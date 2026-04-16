use std::net::SocketAddr;
use std::sync::{Arc, Mutex};

use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use serde_json::Value;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use uuid::Uuid;

use crate::config::{ActionConfig, ConfigStore};
use crate::hid::{DeviceState, HidEvent, SharedDevice};

// ── Outbound message helpers ─────────────────────────────────────────────────

#[derive(Serialize)]
struct WsOut<T: Serialize> {
    id: String,
    #[serde(rename = "type")]
    kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    payload: Option<T>,
}

fn respond<T: Serialize>(kind: &'static str, payload: T) -> String {
    let msg = WsOut {
        id: Uuid::new_v4().to_string(),
        kind,
        payload: Some(payload),
    };
    serde_json::to_string(&msg).unwrap()
}

fn event_msg<T: Serialize>(kind: &'static str, payload: T) -> String {
    respond(kind, payload)
}

// ── State → JSON payload (field names match macOS WebSocket protocol) ────────

fn state_payload(s: &DeviceState) -> Value {
    serde_json::json!({
        "batteryLevel":     s.battery_level,
        "isCharging":       s.is_charging,
        "currentDPIIndex":  s.current_dpi_index,
        "pollingRateHz":    s.polling_rate_hz,
        "currentProfile":   s.current_profile,
        "debounceTime":     s.debounce_time,
        "sleepTime":        s.sleep_time,
        "lodValue":         s.lod_value,
        "angleSnap":        s.angle_snap,
        "motionSync":       s.motion_sync,
        "rippleEffect":     s.ripple_effect,
    })
}

fn hid_event_to_text(ev: &HidEvent, _state: &Arc<Mutex<DeviceState>>) -> Option<String> {
    match ev {
        HidEvent::Connected => Some(event_msg(
            "connection",
            serde_json::json!({"connected": true}),
        )),
        HidEvent::Disconnected => Some(event_msg(
            "connection",
            serde_json::json!({"connected": false}),
        )),
        HidEvent::StateUpdate(s) => Some(event_msg("state", state_payload(s))),
        HidEvent::ButtonPress {
            button,
            timestamp_ms,
        } => Some(event_msg(
            "button",
            serde_json::json!({"button": button, "timestamp": timestamp_ms}),
        )),
    }
}

// ── Server entry point ───────────────────────────────────────────────────────

pub async fn run_server(
    config_store: Arc<Mutex<ConfigStore>>,
    device_state: Arc<Mutex<DeviceState>>,
    device_arc: SharedDevice,
    hid_tx: broadcast::Sender<HidEvent>,
) {
    let addr: SocketAddr = "127.0.0.1:9876".parse().unwrap();
    let listener = TcpListener::bind(addr)
        .await
        .expect("[WS] Failed to bind 127.0.0.1:9876");
    log::info!("[WS] Listening on ws://127.0.0.1:9876");

    while let Ok((stream, peer)) = listener.accept().await {
        log::info!("[WS] Client connected: {peer}");
        let rx = hid_tx.subscribe();
        tokio::spawn(handle_client(
            stream,
            rx,
            Arc::clone(&config_store),
            Arc::clone(&device_state),
            Arc::clone(&device_arc),
        ));
    }
}

// ── Per-client handler ───────────────────────────────────────────────────────

async fn handle_client(
    stream: TcpStream,
    mut rx: broadcast::Receiver<HidEvent>,
    config_store: Arc<Mutex<ConfigStore>>,
    device_state: Arc<Mutex<DeviceState>>,
    device_arc: SharedDevice,
) {
    let ws = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            log::warn!("[WS] Handshake failed: {e}");
            return;
        }
    };

    let (mut sink, mut stream) = ws.split();

    loop {
        tokio::select! {
            // Inbound message from this client
            msg = stream.next() => {
                match msg {
                    None | Some(Err(_)) => break,
                    Some(Ok(Message::Close(_))) => break,
                    Some(Ok(Message::Ping(d))) => {
                        if sink.send(Message::Pong(d)).await.is_err() { break; }
                    }
                    Some(Ok(Message::Text(text))) => {
                        if let Some(reply) = handle_message(
                            &text,
                            &config_store,
                            &device_state,
                            &device_arc,
                        ) {
                            if sink.send(Message::Text(reply)).await.is_err() { break; }
                        }
                    }
                    _ => {}
                }
            }

            // Broadcast event from HID thread
            ev = rx.recv() => {
                match ev {
                    Err(broadcast::error::RecvError::Lagged(_)) => {
                        // Slow client — missed events, but can resync with get_state
                        log::debug!("[WS] Client lagged on broadcast channel");
                    }
                    Err(_) => {}
                    Ok(event) => {
                        if let Some(text) = hid_event_to_text(&event, &device_state) {
                            if sink.send(Message::Text(text)).await.is_err() { break; }
                        }
                    }
                }
            }
        }
    }

    log::info!("[WS] Client disconnected");
}

// ── Message dispatcher ───────────────────────────────────────────────────────

fn handle_message(
    text: &str,
    config_store: &Arc<Mutex<ConfigStore>>,
    device_state: &Arc<Mutex<DeviceState>>,
    _device_arc: &SharedDevice,
) -> Option<String> {
    let v: Value = serde_json::from_str(text).ok()?;
    let kind = v["type"].as_str()?;

    match kind {
        "ping" => Some(respond("pong", serde_json::json!({"version": "1.0"}))),

        "get_state" => {
            let state = device_state.lock().unwrap().clone();
            Some(respond("state", state_payload(&state)))
        }

        "set_cc_action" => {
            let payload = v.get("payload")?;
            let button = payload["button"].as_str()?.to_string();
            let action_type = payload["action"]["type"].as_str()?.to_string();
            let action_value = payload["action"]["value"]
                .as_str()
                .unwrap_or("")
                .to_string();
            let action = ActionConfig {
                kind: action_type,
                value: action_value,
            };
            config_store.lock().unwrap().set_action(&button, action);
            Some(respond("ok", serde_json::json!({"button": button})))
        }

        "get_cc_actions" => {
            let actions = config_store.lock().unwrap().config.cc_actions.clone();
            Some(respond("cc_actions", actions))
        }

        "set_app_profile" => {
            let payload = v.get("payload")?;
            // Accept both "bundleId" (macOS compat) and "exeName" (Windows)
            let exe = payload["bundleId"]
                .as_str()
                .or_else(|| payload["exeName"].as_str())?
                .to_string();
            let profile = payload["profile"].as_u64()? as u8;
            {
                let mut store = config_store.lock().unwrap();
                store.config.app_profiles.insert(exe.clone(), profile);
                store.save();
            }
            Some(respond(
                "ok",
                serde_json::json!({"exeName": exe}),
            ))
        }

        "get_app_profiles" => {
            let profiles = config_store.lock().unwrap().config.app_profiles.clone();
            Some(respond("app_profiles", profiles))
        }

        _ => {
            log::debug!("[WS] Unknown message type: {kind}");
            None
        }
    }
}

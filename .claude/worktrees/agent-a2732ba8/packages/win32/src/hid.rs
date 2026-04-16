use hidapi::{HidApi, HidDevice};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tokio::sync::broadcast;

pub const VENDOR_ID: u16 = 0x093A;
pub const PRODUCT_ID: u16 = 0x522C;
pub const USAGE_PAGE: u16 = 0xFF05;
pub const REPORT_ID: u8 = 0x09;

/// Polling rate code → Hz. Matches web/src/protocol/constants.ts POLLING_RATE_MAP.
const POLLING_RATE_MAP: &[(u8, u32)] = &[
    (0, 1000),
    (1, 500),
    (2, 250),
    (3, 125),
    (4, 8000),
    (5, 4000),
    (6, 2000),
];

/// Device state parsed from input reports. Field names map directly to
/// the WebSocket "state" payload (camelCase serialisation in websocket.rs).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct DeviceState {
    pub battery_level: u8,
    pub is_charging: bool,
    pub current_dpi_index: u8,
    pub polling_rate_hz: u32,
    pub current_profile: u8,
    pub debounce_time: u8,
    pub sleep_time: u32,
    pub lod_value: u8,
    pub angle_snap: bool,
    pub motion_sync: bool,
    pub ripple_effect: bool,
}

/// Events broadcast from the HID thread to all WebSocket client tasks.
#[derive(Debug, Clone)]
pub enum HidEvent {
    Connected,
    Disconnected,
    StateUpdate(DeviceState),
    ButtonPress { button: String, timestamp_ms: u64 },
}

/// Shared HID handle. `Arc<Mutex<Option<HidDevice>>>` lets ProfileSwitcher and
/// WebSocket handlers call send_feature_report() from other threads without
/// touching the tokio runtime.
pub type SharedDevice = Arc<Mutex<Option<HidDevice>>>;

/// Spawn the HID read loop on a dedicated std::thread. Returns shared Arcs for
/// device state, device handle, and customerCode flag.
pub fn spawn_read_loop(
    state: Arc<Mutex<DeviceState>>,
    device_arc: SharedDevice,
    customer_code: Arc<Mutex<bool>>,
    tx: broadcast::Sender<HidEvent>,
) {
    std::thread::Builder::new()
        .name("hid-read".into())
        .spawn(move || loop {
            match open_device() {
                Ok((dev, cc)) => {
                    {
                        *device_arc.lock().unwrap() = Some(dev);
                        *customer_code.lock().unwrap() = cc;
                    }
                    log::info!("[HID] Device opened (customerCode={cc})");
                    let _ = tx.send(HidEvent::Connected);
                    read_loop(&device_arc, &state, &tx);
                    *device_arc.lock().unwrap() = None;
                    log::info!("[HID] Device disconnected");
                    let _ = tx.send(HidEvent::Disconnected);
                }
                Err(e) => {
                    log::debug!("[HID] Device not found: {e}. Retrying in 5s…");
                    std::thread::sleep(Duration::from_secs(5));
                }
            }
        })
        .expect("failed to spawn HID thread");
}

/// Send an 8-byte feature report payload. Prepends report ID 0x09 automatically.
/// Returns true if the report was sent successfully.
pub fn send_feature_report(device_arc: &SharedDevice, payload: &[u8; 8]) -> bool {
    let mut buf = [0u8; 9];
    buf[0] = REPORT_ID;
    buf[1..].copy_from_slice(payload);
    if let Ok(guard) = device_arc.lock() {
        if let Some(dev) = guard.as_ref() {
            return dev.send_feature_report(&buf).is_ok();
        }
    }
    false
}

/// Read a feature report. Returns the full 9-byte buffer (byte[0]=reportId).
#[allow(dead_code)]
pub fn get_feature_report(device_arc: &SharedDevice) -> Option<[u8; 9]> {
    let mut buf = [0u8; 9];
    buf[0] = REPORT_ID;
    if let Ok(guard) = device_arc.lock() {
        if let Some(dev) = guard.as_ref() {
            if dev.get_feature_report(&mut buf).is_ok() {
                return Some(buf);
            }
        }
    }
    None
}

/// Switch the mouse to a profile (0-indexed).
/// Command byte is customerCode-aware: 5 for customerCode devices, 9 for standard.
pub fn switch_profile(device_arc: &SharedDevice, customer_code: bool, profile_index: u8) {
    let cmd: u8 = if customer_code { 5 } else { 9 };
    let payload: [u8; 8] = [cmd, 6, profile_index, 0, 0, 0, 0, 0];
    send_feature_report(device_arc, &payload);
    log::info!("[HID] Switched to profile P{}", profile_index + 1);
}

// ── Internal ─────────────────────────────────────────────────────────────────

fn open_device() -> Result<(HidDevice, bool), hidapi::HidError> {
    let api = HidApi::new()?;
    let info = api
        .device_list()
        .find(|d| {
            d.vendor_id() == VENDOR_ID
                && d.product_id() == PRODUCT_ID
                && d.usage_page() == USAGE_PAGE
        })
        .ok_or_else(|| hidapi::HidError::HidApiError {
            message: "device not found".into(),
        })?;

    let device = info.open_device(&api)?;
    device.set_blocking_mode(true)?;

    // Detect customerCode: send identify [143,0,…], check response byte[8] == 0x40
    // (byte[8] because Windows read buffer is [reportId, ...33 bytes], so original
    //  macOS byte[7] maps to buf[8] after the report-ID prefix)
    let identify: [u8; 8] = [143, 0, 0, 0, 0, 0, 0, 0];
    let mut buf = [0u8; 9];
    buf[0] = REPORT_ID;
    buf[1..].copy_from_slice(&identify);
    let _ = device.send_feature_report(&buf);

    let mut resp = [0u8; 9];
    resp[0] = REPORT_ID;
    let customer_code = device
        .get_feature_report(&mut resp)
        .map(|_| resp[8] == 0x40)
        .unwrap_or(false);

    Ok((device, customer_code))
}

fn read_loop(
    device_arc: &SharedDevice,
    state_arc: &Arc<Mutex<DeviceState>>,
    tx: &broadcast::Sender<HidEvent>,
) {
    // Windows HID read buffer: [reportId(1), data(33)] = 34 bytes
    let mut buf = [0u8; 34];

    loop {
        let result = {
            let guard = match device_arc.lock() {
                Ok(g) => g,
                Err(_) => break,
            };
            match guard.as_ref() {
                Some(dev) => dev.read_timeout(&mut buf, 2000),
                None => break,
            }
        };

        match result {
            Ok(0) => continue,           // timeout, no data
            Err(_) => break,             // device error / disconnected
            Ok(n) if n < 10 => continue, // unexpectedly short report
            Ok(_) => {
                if buf[0] != REPORT_ID {
                    continue;
                }
                // buf[1..] = the 33 input report bytes
                if let Some(event) = parse_input_report(&buf[1..], state_arc) {
                    let _ = tx.send(event);
                }
            }
        }
    }
}

/// Parse a 33-byte input report into a HidEvent.
/// Byte layout matches web/src/protocol/parser.ts and WraithDaemon/HIDManager.swift.
fn parse_input_report(data: &[u8], state_arc: &Arc<Mutex<DeviceState>>) -> Option<HidEvent> {
    if data.len() < 9 {
        return None;
    }

    let battery_byte = data[0];
    let dpi_poll_byte = data[1];
    let prof_deb_byte = data[2];
    let sleep_hi_byte = data[3];
    // data[4] unused
    let sleep_lo_byte = data[5];
    let sensor_byte = data[6];
    let btn_flag = data[7];
    let btn_mask = data[8];

    let polling_hz = POLLING_RATE_MAP
        .iter()
        .find(|&&(code, _)| code == (dpi_poll_byte & 0x0F))
        .map(|&(_, hz)| hz)
        .unwrap_or(0);

    let new_state = DeviceState {
        battery_level: battery_byte & 0x7F,
        is_charging: (battery_byte & 0x80) != 0,
        current_dpi_index: (dpi_poll_byte >> 4) & 0x0F,
        polling_rate_hz: polling_hz,
        current_profile: (prof_deb_byte >> 6) & 0x03,
        debounce_time: prof_deb_byte & 0x3F,
        sleep_time: ((sleep_hi_byte >> 4) as u32) * 256 + sleep_lo_byte as u32,
        lod_value: (sensor_byte >> 4) & 0x0F,
        ripple_effect: (sensor_byte & 0x04) != 0,
        angle_snap: (sensor_byte & 0x02) != 0,
        motion_sync: (sensor_byte & 0x01) != 0,
    };

    // Button press takes priority over state update
    if btn_flag == 0x5A {
        let button_name = match btn_mask {
            0x01 => "START",
            0x00 => "STOP",
            0x80 => "MACRO",
            0x08 => "ARROW_UP",
            0x04 => "ARROW_DOWN",
            0x10 => "MUTE",
            _ => {
                // Unknown button — still update state
                let mut state = state_arc.lock().unwrap();
                if *state != new_state {
                    *state = new_state.clone();
                    return Some(HidEvent::StateUpdate(new_state));
                }
                return None;
            }
        };

        // Update state alongside button press
        {
            let mut state = state_arc.lock().unwrap();
            *state = new_state;
        }

        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        return Some(HidEvent::ButtonPress {
            button: button_name.to_string(),
            timestamp_ms: ts,
        });
    }

    let mut state = state_arc.lock().unwrap();
    if *state != new_state {
        *state = new_state.clone();
        return Some(HidEvent::StateUpdate(new_state));
    }
    None
}

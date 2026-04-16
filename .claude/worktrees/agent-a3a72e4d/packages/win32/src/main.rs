mod actions;
mod config;
mod hid;
mod profile;
mod websocket;

use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use tray_icon::{
    menu::{Menu, MenuEvent, MenuItem},
    Icon, TrayIconBuilder, TrayIconEvent,
};

/// Build a 32×32 RGBA icon with "W1" rendered as pixel art.
/// No extra dependencies — pure Rust, hardcoded glyphs.
fn make_w1_icon() -> Icon {
    const SIZE: usize = 32;
    let mut pixels = vec![0u8; SIZE * SIZE * 4];

    // Background: dark charcoal
    for chunk in pixels.chunks_exact_mut(4) {
        chunk.copy_from_slice(&[28, 28, 30, 255]);
    }

    // Helper: paint a 2×2 logical pixel at (col, row) in glyph coords,
    // offset by (ox, oy) in canvas coords.
    let mut dot = |col: usize, row: usize, ox: usize, oy: usize| {
        for dy in 0..2usize {
            for dx in 0..2usize {
                let px = ox + col * 2 + dx;
                let py = oy + row * 2 + dy;
                if px < SIZE && py < SIZE {
                    let i = (py * SIZE + px) * 4;
                    pixels[i..i + 4].copy_from_slice(&[220, 220, 225, 255]);
                }
            }
        }
    };

    // W glyph — 5 cols × 5 rows (rendered 10×10), origin at canvas (4, 11)
    // Pattern (1 = lit):
    // 1 0 0 0 1
    // 1 0 0 0 1
    // 1 0 1 0 1
    // 1 1 0 1 1
    // 1 0 0 0 1   ← bottom stroke
    let w_pat: &[&[u8]] = &[
        &[1, 0, 0, 0, 1],
        &[1, 0, 0, 0, 1],
        &[1, 0, 1, 0, 1],
        &[1, 1, 0, 1, 1],
        &[1, 0, 0, 0, 1],
    ];
    let (wx, wy) = (4usize, 11usize);
    for (r, row) in w_pat.iter().enumerate() {
        for (c, &on) in row.iter().enumerate() {
            if on == 1 {
                dot(c, r, wx, wy);
            }
        }
    }

    // 1 glyph — 3 cols × 5 rows (rendered 6×10), origin at canvas (18, 11)
    // Pattern:
    // 0 1 0
    // 1 1 0
    // 0 1 0
    // 0 1 0
    // 1 1 1
    let one_pat: &[&[u8]] = &[
        &[0, 1, 0],
        &[1, 1, 0],
        &[0, 1, 0],
        &[0, 1, 0],
        &[1, 1, 1],
    ];
    let (ox, oy) = (18usize, 11usize);
    for (r, row) in one_pat.iter().enumerate() {
        for (c, &on) in row.iter().enumerate() {
            if on == 1 {
                dot(c, r, ox, oy);
            }
        }
    }

    Icon::from_rgba(pixels, SIZE as u32, SIZE as u32).expect("failed to create tray icon")
}

fn main() {
    // RUST_LOG=debug for verbose output; default to info
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    log::info!("=== WraithDaemon (Windows) v0.1.0 ===");

    // ── Shared state ──────────────────────────────────────────────────────────
    let config_store = config::ConfigStore::load();
    let device_state = Arc::new(Mutex::new(hid::DeviceState::default()));
    let device_arc: hid::SharedDevice = Arc::new(Mutex::new(None));
    let customer_code = Arc::new(Mutex::new(false));

    // Broadcast channel: HID events → WebSocket tasks + action engine + tray
    let (hid_tx, mut hid_rx_main) = broadcast::channel::<hid::HidEvent>(64);

    // ── Spawn HID read thread ─────────────────────────────────────────────────
    hid::spawn_read_loop(
        Arc::clone(&device_state),
        Arc::clone(&device_arc),
        Arc::clone(&customer_code),
        hid_tx.clone(),
    );

    // ── Spawn ProfileSwitcher (Win32 message pump) ────────────────────────────
    profile::ProfileSwitcher::new(Arc::clone(&config_store), Arc::clone(&device_arc), Arc::clone(&customer_code)).spawn();

    // ── Build system tray icon ────────────────────────────────────────────────
    let tray_menu = Menu::new();
    let open_item = MenuItem::new("Open Web UI", true, None);
    let quit_item = MenuItem::new("Quit WraithDaemon", true, None);
    let open_id = open_item.id().clone();
    let quit_id = quit_item.id().clone();
    tray_menu
        .append_items(&[&open_item, &quit_item])
        .expect("failed to build tray menu");

    let tray = TrayIconBuilder::new()
        .with_icon(make_w1_icon())
        .with_menu(Box::new(tray_menu))
        .with_tooltip("Wraith W1 — connecting…")
        .build()
        .expect("[Tray] Failed to create tray icon");

    // ── Tokio runtime: WebSocket server + action engine ───────────────────────
    let rt = tokio::runtime::Runtime::new().expect("failed to build tokio runtime");

    // WebSocket server
    rt.spawn(websocket::run_server(
        Arc::clone(&config_store),
        Arc::clone(&device_state),
        Arc::clone(&device_arc),
        hid_tx.clone(),
    ));

    // Action engine — listens for button presses on its own broadcast receiver
    {
        let engine = Arc::new(actions::ActionEngine::new(Arc::clone(&config_store)));
        let mut btn_rx = hid_tx.subscribe();
        rt.spawn(async move {
            loop {
                match btn_rx.recv().await {
                    Ok(hid::HidEvent::ButtonPress { button, .. }) => {
                        let eng = Arc::clone(&engine);
                        tokio::task::spawn_blocking(move || eng.execute(&button))
                            .await
                            .ok();
                    }
                    Ok(_) => {}
                    Err(broadcast::error::RecvError::Lagged(n)) => {
                        log::warn!("[ActionEngine] Lagged by {n} events");
                    }
                    Err(_) => break,
                }
            }
        });
    }

    // ── Main loop: tray events + HID state for tooltip ───────────────────────
    // tray-icon requires the menu event receiver to be polled on the main thread.
    let menu_rx = MenuEvent::receiver();
    let tray_rx = TrayIconEvent::receiver();

    loop {
        // Update tray tooltip from HID events
        match hid_rx_main.try_recv() {
            Ok(hid::HidEvent::StateUpdate(ref s)) => {
                let charge = if s.is_charging { "+" } else { "" };
                let tip = format!("Wraith W1 — {}%{charge}", s.battery_level);
                let _ = tray.set_tooltip(Some(&tip));
            }
            Ok(hid::HidEvent::Connected) => {
                let _ = tray.set_tooltip(Some("Wraith W1 — connected"));
            }
            Ok(hid::HidEvent::Disconnected) => {
                let _ = tray.set_tooltip(Some("Wraith W1 — disconnected"));
            }
            _ => {}
        }

        // Handle tray menu item clicks
        if let Ok(event) = menu_rx.try_recv() {
            if event.id == open_id {
                // Open web UI in default browser
                let verb: Vec<u16> = "open\0".encode_utf16().collect();
                let url: Vec<u16> = "http://localhost:5173\0".encode_utf16().collect();
                unsafe {
                    windows::Win32::UI::Shell::ShellExecuteW(
                        None,
                        windows::core::PCWSTR(verb.as_ptr()),
                        windows::core::PCWSTR(url.as_ptr()),
                        None,
                        None,
                        windows::Win32::UI::WindowsAndMessaging::SW_SHOW,
                    );
                }
            }
            if event.id == quit_id {
                log::info!("[Daemon] Quit via tray");
                std::process::exit(0);
            }
        }

        // Drain tray icon events (required to keep the tray icon alive)
        while tray_rx.try_recv().is_ok() {}

        // Pump the Win32 message queue — required for the tray context menu to appear.
        // tray-icon's hidden HWND receives WM_RBUTTONUP on this thread; without
        // PeekMessage/DispatchMessage the TrackPopupMenu call inside tray-icon
        // is never reached and right-click menus never show.
        unsafe {
            use windows::Win32::UI::WindowsAndMessaging::{
                DispatchMessageW, PeekMessageW, TranslateMessage, MSG, PM_REMOVE,
            };
            let mut msg = MSG::default();
            while PeekMessageW(&mut msg, None, 0, 0, PM_REMOVE).as_bool() {
                let _ = TranslateMessage(&msg);
                DispatchMessageW(&msg);
            }
        }
        std::thread::sleep(std::time::Duration::from_millis(16));
    }
}

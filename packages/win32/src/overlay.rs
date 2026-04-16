/// DPI change overlay — shows a toast notification when the DPI slot changes.
///
/// Uses `notify-rust` which is already a dependency of the project.

pub fn show_dpi_notification(text: &str) {
    let body = text.to_string();
    std::thread::spawn(move || {
        if let Err(e) = notify_rust::Notification::new()
            .summary("Wraith W1 \u{2014} DPI Changed")
            .body(&body)
            .timeout(notify_rust::Timeout::Milliseconds(1500))
            .show()
        {
            log::warn!("[Overlay] Failed to show DPI toast: {e}");
        }
    });
}

import AppKit

/// A floating, transparent overlay that briefly displays the current DPI slot
/// (or actual DPI value) when the user switches DPI on the mouse.
final class DPIOverlay {
    private static var window: NSWindow?
    private static var dismissTimer: Timer?

    /// Show a DPI overlay in the center of the main screen.
    /// - Parameter text: The string to display, e.g. "DPI Slot 2" or "DPI: 1600".
    static func show(text: String) {
        DispatchQueue.main.async {
            // Cancel any pending dismiss so rapid switches restart the timer.
            dismissTimer?.invalidate()

            // Tear down existing window if still visible.
            window?.orderOut(nil)
            window = nil

            guard let screen = NSScreen.main else { return }

            // -- Label ----------------------------------------------------------
            let label = NSTextField(labelWithString: text)
            label.font = NSFont.monospacedSystemFont(ofSize: 36, weight: .bold)
            label.textColor = .white
            label.alignment = .center
            label.isEditable = false
            label.isBordered = false
            label.drawsBackground = false
            label.sizeToFit()

            let padding = NSSize(width: 40, height: 24)
            let bgSize = NSSize(
                width: label.frame.width + padding.width,
                height: label.frame.height + padding.height
            )

            // -- Background view with rounded corners ---------------------------
            let bgView = NSView(frame: NSRect(origin: .zero, size: bgSize))
            bgView.wantsLayer = true
            bgView.layer?.backgroundColor = NSColor(white: 0.1, alpha: 0.75).cgColor
            bgView.layer?.cornerRadius = 14

            label.frame = NSRect(
                x: padding.width / 2,
                y: padding.height / 2,
                width: label.frame.width,
                height: label.frame.height
            )
            bgView.addSubview(label)

            // -- Window ---------------------------------------------------------
            let origin = NSPoint(
                x: screen.frame.midX - bgSize.width / 2,
                y: screen.frame.midY - bgSize.height / 2
            )
            let win = NSWindow(
                contentRect: NSRect(origin: origin, size: bgSize),
                styleMask: .borderless,
                backing: .buffered,
                defer: false
            )
            win.level = .floating
            win.isOpaque = false
            win.backgroundColor = .clear
            win.ignoresMouseEvents = true
            win.hasShadow = false
            win.contentView = bgView
            win.alphaValue = 1.0
            win.orderFrontRegardless()

            self.window = win

            // -- Auto-dismiss after 1.5 s with fade-out ------------------------
            dismissTimer = Timer.scheduledTimer(withTimeInterval: 1.5, repeats: false) { _ in
                NSAnimationContext.runAnimationGroup({ ctx in
                    ctx.duration = 0.3
                    win.animator().alphaValue = 0.0
                }, completionHandler: {
                    win.orderOut(nil)
                    if self.window === win {
                        self.window = nil
                    }
                })
            }
        }
    }
}

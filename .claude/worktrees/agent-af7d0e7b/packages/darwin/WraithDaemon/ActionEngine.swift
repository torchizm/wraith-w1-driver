import Foundation
import AppKit
import CoreGraphics

class ActionEngine {
    private let configStore: ConfigStore

    init(configStore: ConfigStore) {
        self.configStore = configStore
    }

    func executeAction(for button: CCButton) {
        let action = configStore.getAction(for: button.rawValue)
        switch action {
        case .none:
            break
        case .launchApp(let bundleId):
            launchApp(bundleId: bundleId)
        case .keyboardShortcut(let shortcut):
            simulateKeyboardShortcut(shortcut)
        case .shellCommand(let command):
            runShellCommand(command)
        case .openURL(let urlString):
            openURL(urlString)
        case .system(let systemAction):
            performSystemAction(systemAction)
        }
    }

    private func launchApp(bundleId: String) {
        if let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) {
            NSWorkspace.shared.openApplication(at: url, configuration: .init())
            print("[Action] Launched app: \(bundleId)")
        } else {
            // Try as app name
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
            process.arguments = ["-a", bundleId]
            try? process.run()
            print("[Action] Launched app by name: \(bundleId)")
        }
    }

    private func simulateKeyboardShortcut(_ shortcut: String) {
        // Parse shortcut like "cmd+shift+4" or "ctrl+c"
        let parts = shortcut.lowercased().split(separator: "+").map(String.init)
        var flags: CGEventFlags = []
        var keyCode: UInt16 = 0

        for part in parts {
            switch part {
            case "cmd", "command": flags.insert(.maskCommand)
            case "ctrl", "control": flags.insert(.maskControl)
            case "shift": flags.insert(.maskShift)
            case "alt", "option": flags.insert(.maskAlternate)
            default:
                keyCode = keyCodeFor(part)
            }
        }

        if let keyDown = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: true),
           let keyUp = CGEvent(keyboardEventSource: nil, virtualKey: keyCode, keyDown: false) {
            keyDown.flags = flags
            keyUp.flags = flags
            keyDown.post(tap: .cghidEventTap)
            keyUp.post(tap: .cghidEventTap)
            print("[Action] Keyboard shortcut: \(shortcut)")
        }
    }

    private func keyCodeFor(_ key: String) -> UInt16 {
        let map: [String: UInt16] = [
            "a": 0, "b": 11, "c": 8, "d": 2, "e": 14, "f": 3, "g": 5,
            "h": 4, "i": 34, "j": 38, "k": 40, "l": 37, "m": 46, "n": 45,
            "o": 31, "p": 35, "q": 12, "r": 15, "s": 1, "t": 17, "u": 32,
            "v": 9, "w": 13, "x": 7, "y": 16, "z": 6,
            "1": 18, "2": 19, "3": 20, "4": 21, "5": 23, "6": 22, "7": 26,
            "8": 28, "9": 25, "0": 29,
            "space": 49, "return": 36, "enter": 36, "tab": 48, "escape": 53,
            "delete": 51, "backspace": 51,
            "up": 126, "down": 125, "left": 123, "right": 124,
            "f1": 122, "f2": 120, "f3": 99, "f4": 118, "f5": 96, "f6": 97,
            "f7": 98, "f8": 100, "f9": 101, "f10": 109, "f11": 103, "f12": 111,
        ]
        return map[key] ?? 0
    }

    private func runShellCommand(_ command: String) {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-c", command]
        try? process.run()
        print("[Action] Shell command: \(command)")
    }

    private func openURL(_ urlString: String) {
        if let url = URL(string: urlString) {
            NSWorkspace.shared.open(url)
            print("[Action] Opened URL: \(urlString)")
        }
    }

    private func performSystemAction(_ action: String) {
        switch action {
        case "play_pause":
            simulateMediaKey(keyCode: 16) // NX_KEYTYPE_PLAY
        case "next_track":
            simulateMediaKey(keyCode: 17) // NX_KEYTYPE_NEXT
        case "prev_track":
            simulateMediaKey(keyCode: 18) // NX_KEYTYPE_PREVIOUS
        case "volume_up":
            simulateMediaKey(keyCode: 0)  // NX_KEYTYPE_SOUND_UP
        case "volume_down":
            simulateMediaKey(keyCode: 1)  // NX_KEYTYPE_SOUND_DOWN
        case "volume_mute":
            simulateMediaKey(keyCode: 7)  // NX_KEYTYPE_MUTE
        case "screenshot":
            simulateKeyboardShortcut("cmd+shift+3")
        case "lock_screen":
            simulateKeyboardShortcut("cmd+ctrl+q")
        case "show_desktop":
            simulateKeyboardShortcut("cmd+f3") // Mission Control: Show Desktop
        case "task_manager":
            launchApp(bundleId: "com.apple.ActivityMonitor")
        case "mission_control":
            simulateKeyboardShortcut("ctrl+up")
        default:
            print("[Action] Unknown system action: \(action)")
        }
    }

    private func simulateMediaKey(keyCode: Int32) {
        let flags = NSEvent.ModifierFlags(rawValue: 0xa00)
        if let event = NSEvent.otherEvent(
            with: .systemDefined,
            location: .zero,
            modifierFlags: flags,
            timestamp: 0,
            windowNumber: 0,
            context: nil,
            subtype: 8,
            data1: Int((keyCode << 16) | (0xa << 8)),
            data2: -1
        ) {
            event.cgEvent?.post(tap: .cghidEventTap)
        }
    }
}

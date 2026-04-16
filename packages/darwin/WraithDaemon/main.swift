import Foundation
import AppKit

// WraithDaemon - Menu bar agent for W1 mouse

class WraithDaemonApp: NSObject, NSApplicationDelegate, HIDManagerDelegate {
    let configStore = ConfigStore()
    let hidManager = HIDManager()
    lazy var actionEngine = ActionEngine(configStore: configStore)
    lazy var profileSwitcher = ProfileSwitcher(configStore: configStore)
    var wsServer: WraithWSServer!

    var statusItem: NSStatusItem!
    var batteryMenuItem: NSMenuItem!

    override init() {
        super.init()
        wsServer = WraithWSServer(port: 9876)
        wsServer.app = self
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        print("=== WraithDaemon v1.0 ===")

        setupMenuBar()

        hidManager.delegate = self
        hidManager.start()

        profileSwitcher.start()

        do {
            try wsServer.start()
        } catch {
            print("[Error] Failed to start WebSocket server: \(error)")
        }

        print("[Daemon] Ready. Web UI at http://localhost:5173")
    }

    func applicationWillTerminate(_ notification: Notification) {
        hidManager.stop()
        profileSwitcher.stop()
        wsServer.stop()
    }

    // MARK: - Menu Bar

    func setupMenuBar() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem.button {
            button.title = "W1"
            button.font = NSFont.monospacedSystemFont(ofSize: 10, weight: .bold)
        }

        let menu = NSMenu()

        batteryMenuItem = NSMenuItem(title: "Battery: --", action: nil, keyEquivalent: "")
        batteryMenuItem.isEnabled = false
        menu.addItem(batteryMenuItem)
        menu.addItem(NSMenuItem.separator())

        let webUIItem = NSMenuItem(title: "Open Web UI", action: #selector(openWebUI), keyEquivalent: "w")
        webUIItem.target = self
        menu.addItem(webUIItem)
        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "Quit WraithDaemon", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem.menu = menu
    }

    @objc func openWebUI() {
        NSWorkspace.shared.open(URL(string: "http://localhost:5173")!)
    }

    @objc func quitApp() {
        NSApplication.shared.terminate(nil)
    }

    // MARK: - Helpers

    func stateDict() -> [String: Any] {
        let s = hidManager.state
        return [
            "batteryLevel": s.batteryLevel,
            "isCharging": s.isCharging,
            "currentDPIIndex": s.currentDPIIndex,
            "pollingRateHz": s.pollingRateHz,
            "currentProfile": s.currentProfile,
            "debounceTime": s.debounceTime,
            "sleepTime": s.sleepTime,
            "lodValue": s.lodValue,
            "angleSnap": s.angleSnap,
            "motionSync": s.motionSync,
            "rippleEffect": s.rippleEffect,
        ]
    }

    // MARK: - HIDManagerDelegate

    func hidManagerDidConnect() {
        DispatchQueue.main.async {
            self.statusItem.button?.title = "W1"
        }
        wsServer.broadcastJSON([
            "id": UUID().uuidString,
            "type": "connection",
            "payload": ["connected": true],
        ])
    }

    func hidManagerDidDisconnect() {
        DispatchQueue.main.async {
            self.statusItem.button?.title = "W1?"
            self.batteryMenuItem.title = "Battery: Disconnected"
        }
        wsServer.broadcastJSON([
            "id": UUID().uuidString,
            "type": "connection",
            "payload": ["connected": false],
        ])
    }

    func hidManagerDidUpdateState(_ state: DeviceState) {
        DispatchQueue.main.async {
            let icon = state.isCharging ? "+" : ""
            self.batteryMenuItem.title = "Battery: \(state.batteryLevel)%\(icon)"
            self.statusItem.button?.title = "W1 \(state.batteryLevel)%"
        }

        wsServer.broadcastJSON([
            "id": UUID().uuidString,
            "type": "state",
            "payload": stateDict(),
        ])
    }

    func hidManagerDidPressButton(_ button: CCButton) {
        print("[Button] \(button.rawValue) pressed")
        actionEngine.executeAction(for: button)

        wsServer.broadcastJSON([
            "id": UUID().uuidString,
            "type": "button",
            "payload": [
                "button": button.rawValue,
                "timestamp": Int(Date().timeIntervalSince1970 * 1000),
            ] as [String: Any],
        ])
    }
}

// WebSocket server with message handling
class WraithWSServer: WebSocketServer {
    weak var app: WraithDaemonApp?

    override func handleMessage(_ parsed: [String: Any], from clientId: ObjectIdentifier) -> [String: Any]? {
        let msgType = parsed["type"] as? String ?? ""

        switch msgType {
        case "ping":
            return [
                "id": UUID().uuidString,
                "type": "pong",
                "payload": ["version": "1.0"],
            ]

        case "get_state":
            guard let app = app else { return nil }
            return [
                "id": UUID().uuidString,
                "type": "state",
                "payload": app.stateDict(),
            ]

        case "set_cc_action":
            guard let app = app,
                  let payload = parsed["payload"] as? [String: Any],
                  let button = payload["button"] as? String,
                  let actionDict = payload["action"] as? [String: Any],
                  let actionType = actionDict["type"] as? String else {
                print("[WS] set_cc_action: failed to parse payload")
                return nil
            }

            let actionValue = actionDict["value"] as? String ?? ""
            let action: ActionConfig
            switch actionType {
            case "launch_app": action = .launchApp(bundleId: actionValue)
            case "keyboard_shortcut": action = .keyboardShortcut(shortcut: actionValue)
            case "shell_command": action = .shellCommand(command: actionValue)
            case "open_url": action = .openURL(url: actionValue)
            case "system": action = .system(action: actionValue)
            default: action = .none
            }
            app.configStore.setAction(for: button, action: action)
            print("[WS] Set CC action: \(button) -> \(actionType)(\(actionValue))")
            return [
                "id": UUID().uuidString,
                "type": "ok",
                "payload": ["button": button],
            ]

        case "get_cc_actions":
            guard let app = app else { return nil }
            var actions: [String: Any] = [:]
            for (key, value) in app.configStore.config.ccActions {
                switch value {
                case .none:
                    actions[key] = ["type": "none", "value": ""]
                case .launchApp(let v):
                    actions[key] = ["type": "launch_app", "value": v]
                case .keyboardShortcut(let v):
                    actions[key] = ["type": "keyboard_shortcut", "value": v]
                case .shellCommand(let v):
                    actions[key] = ["type": "shell_command", "value": v]
                case .openURL(let v):
                    actions[key] = ["type": "open_url", "value": v]
                case .system(let v):
                    actions[key] = ["type": "system", "value": v]
                }
            }
            return [
                "id": UUID().uuidString,
                "type": "cc_actions",
                "payload": actions,
            ]

        case "set_app_profile":
            guard let app = app,
                  let payload = parsed["payload"] as? [String: Any],
                  let bundleId = payload["bundleId"] as? String,
                  let profile = payload["profile"] as? Int else { return nil }
            app.configStore.config.appProfiles[bundleId] = profile
            app.configStore.save()
            print("[WS] Set app profile: \(bundleId) -> P\(profile + 1)")
            return [
                "id": UUID().uuidString,
                "type": "ok",
            ]

        case "get_app_profiles":
            guard let app = app else { return nil }
            return [
                "id": UUID().uuidString,
                "type": "app_profiles",
                "payload": app.configStore.config.appProfiles,
            ]

        default:
            print("[WS] Unknown message type: \(msgType)")
            return nil
        }
    }
}

// MARK: - Entry Point

let nsApp = NSApplication.shared
nsApp.setActivationPolicy(.accessory)

let daemon = WraithDaemonApp()
nsApp.delegate = daemon
nsApp.run()

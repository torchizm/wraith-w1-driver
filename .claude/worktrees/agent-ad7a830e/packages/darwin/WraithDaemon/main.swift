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

    // MARK: - HIDManagerDelegate

    func hidManagerDidConnect() {
        DispatchQueue.main.async {
            self.statusItem.button?.title = "W1"
        }
        wsServer.broadcast(WSMessage(type: "connection", payload: ["connected": AnyCodable(true)]))
    }

    func hidManagerDidDisconnect() {
        DispatchQueue.main.async {
            self.statusItem.button?.title = "W1?"
            self.batteryMenuItem.title = "Battery: Disconnected"
        }
        wsServer.broadcast(WSMessage(type: "connection", payload: ["connected": AnyCodable(false)]))
    }

    func hidManagerDidUpdateState(_ state: DeviceState) {
        DispatchQueue.main.async {
            let icon = state.isCharging ? "+" : ""
            self.batteryMenuItem.title = "Battery: \(state.batteryLevel)%\(icon)"
            self.statusItem.button?.title = "W1 \(state.batteryLevel)%"
        }

        let payload: [String: AnyCodable] = [
            "batteryLevel": AnyCodable(state.batteryLevel),
            "isCharging": AnyCodable(state.isCharging),
            "currentDPIIndex": AnyCodable(state.currentDPIIndex),
            "pollingRateHz": AnyCodable(state.pollingRateHz),
            "currentProfile": AnyCodable(state.currentProfile),
            "debounceTime": AnyCodable(state.debounceTime),
            "sleepTime": AnyCodable(state.sleepTime),
            "lodValue": AnyCodable(state.lodValue),
            "angleSnap": AnyCodable(state.angleSnap),
            "motionSync": AnyCodable(state.motionSync),
            "rippleEffect": AnyCodable(state.rippleEffect),
        ]
        wsServer.broadcast(WSMessage(type: "state", payload: payload))
    }

    func hidManagerDidPressButton(_ button: CCButton) {
        print("[Button] \(button.rawValue) pressed")
        actionEngine.executeAction(for: button)

        let payload: [String: AnyCodable] = [
            "button": AnyCodable(button.rawValue),
            "timestamp": AnyCodable(Int(Date().timeIntervalSince1970 * 1000)),
        ]
        wsServer.broadcast(WSMessage(type: "button", payload: payload))
    }
}

// WebSocket server with message handling
class WraithWSServer: WebSocketServer {
    weak var app: WraithDaemonApp?

    override func handleMessage(_ message: WSMessage, from clientId: ObjectIdentifier) -> WSMessage? {
        switch message.type {
        case "ping":
            return WSMessage(type: "pong", payload: ["version": AnyCodable("1.0")])

        case "get_state":
            guard let app = app else { return nil }
            let s = app.hidManager.state
            return WSMessage(type: "state", payload: [
                "batteryLevel": AnyCodable(s.batteryLevel),
                "isCharging": AnyCodable(s.isCharging),
                "currentDPIIndex": AnyCodable(s.currentDPIIndex),
                "pollingRateHz": AnyCodable(s.pollingRateHz),
                "currentProfile": AnyCodable(s.currentProfile),
                "debounceTime": AnyCodable(s.debounceTime),
                "sleepTime": AnyCodable(s.sleepTime),
                "lodValue": AnyCodable(s.lodValue),
                "angleSnap": AnyCodable(s.angleSnap),
                "motionSync": AnyCodable(s.motionSync),
                "rippleEffect": AnyCodable(s.rippleEffect),
            ])

        case "set_cc_action":
            guard let app = app,
                  let payload = message.payload,
                  let button = payload["button"]?.value as? String,
                  let actionDict = payload["action"]?.value as? [String: AnyCodable],
                  let actionType = actionDict["type"]?.value as? String else { return nil }

            let actionValue = actionDict["value"]?.value as? String ?? ""
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
            return WSMessage(type: "ok", payload: ["button": AnyCodable(button)])

        case "get_cc_actions":
            guard let app = app else { return nil }
            var actions: [String: AnyCodable] = [:]
            for (key, value) in app.configStore.config.ccActions {
                if let data = try? JSONEncoder().encode(value),
                   let dict = try? JSONDecoder().decode([String: AnyCodable].self, from: data) {
                    actions[key] = AnyCodable(dict)
                }
            }
            return WSMessage(type: "cc_actions", payload: actions)

        case "set_app_profile":
            guard let app = app,
                  let payload = message.payload,
                  let bundleId = payload["bundleId"]?.value as? String,
                  let profile = payload["profile"]?.value as? Int else { return nil }
            app.configStore.config.appProfiles[bundleId] = profile
            app.configStore.save()
            return WSMessage(type: "ok")

        case "get_app_profiles":
            guard let app = app else { return nil }
            var profiles: [String: AnyCodable] = [:]
            for (key, value) in app.configStore.config.appProfiles {
                profiles[key] = AnyCodable(value)
            }
            return WSMessage(type: "app_profiles", payload: profiles)

        default:
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

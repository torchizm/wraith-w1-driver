import Foundation

// Action types for CC button mapping
enum ActionConfig: Codable, Equatable {
    case none
    case launchApp(bundleId: String)
    case keyboardShortcut(shortcut: String)
    case shellCommand(command: String)
    case openURL(url: String)
    case system(action: String)

    enum CodingKeys: String, CodingKey {
        case type, value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)
        let value = try container.decodeIfPresent(String.self, forKey: .value) ?? ""
        switch type {
        case "launch_app": self = .launchApp(bundleId: value)
        case "keyboard_shortcut": self = .keyboardShortcut(shortcut: value)
        case "shell_command": self = .shellCommand(command: value)
        case "open_url": self = .openURL(url: value)
        case "system": self = .system(action: value)
        default: self = .none
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .none:
            try container.encode("none", forKey: .type)
            try container.encode("", forKey: .value)
        case .launchApp(let bundleId):
            try container.encode("launch_app", forKey: .type)
            try container.encode(bundleId, forKey: .value)
        case .keyboardShortcut(let shortcut):
            try container.encode("keyboard_shortcut", forKey: .type)
            try container.encode(shortcut, forKey: .value)
        case .shellCommand(let command):
            try container.encode("shell_command", forKey: .type)
            try container.encode(command, forKey: .value)
        case .openURL(let url):
            try container.encode("open_url", forKey: .type)
            try container.encode(url, forKey: .value)
        case .system(let action):
            try container.encode("system", forKey: .type)
            try container.encode(action, forKey: .value)
        }
    }
}

struct DaemonConfig: Codable {
    var ccActions: [String: ActionConfig] = [:]
    var appProfiles: [String: Int] = [:]  // bundleId -> profile index
}

class ConfigStore {
    private let configURL: URL
    var config: DaemonConfig

    init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = appSupport.appendingPathComponent("WraithController")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        configURL = dir.appendingPathComponent("config.json")
        config = Self.load(from: configURL)
    }

    private static func load(from url: URL) -> DaemonConfig {
        guard let data = try? Data(contentsOf: url),
              let config = try? JSONDecoder().decode(DaemonConfig.self, from: data) else {
            return DaemonConfig()
        }
        return config
    }

    func save() {
        guard let data = try? JSONEncoder().encode(config) else { return }
        try? data.write(to: configURL, options: .atomic)
    }

    func setAction(for button: String, action: ActionConfig) {
        config.ccActions[button] = action
        save()
    }

    func getAction(for button: String) -> ActionConfig {
        config.ccActions[button] ?? .none
    }
}

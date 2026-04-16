import SwiftUI

struct ControlCenterButton: View {
    let label: String
    let isActive: Bool
    var width: CGFloat = 70
    var height: CGFloat = 40

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(isActive ? Color.red : Color(white: 0.15))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(isActive ? Color.red.opacity(0.8) : Color(white: 0.3), lineWidth: 1)
                )
                .shadow(color: isActive ? Color.red.opacity(0.6) : .clear, radius: 8)
            Text(label)
                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                .foregroundColor(isActive ? .white : Color(white: 0.7))
        }
        .frame(width: width, height: height)
        .animation(.easeInOut(duration: 0.15), value: isActive)
    }
}

struct SliderView: View {
    let activeButton: WraithButton?

    var body: some View {
        VStack(spacing: 2) {
            ControlCenterButton(label: "▲", isActive: activeButton == .arrowUp, width: 50, height: 30)
            ZStack {
                Circle().fill(Color(white: 0.2)).overlay(Circle().stroke(Color(white: 0.4), lineWidth: 2))
                Circle().fill(Color(white: 0.25)).padding(6)
                RoundedRectangle(cornerRadius: 1).fill(Color(white: 0.5)).frame(width: 2, height: 10).offset(y: -12)
            }
            .frame(width: 50, height: 50)
            ControlCenterButton(label: "▼", isActive: activeButton == .arrowDown, width: 50, height: 30)
        }
    }
}

// MARK: - Config Tile

struct ConfigTile: View {
    let title: String
    let value: String
    var highlight: Bool = false
    var accentColor: Color = .cyan

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.system(size: 8, weight: .medium, design: .monospaced))
                .foregroundColor(Color(white: 0.4))
                .lineLimit(1)
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundColor(highlight ? accentColor : .white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(Color(white: 0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(highlight ? accentColor.opacity(0.4) : Color(white: 0.15), lineWidth: 1)
                )
        )
    }
}

struct ProfileButton: View {
    let index: Int
    let isCurrent: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(isCurrent ? Color.cyan.opacity(0.2) : Color(white: 0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(isCurrent ? Color.cyan : Color(white: 0.15), lineWidth: isCurrent ? 2 : 1)
                )
            Text("P\(index + 1)")
                .font(.system(size: 11, weight: isCurrent ? .bold : .medium, design: .monospaced))
                .foregroundColor(isCurrent ? .cyan : Color(white: 0.4))
        }
        .frame(width: 40, height: 35)
    }
}

struct EventLogRow: View {
    let event: ButtonEvent

    private var timeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss.SSS"
        return formatter.string(from: event.timestamp)
    }

    private var hexString: String {
        event.rawBytes.prefix(12).map { String(format: "%02x", $0) }.joined(separator: " ")
    }

    var body: some View {
        HStack(spacing: 8) {
            Text(timeString)
                .font(.system(size: 10, design: .monospaced))
                .foregroundColor(Color(white: 0.5))
            Text(event.button.rawValue)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(.red)
                .frame(width: 80, alignment: .leading)
            if let action = event.button.consumerAction {
                Text("-> \(action)")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.orange)
            }
            Spacer()
            Text(hexString)
                .font(.system(size: 9, design: .monospaced))
                .foregroundColor(Color(white: 0.4))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 2)
    }
}

// MARK: - Battery View

struct BatteryView: View {
    let level: Int
    let isCharging: Bool

    private var color: Color {
        if isCharging { return .green }
        if level <= 15 { return .red }
        if level <= 30 { return .orange }
        return .green
    }

    var body: some View {
        HStack(spacing: 4) {
            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: 3)
                    .stroke(Color(white: 0.4), lineWidth: 1)
                    .frame(width: 28, height: 12)
                RoundedRectangle(cornerRadius: 2)
                    .fill(color)
                    .frame(width: max(2, CGFloat(level) / 100.0 * 24), height: 8)
                    .padding(.leading, 2)
                // Tip
                RoundedRectangle(cornerRadius: 1)
                    .fill(Color(white: 0.4))
                    .frame(width: 2, height: 6)
                    .offset(x: 29)
            }
            Text(isCharging ? "CHG" : "\(level)%")
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .foregroundColor(color)
        }
    }
}

// MARK: - Main Content View

struct ContentView: View {
    @StateObject private var hidManager = HIDManager()

    private var config: DeviceConfig { hidManager.deviceConfig }

    private var lodString: String {
        switch config.lodValue {
        case 0: return "Low"
        case 1: return "High"
        case 2: return "Med"
        default: return "\(config.lodValue)"
        }
    }

    private var sleepString: String {
        if config.sleepTime <= 0 { return "OFF" }
        if config.sleepTime < 60 { return "\(config.sleepTime)s" }
        return "\(config.sleepTime / 60)m"
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Circle()
                    .fill(hidManager.isConnected ? Color.green : Color.red)
                    .frame(width: 8, height: 8)
                Text("WRAITH CONTROLLER")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                Spacer()

                if hidManager.isConnected {
                    BatteryView(level: config.batteryLevel, isCharging: config.isCharging)
                        .padding(.trailing, 8)
                    Text("W1 Freestyle")
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(Color(white: 0.5))
                }

                Button(action: { hidManager.reconnect() }) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12))
                        .foregroundColor(Color(white: 0.6))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(white: 0.08))

            if let error = hidManager.errorMessage {
                Text(error)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(.red)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.red.opacity(0.1))
            }

            // Debug: Raw hex display
            if !hidManager.rawHex.isEmpty {
                Text(hidManager.rawHex)
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.yellow)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(white: 0.04))
            }

            // Device Config Panel
            VStack(spacing: 8) {
                // Row 1: Main settings
                HStack(spacing: 6) {
                    ConfigTile(title: "POLL RATE", value: config.pollingRateHz > 0 ? "\(config.pollingRateHz) Hz" : "--", highlight: true)
                    ConfigTile(title: "DPI SLOT", value: "Slot \(config.currentDPIIndex + 1)", highlight: true, accentColor: .orange)
                    ConfigTile(title: "LOD", value: lodString)
                    ConfigTile(title: "SLEEP", value: sleepString)
                    ConfigTile(title: "DEBOUNCE", value: "\(config.debounceTime)ms")
                }

                // Row 2: Toggles + Profile
                HStack(spacing: 8) {
                    // Toggle indicators
                    HStack(spacing: 6) {
                        togglePill("ANGLE SNAP", isOn: config.angleSnap)
                        togglePill("MOTION SYNC", isOn: config.motionSync)
                        togglePill("RIPPLE", isOn: config.rippleEffect)
                    }

                    Spacer()

                    // Profile buttons
                    HStack(spacing: 4) {
                        Text("PROFILE")
                            .font(.system(size: 8, weight: .medium, design: .monospaced))
                            .foregroundColor(Color(white: 0.4))
                        ForEach(0..<4, id: \.self) { idx in
                            ProfileButton(index: idx, isCurrent: idx == config.currentProfile)
                        }
                    }
                }
            }
            .padding(12)
            .background(Color(white: 0.06))

            Rectangle().fill(Color(white: 0.2)).frame(height: 1)

            // Control Center Buttons
            VStack(spacing: 12) {
                // Display area
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(white: 0.05))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color(white: 0.2), lineWidth: 1)
                        )
                    VStack(spacing: 4) {
                        Text("W R A I T H.")
                            .font(.system(size: 16, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(white: 0.3))
                        if let active = hidManager.activeButton {
                            Text(active.rawValue)
                                .font(.system(size: 22, weight: .heavy, design: .monospaced))
                                .foregroundColor(.red)
                                .transition(.scale.combined(with: .opacity))
                        } else {
                            Text("Press a button")
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(Color(white: 0.25))
                        }
                    }
                    .animation(.easeInOut(duration: 0.15), value: hidManager.activeButton)
                }
                .frame(height: 60)

                // Button row
                HStack(spacing: 6) {
                    VStack(spacing: 4) {
                        ControlCenterButton(label: "START", isActive: hidManager.activeButton == .start, width: 65, height: 30)
                        ControlCenterButton(label: "STOP", isActive: hidManager.activeButton == .stop, width: 65, height: 30)
                    }
                    ControlCenterButton(label: "MACRO", isActive: hidManager.activeButton == .macro, width: 65, height: 64)

                    VStack(spacing: 4) {
                        internalBtn("DPI +", w: 50, h: 30)
                        internalBtn("DPI -", w: 50, h: 30)
                    }
                    VStack(spacing: 4) {
                        internalBtn("EDIT", w: 50, h: 30)
                        internalBtn("SAVE", w: 50, h: 30)
                    }

                    Spacer()

                    SliderView(activeButton: hidManager.activeButton)
                    ControlCenterButton(label: "MUTE", isActive: hidManager.activeButton == .mute, width: 50, height: 64)
                }
            }
            .padding(12)
            .background(Color(white: 0.1))

            Rectangle().fill(Color(white: 0.2)).frame(height: 1)

            // Event log
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("EVENT LOG")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(white: 0.4))
                    Spacer()
                    Text("\(hidManager.eventLog.count) events")
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundColor(Color(white: 0.3))
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)

                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(Array(hidManager.eventLog.enumerated()), id: \.offset) { _, event in
                            EventLogRow(event: event)
                            Rectangle().fill(Color(white: 0.12)).frame(height: 1)
                        }
                    }
                }
            }
            .frame(maxHeight: 150)
            .background(Color(white: 0.06))
        }
        .frame(width: 580, height: 600)
        .background(Color(white: 0.1))
        .preferredColorScheme(.dark)
    }

    private func internalBtn(_ label: String, w: CGFloat, h: CGFloat) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(Color(white: 0.08))
                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(white: 0.15), lineWidth: 1))
            Text(label)
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundColor(Color(white: 0.3))
        }
        .frame(width: w, height: h)
    }

    private func togglePill(_ label: String, isOn: Bool) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(isOn ? Color.green : Color(white: 0.3))
                .frame(width: 6, height: 6)
            Text(label)
                .font(.system(size: 8, weight: .medium, design: .monospaced))
                .foregroundColor(isOn ? .green : Color(white: 0.4))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(isOn ? Color.green.opacity(0.1) : Color(white: 0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(isOn ? Color.green.opacity(0.3) : Color(white: 0.12), lineWidth: 1)
                )
        )
    }
}

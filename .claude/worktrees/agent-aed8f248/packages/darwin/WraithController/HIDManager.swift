import Foundation
import IOKit
import IOKit.hid
import Combine

enum WraithButton: String, CaseIterable, Identifiable {
    case start = "START"
    case stop = "STOP"
    case macro = "MACRO"
    case arrowUp = "ARROW UP"
    case arrowDown = "ARROW DOWN"
    case mute = "MUTE"

    var id: String { rawValue }

    var bitMask: UInt8 {
        switch self {
        case .start: return 0x01
        case .stop: return 0x00
        case .macro: return 0x80
        case .arrowUp: return 0x08
        case .arrowDown: return 0x04
        case .mute: return 0x10
        }
    }

    static func from(byte: UInt8) -> WraithButton? {
        switch byte {
        case 0x01: return .start
        case 0x00: return .stop
        case 0x80: return .macro
        case 0x08: return .arrowUp
        case 0x04: return .arrowDown
        case 0x10: return .mute
        default: return nil
        }
    }

    var consumerAction: String? {
        switch self {
        case .arrowUp: return "Volume Up"
        case .arrowDown: return "Volume Down"
        case .mute: return "Mute Toggle"
        default: return nil
        }
    }
}

struct ButtonEvent {
    let button: WraithButton
    let timestamp: Date
    let rawBytes: [UInt8]
}

class HIDManager: ObservableObject {
    @Published var activeButton: WraithButton? = nil
    @Published var lastEvent: ButtonEvent? = nil
    @Published var eventLog: [ButtonEvent] = []
    @Published var isConnected: Bool = false
    @Published var errorMessage: String? = nil
    @Published var deviceConfig: DeviceConfig = DeviceConfig()
    @Published var rawHex: String = ""

    private var manager: IOHIDManager?
    private var reportBuffers: [UnsafeMutablePointer<UInt8>] = []
    private let vendorID: Int = 0x093a
    private let productID: Int = 0x522c

    private var clearTimer: Timer?

    // Polling rate map: code -> Hz
    private let pollingRateMap: [UInt8: Int] = [
        3: 125, 2: 250, 1: 500, 0: 1000, 6: 2000, 5: 4000, 4: 8000
    ]

    init() {
        setupHID()
    }

    deinit {
        for buf in reportBuffers {
            buf.deallocate()
        }
        if let manager = manager {
            IOHIDManagerClose(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        }
    }

    func setupHID() {
        manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
        guard let manager = manager else {
            errorMessage = "Failed to create HID Manager"
            return
        }

        let matchingDict: [String: Any] = [
            kIOHIDVendorIDKey: vendorID,
            kIOHIDProductIDKey: productID
        ]
        IOHIDManagerSetDeviceMatching(manager, matchingDict as CFDictionary)

        let result = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        guard result == kIOReturnSuccess else {
            errorMessage = "Failed to open HID Manager (code: \(result)). Grant Input Monitoring permission in System Settings > Privacy & Security > Input Monitoring."
            return
        }

        guard let deviceSet = IOHIDManagerCopyDevices(manager) as? Set<IOHIDDevice>, !deviceSet.isEmpty else {
            errorMessage = "No W1 Freestyle device found. Make sure the dongle is plugged in."
            return
        }

        isConnected = true

        let selfPtr = Unmanaged.passUnretained(self).toOpaque()

        for device in deviceSet {
            let bufferSize = 256
            let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
            reportBuffers.append(buffer)

            IOHIDDeviceRegisterInputReportCallback(device, buffer, bufferSize, { context, result, sender, type, reportID, report, reportLength in
                guard let context = context else { return }
                let mgr = Unmanaged<HIDManager>.fromOpaque(context).takeUnretainedValue()
                let bytes = Array(UnsafeBufferPointer(start: report, count: reportLength))
                mgr.handleReport(reportID: Int32(reportID), bytes: bytes)
            }, selfPtr)
        }

        IOHIDManagerScheduleWithRunLoop(manager, CFRunLoopGetMain(), CFRunLoopMode.defaultMode.rawValue)
    }

    private func handleReport(reportID: Int32, bytes: [UInt8]) {
        // ReportID:9 vendor reports from 0xFF05 interface
        // Raw bytes layout (byte[0] is reportID = 0x09):
        //   [0]  = 0x09 (report ID)
        //   [1]  = De[0]: Battery (bit7=charging, bits0-6=level)
        //   [2]  = De[1]: high nibble=DPI index, low nibble=polling rate code
        //   [3]  = De[2]: bits7-6=profile index, bits5-0=debounce time (ms)
        //   [4]  = De[3]: bits7-4=sleep time high nibble
        //   [5]  = De[4]: (unknown / padding)
        //   [6]  = De[5]: sleep time low byte -> sleep = (De[3]>>4)*256 + De[5]
        //   [7]  = De[6]: bits7-4=LOD, bit2=ripple, bit1=angleSnap, bit0=motionSync
        //   [8]  = De[7]: 0x5A = button press indicator
        //   [9]  = De[8]: button bitmask
        guard reportID == 9, bytes.count >= 10 else { return }

        // Parse device state from every report
        let batteryByte = bytes[1]
        let dpiPollByte = bytes[2]
        let profileDebByte = bytes[3]
        let sleepHighByte = bytes[4]
        let sleepLowByte = bytes[6]
        let sensorByte = bytes[7]

        let isCharging = (batteryByte & 0x80) != 0
        let batteryLevel = Int(batteryByte & 0x7F)
        let dpiIndex = Int((dpiPollByte >> 4) & 0x0F)
        let pollCode = dpiPollByte & 0x0F
        let pollingHz = pollingRateMap[pollCode] ?? 0
        let profileIndex = Int((profileDebByte >> 6) & 0x03)
        let debounceTime = Int(profileDebByte & 0x3F)
        let sleepHigh = Int((sleepHighByte >> 4) & 0x0F)
        let sleepTime = sleepHigh * 256 + Int(sleepLowByte)
        let lodValue = Int((sensorByte >> 4) & 0x0F)
        let ripple = (sensorByte & 0x04) != 0
        let angleSnap = (sensorByte & 0x02) != 0
        let motionSync = (sensorByte & 0x01) != 0

        // Check for button press
        let pressIndicator = bytes[8]
        let buttonByte = bytes[9]
        var pressedButton: WraithButton? = nil

        if pressIndicator == 0x5a {
            pressedButton = WraithButton.from(byte: buttonByte)
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            // Update device config
            self.deviceConfig.batteryLevel = batteryLevel
            self.deviceConfig.isCharging = isCharging
            self.deviceConfig.currentDPIIndex = dpiIndex
            self.deviceConfig.pollingRateCode = pollCode
            self.deviceConfig.pollingRateHz = pollingHz
            self.deviceConfig.currentProfile = profileIndex
            self.deviceConfig.debounceTime = debounceTime
            self.deviceConfig.sleepTime = sleepTime
            self.deviceConfig.lodValue = lodValue
            self.deviceConfig.rippleEffect = ripple
            self.deviceConfig.angleSnap = angleSnap
            self.deviceConfig.motionSync = motionSync

            // Debug: show raw bytes with labeled positions
            let hex = bytes.prefix(10).enumerated().map { i, b in
                String(format: "[%d]%02x", i, b)
            }.joined(separator: " ")
            self.rawHex = hex

            // Handle button press
            if let button = pressedButton {
                let event = ButtonEvent(button: button, timestamp: Date(), rawBytes: bytes)
                self.activeButton = button
                self.lastEvent = event
                self.eventLog.insert(event, at: 0)
                if self.eventLog.count > 50 {
                    self.eventLog.removeLast()
                }

                self.clearTimer?.invalidate()
                self.clearTimer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: false) { _ in
                    self.activeButton = nil
                }
            }
        }
    }

    func reconnect() {
        for buf in reportBuffers {
            buf.deallocate()
        }
        reportBuffers.removeAll()
        if let manager = manager {
            IOHIDManagerClose(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        }
        manager = nil
        isConnected = false
        errorMessage = nil
        eventLog.removeAll()
        activeButton = nil
        lastEvent = nil
        deviceConfig = DeviceConfig()
        setupHID()
    }
}

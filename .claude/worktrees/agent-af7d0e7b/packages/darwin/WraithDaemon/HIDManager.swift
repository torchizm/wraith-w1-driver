import Foundation
import IOKit
import IOKit.hid

protocol HIDManagerDelegate: AnyObject {
    func hidManagerDidConnect()
    func hidManagerDidDisconnect()
    func hidManagerDidUpdateState(_ state: DeviceState)
    func hidManagerDidPressButton(_ button: CCButton)
}

class HIDManager {
    weak var delegate: HIDManagerDelegate?

    private(set) var state = DeviceState()
    private(set) var isConnected = false

    private var manager: IOHIDManager?
    private var reportBuffers: [UnsafeMutablePointer<UInt8>] = []
    private let vendorID: Int = 0x093a
    private let productID: Int = 0x522c

    private let pollingRateMap: [UInt8: Int] = [
        3: 125, 2: 250, 1: 500, 0: 1000, 6: 2000, 5: 4000, 4: 8000
    ]

    func start() {
        manager = IOHIDManagerCreate(kCFAllocatorDefault, IOOptionBits(kIOHIDOptionsTypeNone))
        guard let manager = manager else { return }

        let matchingDict: [String: Any] = [
            kIOHIDVendorIDKey: vendorID,
            kIOHIDProductIDKey: productID
        ]
        IOHIDManagerSetDeviceMatching(manager, matchingDict as CFDictionary)

        let result = IOHIDManagerOpen(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        guard result == kIOReturnSuccess else {
            print("[HID] Failed to open HID Manager (code: \(result))")
            print("[HID] Grant Input Monitoring permission in System Settings > Privacy & Security > Input Monitoring")
            return
        }

        guard let deviceSet = IOHIDManagerCopyDevices(manager) as? Set<IOHIDDevice>, !deviceSet.isEmpty else {
            print("[HID] No W1 Freestyle device found. Starting monitor for plug-in...")
            scheduleReconnect()
            return
        }

        isConnected = true
        delegate?.hidManagerDidConnect()
        print("[HID] W1 Freestyle connected (\(deviceSet.count) interfaces)")

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

    func stop() {
        for buf in reportBuffers {
            buf.deallocate()
        }
        reportBuffers.removeAll()
        if let manager = manager {
            IOHIDManagerClose(manager, IOOptionBits(kIOHIDOptionsTypeNone))
        }
        manager = nil
        isConnected = false
    }

    private func scheduleReconnect() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            guard let self = self, !self.isConnected else { return }
            self.stop()
            self.start()
        }
    }

    private func handleReport(reportID: Int32, bytes: [UInt8]) {
        guard reportID == 9, bytes.count >= 10 else { return }

        let batteryByte = bytes[1]
        let dpiPollByte = bytes[2]
        let profileDebByte = bytes[3]
        let sleepHighByte = bytes[4]
        let sleepLowByte = bytes[6]
        let sensorByte = bytes[7]

        let newState = DeviceState(
            batteryLevel: Int(batteryByte & 0x7F),
            isCharging: (batteryByte & 0x80) != 0,
            currentDPIIndex: Int((dpiPollByte >> 4) & 0x0F),
            pollingRateCode: dpiPollByte & 0x0F,
            pollingRateHz: pollingRateMap[dpiPollByte & 0x0F] ?? 0,
            currentProfile: Int((profileDebByte >> 6) & 0x03),
            debounceTime: Int(profileDebByte & 0x3F),
            sleepTime: Int((sleepHighByte >> 4) & 0x0F) * 256 + Int(sleepLowByte),
            lodValue: Int((sensorByte >> 4) & 0x0F),
            rippleEffect: (sensorByte & 0x04) != 0,
            angleSnap: (sensorByte & 0x02) != 0,
            motionSync: (sensorByte & 0x01) != 0
        )

        if newState != state {
            state = newState
            delegate?.hidManagerDidUpdateState(state)
        }

        // Button press detection
        if bytes[8] == 0x5a {
            if let button = CCButton.from(byte: bytes[9]) {
                delegate?.hidManagerDidPressButton(button)
            }
        }
    }
}

import Foundation

// MARK: - Protocol Constants

struct WraithProtocol {
    static let pollingRateMap: [UInt8: Int] = [
        3: 125, 2: 250, 1: 500, 0: 1000, 6: 2000, 5: 4000, 4: 8000
    ]

    static let performanceModes: [UInt8: String] = [
        0: "Power Saving", 1: "Standard", 2: "Gaming"
    ]
}

// MARK: - Device Configuration Model

struct DeviceConfig: Equatable {
    var batteryLevel: Int = 0
    var isCharging: Bool = false
    var currentDPIIndex: Int = 0
    var pollingRateCode: UInt8 = 0
    var pollingRateHz: Int = 0
    var currentProfile: Int = 0       // 0-3 for P1-P4
    var debounceTime: Int = 0         // ms
    var sleepTime: Int = 0            // seconds
    var lodValue: Int = 0             // 0, 1, 2
    var rippleEffect: Bool = false
    var angleSnap: Bool = false
    var motionSync: Bool = false
}

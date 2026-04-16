import Foundation

// Polling rate map
let pollingRateMap: [UInt8: Int] = [
    3: 125, 2: 250, 1: 500, 0: 1000, 6: 2000, 5: 4000, 4: 8000
]

// Control center button bitmasks
enum CCButton: String, Codable {
    case start = "START"
    case stop = "STOP"
    case macro = "MACRO"
    case arrowUp = "ARROW_UP"
    case arrowDown = "ARROW_DOWN"
    case mute = "MUTE"

    static func from(byte: UInt8) -> CCButton? {
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
}

// Device state parsed from input reports
struct DeviceState: Codable, Equatable {
    var batteryLevel: Int = 0
    var isCharging: Bool = false
    var currentDPIIndex: Int = 0
    var pollingRateCode: UInt8 = 0
    var pollingRateHz: Int = 0
    var currentProfile: Int = 0
    var debounceTime: Int = 0
    var sleepTime: Int = 0
    var lodValue: Int = 0
    var rippleEffect: Bool = false
    var angleSnap: Bool = false
    var motionSync: Bool = false
}

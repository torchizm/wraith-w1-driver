// Input report parser - ported from HIDManager.swift:133-168
// Parses vendor input reports (ReportID 9, 33 bytes from 0xFF05 interface)

import { POLLING_RATE_MAP, CC_BUTTONS } from './constants'

export interface DeviceState {
  batteryLevel: number      // 0-100
  isCharging: boolean
  currentDPIIndex: number   // 0-based
  pollingRateCode: number
  pollingRateHz: number
  currentProfile: number    // 0-3 (P1-P4)
  debounceTime: number      // ms
  sleepTime: number         // seconds
  lodValue: number          // 2=Low(0.7mm), 0=Medium(1mm), 1=High(2mm)
  rippleEffect: boolean
  angleSnap: boolean
  motionSync: boolean
  dpiLevels: number[]       // DPI values per slot (read via feature reports)
  performanceMode: number   // 0=power saving, 1=standard, 2=gaming
}

export interface ButtonPress {
  button: string            // e.g. 'START', 'MACRO'
  bitmask: number
  timestamp: number
}

export interface ParsedReport {
  state: DeviceState
  buttonPress: ButtonPress | null
  rawBytes: number[]
}

/**
 * Parse a vendor input report from the W1 Freestyle.
 * In WebHID, event.data does NOT include the report ID byte,
 * so data[0] = De[0] = battery byte.
 *
 * Byte layout (De[] = WebHID data bytes):
 *   De[0]: Battery (bit7=charging, bits0-6=level 0-100)
 *   De[1]: high nibble=DPI index, low nibble=polling rate code
 *   De[2]: bits7-6=profile index (0-3), bits5-0=debounce time (ms)
 *   De[3]: bits7-4=sleep time high nibble
 *   De[4]: (padding/unknown)
 *   De[5]: sleep time low byte -> sleep = (De[3]>>4)*256 + De[5]
 *   De[6]: bits7-4=LOD, bit2=ripple, bit1=angleSnap, bit0=motionSync
 *   De[7]: 0x5A = button press indicator
 *   De[8]: button bitmask
 */
export function parseInputReport(data: DataView): ParsedReport {
  const bytes: number[] = []
  for (let i = 0; i < data.byteLength; i++) {
    bytes.push(data.getUint8(i))
  }

  const batteryByte = bytes[0]
  const dpiPollByte = bytes[1]
  const profileDebByte = bytes[2]
  const sleepHighByte = bytes[3]
  const sleepLowByte = bytes[5]
  const sensorByte = bytes[6]

  const state: DeviceState = {
    batteryLevel: batteryByte & 0x7f,
    isCharging: (batteryByte & 0x80) !== 0,
    currentDPIIndex: (dpiPollByte >> 4) & 0x0f,
    pollingRateCode: dpiPollByte & 0x0f,
    pollingRateHz: POLLING_RATE_MAP[dpiPollByte & 0x0f] ?? 0,
    currentProfile: (profileDebByte >> 6) & 0x03,
    debounceTime: profileDebByte & 0x3f,
    sleepTime: ((sleepHighByte >> 4) & 0x0f) * 256 + sleepLowByte,
    lodValue: (sensorByte >> 4) & 0x0f,
    rippleEffect: (sensorByte & 0x04) !== 0,
    angleSnap: (sensorByte & 0x02) !== 0,
    motionSync: (sensorByte & 0x01) !== 0,
    dpiLevels: [],         // populated by feature report reads, not input reports
    performanceMode: 2,    // populated by feature report reads, not input reports
  }

  let buttonPress: ButtonPress | null = null
  if (bytes.length > 8 && bytes[7] === 0x5a) {
    const bitmask = bytes[8]
    const name = CC_BUTTONS[bitmask]
    if (name !== undefined) {
      buttonPress = { button: name, bitmask, timestamp: Date.now() }
    }
  }

  return { state, buttonPress, rawBytes: bytes }
}

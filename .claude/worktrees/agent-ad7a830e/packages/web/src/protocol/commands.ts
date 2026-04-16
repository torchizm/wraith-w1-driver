// Feature report command builders for writing device config
// All commands: sendFeatureReport(9, Uint8Array[8])

import { getCommandIDs, POLLING_RATE_REVERSE, PARAM, TIMING_PARAM } from './constants'

function makePayload(...bytes: number[]): Uint8Array {
  const buf = new Uint8Array(8)
  for (let i = 0; i < Math.min(bytes.length, 8); i++) {
    buf[i] = bytes[i]
  }
  return buf
}

// Device identification
export function cmdIdentify(): Uint8Array {
  return makePayload(143, 0)
}

export interface IdentifyResult {
  mouseType: string      // 'type3' | 'type5' | 'unknown'
  customerCode: boolean
  sensorType: number     // 0 or 1
  connectionMode: string // '1k' | '8k'
  firmwareValid: boolean
  maxDPI: number
}

export function parseIdentifyResponse(data: DataView): IdentifyResult | null {
  if (data.byteLength < 8) return null
  const bytes: number[] = []
  for (let i = 0; i < data.byteLength; i++) bytes.push(data.getUint8(i))

  // Response format: [reportId=9, cmd=143, firmware, mouseType, connMode, ?, sensor, ?, customerCode]
  //                          [0]      [1]     [2]       [3]        [4]   [5]  [6]  [7]       [8]
  // customerCode is at byte[8]: macOS byte[7] maps to buf[8] after the report-ID prefix.
  if (bytes[0] !== 9 || bytes[1] !== 143) return null

  const firmwareValid = bytes[2] === 1
  const mouseTypeRaw = bytes[3]
  const mouseType = mouseTypeRaw === 20 ? 'type3' : mouseTypeRaw === 18 ? 'type5' : `unknown(${mouseTypeRaw})`
  const connMode = bytes[4] === 1 ? '1k' : bytes[4] === 2 ? '8k' : `unknown(${bytes[4]})`
  const sensorType = bytes[6] === 241 ? 1 : 0
  const customerCode = bytes[8] === 64
  const maxDPI = sensorType === 1 ? 30000 : 26000

  return { mouseType, customerCode, sensorType, connectionMode: connMode, firmwareValid, maxDPI }
}

// Polling rate
export function cmdSetPollingRate(isCustomer: boolean, hz: number): Uint8Array {
  const cmd = getCommandIDs(isCustomer)
  const code = POLLING_RATE_REVERSE[hz]
  if (code === undefined) throw new Error(`Invalid polling rate: ${hz}`)
  return makePayload(cmd.setPollingRate, code)
}

export function cmdReadPollingRate(isCustomer: boolean): Uint8Array {
  return makePayload(getCommandIDs(isCustomer).readPollingRate, 0)
}

// DPI
export function cmdSetDPIValue(isCustomer: boolean, slot: number, dpiValue: number): Uint8Array {
  const cmd = getCommandIDs(isCustomer)
  const encoded = Math.round(dpiValue / 50 - 1)
  return makePayload(cmd.setDPIValue, slot, encoded & 0xff, (encoded >> 8) & 0xff)
}

export function cmdSetDPIConfig(isCustomer: boolean, totalLevels: number, currentIndex: number): Uint8Array {
  const cmd = getCommandIDs(isCustomer)
  return makePayload(cmd.setDPIConfig, totalLevels, currentIndex)
}

export function cmdReadDPIConfig(isCustomer: boolean): Uint8Array {
  return makePayload(getCommandIDs(isCustomer).readDPIConfig, 0)
}

export function cmdReadDPIValue(isCustomer: boolean, slot: number): Uint8Array {
  return makePayload(getCommandIDs(isCustomer).readDPIValue, slot)
}

export function parseDPIConfigResponse(data: DataView): { totalLevels: number; currentIndex: number } | null {
  if (data.byteLength < 4) return null
  const bytes: number[] = []
  for (let i = 0; i < data.byteLength; i++) bytes.push(data.getUint8(i))
  if (bytes[0] !== 9) return null
  return { totalLevels: bytes[2], currentIndex: bytes[3] }
}

export function parseDPIValueResponse(data: DataView): { slot: number; dpiValue: number } | null {
  if (data.byteLength < 5) return null
  const bytes: number[] = []
  for (let i = 0; i < data.byteLength; i++) bytes.push(data.getUint8(i))
  if (bytes[0] !== 9) return null
  const rawValue = (bytes[4] << 8) | bytes[3]
  return { slot: bytes[2], dpiValue: (rawValue + 1) * 50 }
}

// Sensor parameters (LOD, Angle Snap, Motion Sync, Ripple, Performance Mode)
export function cmdSetSensorParam(isCustomer: boolean, paramId: number, value: number): Uint8Array {
  return makePayload(getCommandIDs(isCustomer).setSensorMode, paramId, value)
}

export function cmdReadSensorParam(isCustomer: boolean, paramId: number): Uint8Array {
  return makePayload(getCommandIDs(isCustomer).readSensorSetting, paramId)
}

// Convenience
export const cmdSetLOD = (c: boolean, v: number) => cmdSetSensorParam(c, PARAM.SILENT_ALTITUDE, v)
export const cmdSetAngleSnap = (c: boolean, on: boolean) => cmdSetSensorParam(c, PARAM.LINEAR_CORRECTION, on ? 1 : 0)
export const cmdSetMotionSync = (c: boolean, on: boolean) => cmdSetSensorParam(c, PARAM.MOTION_SYNC, on ? 1 : 0)
export const cmdSetRipple = (c: boolean, on: boolean) => cmdSetSensorParam(c, PARAM.WAVE_CONTROL, on ? 1 : 0)
export const cmdSetPerfMode = (c: boolean, mode: number) => cmdSetSensorParam(c, PARAM.PERF_MODE, mode)

// Debounce and Sleep
export function cmdSetDebounce(isCustomer: boolean, ms: number): Uint8Array {
  return makePayload(getCommandIDs(isCustomer).setParameter, TIMING_PARAM.KEY_DEBOUNCING, ms)
}

export function cmdSetSleepTime(isCustomer: boolean, seconds: number): Uint8Array {
  return makePayload(
    getCommandIDs(isCustomer).setParameter,
    TIMING_PARAM.DEEP_SLEEP,
    seconds & 0xff,
    (seconds >> 8) & 0xff,
  )
}

export function cmdReadDebounce(isCustomer: boolean): Uint8Array {
  return makePayload(getCommandIDs(isCustomer).readDebounce, TIMING_PARAM.KEY_DEBOUNCING)
}

export function cmdReadSleepTime(isCustomer: boolean): Uint8Array {
  return makePayload(getCommandIDs(isCustomer).readDebounce, TIMING_PARAM.DEEP_SLEEP)
}

// Key/Button mapping
export function cmdSetKeyFunction(buttonId: number, functionValue: number): Uint8Array {
  return makePayload(
    6,
    buttonId,
    functionValue & 0xff,
    (functionValue >> 8) & 0xff,
    (functionValue >> 16) & 0xff,
    (functionValue >> 24) & 0xff,
  )
}

export function cmdReadKeyFunction(buttonId: number): Uint8Array {
  return makePayload(134, buttonId)
}

export function parseKeyFunctionResponse(data: DataView): { buttonId: number; functionValue: number } | null {
  if (data.byteLength < 7) return null
  const bytes: number[] = []
  for (let i = 0; i < data.byteLength; i++) bytes.push(data.getUint8(i))
  if (bytes[0] !== 9) return null
  const functionValue = bytes[3] | (bytes[4] << 8) | (bytes[5] << 16) | (bytes[6] << 24)
  return { buttonId: bytes[2], functionValue: functionValue >>> 0 }
}

// Profile switching
export function cmdSwitchProfile(isCustomer: boolean, profileIndex: number): Uint8Array {
  return makePayload(getCommandIDs(isCustomer).switchProfile, 6, profileIndex & 0xff, (profileIndex >> 8) & 0xff)
}

// Macro upload
export function cmdMacroHeader(chunkCount: number, chunkIndex: number, chunkSize: number, buttonId: number): Uint8Array {
  return makePayload(7, chunkCount, chunkIndex, chunkSize, buttonId & 0xff)
}

// JavaScript event.code -> HID Usage ID mapping
export const JS_KEY_TO_HID: Record<string, number> = {
  // Letters
  KeyA: 0x04, KeyB: 0x05, KeyC: 0x06, KeyD: 0x07, KeyE: 0x08, KeyF: 0x09,
  KeyG: 0x0a, KeyH: 0x0b, KeyI: 0x0c, KeyJ: 0x0d, KeyK: 0x0e, KeyL: 0x0f,
  KeyM: 0x10, KeyN: 0x11, KeyO: 0x12, KeyP: 0x13, KeyQ: 0x14, KeyR: 0x15,
  KeyS: 0x16, KeyT: 0x17, KeyU: 0x18, KeyV: 0x19, KeyW: 0x1a, KeyX: 0x1b,
  KeyY: 0x1c, KeyZ: 0x1d,
  // Digits
  Digit1: 0x1e, Digit2: 0x1f, Digit3: 0x20, Digit4: 0x21, Digit5: 0x22,
  Digit6: 0x23, Digit7: 0x24, Digit8: 0x25, Digit9: 0x26, Digit0: 0x27,
  // Control keys
  Enter: 0x28, Escape: 0x29, Backspace: 0x2a, Tab: 0x2b, Space: 0x2c,
  // Symbols
  Minus: 0x2d, Equal: 0x2e, BracketLeft: 0x2f, BracketRight: 0x30,
  Backslash: 0x31, Semicolon: 0x33, Quote: 0x34, Backquote: 0x35,
  Comma: 0x36, Period: 0x37, Slash: 0x38,
  // Lock keys
  CapsLock: 0x39, ScrollLock: 0x47, NumLock: 0x53,
  // Function keys
  F1: 0x3a, F2: 0x3b, F3: 0x3c, F4: 0x3d, F5: 0x3e, F6: 0x3f,
  F7: 0x40, F8: 0x41, F9: 0x42, F10: 0x43, F11: 0x44, F12: 0x45,
  // Navigation
  PrintScreen: 0x46, Pause: 0x48, Insert: 0x49, Home: 0x4a,
  PageUp: 0x4b, Delete: 0x4c, End: 0x4d, PageDown: 0x4e,
  ArrowRight: 0x4f, ArrowLeft: 0x50, ArrowDown: 0x51, ArrowUp: 0x52,
  // Numpad
  NumpadDivide: 0x54, NumpadMultiply: 0x55, NumpadSubtract: 0x56,
  NumpadAdd: 0x57, NumpadEnter: 0x58,
  Numpad1: 0x59, Numpad2: 0x5a, Numpad3: 0x5b, Numpad4: 0x5c,
  Numpad5: 0x5d, Numpad6: 0x5e, Numpad7: 0x5f, Numpad8: 0x60,
  Numpad9: 0x61, Numpad0: 0x62, NumpadDecimal: 0x63,
  // Modifiers (as standalone keys)
  ShiftLeft: 0xe1, ShiftRight: 0xe5, ControlLeft: 0xe0, ControlRight: 0xe4,
  AltLeft: 0xe2, AltRight: 0xe6, MetaLeft: 0xe3, MetaRight: 0xe7,
}

// Modifier bit flags for HID modifier byte
const MACRO_MODIFIER_BITS: Record<string, number> = {
  ControlLeft: 0x01, ShiftLeft: 0x02, AltLeft: 0x04, MetaLeft: 0x08,
  ControlRight: 0x10, ShiftRight: 0x20, AltRight: 0x40, MetaRight: 0x80,
}

/**
 * Encode recorded keystrokes into 32-byte chunks for macro upload.
 * Each keystroke = [keyCode, modifiers, delayLow, delayHigh] = 4 bytes.
 * 8 keystrokes per 32-byte chunk, max 10 chunks = 80 keystrokes.
 */
export function encodeMacro(keystrokes: { code: string; delay: number }[]): Uint8Array[] {
  const MAX_KEYSTROKES = 80
  const CHUNK_SIZE = 32
  const KEYSTROKES_PER_CHUNK = 8

  const limited = keystrokes.slice(0, MAX_KEYSTROKES)
  const chunkCount = Math.ceil(limited.length / KEYSTROKES_PER_CHUNK)
  const chunks: Uint8Array[] = []

  for (let c = 0; c < chunkCount; c++) {
    const chunk = new Uint8Array(CHUNK_SIZE)
    for (let k = 0; k < KEYSTROKES_PER_CHUNK; k++) {
      const idx = c * KEYSTROKES_PER_CHUNK + k
      if (idx >= limited.length) break
      const ks = limited[idx]
      const hidCode = JS_KEY_TO_HID[ks.code] ?? 0
      const modBits = MACRO_MODIFIER_BITS[ks.code] ?? 0
      const delayMs = Math.min(Math.max(Math.round(ks.delay), 0), 0xffff)
      const offset = k * 4
      chunk[offset] = hidCode
      chunk[offset + 1] = modBits
      chunk[offset + 2] = delayMs & 0xff
      chunk[offset + 3] = (delayMs >> 8) & 0xff
    }
    chunks.push(chunk)
  }

  return chunks
}

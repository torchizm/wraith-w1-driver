// Wraith W1 HID Protocol Constants

export const VENDOR_ID = 0x093a
export const PRODUCT_ID_WIRELESS = 0x522c
export const PRODUCT_ID_WIRED = 0x622c
export const USAGE_PAGE_VENDOR = 0xff05
export const REPORT_ID = 9

// Polling rate: code <-> Hz
export const POLLING_RATE_MAP: Record<number, number> = {
  3: 125, 2: 250, 1: 500, 0: 1000, 6: 2000, 5: 4000, 4: 8000,
}
export const POLLING_RATE_REVERSE: Record<number, number> = {
  125: 3, 250: 2, 500: 1, 1000: 0, 2000: 6, 4000: 5, 8000: 4,
}

// Performance modes
export const PERF_MODES: Record<number, string> = {
  0: 'Power Saving', 1: 'Standard', 2: 'Gaming',
}

// Sensor parameter IDs
export const PARAM = {
  SILENT_ALTITUDE: 1,  // LOD: 2=0.7mm(Low), 0=1mm(Medium), 1=2mm(High)
  WAVE_CONTROL: 2,     // Ripple
  LINEAR_CORRECTION: 3, // Angle Snap
  MOTION_SYNC: 4,
  PERF_MODE: 5,
} as const

// Debounce/Sleep parameter IDs
export const TIMING_PARAM = {
  KEY_DEBOUNCING: 1,
  DEEP_SLEEP: 3,
} as const

// Valid sleep times (seconds)
export const SLEEP_TIMES = [10, 20, 30, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900]

// Button IDs for key mapping
export const BUTTON_IDS: Record<string, number> = {
  left: 0, right: 1, middle: 2, back: 3, forward: 4, dpi: 5,
}

// Default key function values (32-bit LE)
export const DEFAULT_KEY_FUNCTIONS: Record<string, number> = {
  'left-click': 0x00f00001,
  'right-click': 0x00f10001,
  'middle-click': 0x00f20001,
  'forward': 0x00f40001,
  'back': 0x00f30001,
  'dpi-cycle': 0x00030007,
  'disable': 0x00000000,
  'dpi-plus': 0x00010007,
  'dpi-minus': 0x00020007,
  'profile-switch': 0x0000f10a,
}

// Control center button bitmasks (byte[9] of vendor input report)
export const CC_BUTTONS: Record<number, string> = {
  0x01: 'START',
  0x00: 'STOP',
  0x80: 'MACRO',
  0x08: 'ARROW_UP',
  0x04: 'ARROW_DOWN',
  0x10: 'MUTE',
}

// Command IDs based on customerCode flag
export function getCommandIDs(isCustomer: boolean) {
  return {
    setPollingRate: isCustomer ? 1 : 13,
    setDPIValue: isCustomer ? 2 : 12,
    setDPIConfig: isCustomer ? 3 : 11,
    setSensorMode: isCustomer ? 4 : 10,
    setParameter: isCustomer ? 5 : 9,
    setKeyFunction: 6,
    sendMacroChunk: 7,

    readPollingRate: isCustomer ? 129 : 141,
    readDPIValue: isCustomer ? 130 : 140,
    readDPIConfig: isCustomer ? 131 : 139,
    readSensorSetting: isCustomer ? 132 : 138,
    readDebounce: isCustomer ? 133 : 137,
    readKeyFunction: 134,

    identify: 143,
    switchProfile: isCustomer ? 5 : 9,
  }
}

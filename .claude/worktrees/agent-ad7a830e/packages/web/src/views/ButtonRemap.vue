<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '../composables/useToast'
import {
  cmdReadKeyFunction, parseKeyFunctionResponse,
  cmdSetKeyFunction,
} from '../protocol/commands'
import { DEFAULT_KEY_FUNCTIONS } from '../protocol/constants'

const store = useDeviceStore()
const { t } = useI18n()
const { showToast } = useToast()
const savingButton = ref<number | null>(null)

// --- HID key code mapping ---
const HID_KEY_CODES: Record<string, number> = {
  KeyA: 0x04, KeyB: 0x05, KeyC: 0x06, KeyD: 0x07, KeyE: 0x08, KeyF: 0x09,
  KeyG: 0x0A, KeyH: 0x0B, KeyI: 0x0C, KeyJ: 0x0D, KeyK: 0x0E, KeyL: 0x0F,
  KeyM: 0x10, KeyN: 0x11, KeyO: 0x12, KeyP: 0x13, KeyQ: 0x14, KeyR: 0x15,
  KeyS: 0x16, KeyT: 0x17, KeyU: 0x18, KeyV: 0x19, KeyW: 0x1A, KeyX: 0x1B,
  KeyY: 0x1C, KeyZ: 0x1D,
  Digit1: 0x1E, Digit2: 0x1F, Digit3: 0x20, Digit4: 0x21, Digit5: 0x22,
  Digit6: 0x23, Digit7: 0x24, Digit8: 0x25, Digit9: 0x26, Digit0: 0x27,
  Enter: 0x28, Escape: 0x29, Backspace: 0x2A, Tab: 0x2B, Space: 0x2C,
  Minus: 0x2D, Equal: 0x2E, BracketLeft: 0x2F, BracketRight: 0x30,
  Backslash: 0x31, Semicolon: 0x33, Quote: 0x34, Backquote: 0x35,
  Comma: 0x36, Period: 0x37, Slash: 0x38,
  F1: 0x3A, F2: 0x3B, F3: 0x3C, F4: 0x3D, F5: 0x3E, F6: 0x3F,
  F7: 0x40, F8: 0x41, F9: 0x42, F10: 0x43, F11: 0x44, F12: 0x45,
  PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48,
  Insert: 0x49, Home: 0x4A, PageUp: 0x4B, Delete: 0x4C, End: 0x4D,
  PageDown: 0x4E, ArrowRight: 0x4F, ArrowLeft: 0x50, ArrowDown: 0x51,
  ArrowUp: 0x52,
}

const HID_KEY_NAMES: Record<number, string> = {}
for (const [code, hid] of Object.entries(HID_KEY_CODES)) {
  let name = code
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
  HID_KEY_NAMES[hid] = name
}

// --- Modifier bit helpers ---
const MODIFIER_BITS = { ctrl: 0x01, shift: 0x02, alt: 0x04, meta: 0x08 } as const

function encodeKeyboardCombo(modifiers: number, hidKeyCode: number): number {
  return ((0x00) | (modifiers << 8) | (hidKeyCode << 16) | (0x00 << 24)) >>> 0
}

function decodeKeyboardCombo(value: number): { modifiers: number; keyCode: number } | null {
  const byte0 = value & 0xFF
  const byte1 = (value >> 8) & 0xFF
  const byte2 = (value >> 16) & 0xFF
  if (byte0 !== 0) return null
  if (byte2 === 0) return null
  if (isKnownConstant(value)) return null
  return { modifiers: byte1, keyCode: byte2 }
}

function isKnownConstant(value: number): boolean {
  for (const v of Object.values(DEFAULT_KEY_FUNCTIONS)) {
    if (v === value) return true
  }
  return false
}

function isFireKeyValue(value: number): boolean {
  return value === 0x0219000A
}

function modifierString(mods: number): string {
  const parts: string[] = []
  if (mods & MODIFIER_BITS.ctrl) parts.push('Ctrl')
  if (mods & MODIFIER_BITS.shift) parts.push('Shift')
  if (mods & MODIFIER_BITS.alt) parts.push('Alt')
  if (mods & MODIFIER_BITS.meta) parts.push('Win')
  return parts.join('+')
}

function keyComboPartsFromValue(value: number): string[] | null {
  const decoded = decodeKeyboardCombo(value)
  if (!decoded) return null
  const parts: string[] = []
  if (decoded.modifiers & MODIFIER_BITS.ctrl) parts.push('Ctrl')
  if (decoded.modifiers & MODIFIER_BITS.shift) parts.push('Shift')
  if (decoded.modifiers & MODIFIER_BITS.alt) parts.push('Alt')
  if (decoded.modifiers & MODIFIER_BITS.meta) parts.push('Win')
  const keyName = HID_KEY_NAMES[decoded.keyCode]
  parts.push(keyName ?? `Key(0x${decoded.keyCode.toString(16)})`)
  return parts
}

function keyComboLabel(value: number): string | null {
  const decoded = decodeKeyboardCombo(value)
  if (!decoded) return null
  const parts: string[] = []
  const ms = modifierString(decoded.modifiers)
  if (ms) parts.push(ms)
  const keyName = HID_KEY_NAMES[decoded.keyCode]
  parts.push(keyName ?? `Key(0x${decoded.keyCode.toString(16)})`)
  return parts.join('+')
}

// --- Dangerous combo detection ---
const DANGEROUS_COMBOS: { mods: number; code: string; label: string }[] = [
  { mods: MODIFIER_BITS.meta, code: 'KeyQ', label: 'Cmd+Q' },
  { mods: MODIFIER_BITS.meta, code: 'KeyW', label: 'Cmd+W' },
  { mods: MODIFIER_BITS.ctrl, code: 'KeyQ', label: 'Ctrl+Q' },
  { mods: MODIFIER_BITS.ctrl, code: 'KeyW', label: 'Ctrl+W' },
  { mods: MODIFIER_BITS.ctrl | MODIFIER_BITS.alt, code: 'Delete', label: 'Ctrl+Alt+Delete' },
  { mods: MODIFIER_BITS.alt, code: 'F4', label: 'Alt+F4' },
]

function isDangerousCombo(modMask: number, code: string): string | null {
  for (const dc of DANGEROUS_COMBOS) {
    if (dc.mods === modMask && dc.code === code) return dc.label
  }
  return null
}

// --- Fire key state per button ---
interface FireKeyConfig {
  count: number
  intervalMs: number
}

const fireKeyConfigs = reactive<Record<number, FireKeyConfig>>({})

// --- Button config ---
interface ButtonConfig {
  id: string
  labelKey: string
  buttonId: number
  currentFunction: number
  currentLabel: string
  selectedAction: string
  capturedShortcut: string
  capturedValue: number
  isCapturing: boolean
  icon: string
}

const buttons = ref<ButtonConfig[]>([
  { id: 'left',    labelKey: 'buttons.btnLeft',    buttonId: 0, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'LMB' },
  { id: 'right',   labelKey: 'buttons.btnRight',   buttonId: 1, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'RMB' },
  { id: 'middle',  labelKey: 'buttons.btnMiddle',  buttonId: 2, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'MMB' },
  { id: 'back',    labelKey: 'buttons.btnBack',    buttonId: 3, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'M4' },
  { id: 'forward', labelKey: 'buttons.btnForward', buttonId: 4, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'M5' },
  { id: 'dpi',     labelKey: 'buttons.btnDpi',     buttonId: 5, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'DPI' },
])

// --- Selected button for config panel ---
const selectedButtonId = ref<string | null>(null)
const selectedButton = computed(() => buttons.value.find(b => b.id === selectedButtonId.value) ?? null)

function selectButton(id: string) {
  selectedButtonId.value = selectedButtonId.value === id ? null : id
}

// --- Modal capture state ---
const capturingButton = ref<ButtonConfig | null>(null)
const liveModifiers = reactive({ ctrl: false, shift: false, alt: false, meta: false })
const liveKey = ref<string | null>(null)
const dangerousWarning = ref<string | null>(null)

const isModalOpen = computed(() => capturingButton.value !== null)

const liveKeyParts = computed<string[]>(() => {
  const parts: string[] = []
  if (liveModifiers.ctrl) parts.push('Ctrl')
  if (liveModifiers.shift) parts.push('Shift')
  if (liveModifiers.alt) parts.push('Alt')
  if (liveModifiers.meta) parts.push('Win')
  if (liveKey.value) parts.push(liveKey.value)
  return parts
})

// Sentinel values for grouped dropdown
const ACTION_CUSTOM_SHORTCUT = -1
const ACTION_FIRE_KEY = -2

// --- Grouped action options ---
const actionGroups = [
  {
    label: 'Mouse Buttons',
    options: [
      { label: 'Left Click',     value: DEFAULT_KEY_FUNCTIONS['left-click'] },
      { label: 'Right Click',    value: DEFAULT_KEY_FUNCTIONS['right-click'] },
      { label: 'Middle Click',   value: DEFAULT_KEY_FUNCTIONS['middle-click'] },
      { label: 'Forward',        value: DEFAULT_KEY_FUNCTIONS['forward'] },
      { label: 'Back',           value: DEFAULT_KEY_FUNCTIONS['back'] },
    ],
  },
  {
    label: 'DPI',
    options: [
      { label: 'DPI Cycle',      value: DEFAULT_KEY_FUNCTIONS['dpi-cycle'] },
      { label: 'DPI +',          value: DEFAULT_KEY_FUNCTIONS['dpi-plus'] },
      { label: 'DPI -',          value: DEFAULT_KEY_FUNCTIONS['dpi-minus'] },
    ],
  },
  {
    label: 'Special',
    options: [
      { label: 'Profile Switch', value: DEFAULT_KEY_FUNCTIONS['profile-switch'] },
      { label: 'Disable',        value: DEFAULT_KEY_FUNCTIONS['disable'] },
    ],
  },
  {
    label: 'Custom',
    options: [
      { label: 'Custom Shortcut...', value: ACTION_CUSTOM_SHORTCUT },
      { label: 'Fire Key...',         value: ACTION_FIRE_KEY },
    ],
  },
]

// --- Human-readable label for any function value ---
function functionToLabel(value: number): string {
  for (const [name, v] of Object.entries(DEFAULT_KEY_FUNCTIONS)) {
    if (v === value) return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  const combo = keyComboLabel(value)
  if (combo) return combo
  if (isFireKeyValue(value)) return 'Fire Key'
  if (value === 0) return 'Disable'
  return `Custom (0x${value.toString(16).padStart(8, '0')})`
}

function functionToLabelWithFireConfig(value: number, buttonId: number): string {
  if (isFireKeyValue(value) && fireKeyConfigs[buttonId]) {
    const cfg = fireKeyConfigs[buttonId]
    return `Fire Key (${cfg.count}x, ${cfg.intervalMs}ms)`
  }
  return functionToLabel(value)
}

// --- Determine the select value for current function ---
function selectValueForFunction(value: number): number {
  for (const v of Object.values(DEFAULT_KEY_FUNCTIONS)) {
    if (v === value) return value
  }
  if (decodeKeyboardCombo(value)) return ACTION_CUSTOM_SHORTCUT
  if (isFireKeyValue(value)) return ACTION_FIRE_KEY
  return value
}

// --- Read buttons from device ---
async function readButtons() {
  if (!store.connected) return
  for (const btn of buttons.value) {
    btn.currentLabel = t('buttons.loading')
    const resp = await store.sendAndRead(cmdReadKeyFunction(btn.buttonId), 200)
    if (resp) {
      const parsed = parseKeyFunctionResponse(resp)
      if (parsed) {
        btn.currentFunction = parsed.functionValue
        btn.currentLabel = functionToLabelWithFireConfig(parsed.functionValue, btn.buttonId)

        if (decodeKeyboardCombo(parsed.functionValue)) {
          btn.selectedAction = 'custom-shortcut'
          btn.capturedValue = parsed.functionValue
          btn.capturedShortcut = keyComboLabel(parsed.functionValue) ?? ''
        } else if (isFireKeyValue(parsed.functionValue)) {
          btn.selectedAction = 'fire-key'
          if (!fireKeyConfigs[btn.buttonId]) {
            fireKeyConfigs[btn.buttonId] = { count: 3, intervalMs: 50 }
          }
        } else {
          btn.selectedAction = 'preset'
        }
      }
    }
  }
}

// --- Set button action ---
async function setButton(btn: ButtonConfig, value: number) {
  savingButton.value = btn.buttonId
  try {
    await store.sendFeatureReport(cmdSetKeyFunction(btn.buttonId, value))
    // Verify
    const resp = await store.sendAndRead(cmdReadKeyFunction(btn.buttonId), 200)
    const verified = resp ? (parseKeyFunctionResponse(resp)?.functionValue === value) : false
    btn.currentFunction = value
    btn.currentLabel = functionToLabelWithFireConfig(value, btn.buttonId)
    showToast(
      verified
        ? `${t(btn.labelKey)} set to ${btn.currentLabel}`
        : `${t(btn.labelKey)} set to ${btn.currentLabel} (unverified)`,
      verified ? 'success' : 'info',
    )
  } finally {
    savingButton.value = null
  }
}

// --- Handle dropdown change ---
function onActionChange(btn: ButtonConfig, rawValue: number) {
  if (rawValue === ACTION_CUSTOM_SHORTCUT) {
    btn.selectedAction = 'custom-shortcut'
    btn.capturedShortcut = ''
    btn.capturedValue = 0
  } else if (rawValue === ACTION_FIRE_KEY) {
    btn.selectedAction = 'fire-key'
    if (!fireKeyConfigs[btn.buttonId]) {
      fireKeyConfigs[btn.buttonId] = { count: 3, intervalMs: 50 }
    }
  } else {
    btn.selectedAction = 'preset'
    setButton(btn, rawValue)
  }
}

// --- Modal-based keyboard shortcut capture ---
function startCapture(btn: ButtonConfig) {
  liveModifiers.ctrl = false
  liveModifiers.shift = false
  liveModifiers.alt = false
  liveModifiers.meta = false
  liveKey.value = null
  dangerousWarning.value = null
  capturingButton.value = btn
}

function closeModal() {
  const btn = capturingButton.value
  capturingButton.value = null
  liveKey.value = null
  dangerousWarning.value = null
  if (btn && !btn.capturedValue && !decodeKeyboardCombo(btn.currentFunction)) {
    btn.selectedAction = 'preset'
  }
}

function handleModalKeyDown(e: KeyboardEvent) {
  if (!capturingButton.value) return
  e.preventDefault()
  e.stopPropagation()

  liveModifiers.ctrl = e.ctrlKey
  liveModifiers.shift = e.shiftKey
  liveModifiers.alt = e.altKey
  liveModifiers.meta = e.metaKey

  if (e.key === 'Escape') {
    closeModal()
    return
  }

  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return

  const hidCode = HID_KEY_CODES[e.code]
  if (!hidCode) {
    showToast(t('buttons.unsupportedKey', { key: e.code }), 'error')
    return
  }

  const keyName = e.code
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
  liveKey.value = keyName

  let modMask = 0
  if (e.ctrlKey) modMask |= MODIFIER_BITS.ctrl
  if (e.shiftKey) modMask |= MODIFIER_BITS.shift
  if (e.altKey) modMask |= MODIFIER_BITS.alt
  if (e.metaKey) modMask |= MODIFIER_BITS.meta

  const danger = isDangerousCombo(modMask, e.code)
  if (danger) {
    dangerousWarning.value = danger
    showToast(t('buttons.dangerousCombo', { combo: danger }), 'info')
  }

  const functionValue = encodeKeyboardCombo(modMask, hidCode)
  const label = keyComboLabel(functionValue)
  const btn = capturingButton.value

  btn.capturedValue = functionValue
  btn.capturedShortcut = label ?? ''
  btn.isCapturing = false

  setTimeout(() => {
    capturingButton.value = null
    liveKey.value = null
    dangerousWarning.value = null
    setButton(btn, functionValue)
  }, 350)
}

function handleModalKeyUp(e: KeyboardEvent) {
  if (!capturingButton.value) return
  e.preventDefault()
  e.stopPropagation()
  liveModifiers.ctrl = e.ctrlKey
  liveModifiers.shift = e.shiftKey
  liveModifiers.alt = e.altKey
  liveModifiers.meta = e.metaKey
}

// --- Fire key ---
async function applyFireKey(btn: ButtonConfig) {
  const cfg = fireKeyConfigs[btn.buttonId]
  if (!cfg) return

  cfg.count = Math.max(1, Math.min(10, cfg.count))
  cfg.intervalMs = Math.max(10, Math.min(500, cfg.intervalMs))

  savingButton.value = btn.buttonId
  try {
    const fireKeyFunctionValue = 0x0219000A
    await store.sendFeatureReport(cmdSetKeyFunction(btn.buttonId, fireKeyFunctionValue))

    const reportId = store.customerCode ? 5 : 9
    const params = new Uint8Array(8)
    params[0] = reportId
    params[1] = 2
    params[2] = cfg.count
    params[3] = cfg.intervalMs
    params[4] = 0
    params[5] = 0
    params[6] = 0
    params[7] = 0
    await store.sendFeatureReport(params)

    btn.currentFunction = fireKeyFunctionValue
    btn.currentLabel = `Fire Key (${cfg.count}x, ${cfg.intervalMs}ms)`
    showToast(`${t(btn.labelKey)} set to Fire Key (${cfg.count}x, ${cfg.intervalMs}ms)`, 'success')
  } finally {
    savingButton.value = null
  }
}

// Global key handlers for the capture modal
function globalKeyDownHandler(e: KeyboardEvent) {
  if (capturingButton.value) {
    handleModalKeyDown(e)
  }
}

function globalKeyUpHandler(e: KeyboardEvent) {
  if (capturingButton.value) {
    handleModalKeyUp(e)
  }
}

onMounted(() => {
  readButtons()
  document.addEventListener('keydown', globalKeyDownHandler, true)
  document.addEventListener('keyup', globalKeyUpHandler, true)
})

onUnmounted(() => {
  document.removeEventListener('keydown', globalKeyDownHandler, true)
  document.removeEventListener('keyup', globalKeyUpHandler, true)
})
</script>

<template>
  <div v-if="!store.connected" class="text-center text-text-muted py-20 text-sm font-display tracking-wider">{{ t('buttons.connectFirst') }}</div>
  <div v-else class="space-y-5">
    <h2 class="text-lg font-bold text-text-primary font-display tracking-widest uppercase">{{ t('buttons.title') }}</h2>

    <!-- Two-column layout: Mouse diagram left, config panel right -->
    <div class="remap-layout">
      <!-- LEFT: Mouse diagram with clickable button zones -->
      <div class="mouse-diagram-panel hud-card bg-bg-secondary border border-border-default p-6">
        <div class="mouse-body">
          <!-- SVG mouse outline -->
          <svg viewBox="0 0 200 340" class="mouse-svg" xmlns="http://www.w3.org/2000/svg">
            <!-- Mouse body shape -->
            <path d="M30 120 Q30 20, 100 10 Q170 20, 170 120 L170 260 Q170 330, 100 335 Q30 330, 30 260 Z"
              class="mouse-outline" fill="none" stroke-width="2"/>

            <!-- Center divider -->
            <line x1="100" y1="10" x2="100" y2="130" class="mouse-divider" stroke-width="1"/>

            <!-- Scroll wheel -->
            <rect x="88" y="60" width="24" height="40" rx="12" class="mouse-wheel-shape" stroke-width="1.5"/>

            <!-- Side buttons (left side of mouse body) -->
            <rect x="18" y="155" width="18" height="30" rx="3" class="mouse-side-btn-shape" stroke-width="1.5"/>
            <rect x="18" y="195" width="18" height="30" rx="3" class="mouse-side-btn-shape" stroke-width="1.5"/>

            <!-- DPI button (behind scroll wheel) -->
            <ellipse cx="100" cy="145" rx="14" ry="8" class="mouse-dpi-shape" stroke-width="1.5"/>
          </svg>

          <!-- Clickable overlay zones -->
          <button
            class="zone zone-left"
            :class="{ 'zone--active': selectedButtonId === 'left', 'zone--saving': savingButton === 0 }"
            @click="selectButton('left')"
          >
            <span class="zone-label">LMB</span>
          </button>

          <button
            class="zone zone-right"
            :class="{ 'zone--active': selectedButtonId === 'right', 'zone--saving': savingButton === 1 }"
            @click="selectButton('right')"
          >
            <span class="zone-label">RMB</span>
          </button>

          <button
            class="zone zone-middle"
            :class="{ 'zone--active': selectedButtonId === 'middle', 'zone--saving': savingButton === 2 }"
            @click="selectButton('middle')"
          >
            <span class="zone-label">M3</span>
          </button>

          <button
            class="zone zone-back"
            :class="{ 'zone--active': selectedButtonId === 'back', 'zone--saving': savingButton === 3 }"
            @click="selectButton('back')"
          >
            <span class="zone-label">M4</span>
          </button>

          <button
            class="zone zone-forward"
            :class="{ 'zone--active': selectedButtonId === 'forward', 'zone--saving': savingButton === 4 }"
            @click="selectButton('forward')"
          >
            <span class="zone-label">M5</span>
          </button>

          <button
            class="zone zone-dpi"
            :class="{ 'zone--active': selectedButtonId === 'dpi', 'zone--saving': savingButton === 5 }"
            @click="selectButton('dpi')"
          >
            <span class="zone-label">DPI</span>
          </button>
        </div>

        <!-- Button status list beneath diagram -->
        <div class="mt-6 space-y-1.5">
          <div
            v-for="btn in buttons" :key="btn.id"
            class="status-row"
            :class="{ 'status-row--active': selectedButtonId === btn.id }"
            @click="selectButton(btn.id)"
          >
            <span class="status-icon font-data text-[10px]">{{ btn.icon }}</span>
            <span class="text-[10px] text-text-secondary truncate flex-1">{{ t(btn.labelKey) }}</span>
            <template v-if="savingButton === btn.buttonId">
              <span class="text-[9px] text-accent-cyan animate-pulse font-data">...</span>
            </template>
            <template v-else-if="keyComboPartsFromValue(btn.currentFunction)">
              <span class="inline-flex items-center gap-0.5">
                <template v-for="(part, idx) in keyComboPartsFromValue(btn.currentFunction)" :key="idx">
                  <span v-if="idx > 0" class="text-accent-purple text-[8px] font-bold">+</span>
                  <span class="keycap keycap-xs">{{ part }}</span>
                </template>
              </span>
            </template>
            <template v-else>
              <span class="text-[9px] text-accent-cyan font-data truncate max-w-[100px]">{{ btn.currentLabel }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- RIGHT: Configuration panel for selected button -->
      <div class="config-panel">
        <template v-if="selectedButton">
          <div class="hud-card bg-bg-secondary border border-border-default p-5 space-y-5">
            <!-- Header -->
            <div class="flex items-center gap-3">
              <div class="config-badge">{{ selectedButton.icon }}</div>
              <div>
                <h3 class="text-sm font-bold text-accent-cyan font-display tracking-wider uppercase">{{ t(selectedButton.labelKey) }}</h3>
                <div class="text-[9px] text-text-muted font-data mt-0.5">ID: {{ selectedButton.buttonId }}</div>
              </div>
              <div class="ml-auto">
                <template v-if="savingButton === selectedButton.buttonId">
                  <span class="text-[10px] text-accent-cyan animate-pulse font-data tracking-wider">WRITING...</span>
                </template>
              </div>
            </div>

            <!-- Current assignment display -->
            <div class="current-assignment">
              <span class="text-[10px] text-text-muted font-data">{{ t('buttons.current') }}</span>
              <div class="mt-1.5">
                <template v-if="keyComboPartsFromValue(selectedButton.currentFunction)">
                  <span class="inline-flex items-center gap-1">
                    <template v-for="(part, idx) in keyComboPartsFromValue(selectedButton.currentFunction)" :key="idx">
                      <span v-if="idx > 0" class="text-accent-purple text-[10px] font-bold">+</span>
                      <span class="keycap">{{ part }}</span>
                    </template>
                  </span>
                </template>
                <template v-else>
                  <span class="text-sm text-accent-cyan font-data font-bold">{{ selectedButton.currentLabel }}</span>
                </template>
              </div>
            </div>

            <!-- Action dropdown -->
            <div class="space-y-2">
              <label class="text-[10px] text-text-muted font-data tracking-wider uppercase">Assign Action</label>
              <div class="hud-select-wrap">
                <select
                  :value="selectValueForFunction(selectedButton.currentFunction)"
                  :disabled="savingButton === selectedButton.buttonId"
                  @change="onActionChange(selectedButton!, Number(($event.target as HTMLSelectElement).value))"
                  class="hud-select"
                >
                  <optgroup v-for="group in actionGroups" :key="group.label" :label="group.label">
                    <option v-for="opt in group.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </optgroup>
                </select>
                <div class="hud-select-arrow">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>
                </div>
              </div>
            </div>

            <!-- Custom Shortcut capture UI -->
            <div v-if="selectedButton.selectedAction === 'custom-shortcut'" class="shortcut-section">
              <div class="flex items-center gap-3 flex-wrap">
                <div v-if="selectedButton.capturedShortcut && keyComboPartsFromValue(selectedButton.capturedValue)" class="inline-flex items-center gap-1">
                  <template v-for="(part, idx) in keyComboPartsFromValue(selectedButton.capturedValue)" :key="idx">
                    <span v-if="idx > 0" class="text-accent-purple text-[10px] font-bold">+</span>
                    <span class="keycap">{{ part }}</span>
                  </template>
                </div>
                <button
                  @click="startCapture(selectedButton!)"
                  class="hud-btn-sm"
                >{{ selectedButton.capturedShortcut ? t('buttons.recapture') : t('buttons.captureKey') }}</button>
              </div>
            </div>

            <!-- Fire Key config UI -->
            <div v-if="selectedButton.selectedAction === 'fire-key'" class="fire-section">
              <div class="grid grid-cols-2 gap-3">
                <label class="space-y-1.5">
                  <span class="text-[10px] text-text-muted font-data tracking-wider">{{ t('buttons.fireCount') }}</span>
                  <input
                    type="number"
                    :value="fireKeyConfigs[selectedButton.buttonId]?.count ?? 3"
                    @input="fireKeyConfigs[selectedButton!.buttonId] = { ...(fireKeyConfigs[selectedButton!.buttonId] ?? { count: 3, intervalMs: 50 }), count: Number(($event.target as HTMLInputElement).value) }"
                    min="1" max="10" step="1"
                    class="hud-number-input w-full"
                  />
                </label>
                <label class="space-y-1.5">
                  <span class="text-[10px] text-text-muted font-data tracking-wider">{{ t('buttons.fireInterval') }} (ms)</span>
                  <input
                    type="number"
                    :value="fireKeyConfigs[selectedButton.buttonId]?.intervalMs ?? 50"
                    @input="fireKeyConfigs[selectedButton!.buttonId] = { ...(fireKeyConfigs[selectedButton!.buttonId] ?? { count: 3, intervalMs: 50 }), intervalMs: Number(($event.target as HTMLInputElement).value) }"
                    min="10" max="500" step="10"
                    class="hud-number-input w-full"
                  />
                </label>
              </div>
              <button
                @click="applyFireKey(selectedButton!)"
                class="hud-btn-accent mt-3 w-full"
              >{{ t('buttons.fireApply') }}</button>
            </div>
          </div>
        </template>

        <!-- No selection state -->
        <template v-else>
          <div class="hud-card bg-bg-secondary border border-border-default p-8 flex flex-col items-center justify-center min-h-[300px] text-center">
            <svg class="w-12 h-12 text-text-muted/30 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"/>
            </svg>
            <p class="text-xs text-text-muted font-display tracking-wider">{{ t('buttons.selectButton') }}</p>
            <p class="text-[10px] text-text-muted/50 mt-2 font-data">{{ t('buttons.noSelection') }}</p>
          </div>
        </template>
      </div>
    </div>

    <!-- Capture modal overlay -->
    <Teleport to="body">
      <Transition name="capture-modal">
        <div
          v-if="isModalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeModal"
        >
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/80 backdrop-blur-md" />

          <!-- Modal content -->
          <div class="capture-modal-frame">
            <!-- Scanning line animation -->
            <div class="scan-line"></div>

            <!-- Corner accents -->
            <div class="corner-accent corner-tl"></div>
            <div class="corner-accent corner-tr"></div>
            <div class="corner-accent corner-bl"></div>
            <div class="corner-accent corner-br"></div>

            <!-- Prompt text -->
            <p class="text-center text-sm text-text-secondary mb-8 font-display tracking-wider uppercase">{{ t('buttons.pressKey') }}</p>

            <!-- Live key badges area -->
            <div class="flex items-center justify-center gap-2.5 min-h-[56px] mb-8">
              <template v-if="liveKeyParts.length > 0">
                <template v-for="(part, idx) in liveKeyParts" :key="idx">
                  <span v-if="idx > 0" class="text-accent-purple text-lg font-bold select-none">+</span>
                  <span class="keycap keycap-lg">{{ part }}</span>
                </template>
              </template>
              <span v-else class="text-text-muted text-xs font-data tracking-widest uppercase">{{ t('buttons.captureWaiting') }}</span>
            </div>

            <!-- Dangerous combo warning -->
            <div v-if="dangerousWarning" class="danger-banner">
              <svg class="w-4 h-4 text-accent-orange shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="square" stroke-linejoin="miter" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-[11px] text-accent-orange font-data tracking-wide">{{ t('buttons.dangerousComboWarning', { combo: dangerousWarning }) }}</span>
            </div>

            <!-- Modifier-only hint -->
            <p class="text-center text-[10px] text-text-muted mb-5 font-data">{{ t('buttons.modifierOnlyHint') }}</p>

            <!-- Cancel button -->
            <div class="flex justify-center">
              <button
                @click="closeModal"
                class="hud-btn-sm"
              >{{ t('buttons.cancelCapture') }} <span class="keycap keycap-xs ml-1.5">Esc</span></button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Two-column layout ─────────────────────────────────────────────────── */
.remap-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  align-items: start;
}

@media (max-width: 768px) {
  .remap-layout {
    grid-template-columns: 1fr;
  }
}

/* ── Mouse Diagram ─────────────────────────────────────────────────────── */
.mouse-diagram-panel {
  position: sticky;
  top: 24px;
}

.mouse-body {
  position: relative;
  width: 200px;
  height: 340px;
  margin: 0 auto;
}

.mouse-svg {
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.mouse-outline {
  stroke: var(--color-border-default);
  filter: drop-shadow(0 0 6px rgba(128, 60, 238, 0.15));
}

.mouse-divider {
  stroke: var(--color-border-default);
  opacity: 0.5;
  stroke-dasharray: 3 3;
}

.mouse-wheel-shape {
  fill: rgba(128, 60, 238, 0.08);
  stroke: var(--color-border-default);
}

.mouse-side-btn-shape {
  fill: rgba(128, 60, 238, 0.05);
  stroke: var(--color-border-default);
}

.mouse-dpi-shape {
  fill: rgba(128, 60, 238, 0.05);
  stroke: var(--color-border-default);
}

/* ── Clickable Zones ───────────────────────────────────────────────────── */
.zone {
  position: absolute;
  z-index: 2;
  background: transparent;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s, border-color 0.15s, box-shadow 0.15s;
}

.zone:hover {
  background: rgba(128, 60, 238, 0.1);
  border-color: rgba(128, 60, 238, 0.4);
}

.zone--active {
  background: rgba(128, 60, 238, 0.15) !important;
  border-color: var(--color-accent-purple) !important;
  box-shadow: 0 0 16px rgba(128, 60, 238, 0.3), inset 0 0 12px rgba(128, 60, 238, 0.08);
}

.zone--saving {
  animation: zonePulse 1s ease-in-out infinite;
}

@keyframes zonePulse {
  0%, 100% { box-shadow: 0 0 8px rgba(6, 182, 212, 0.2); }
  50% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.5); }
}

.zone-label {
  font-size: 9px;
  font-weight: 700;
  font-family: ui-monospace, monospace;
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
  pointer-events: none;
  text-transform: uppercase;
}

.zone--active .zone-label {
  color: var(--color-accent-cyan);
}

/* Zone positions - mapped to SVG coordinates */
.zone-left {
  top: 3%;
  left: 15%;
  width: 35%;
  height: 35%;
  border-radius: 20px 4px 4px 4px;
}

.zone-right {
  top: 3%;
  right: 15%;
  width: 35%;
  height: 35%;
  border-radius: 4px 20px 4px 4px;
}

.zone-middle {
  top: 17%;
  left: 44%;
  width: 12%;
  height: 13%;
  border-radius: 12px;
}

.zone-back {
  top: 45%;
  left: 8%;
  width: 10%;
  height: 9%;
  border-radius: 3px;
}

.zone-forward {
  top: 56.5%;
  left: 8%;
  width: 10%;
  height: 9%;
  border-radius: 3px;
}

.zone-dpi {
  top: 40%;
  left: 43%;
  width: 14%;
  height: 5%;
  border-radius: 8px;
}

/* ── Status rows ───────────────────────────────────────────────────────── */
.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  cursor: pointer;
  transition: background-color 0.12s;
  border-left: 2px solid transparent;
}

.status-row:hover {
  background: rgba(128, 60, 238, 0.05);
}

.status-row--active {
  background: rgba(128, 60, 238, 0.08);
  border-left-color: var(--color-accent-purple);
}

.status-icon {
  width: 28px;
  text-align: center;
  color: var(--color-accent-purple);
  font-weight: 700;
}

/* ── Config panel ──────────────────────────────────────────────────────── */
.config-badge {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  font-family: ui-monospace, monospace;
  color: var(--color-accent-purple);
  background: rgba(128, 60, 238, 0.1);
  border: 1px solid rgba(128, 60, 238, 0.3);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

.current-assignment {
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border-default);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

.shortcut-section,
.fire-section {
  padding: 14px;
  background: rgba(128, 60, 238, 0.04);
  border: 1px solid rgba(128, 60, 238, 0.15);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

/* ── HUD Select Dropdown ────────────────────────────────────────────────── */
.hud-select-wrap {
  position: relative;
}
.hud-select {
  width: 100%;
  appearance: none;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-default);
  padding: 8px 32px 8px 12px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: var(--color-text-primary);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.hud-select:focus {
  outline: none;
  border-color: var(--color-accent-purple);
  box-shadow: 0 0 12px rgba(147, 51, 234, 0.25);
}
.hud-select:disabled {
  opacity: 0.4;
  cursor: wait;
}
.hud-select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

/* ── Number Inputs ──────────────────────────────────────────────────────── */
.hud-number-input {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-default);
  padding: 6px 10px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: var(--color-text-primary);
  text-align: center;
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
  transition: border-color 0.15s, box-shadow 0.15s;
}
.hud-number-input:focus {
  outline: none;
  border-color: var(--color-accent-cyan);
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
}

/* ── HUD Buttons ────────────────────────────────────────────────────────── */
.hud-btn-sm {
  font-size: 10px;
  padding: 5px 14px;
  font-family: ui-monospace, monospace;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  transition: border-color 0.15s, box-shadow 0.15s, color 0.15s;
  cursor: pointer;
}
.hud-btn-sm:hover {
  border-color: var(--color-accent-cyan);
  color: var(--color-accent-cyan);
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
}

.hud-btn-accent {
  font-size: 10px;
  padding: 7px 16px;
  font-family: ui-monospace, monospace;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: rgba(147, 51, 234, 0.12);
  border: 1px solid rgba(147, 51, 234, 0.4);
  color: var(--color-accent-purple);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  transition: background-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.hud-btn-accent:hover {
  background: rgba(147, 51, 234, 0.22);
  box-shadow: 0 0 15px rgba(147, 51, 234, 0.3);
}

/* ── Keycap Badges ──────────────────────────────────────────────────────── */
.keycap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: ui-monospace, monospace;
  font-weight: 600;
  background: linear-gradient(180deg, var(--color-bg-tertiary) 0%, #0e0e18 100%);
  border: 1px solid rgba(147, 51, 234, 0.5);
  border-top-color: rgba(147, 51, 234, 0.7);
  border-left-color: rgba(147, 51, 234, 0.6);
  border-bottom-color: rgba(60, 20, 100, 0.8);
  border-right-color: rgba(60, 20, 100, 0.5);
  box-shadow:
    0 3px 0 0 rgba(30, 10, 50, 0.9),
    0 4px 8px -1px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 0 rgba(147, 51, 234, 0.15);
  color: var(--color-accent-cyan);
  padding: 2px 8px;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
  user-select: none;
  letter-spacing: 0.04em;
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
}

.keycap-xs {
  font-size: 9px;
  padding: 1px 5px;
}

.keycap-lg {
  font-size: 18px;
  padding: 8px 20px;
  box-shadow:
    0 4px 0 0 rgba(30, 10, 50, 0.9),
    0 6px 12px -1px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(147, 51, 234, 0.2),
    inset 0 1px 0 0 rgba(147, 51, 234, 0.2);
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
}

/* ── Capture Modal ──────────────────────────────────────────────────────── */
.capture-modal-frame {
  position: relative;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-accent-purple);
  padding: 40px 36px 32px;
  max-width: 520px;
  width: calc(100% - 32px);
  box-shadow:
    0 0 40px rgba(147, 51, 234, 0.2),
    0 0 80px rgba(147, 51, 234, 0.05),
    inset 0 0 60px rgba(0, 0, 0, 0.3);
  clip-path: polygon(
    0 0,
    calc(100% - 20px) 0,
    100% 20px,
    100% 100%,
    20px 100%,
    0 calc(100% - 20px)
  );
  overflow: hidden;
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--color-accent-cyan), transparent);
  opacity: 0.6;
  animation: scanSweep 2.5s ease-in-out infinite;
  z-index: 2;
  pointer-events: none;
}

@keyframes scanSweep {
  0% { top: 0; opacity: 0; }
  10% { opacity: 0.6; }
  90% { opacity: 0.6; }
  100% { top: 100%; opacity: 0; }
}

.corner-accent {
  position: absolute;
  width: 16px;
  height: 16px;
  border-color: var(--color-accent-cyan);
  pointer-events: none;
  z-index: 3;
}
.corner-tl { top: 4px; left: 4px; border-top: 2px solid; border-left: 2px solid; }
.corner-tr { top: 4px; right: 4px; border-top: 2px solid; border-right: 2px solid; }
.corner-bl { bottom: 4px; left: 4px; border-bottom: 2px solid; border-left: 2px solid; }
.corner-br { bottom: 4px; right: 4px; border-bottom: 2px solid; border-right: 2px solid; }

.danger-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin-bottom: 16px;
  padding: 8px 16px;
  background: rgba(249, 115, 22, 0.08);
  border: 1px solid rgba(249, 115, 22, 0.35);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

/* Modal transition */
.capture-modal-enter-active {
  transition: opacity 0.2s ease-out;
}
.capture-modal-leave-active {
  transition: opacity 0.15s ease-in;
}
.capture-modal-enter-from,
.capture-modal-leave-to {
  opacity: 0;
}
</style>

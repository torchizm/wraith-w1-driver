<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  cmdReadKeyFunction, parseKeyFunctionResponse,
  cmdSetKeyFunction,
} from '../protocol/commands'
import { DEFAULT_KEY_FUNCTIONS } from '../protocol/constants'

const store = useDeviceStore()
const { t } = useI18n()

interface ButtonConfig {
  id: string
  labelKey: string
  buttonId: number
  currentFunction: number
  currentLabel: string
}

const buttons = ref<ButtonConfig[]>([
  { id: 'left',    labelKey: 'buttons.btnLeft',    buttonId: 0, currentFunction: 0, currentLabel: '' },
  { id: 'right',   labelKey: 'buttons.btnRight',   buttonId: 1, currentFunction: 0, currentLabel: '' },
  { id: 'middle',  labelKey: 'buttons.btnMiddle',  buttonId: 2, currentFunction: 0, currentLabel: '' },
  { id: 'back',    labelKey: 'buttons.btnBack',    buttonId: 3, currentFunction: 0, currentLabel: '' },
  { id: 'forward', labelKey: 'buttons.btnForward', buttonId: 4, currentFunction: 0, currentLabel: '' },
  { id: 'dpi',     labelKey: 'buttons.btnDpi',     buttonId: 5, currentFunction: 0, currentLabel: '' },
])

const actionOptions = [
  { label: 'Left Click',     value: DEFAULT_KEY_FUNCTIONS['left-click'] },
  { label: 'Right Click',    value: DEFAULT_KEY_FUNCTIONS['right-click'] },
  { label: 'Middle Click',   value: DEFAULT_KEY_FUNCTIONS['middle-click'] },
  { label: 'Forward',        value: DEFAULT_KEY_FUNCTIONS['forward'] },
  { label: 'Back',           value: DEFAULT_KEY_FUNCTIONS['back'] },
  { label: 'DPI Cycle',      value: DEFAULT_KEY_FUNCTIONS['dpi-cycle'] },
  { label: 'DPI +',          value: DEFAULT_KEY_FUNCTIONS['dpi-plus'] },
  { label: 'DPI -',          value: DEFAULT_KEY_FUNCTIONS['dpi-minus'] },
  { label: 'Profile Switch', value: DEFAULT_KEY_FUNCTIONS['profile-switch'] },
  { label: 'Disable',        value: DEFAULT_KEY_FUNCTIONS['disable'] },
]

function functionToLabel(value: number): string {
  for (const [name, v] of Object.entries(DEFAULT_KEY_FUNCTIONS)) {
    if (v === value) return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  return `Custom (0x${value.toString(16).padStart(8, '0')})`
}

async function readButtons() {
  if (!store.connected) return
  for (const btn of buttons.value) {
    btn.currentLabel = t('buttons.loading')
    const resp = await store.sendAndRead(cmdReadKeyFunction(btn.buttonId), 200)
    if (resp) {
      const parsed = parseKeyFunctionResponse(resp)
      if (parsed) {
        btn.currentFunction = parsed.functionValue
        btn.currentLabel = functionToLabel(parsed.functionValue)
      }
    }
  }
}

async function setButton(btn: ButtonConfig, value: number) {
  await store.sendFeatureReport(cmdSetKeyFunction(btn.buttonId, value))
  btn.currentFunction = value
  btn.currentLabel = functionToLabel(value)
}

onMounted(readButtons)
</script>

<template>
  <div v-if="!store.connected" class="text-center text-text-muted py-20 text-sm">{{ t('buttons.connectFirst') }}</div>
  <div v-else class="space-y-6">
    <h2 class="text-lg font-bold text-text-primary">{{ t('buttons.title') }}</h2>

    <div class="space-y-3">
      <div
        v-for="btn in buttons" :key="btn.id"
        class="bg-bg-secondary rounded-xl border border-border-default p-4 flex items-center gap-4"
      >
        <div class="w-28 shrink-0">
          <div class="text-xs font-semibold text-text-primary">{{ t(btn.labelKey) }}</div>
          <div class="text-[9px] text-text-muted mt-0.5">{{ t('buttons.btnLabel') }} {{ btn.buttonId }}</div>
        </div>

        <div class="flex-1">
          <div class="text-[10px] text-text-muted mb-1">{{ t('buttons.current') }} <span class="text-accent-cyan">{{ btn.currentLabel }}</span></div>
          <select
            :value="btn.currentFunction"
            @change="setButton(btn, Number(($event.target as HTMLSelectElement).value))"
            class="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary"
          >
            <option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="text-[9px] text-text-muted/40 p-2">
      {{ t('buttons.comingSoon') }}
    </div>
  </div>
</template>

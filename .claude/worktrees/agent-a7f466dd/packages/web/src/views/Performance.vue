<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  cmdSetPollingRate, cmdSetLOD, cmdSetAngleSnap, cmdSetMotionSync,
  cmdSetRipple, cmdSetPerfMode, cmdSetDebounce, cmdSetSleepTime,
  cmdSetDPIValue, cmdSetDPIConfig,
} from '../protocol/commands'
import { SLEEP_TIMES, PERF_MODES } from '../protocol/constants'

const store = useDeviceStore()
const { t } = useI18n()
const saving = ref(false)

// Device always has exactly 4 DPI slots (one per on-board configuration)
const DPI_SLOT_COUNT = 4
const dpiSlots = ref<number[]>(Array(DPI_SLOT_COUNT).fill(800))
const currentDPISlot = ref(0)
const maxDPI = computed(() => store.deviceInfo?.maxDPI ?? 26000)

// Reactively sync DPI slots from store — fires on connect, profile switch, and any readDPIConfig call
watch(
  () => store.dpiLevels,
  (levels) => {
    if (levels.length > 0) {
      // Pad/trim to exactly 4 slots
      const arr = [...levels]
      while (arr.length < DPI_SLOT_COUNT) arr.push(800)
      dpiSlots.value = arr.slice(0, DPI_SLOT_COUNT)
      currentDPISlot.value = store.currentDPIIndex
    } else {
      // Fallback: try localStorage while device config is still loading
      try {
        const cached = localStorage.getItem('wraith:lastState')
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.dpiLevels?.length) {
            const arr = [...parsed.dpiLevels]
            while (arr.length < DPI_SLOT_COUNT) arr.push(800)
            dpiSlots.value = arr.slice(0, DPI_SLOT_COUNT)
            currentDPISlot.value = parsed.currentDPIIndex ?? 0
          }
        }
      } catch {}
    }
  },
  { immediate: true },
)

// Keep active-slot highlight in sync when user cycles DPI on the physical mouse
watch(() => store.currentDPIIndex, (idx) => { currentDPISlot.value = idx })

async function setPollingRate(hz: number) {
  saving.value = true
  try {
    await store.sendFeatureReport(cmdSetPollingRate(store.customerCode, hz))
    store.updateState({ pollingRateHz: hz })
  } finally { saving.value = false }
}

async function setLOD(value: number) {
  saving.value = true
  try {
    await store.sendFeatureReport(cmdSetLOD(store.customerCode, value))
    store.updateState({ lodValue: value })
  } finally { saving.value = false }
}

async function setDebounce(ms: number) {
  saving.value = true
  try {
    await store.sendFeatureReport(cmdSetDebounce(store.customerCode, ms))
    store.updateState({ debounceTime: ms })
  } finally { saving.value = false }
}

async function setSleepTime(seconds: number) {
  saving.value = true
  try {
    await store.sendFeatureReport(cmdSetSleepTime(store.customerCode, seconds))
    store.updateState({ sleepTime: seconds })
  } finally { saving.value = false }
}

async function toggleAngleSnap() {
  const newVal = !store.angleSnap
  await store.sendFeatureReport(cmdSetAngleSnap(store.customerCode, newVal))
  store.updateState({ angleSnap: newVal })
}
async function toggleMotionSync() {
  const newVal = !store.motionSync
  await store.sendFeatureReport(cmdSetMotionSync(store.customerCode, newVal))
  store.updateState({ motionSync: newVal })
}
async function toggleRipple() {
  const newVal = !store.rippleEffect
  await store.sendFeatureReport(cmdSetRipple(store.customerCode, newVal))
  store.updateState({ rippleEffect: newVal })
}

const perfModeApplying = ref<number | null>(null)

async function setPerfMode(mode: number) {
  perfModeApplying.value = mode
  await store.sendFeatureReport(cmdSetPerfMode(store.customerCode, mode))
  // Device firmware needs ~1.5s to apply sensor mode changes
  await new Promise(resolve => setTimeout(resolve, 1500))
  store.updateState({ performanceMode: mode })
  perfModeApplying.value = null
}

async function updateDPISlot(index: number, value: number) {
  dpiSlots.value[index] = value
  await store.sendFeatureReport(cmdSetDPIValue(store.customerCode, index, value))
}

async function selectDPISlot(index: number) {
  currentDPISlot.value = index
  await store.sendFeatureReport(cmdSetDPIConfig(store.customerCode, DPI_SLOT_COUNT, index))
  store.updateState({ currentDPIIndex: index })
}

const pollingRates = [125, 250, 500, 1000, 2000, 4000, 8000]

const lodOptions = computed(() => [
  { v: 2, label: t('perf.lodLow') },   // 0.7 mm
  { v: 0, label: t('perf.lodMedium') }, // 1 mm
  { v: 1, label: t('perf.lodHigh') },   // 2 mm
])
</script>

<template>
  <div v-if="!store.connected" class="text-center text-text-muted py-20 text-sm">{{ t('perf.connectFirst') }}</div>
  <div v-else class="space-y-6">
    <h2 class="text-lg font-bold text-text-primary">{{ t('perf.title') }}</h2>

    <!-- DPI Section -->
    <section class="bg-bg-secondary rounded-xl border border-border-default p-4 space-y-4">
      <h3 class="text-xs font-semibold text-text-secondary tracking-wider">{{ t('perf.dpiLevels') }}</h3>
      <div v-for="(dpi, i) in dpiSlots" :key="i" class="flex items-center gap-3">
        <button
          @click="selectDPISlot(i)"
          class="text-[10px] font-bold w-16 text-left transition-colors"
          :class="i === currentDPISlot ? 'text-accent-orange' : 'text-text-muted hover:text-text-secondary'"
          :title="t('perf.slotActivate')"
        >{{ t('perf.slot') }} {{ i + 1 }}</button>
        <input
          type="range"
          :min="50" :max="maxDPI" :step="50"
          :value="dpi"
          @change="updateDPISlot(i, Number(($event.target as HTMLInputElement).value))"
          class="flex-1 h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-orange"
        />
        <span class="text-xs font-bold text-text-primary w-16 text-right">{{ dpi }}</span>
      </div>
    </section>

    <!-- Polling Rate -->
    <section class="bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3">
      <h3 class="text-xs font-semibold text-text-secondary tracking-wider">{{ t('perf.pollingRate') }}</h3>
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="hz in pollingRates" :key="hz"
          @click="setPollingRate(hz)"
          class="px-3 py-1.5 text-[10px] font-semibold rounded-full border transition-all"
          :class="store.pollingRateHz === hz
            ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan'
            : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'"
        >{{ hz }} Hz</button>
      </div>
    </section>

    <!-- LOD -->
    <section class="bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3">
      <h3 class="text-xs font-semibold text-text-secondary tracking-wider">{{ t('perf.liftOff') }}</h3>
      <div class="flex gap-2">
        <button
          v-for="lod in lodOptions"
          :key="lod.v"
          @click="setLOD(lod.v)"
          class="px-4 py-1.5 text-[10px] font-semibold rounded-full border transition-all"
          :class="store.lodValue === lod.v
            ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan'
            : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary'"
        >{{ lod.label }}</button>
      </div>
    </section>

    <!-- Debounce + Sleep row -->
    <div class="grid grid-cols-2 gap-4">
      <section class="bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3">
        <h3 class="text-xs font-semibold text-text-secondary tracking-wider">{{ t('perf.debounce') }}</h3>
        <div class="flex items-center gap-3">
          <input
            type="range" :min="0" :max="30" :step="1"
            :value="store.debounceTime"
            @change="setDebounce(Number(($event.target as HTMLInputElement).value))"
            class="flex-1 h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-purple"
          />
          <span class="text-xs font-bold text-text-primary w-12 text-right">{{ store.debounceTime }}ms</span>
        </div>
      </section>

      <section class="bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3">
        <h3 class="text-xs font-semibold text-text-secondary tracking-wider">{{ t('perf.sleep') }}</h3>
        <select
          :value="store.sleepTime"
          @change="setSleepTime(Number(($event.target as HTMLSelectElement).value))"
          class="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary"
        >
          <option v-for="t2 in SLEEP_TIMES" :key="t2" :value="t2">
            {{ t2 < 60 ? `${t2}s` : `${t2 / 60}m` }}
          </option>
        </select>
      </section>
    </div>

    <!-- Toggles -->
    <section class="bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3">
      <h3 class="text-xs font-semibold text-text-secondary tracking-wider">{{ t('perf.sensorFeatures') }}</h3>
      <div class="grid grid-cols-3 gap-3">
        <button
          @click="toggleAngleSnap"
          class="flex items-center gap-2 p-3 rounded-xl border transition-all"
          :class="store.angleSnap
            ? 'bg-accent-green/10 border-accent-green/30'
            : 'bg-bg-tertiary border-border-default'"
        >
          <div class="w-2 h-2 rounded-full" :class="store.angleSnap ? 'bg-accent-green' : 'bg-text-muted/30'" />
          <span class="text-[10px] font-semibold" :class="store.angleSnap ? 'text-accent-green' : 'text-text-muted'">{{ t('perf.angleSnap') }}</span>
        </button>
        <button
          @click="toggleMotionSync"
          class="flex items-center gap-2 p-3 rounded-xl border transition-all"
          :class="store.motionSync
            ? 'bg-accent-green/10 border-accent-green/30'
            : 'bg-bg-tertiary border-border-default'"
        >
          <div class="w-2 h-2 rounded-full" :class="store.motionSync ? 'bg-accent-green' : 'bg-text-muted/30'" />
          <span class="text-[10px] font-semibold" :class="store.motionSync ? 'text-accent-green' : 'text-text-muted'">{{ t('perf.motionSync') }}</span>
        </button>
        <button
          @click="toggleRipple"
          class="flex items-center gap-2 p-3 rounded-xl border transition-all"
          :class="store.rippleEffect
            ? 'bg-accent-green/10 border-accent-green/30'
            : 'bg-bg-tertiary border-border-default'"
        >
          <div class="w-2 h-2 rounded-full" :class="store.rippleEffect ? 'bg-accent-green' : 'bg-text-muted/30'" />
          <span class="text-[10px] font-semibold" :class="store.rippleEffect ? 'text-accent-green' : 'text-text-muted'">{{ t('perf.ripple') }}</span>
        </button>
      </div>
    </section>

    <!-- Performance Mode -->
    <section class="bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3">
      <h3 class="text-xs font-semibold text-text-secondary tracking-wider">{{ t('perf.perfMode') }}</h3>
      <div class="flex gap-2">
        <button
          v-for="(label, code) in PERF_MODES" :key="code"
          @click="setPerfMode(Number(code))"
          :disabled="perfModeApplying !== null"
          class="px-4 py-1.5 text-[10px] font-semibold rounded-full border transition-all flex-1 text-center disabled:cursor-wait"
          :class="perfModeApplying === Number(code)
            ? 'border-accent-purple/50 bg-accent-purple/5 text-accent-purple/60 animate-pulse'
            : store.performanceMode === Number(code)
              ? 'border-accent-purple bg-accent-purple/10 text-accent-purple'
              : 'bg-bg-tertiary border-border-default text-text-secondary hover:border-accent-purple/40 hover:text-text-primary'"
        >{{ perfModeApplying === Number(code) ? '…' : label }}</button>
      </div>
    </section>
  </div>
</template>

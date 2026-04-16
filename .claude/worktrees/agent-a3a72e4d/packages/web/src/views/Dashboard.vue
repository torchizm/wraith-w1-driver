<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ControlCenter from '../components/ControlCenter.vue'

const store = useDeviceStore()
const { t } = useI18n()

const lodLabel = computed(() => {
  switch (store.lodValue) {
    case 0: return t('lod.low')
    case 1: return t('lod.high')
    case 2: return t('lod.medium')
    default: return `${store.lodValue}`
  }
})

const sleepLabel = computed(() => {
  const s = store.sleepTime
  if (s <= 0) return t('sleep.off')
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m`
})

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })
}
</script>

<template>
  <!-- Not connected state -->
  <div v-if="!store.connected" class="flex flex-col items-center justify-center h-[60vh] gap-6">
    <div class="text-2xl font-bold tracking-[0.4em] text-text-muted/20">{{ t('dashboard.title') }}</div>
    <p class="text-sm text-text-secondary text-center max-w-md">
      {{ t('dashboard.connectPrompt') }}
    </p>
    <button
      @click="store.connect()"
      class="px-6 py-2.5 text-sm font-semibold bg-accent-purple text-white rounded-full hover:bg-accent-purple/80 transition-colors"
    >
      {{ t('dashboard.connectBtn') }}
    </button>
  </div>

  <!-- Connected state -->
  <div v-else class="space-y-4">
    <!-- Config tiles row 1 -->
    <div class="grid grid-cols-5 gap-3">
      <div class="bg-bg-secondary rounded-xl border border-accent-cyan/30 p-3 text-center">
        <div class="text-[8px] font-semibold text-text-muted tracking-wider">{{ t('dashboard.pollRate') }}</div>
        <div class="text-base font-bold text-accent-cyan mt-1">{{ store.pollingRateHz }} Hz</div>
      </div>
      <div class="bg-bg-secondary rounded-xl border border-accent-orange/30 p-3 text-center">
        <div class="text-[8px] font-semibold text-text-muted tracking-wider">{{ t('dashboard.dpi') }}</div>
        <div class="text-base font-bold text-accent-orange mt-1">
          {{ store.dpiLevels.length > store.currentDPIIndex ? store.dpiLevels[store.currentDPIIndex] : `Slot ${store.currentDPIIndex + 1}` }}
        </div>
      </div>
      <div class="bg-bg-secondary rounded-xl border border-border-default p-3 text-center">
        <div class="text-[8px] font-semibold text-text-muted tracking-wider">{{ t('dashboard.lod') }}</div>
        <div class="text-base font-bold text-text-primary mt-1">{{ lodLabel }}</div>
      </div>
      <div class="bg-bg-secondary rounded-xl border border-border-default p-3 text-center">
        <div class="text-[8px] font-semibold text-text-muted tracking-wider">{{ t('dashboard.sleep') }}</div>
        <div class="text-base font-bold text-text-primary mt-1">{{ sleepLabel }}</div>
      </div>
      <div class="bg-bg-secondary rounded-xl border border-border-default p-3 text-center">
        <div class="text-[8px] font-semibold text-text-muted tracking-wider">{{ t('dashboard.debounce') }}</div>
        <div class="text-base font-bold text-text-primary mt-1">{{ store.debounceTime }}ms</div>
      </div>
    </div>

    <!-- Toggles + Profile row -->
    <div class="flex items-center gap-3">
      <!-- Toggle pills -->
      <div class="flex items-center gap-2">
        <div
          v-for="toggle in [
            { label: t('dashboard.angleSnap'), value: store.angleSnap },
            { label: t('dashboard.motionSync'), value: store.motionSync },
            { label: t('dashboard.ripple'), value: store.rippleEffect },
          ]"
          :key="toggle.label"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-semibold"
          :class="toggle.value
            ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
            : 'bg-bg-primary border-border-default/50 text-text-muted'"
        >
          <div class="w-1.5 h-1.5 rounded-full" :class="toggle.value ? 'bg-accent-green' : 'bg-text-muted/50'" />
          {{ toggle.label }}
        </div>
      </div>

      <div class="flex-1" />

      <!-- Profile selector -->
      <div class="flex items-center gap-1">
        <span class="text-[8px] text-text-muted tracking-wider mr-1">{{ t('dashboard.profile') }}</span>
        <div
          v-for="i in 4"
          :key="i"
          class="w-8 h-7 rounded-lg border text-[10px] font-bold flex items-center justify-center transition-all"
          :class="store.currentProfile === i - 1
            ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
            : 'bg-bg-primary border-border-default/50 text-text-muted'"
        >P{{ i }}</div>
      </div>
    </div>

    <!-- Control Center -->
    <ControlCenter />

    <!-- Event Log -->
    <div class="bg-bg-secondary rounded-xl border border-border-default">
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <span class="text-[9px] font-semibold text-text-muted tracking-widest">{{ t('dashboard.eventLog') }}</span>
        <span class="text-[9px] text-text-muted/50">{{ store.eventLog.length }} {{ t('dashboard.events') }}</span>
      </div>
      <div class="max-h-40 overflow-y-auto">
        <div
          v-for="(event, i) in store.eventLog"
          :key="i"
          class="flex items-center gap-3 px-3 py-1 border-b border-border-default/30 text-[10px]"
        >
          <span class="text-text-muted/50 w-20 shrink-0">{{ formatTime(event.timestamp) }}</span>
          <span class="text-accent-red font-bold w-20">{{ event.button }}</span>
          <span class="text-text-muted/30 flex-1 truncate font-mono">{{ event.rawHex }}</span>
        </div>
        <div v-if="!store.eventLog.length" class="px-3 py-4 text-center text-[10px] text-text-muted/30">
          {{ t('dashboard.eventLogEmpty') }}
        </div>
      </div>
    </div>

    <!-- Raw hex debug -->
    <div v-if="store.rawHex" class="text-[9px] text-accent-orange/40 px-1 font-mono">
      {{ t('dashboard.rawPrefix') }} {{ store.rawHex }}
    </div>

    <!-- Debug Log -->
    <div class="bg-bg-secondary rounded-xl border border-border-default">
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-default">
        <span class="text-[9px] font-semibold text-text-muted tracking-widest">{{ t('dashboard.debugLog') }}</span>
        <span class="text-[9px] text-text-muted/50">{{ t('dashboard.debugLogHint') }}</span>
      </div>
      <div class="max-h-48 overflow-y-auto">
        <div
          v-for="(line, i) in store.hid.debugLog"
          :key="i"
          class="px-3 py-0.5 border-b border-border-default/20 text-[9px] text-accent-cyan/60 font-mono"
        >{{ line }}</div>
        <div v-if="!store.hid.debugLog.length" class="px-3 py-3 text-center text-[9px] text-text-muted/30">
          {{ t('dashboard.debugLogEmpty') }}
        </div>
      </div>
    </div>
  </div>
</template>

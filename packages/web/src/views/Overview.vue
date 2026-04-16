<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import ControlCenter from '../components/ControlCenter.vue'

const store = useDeviceStore()
const { t } = useI18n()

const dpiMax = computed(() => Math.max(...store.dpiLevels, 1))
const currentDPI = computed(() => store.dpiLevels[store.currentDPIIndex] ?? 0)

const connectionBadge = computed(() => {
  if (!store.deviceInfo) return ''
  return store.deviceInfo.connectionMode === '8k' ? '8K' : '1K'
})

const connectionLabel = computed(() => {
  if (!store.deviceInfo) return ''
  return store.deviceInfo.connectionMode === '1k' ? t('dashboard.conn1k') : t('dashboard.conn8k')
})

const mouseTypeLabel = computed(() => {
  if (!store.deviceInfo) return ''
  return store.deviceInfo.mouseType === 'type3' ? t('dashboard.mouseType3') : t('dashboard.mouseType5')
})

const sensorLabel = computed(() => {
  if (!store.deviceInfo) return ''
  return store.deviceInfo.sensorType === 0 ? t('dashboard.sensor0') : t('dashboard.sensor1')
})

function formatTime(ts: number) {
  const d = new Date(ts)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })
}
</script>

<template>
  <!-- Not connected -->
  <div v-if="!store.connected" class="flex flex-col items-center justify-center h-[60vh] gap-8">
    <div class="card flex flex-col items-center justify-center gap-5 px-14 py-10">
      <div class="overview-title text-3xl font-black text-text-muted/30 uppercase select-none">
        {{ t('dashboard.title') }}
      </div>
      <p class="font-body text-sm text-text-secondary text-center max-w-sm">
        {{ t('dashboard.connectPrompt') }}
      </p>
      <button
        @click="store.connect()"
        class="btn btn-primary px-8 py-2.5 text-sm font-bold uppercase"
      >
        {{ t('dashboard.connectBtn') }}
      </button>
    </div>
  </div>

  <!-- Connected -->
  <div v-else class="space-y-4">

    <!-- Status Cards: 4-column grid -->
    <div class="grid grid-cols-4 gap-3">

      <!-- Battery -->
      <div class="card p-4">
        <div class="section-label mb-2">
          {{ t('overview.battery') }}
        </div>
        <div class="flex items-end gap-2">
          <span class="data-value text-2xl font-black" :class="store.batteryLevel <= 15 ? 'text-accent-red' : 'text-accent-green'">
            {{ store.batteryLevel }}<span class="text-sm text-accent-green/60">%</span>
          </span>
          <span v-if="store.isCharging" class="section-label text-accent-gold mb-1">
            {{ t('overview.charging') }}
          </span>
        </div>
        <!-- Battery bar -->
        <div class="mt-2 h-1.5 bg-bg-primary border border-border-default/30 rounded-sm overflow-hidden">
          <div
            class="h-full transition-all duration-500 rounded-sm"
            :class="store.batteryLevel <= 15 ? 'bg-accent-red' : store.isCharging ? 'bg-accent-gold' : 'bg-accent-green'"
            :style="{ width: `${store.batteryLevel}%` }"
          />
        </div>
      </div>

      <!-- DPI -->
      <div class="card p-4">
        <div class="section-label mb-2">
          {{ t('overview.dpi') }}
        </div>
        <div class="data-value-accent text-2xl font-black text-accent-orange">
          {{ currentDPI || store.currentDPIIndex + 1 }}
        </div>
        <div class="font-data text-[8px] text-text-muted/50 mt-0.5">
          {{ t('dashboard.dpiSlotOf', { slot: store.currentDPIIndex + 1, total: store.dpiLevels.length || '?' }) }}
        </div>
        <!-- Mini DPI level bars -->
        <div v-if="store.dpiLevels.length > 0" class="flex gap-0.5 items-end mt-2 h-3">
          <div
            v-for="(dpi, idx) in store.dpiLevels"
            :key="idx"
            class="flex-1 rounded-sm transition-all duration-200"
            :class="idx === store.currentDPIIndex
              ? 'bg-accent-orange'
              : 'bg-bg-primary border border-border-default/30'"
            :style="{ height: `${(dpi / dpiMax) * 100}%`, minHeight: '2px' }"
          />
        </div>
      </div>

      <!-- Polling Rate -->
      <div class="card p-4">
        <div class="section-label mb-2">
          {{ t('overview.pollingRate') }}
        </div>
        <div class="data-value-accent text-2xl font-black text-accent-cyan">
          {{ store.pollingRateHz }}<span class="text-sm ml-0.5 text-accent-cyan/60">Hz</span>
        </div>
        <!-- Connection mode badge -->
        <div v-if="connectionBadge" class="mt-2">
          <span
            class="inline-block px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider border rounded-md"
            :class="connectionBadge === '8K'
              ? 'bg-accent-cyan/10 border-accent-cyan/40 text-accent-cyan'
              : 'bg-bg-primary border-border-default/40 text-text-muted'"
            style="font-family: var(--font-display);"
          >{{ connectionLabel }}</span>
        </div>
      </div>

      <!-- Profile -->
      <div class="card p-4">
        <div class="section-label mb-2">
          {{ t('overview.profile') }}
        </div>
        <div class="flex gap-1.5 mt-1">
          <div
            v-for="i in 4"
            :key="i"
            class="flex-1 h-9 border rounded-md text-[11px] font-black flex items-center justify-center transition-all duration-200"
            :class="store.currentProfile === i - 1
              ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
              : 'bg-bg-primary border-border-default/40 text-text-muted/40'"
            style="font-family: var(--font-display);"
          >P{{ i }}</div>
        </div>
      </div>
    </div>

    <!-- Quick Actions Row -->
    <div class="card px-4 py-3">
      <div class="section-label mb-2">
        {{ t('overview.quickActions') }}
      </div>
      <div class="flex items-center gap-6">
        <!-- DPI Preset Buttons -->
        <div class="flex items-center gap-1.5">
          <span class="section-label mr-1">{{ t('overview.dpi') }}</span>
          <div
            v-for="(dpi, idx) in store.dpiLevels"
            :key="idx"
            class="px-2 py-1 font-data text-[9px] font-bold border rounded-md transition-all duration-150 cursor-default"
            :class="idx === store.currentDPIIndex
              ? 'bg-accent-orange/20 border-accent-orange/60 text-accent-orange'
              : 'bg-bg-primary border-border-default/40 text-text-muted/50'"
          >{{ dpi }}</div>
        </div>

        <div class="w-px h-6 bg-border-default/30" />

        <!-- Polling Rate Display -->
        <div class="flex items-center gap-1.5">
          <span class="section-label mr-1">{{ t('overview.pollingRate') }}</span>
          <span class="font-data text-[10px] font-bold text-accent-cyan">{{ store.pollingRateHz }}Hz</span>
        </div>

        <div class="w-px h-6 bg-border-default/30" />

        <!-- Profile Quick Switch -->
        <div class="flex items-center gap-1">
          <span class="section-label mr-1">{{ t('overview.profile') }}</span>
          <div
            v-for="i in 4"
            :key="i"
            class="w-6 h-6 text-[8px] font-black flex items-center justify-center border rounded-md transition-all duration-150 cursor-default"
            :class="store.currentProfile === i - 1
              ? 'bg-accent-purple/20 border-accent-purple/60 text-accent-purple'
              : 'bg-bg-primary border-border-default/30 text-text-muted/30'"
            style="font-family: var(--font-display);"
          >P{{ i }}</div>
        </div>

        <div class="flex-1" />

        <!-- Toggle indicators -->
        <div class="flex items-center gap-2">
          <div
            v-for="toggle in [
              { label: t('dashboard.angleSnap'), value: store.angleSnap },
              { label: t('dashboard.motionSync'), value: store.motionSync },
              { label: t('dashboard.ripple'), value: store.rippleEffect },
            ]"
            :key="toggle.label"
            class="flex items-center gap-1.5 px-2 py-0.5 border rounded-md text-[7px] font-bold uppercase tracking-wide transition-all"
            :class="toggle.value
              ? 'bg-accent-green/10 border-accent-green/40 text-accent-green'
              : 'bg-bg-primary border-border-default/30 text-text-muted/30'"
            style="font-family: var(--font-display);"
          >
            <span
              class="status-dot"
              :class="toggle.value ? 'status-dot--on' : 'status-dot--off'"
            />
            {{ toggle.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- Control Center -->
    <ControlCenter />

    <!-- Bottom: Event Log + Device Info -->
    <div class="grid grid-cols-3 gap-3">
      <!-- Event Log (last 10) -->
      <div class="col-span-2 card overflow-hidden">
        <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-default/40">
          <span class="section-label">
            {{ t('overview.eventLog') }}
          </span>
          <span class="font-data text-[8px] text-text-muted/30">
            {{ store.eventLog.length }} {{ t('dashboard.events') }}
          </span>
        </div>
        <div class="max-h-32 overflow-y-auto">
          <div
            v-for="(event, i) in store.eventLog.slice(0, 10)"
            :key="i"
            class="flex items-center gap-3 px-3 py-0.5 border-b border-border-default/15 font-data text-[9px]"
          >
            <span class="text-accent-cyan/40 w-20 shrink-0">{{ formatTime(event.timestamp) }}</span>
            <span class="text-accent-red font-bold w-16">{{ event.button }}</span>
            <span class="text-text-muted/20 flex-1 truncate">{{ event.rawHex }}</span>
          </div>
          <div v-if="!store.eventLog.length" class="px-3 py-4 text-center font-data text-[9px] text-text-muted/25">
            {{ t('dashboard.eventLogEmpty') }}
          </div>
        </div>
      </div>

      <!-- Device Info -->
      <div class="card overflow-hidden">
        <div class="px-3 py-1.5 border-b border-border-default/40">
          <span class="section-label">
            {{ t('overview.deviceInfo') }}
          </span>
        </div>
        <div v-if="store.deviceInfo" class="px-3 py-2 space-y-1 font-data text-[9px]">
          <div class="flex justify-between">
            <span class="text-text-muted/50">{{ t('dashboard.mouseType') }}</span>
            <span class="text-accent-cyan">{{ mouseTypeLabel }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-muted/50">{{ t('dashboard.sensorType') }}</span>
            <span class="text-accent-cyan">{{ sensorLabel }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-muted/50">{{ t('dashboard.maxDpi') }}</span>
            <span class="text-accent-cyan">{{ store.deviceInfo.maxDPI }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-muted/50">{{ t('dashboard.firmwareStatus') }}</span>
            <span :class="store.deviceInfo.firmwareValid ? 'text-accent-green' : 'text-accent-red'">
              {{ store.deviceInfo.firmwareValid ? t('dashboard.fwValid') : t('dashboard.fwInvalid') }}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-text-muted/50">{{ t('dashboard.debounce') }}</span>
            <span class="text-accent-cyan">{{ store.debounceTime }}ms</span>
          </div>
        </div>
        <div v-else class="px-3 py-4 text-center font-data text-[9px] text-text-muted/25">
          {{ t('overview.noDeviceInfo') }}
        </div>
      </div>
    </div>

    <!-- Raw hex debug -->
    <div v-if="store.rawHex" class="font-data text-[8px] text-accent-orange/30 px-1">
      {{ t('dashboard.rawPrefix') }} {{ store.rawHex }}
    </div>
  </div>
</template>

<style scoped>
.overview-title {
  font-family: var(--font-display);
  letter-spacing: 0.15em;
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  transition: all 0.2s ease;
}
.status-dot--on {
  background: var(--color-accent-green);
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.5);
}
.status-dot--off {
  background: var(--color-text-muted);
  opacity: 0.2;
}
</style>

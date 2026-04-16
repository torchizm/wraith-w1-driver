<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { useI18n } from 'vue-i18n'
import { cmdSwitchProfile } from '../protocol/commands'

const store = useDeviceStore()
const { t } = useI18n()

const profileKeys = [
  'profiles.profile1',
  'profiles.profile2',
  'profiles.profile3',
  'profiles.profile4',
]

async function switchProfile(index: number) {
  await store.sendFeatureReport(cmdSwitchProfile(store.customerCode, index))
  store.updateState({ currentProfile: index })
  await store.readDPIConfig()
}
</script>

<template>
  <div v-if="!store.connected" class="text-center text-text-muted py-20 text-sm">{{ t('profiles.connectFirst') }}</div>
  <div v-else class="space-y-6">
    <h2 class="text-lg font-bold text-text-primary">{{ t('profiles.title') }}</h2>

    <div class="grid grid-cols-2 gap-4">
      <button
        v-for="(key, i) in profileKeys" :key="i"
        @click="switchProfile(i)"
        class="bg-bg-secondary rounded-xl border p-6 text-center transition-all hover:border-accent-purple/50"
        :class="store.currentProfile === i
          ? 'border-accent-purple shadow-[0_0_20px_rgba(128,60,238,0.15)]'
          : 'border-border-default'"
      >
        <div
          class="text-3xl font-black mb-2"
          :class="store.currentProfile === i ? 'text-accent-purple' : 'text-text-muted/30'"
        >P{{ i + 1 }}</div>
        <div class="text-xs font-medium" :class="store.currentProfile === i ? 'text-accent-purple' : 'text-text-secondary'">
          {{ t(key) }}
        </div>
        <div v-if="store.currentProfile === i" class="mt-2 text-[9px] text-accent-purple/60 font-semibold">{{ t('profiles.active') }}</div>
      </button>
    </div>

    <div class="text-[9px] text-text-muted/40 p-2">
      {{ t('profiles.hint') }}
    </div>
  </div>
</template>

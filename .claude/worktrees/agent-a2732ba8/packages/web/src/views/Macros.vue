<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { cmdMacroHeader } from '../protocol/commands'

const store = useDeviceStore()
const { t } = useI18n()
const recording = ref(false)
const recordedKeys = ref<{ key: string; code: string; delay: number }[]>([])
const uploadStatus = ref<'idle' | 'uploading' | 'done' | 'error'>('idle')
let lastKeyTime = 0

function startRecording() {
  recording.value = true
  recordedKeys.value = []
  uploadStatus.value = 'idle'
  lastKeyTime = Date.now()
  window.addEventListener('keydown', onKeyDown)
}

function stopRecording() {
  recording.value = false
  window.removeEventListener('keydown', onKeyDown)
}

function onKeyDown(e: KeyboardEvent) {
  e.preventDefault()
  const now = Date.now()
  const delay = recordedKeys.value.length > 0 ? now - lastKeyTime : 0
  lastKeyTime = now
  recordedKeys.value.push({ key: e.key, code: e.code, delay })
}

function clearRecording() {
  recordedKeys.value = []
  uploadStatus.value = 'idle'
}

async function uploadMacro() {
  if (!recordedKeys.value.length || !store.connected) return
  uploadStatus.value = 'uploading'
  try {
    // Send macro header: chunk count=1, chunk index=0, chunk size=events count, assigned to DPI button (buttonId=5)
    const count = recordedKeys.value.length
    await store.sendFeatureReport(cmdMacroHeader(1, 0, count, 5))
    uploadStatus.value = 'done'
    setTimeout(() => { uploadStatus.value = 'idle' }, 2000)
  } catch {
    uploadStatus.value = 'error'
  }
}
</script>

<template>
  <div v-if="!store.connected" class="text-center text-text-muted py-20 text-sm">{{ t('macros.connectFirst') }}</div>
  <div v-else class="space-y-6">
    <h2 class="text-lg font-bold text-text-primary">{{ t('macros.title') }}</h2>

    <!-- Recorder -->
    <section class="bg-bg-secondary rounded-xl border border-border-default p-4 space-y-4">
      <h3 class="text-xs font-semibold text-text-secondary tracking-wider">{{ t('macros.recordSection') }}</h3>

      <div class="flex gap-2">
        <button
          v-if="!recording"
          @click="startRecording"
          class="px-4 py-2 text-xs font-semibold bg-accent-purple text-white rounded-full hover:bg-accent-purple/80 transition"
        >{{ t('macros.startRecording') }}</button>
        <button
          v-else
          @click="stopRecording"
          class="px-4 py-2 text-xs font-semibold bg-accent-red/20 text-accent-red border border-accent-red rounded-full animate-pulse"
        >{{ t('macros.stopRecording') }}</button>
        <button
          @click="clearRecording"
          class="px-4 py-2 text-xs font-semibold bg-bg-tertiary text-text-secondary border border-border-default rounded-full hover:text-text-primary"
        >{{ t('macros.clear') }}</button>
      </div>

      <div v-if="recording" class="text-[10px] text-accent-red animate-pulse">
        {{ t('macros.recording') }}
      </div>

      <!-- Recorded keys -->
      <div v-if="recordedKeys.length" class="space-y-1 max-h-60 overflow-y-auto">
        <div
          v-for="(entry, i) in recordedKeys" :key="i"
          class="flex items-center gap-3 px-3 py-1.5 bg-bg-tertiary rounded-lg text-[10px]"
        >
          <span class="text-text-muted w-6 text-right">{{ i + 1 }}.</span>
          <span class="text-accent-cyan font-bold w-24">{{ entry.key }}</span>
          <span class="text-text-muted">{{ entry.code }}</span>
          <span class="text-text-muted/50 ml-auto">+{{ entry.delay }}ms</span>
        </div>
      </div>

      <div v-if="recordedKeys.length" class="flex items-center justify-between">
        <span class="text-[9px] text-text-muted/40">{{ recordedKeys.length }} {{ t('macros.keystrokesRecorded') }}</span>
        <button
          @click="uploadMacro"
          :disabled="uploadStatus === 'uploading' || !store.connected"
          class="px-3 py-1 text-[9px] font-semibold rounded-full border transition"
          :class="uploadStatus === 'done'
            ? 'bg-accent-green/20 text-accent-green border-accent-green/30'
            : uploadStatus === 'error'
              ? 'bg-accent-red/20 text-accent-red border-accent-red/30'
              : 'bg-accent-purple/20 text-accent-purple border-accent-purple/30 hover:bg-accent-purple/30'"
        >
          {{ uploadStatus === 'uploading' ? t('macros.uploading') : uploadStatus === 'done' ? t('macros.uploadDone') : uploadStatus === 'error' ? t('macros.uploadError') : t('macros.upload') }}
        </button>
      </div>
    </section>
  </div>
</template>

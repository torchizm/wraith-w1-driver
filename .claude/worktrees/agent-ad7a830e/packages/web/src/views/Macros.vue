<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { ref, computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '../composables/useToast'
import { cmdMacroHeader, cmdSetKeyFunction, encodeMacro, JS_KEY_TO_HID } from '../protocol/commands'
import { BUTTON_IDS, DEFAULT_KEY_FUNCTIONS } from '../protocol/constants'

const store = useDeviceStore()
const { t } = useI18n()
const { showToast } = useToast()

const recording = ref(false)
const recordedKeys = ref<{ key: string; code: string; delay: number }[]>([])
const uploadStatus = ref<'idle' | 'uploading' | 'done' | 'error'>('idle')
const uploadProgress = ref('')
const selectedButton = ref('dpi')
const selectedStep = ref<number | null>(null)
const insertingAt = ref<number | null>(null)
let lastKeyTime = 0

// Drag state
const draggingIndex = ref<number | null>(null)
const dragDelayPreview = ref<number | null>(null)

const MAX_KEYSTROKES = 80
const MACRO_REPORT_ID = 9
const MIN_BLOCK_WIDTH = 40
const PIXELS_PER_MS = 0.3

const buttonOptions = [
  { id: 'left',    labelKey: 'macros.btnLeft' },
  { id: 'right',   labelKey: 'macros.btnRight' },
  { id: 'middle',  labelKey: 'macros.btnMiddle' },
  { id: 'back',    labelKey: 'macros.btnBack' },
  { id: 'forward', labelKey: 'macros.btnForward' },
  { id: 'dpi',     labelKey: 'macros.btnDpi' },
]

// Default functions to restore when clearing a macro
const defaultFunctions: Record<string, number> = {
  left: DEFAULT_KEY_FUNCTIONS['left-click'],
  right: DEFAULT_KEY_FUNCTIONS['right-click'],
  middle: DEFAULT_KEY_FUNCTIONS['middle-click'],
  back: DEFAULT_KEY_FUNCTIONS['back'],
  forward: DEFAULT_KEY_FUNCTIONS['forward'],
  dpi: DEFAULT_KEY_FUNCTIONS['dpi-cycle'],
}

const totalDuration = computed(() =>
  recordedKeys.value.reduce((sum, k) => sum + k.delay, 0)
)

const uploadPercent = computed(() => {
  if (uploadStatus.value !== 'uploading' || !uploadProgress.value) return 0
  const match = uploadProgress.value.match(/(\d+)\s*\/\s*(\d+)/)
  if (!match) return 0
  return Math.round((parseInt(match[1]) / parseInt(match[2])) * 100)
})

function keyBorderColor(code: string): string {
  if (/^(ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|MetaLeft|MetaRight)$/.test(code))
    return 'border-l-blue-400'
  if (/^Key[A-Z]$/.test(code))
    return 'border-l-emerald-400'
  if (/^F\d+$/.test(code))
    return 'border-l-orange-400'
  return 'border-l-gray-400'
}

function keyColor(code: string): string {
  if (/^(ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|MetaLeft|MetaRight)$/.test(code))
    return 'bg-blue-600/80 border-blue-400/50'
  if (/^Key[A-Z]$/.test(code))
    return 'bg-emerald-600/80 border-emerald-400/50'
  if (/^F\d+$/.test(code))
    return 'bg-orange-600/80 border-orange-400/50'
  return 'bg-gray-600/80 border-gray-400/50'
}

function keyColorDot(code: string): string {
  if (/^(ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|MetaLeft|MetaRight)$/.test(code))
    return 'bg-blue-400'
  if (/^Key[A-Z]$/.test(code))
    return 'bg-emerald-400'
  if (/^F\d+$/.test(code))
    return 'bg-orange-400'
  return 'bg-gray-400'
}

function timelineNeonColor(code: string): string {
  if (/^(ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|MetaLeft|MetaRight)$/.test(code))
    return 'rgba(96, 165, 250, 0.6)'
  if (/^Key[A-Z]$/.test(code))
    return 'rgba(52, 211, 153, 0.6)'
  if (/^F\d+$/.test(code))
    return 'rgba(251, 146, 60, 0.6)'
  return 'rgba(156, 163, 175, 0.4)'
}

function blockWidth(delay: number): number {
  return Math.max(MIN_BLOCK_WIDTH, delay * PIXELS_PER_MS)
}

function formatMs(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's'
  return ms + 'ms'
}

function startRecording() {
  recording.value = true
  recordedKeys.value = []
  uploadStatus.value = 'idle'
  uploadProgress.value = ''
  selectedStep.value = null
  lastKeyTime = Date.now()
  window.addEventListener('keydown', onKeyDown)
}

function stopRecording() {
  recording.value = false
  window.removeEventListener('keydown', onKeyDown)
}

function onKeyDown(e: KeyboardEvent) {
  e.preventDefault()
  if (recordedKeys.value.length >= MAX_KEYSTROKES) {
    stopRecording()
    showToast(t('macros.tooManyKeystrokes'), 'info')
    return
  }
  const now = Date.now()
  const delay = recordedKeys.value.length > 0 ? now - lastKeyTime : 0
  lastKeyTime = now
  recordedKeys.value.push({ key: e.key, code: e.code, delay })
}

function clearRecording() {
  recordedKeys.value = []
  uploadStatus.value = 'idle'
  uploadProgress.value = ''
  selectedStep.value = null
  insertingAt.value = null
}

function isRecognizedKey(code: string): boolean {
  return code in JS_KEY_TO_HID
}

// Step editing
function selectStep(index: number) {
  selectedStep.value = selectedStep.value === index ? null : index
}

function deleteStep(index: number) {
  recordedKeys.value.splice(index, 1)
  if (selectedStep.value === index) selectedStep.value = null
  else if (selectedStep.value !== null && selectedStep.value > index) selectedStep.value--
  showToast(t('macros.stepDeleted'), 'info')
}

function duplicateStep(index: number) {
  if (recordedKeys.value.length >= MAX_KEYSTROKES) {
    showToast(t('macros.tooManyKeystrokes'), 'info')
    return
  }
  const entry = { ...recordedKeys.value[index] }
  recordedKeys.value.splice(index + 1, 0, entry)
  selectedStep.value = index + 1
  showToast(t('macros.stepDuplicated'), 'success')
}

function updateDelay(index: number, value: string) {
  const num = parseInt(value, 10)
  if (!isNaN(num) && num >= 0) {
    recordedKeys.value[index].delay = num
  }
}

// Insert step
function startInsert(index: number) {
  insertingAt.value = index
  window.addEventListener('keydown', onInsertKeyDown)
}

function cancelInsert() {
  insertingAt.value = null
  window.removeEventListener('keydown', onInsertKeyDown)
}

function onInsertKeyDown(e: KeyboardEvent) {
  e.preventDefault()
  if (insertingAt.value === null) return
  if (recordedKeys.value.length >= MAX_KEYSTROKES) {
    showToast(t('macros.tooManyKeystrokes'), 'info')
    cancelInsert()
    return
  }
  const newEntry = { key: e.key, code: e.code, delay: 50 }
  recordedKeys.value.splice(insertingAt.value + 1, 0, newEntry)
  selectedStep.value = insertingAt.value + 1
  showToast(t('macros.stepInserted'), 'success')
  cancelInsert()
}

// Drag to adjust delay
function onDragStart(index: number, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  draggingIndex.value = index
  const startX = event.clientX
  const nextIndex = index + 1
  if (nextIndex >= recordedKeys.value.length) return
  const originalDelay = recordedKeys.value[nextIndex].delay

  function onMouseMove(e: MouseEvent) {
    const dx = e.clientX - startX
    const newDelay = Math.max(0, Math.round(originalDelay + dx / PIXELS_PER_MS))
    dragDelayPreview.value = newDelay
    recordedKeys.value[nextIndex].delay = newDelay
  }

  function onMouseUp() {
    draggingIndex.value = null
    dragDelayPreview.value = null
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keydown', onInsertKeyDown)
})

async function uploadMacro() {
  if (!recordedKeys.value.length || !store.connected) return
  uploadStatus.value = 'uploading'

  const buttonId = BUTTON_IDS[selectedButton.value]
  if (buttonId === undefined) {
    uploadStatus.value = 'error'
    showToast(t('macros.uploadFailed'), 'error')
    return
  }

  try {
    // Encode keystrokes into chunks
    const keystrokes = recordedKeys.value.map(k => ({ code: k.code, delay: k.delay }))
    const chunks = encodeMacro(keystrokes)
    const chunkCount = chunks.length

    // Step 1: Send macro header + data for each chunk
    for (let i = 0; i < chunkCount; i++) {
      uploadProgress.value = t('macros.uploadProgress', { current: i + 1, total: chunkCount })

      // Send header for this chunk
      await store.sendFeatureReport(cmdMacroHeader(chunkCount, i, 32, buttonId))
      await new Promise(r => setTimeout(r, 50))

      // Send data chunk via OUTPUT report
      await store.sendReport(MACRO_REPORT_ID, chunks[i])
      await new Promise(r => setTimeout(r, 50))
    }

    // Step 2: Assign macro mode to the selected button
    const macroAssign = new Uint8Array([6, buttonId, 9, 0, buttonId, 0, 0, 0])
    await store.sendFeatureReport(macroAssign)

    uploadStatus.value = 'done'
    uploadProgress.value = ''
    const btnLabel = t(buttonOptions.find(b => b.id === selectedButton.value)?.labelKey ?? 'macros.btnDpi')
    showToast(t('macros.uploadSuccess', { button: btnLabel }), 'success')
    setTimeout(() => { uploadStatus.value = 'idle' }, 3000)
  } catch (err) {
    console.error('Macro upload failed:', err)
    uploadStatus.value = 'error'
    uploadProgress.value = ''
    showToast(t('macros.uploadFailed'), 'error')
  }
}

async function deleteMacro() {
  if (!store.connected) return
  const buttonId = BUTTON_IDS[selectedButton.value]
  if (buttonId === undefined) return

  try {
    const defaultFn = defaultFunctions[selectedButton.value] ?? DEFAULT_KEY_FUNCTIONS['left-click']
    await store.sendFeatureReport(cmdSetKeyFunction(buttonId, defaultFn))
    const btnLabel = t(buttonOptions.find(b => b.id === selectedButton.value)?.labelKey ?? 'macros.btnDpi')
    showToast(t('macros.deleteSuccess', { button: btnLabel }), 'success')
  } catch (err) {
    console.error('Macro delete failed:', err)
    showToast(t('macros.deleteFailed'), 'error')
  }
}
</script>

<template>
  <div v-if="!store.connected" class="text-center text-text-muted py-20 text-sm font-display tracking-wider">{{ t('macros.connectFirst') }}</div>
  <div v-else class="macro-page">
    <h2 class="text-lg font-bold text-text-primary font-display tracking-widest uppercase mb-5">{{ t('macros.title') }}</h2>

    <!-- TOP BAR: Target button + record controls -->
    <section class="top-bar hud-card bg-bg-secondary border border-border-default p-4">
      <div class="top-bar-inner">
        <!-- Target button selector -->
        <div class="flex items-center gap-3">
          <span class="text-[10px] text-text-muted font-data tracking-wider uppercase whitespace-nowrap">{{ t('macros.targetButton') }}</span>
          <div class="macro-select-wrap">
            <select v-model="selectedButton" class="macro-select">
              <option v-for="btn in buttonOptions" :key="btn.id" :value="btn.id">{{ t(btn.labelKey) }}</option>
            </select>
            <div class="macro-select-arrow">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"/></svg>
            </div>
          </div>
          <button
            @click="deleteMacro"
            :disabled="uploadStatus === 'uploading'"
            class="macro-btn-danger"
          >{{ t('macros.deleteMacro') }}</button>
        </div>

        <!-- Record controls -->
        <div class="flex items-center gap-3">
          <button
            v-if="!recording"
            @click="startRecording"
            class="record-btn"
          >
            <span class="record-dot"></span>
            {{ t('macros.startRecording') }}
          </button>
          <button
            v-else
            @click="stopRecording"
            class="record-btn record-btn--active"
          >
            <span class="stop-icon"></span>
            {{ t('macros.stopRecording') }}
          </button>
          <button @click="clearRecording" class="macro-btn-outline">{{ t('macros.clear') }}</button>

          <!-- Keystroke counter LED -->
          <div v-if="recordedKeys.length || recording" class="led-counter">
            <span class="led-digit">{{ String(recordedKeys.length).padStart(2, '0') }}</span>
            <span class="led-sep">/</span>
            <span class="led-digit led-digit--max">{{ MAX_KEYSTROKES }}</span>
          </div>
        </div>
      </div>

      <!-- Recording indicator -->
      <div v-if="recording" class="flex items-center gap-2 mt-2">
        <span class="inline-block w-2 h-2 rounded-full bg-accent-red animate-pulse"></span>
        <span class="text-[10px] text-accent-red font-data tracking-wider uppercase">{{ t('macros.recording') }}</span>
      </div>
      <div v-if="recording" class="text-[9px] text-text-muted/60 font-data mt-1">
        {{ t('macros.maxKeystrokesWarning') }}
      </div>
    </section>

    <!-- MIDDLE: Two-column split - keystroke list + timeline -->
    <div v-if="recordedKeys.length" class="middle-split">
      <!-- LEFT: Keystroke list (scrollable) -->
      <section class="keystroke-panel hud-card bg-bg-secondary border border-border-default p-4">
        <h3 class="text-[10px] font-bold text-text-secondary font-display tracking-wider uppercase mb-3">Keystroke List</h3>

        <div class="keystroke-list">
          <div
            v-for="(entry, i) in recordedKeys" :key="i"
            @click="selectStep(i)"
            class="step-card"
            :class="[
              keyBorderColor(entry.code),
              selectedStep === i ? 'step-card--selected' : ''
            ]"
          >
            <span class="text-text-muted w-5 text-right shrink-0 font-data text-[9px]">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="w-2 h-2 rounded-full shrink-0" :class="keyColorDot(entry.code)"></span>
            <span
              class="font-bold font-data shrink-0 text-[11px] min-w-[48px]"
              :class="isRecognizedKey(entry.code) ? 'text-accent-cyan' : 'text-accent-red/60'"
            >{{ entry.key }}</span>
            <span class="text-text-muted font-data text-[9px] truncate">{{ entry.code }}</span>
            <span v-if="!isRecognizedKey(entry.code)" class="text-accent-red/40 text-[8px] font-data shrink-0">(unmapped)</span>
            <div class="ml-auto flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                :value="entry.delay"
                @input="updateDelay(i, ($event.target as HTMLInputElement).value)"
                @click.stop
                min="0"
                class="step-delay-input"
              />
              <span class="text-[8px] text-text-muted/40 font-data">ms</span>
              <button @click.stop="duplicateStep(i)" class="step-action-btn step-action-btn--cyan" title="Duplicate">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="1"/><path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"/></svg>
              </button>
              <button @click.stop="deleteStep(i)" class="step-action-btn step-action-btn--red" title="Delete">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              <button @click.stop="startInsert(i)" class="step-action-btn step-action-btn--purple" title="Insert after">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Insert capture overlay -->
        <div v-if="insertingAt !== null" class="insert-capture-bar mt-3">
          <span class="inline-block w-2 h-2 rounded-full bg-accent-purple animate-pulse"></span>
          <span class="text-xs text-accent-purple font-data tracking-wider">{{ t('macros.insertCapture') }}</span>
          <button @click="cancelInsert" class="ml-auto macro-btn-outline text-[9px]">{{ t('macros.insertCancelCapture') }}</button>
        </div>
      </section>

      <!-- RIGHT: Visual timeline -->
      <section class="timeline-panel hud-card bg-bg-secondary border border-border-default p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-[10px] font-bold text-text-secondary font-display tracking-wider uppercase">{{ t('macros.timelineSection') }}</h3>
          <div class="led-counter led-counter--sm">
            <span class="text-[9px] font-data text-text-muted/50 mr-1.5">{{ t('macros.totalDuration') }}</span>
            <span class="led-digit">{{ formatMs(totalDuration) }}</span>
          </div>
        </div>

        <!-- Color legend -->
        <div class="flex items-center gap-4 text-[9px] text-text-muted font-data tracking-wide mb-3">
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 bg-blue-400 inline-block" style="clip-path: polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)"></span> Modifier</span>
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 bg-emerald-400 inline-block" style="clip-path: polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)"></span> Letter</span>
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 bg-orange-400 inline-block" style="clip-path: polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)"></span> Function</span>
          <span class="flex items-center gap-1.5"><span class="w-2 h-2 bg-gray-400 inline-block" style="clip-path: polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)"></span> Other</span>
        </div>

        <!-- Timeline bar -->
        <div class="overflow-x-auto pb-2">
          <div class="timeline-track">
            <div
              v-for="(entry, i) in recordedKeys"
              :key="'tl-' + i"
              class="timeline-block"
              :class="[
                keyColor(entry.code),
                selectedStep === i ? 'timeline-block--selected' : '',
                draggingIndex === i ? 'opacity-80' : ''
              ]"
              :style="{
                width: blockWidth(i === 0 ? 50 : entry.delay) + 'px',
                marginRight: '2px',
                '--neon-color': timelineNeonColor(entry.code)
              }"
              @click="selectStep(i)"
            >
              <span class="truncate px-1 text-[8px] font-bold font-data">{{ entry.key }}</span>

              <!-- Delay label above block -->
              <span
                v-if="entry.delay > 0"
                class="absolute -top-4 left-0 right-0 text-center text-[7px] font-data"
                :class="draggingIndex === i - 1 ? 'text-accent-gold font-bold' : 'text-text-muted/50'"
              >
                {{ draggingIndex === i - 1 && dragDelayPreview !== null ? dragDelayPreview : entry.delay }}ms
              </span>

              <!-- Drag handle on right edge -->
              <div
                v-if="i < recordedKeys.length - 1"
                class="drag-handle"
                @mousedown="onDragStart(i, $event)"
              ></div>
            </div>

            <!-- Total duration marker -->
            <div class="flex-shrink-0 h-10 flex items-center pl-3 border-l-2 border-accent-gold/40">
              <div class="led-counter led-counter--sm">
                <span class="led-digit text-accent-gold">{{ formatMs(totalDuration) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- BOTTOM: Upload controls -->
    <section v-if="recordedKeys.length" class="hud-card bg-bg-secondary border border-border-default p-4 mt-4">
      <div class="flex items-center justify-between">
        <span class="text-[10px] text-text-muted/50 font-data">{{ recordedKeys.length }} / {{ MAX_KEYSTROKES }} {{ t('macros.keystrokesRecorded') }}</span>
        <button
          @click="uploadMacro"
          :disabled="uploadStatus === 'uploading' || !store.connected"
          class="upload-btn"
          :class="{
            'upload-btn--done': uploadStatus === 'done',
            'upload-btn--error': uploadStatus === 'error',
          }"
        >
          {{ uploadStatus === 'uploading' ? t('macros.uploading') : uploadStatus === 'done' ? t('macros.uploadDone') : uploadStatus === 'error' ? t('macros.uploadError') : t('macros.upload') }}
        </button>
      </div>

      <!-- Progress bar -->
      <div v-if="uploadStatus === 'uploading'" class="upload-progress-track mt-3">
        <div class="upload-progress-fill" :style="{ width: uploadPercent + '%' }"></div>
      </div>
      <div v-if="uploadProgress" class="text-[9px] text-accent-purple/70 font-data tracking-wide mt-2">
        {{ uploadProgress }}
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ── Page layout ───────────────────────────────────────────────────────── */
.macro-page {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Top bar ───────────────────────────────────────────────────────────── */
.top-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

/* ── Middle split: keystroke list + timeline ────────────────────────────── */
.middle-split {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 16px;
  margin-top: 16px;
}

@media (max-width: 900px) {
  .middle-split {
    grid-template-columns: 1fr;
  }
}

.keystroke-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.keystroke-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  space-y: 1px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 4px;
}

.timeline-panel {
  min-height: 0;
  overflow: hidden;
}

/* ── Select Dropdown ────────────────────────────────────────────────────── */
.macro-select-wrap {
  position: relative;
}
.macro-select {
  width: 160px;
  appearance: none;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-default);
  padding: 6px 28px 6px 10px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: var(--color-text-primary);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  transition: border-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.macro-select:focus {
  outline: none;
  border-color: var(--color-accent-purple);
  box-shadow: 0 0 12px rgba(147, 51, 234, 0.25);
}
.macro-select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

/* ── Buttons ────────────────────────────────────────────────────────────── */
.macro-btn-danger {
  padding: 6px 12px;
  font-size: 10px;
  font-family: ui-monospace, monospace;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-accent-red);
  border: 1px solid rgba(239, 68, 68, 0.3);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  transition: background-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.macro-btn-danger:hover {
  background: rgba(239, 68, 68, 0.2);
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
}
.macro-btn-danger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.macro-btn-outline {
  padding: 5px 12px;
  font-size: 10px;
  font-family: ui-monospace, monospace;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-default);
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
  transition: color 0.15s, border-color 0.15s;
  cursor: pointer;
}
.macro-btn-outline:hover {
  color: var(--color-text-primary);
  border-color: var(--color-accent-cyan);
}

/* ── Record Button ──────────────────────────────────────────────────────── */
.record-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  font-size: 10px;
  font-family: ui-monospace, monospace;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-accent-red);
  border: 1px solid rgba(239, 68, 68, 0.4);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  transition: background-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.record-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
}
.record-btn--active {
  animation: recordPulse 1.5s ease-in-out infinite;
}

.record-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent-red);
}
.record-btn--active .record-dot {
  display: none;
}
.stop-icon {
  width: 8px;
  height: 8px;
  background: var(--color-accent-red);
}

@keyframes recordPulse {
  0%, 100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.2); }
  50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.5), 0 0 60px rgba(239, 68, 68, 0.15); }
}

/* ── LED Counter ────────────────────────────────────────────────────────── */
.led-counter {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--color-border-default);
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
}
.led-counter--sm {
  padding: 2px 8px;
}
.led-digit {
  font-family: ui-monospace, monospace;
  font-weight: 700;
  font-size: 13px;
  color: var(--color-accent-cyan);
  text-shadow: 0 0 8px rgba(6, 182, 212, 0.5);
  letter-spacing: 0.1em;
}
.led-counter--sm .led-digit {
  font-size: 11px;
}
.led-sep {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 0 1px;
}
.led-digit--max {
  color: var(--color-text-muted);
  text-shadow: none;
}

/* ── Step Cards ─────────────────────────────────────────────────────────── */
.step-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: var(--color-bg-tertiary);
  border: 1px solid transparent;
  border-left-width: 3px;
  cursor: pointer;
  transition: background-color 0.12s, border-color 0.12s, box-shadow 0.12s;
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%);
}
.step-card:hover {
  background: color-mix(in srgb, var(--color-bg-tertiary) 80%, var(--color-accent-purple) 5%);
}
.step-card--selected {
  background: rgba(147, 51, 234, 0.1);
  border-color: rgba(147, 51, 234, 0.3);
  border-left-color: var(--color-accent-purple);
  box-shadow: 0 0 15px rgba(147, 51, 234, 0.1);
}

.step-delay-input {
  width: 48px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border-default);
  padding: 2px 4px;
  font-size: 9px;
  font-family: ui-monospace, monospace;
  color: var(--color-text-primary);
  text-align: right;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.step-delay-input:focus {
  outline: none;
  border-color: var(--color-accent-cyan);
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.2);
}

.step-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1px solid transparent;
  background: transparent;
  transition: color 0.12s, border-color 0.12s, background-color 0.12s;
  cursor: pointer;
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
}
.step-action-btn--cyan {
  color: rgba(6, 182, 212, 0.5);
  border-color: rgba(6, 182, 212, 0.15);
}
.step-action-btn--cyan:hover {
  color: var(--color-accent-cyan);
  border-color: rgba(6, 182, 212, 0.4);
  background: rgba(6, 182, 212, 0.08);
}
.step-action-btn--red {
  color: rgba(239, 68, 68, 0.5);
  border-color: rgba(239, 68, 68, 0.15);
}
.step-action-btn--red:hover {
  color: var(--color-accent-red);
  border-color: rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.08);
}
.step-action-btn--purple {
  color: rgba(147, 51, 234, 0.5);
  border-color: rgba(147, 51, 234, 0.15);
}
.step-action-btn--purple:hover {
  color: var(--color-accent-purple);
  border-color: rgba(147, 51, 234, 0.4);
  background: rgba(147, 51, 234, 0.08);
}

/* ── Insert Capture Bar ─────────────────────────────────────────────────── */
.insert-capture-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: rgba(147, 51, 234, 0.06);
  border: 1px solid rgba(147, 51, 234, 0.3);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
}

/* ── Upload Button ──────────────────────────────────────────────────────── */
.upload-btn {
  padding: 6px 16px;
  font-size: 10px;
  font-family: ui-monospace, monospace;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: rgba(147, 51, 234, 0.12);
  color: var(--color-accent-purple);
  border: 1px solid rgba(147, 51, 234, 0.35);
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  transition: background-color 0.15s, box-shadow 0.15s;
  cursor: pointer;
}
.upload-btn:hover {
  background: rgba(147, 51, 234, 0.22);
  box-shadow: 0 0 15px rgba(147, 51, 234, 0.25);
}
.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.upload-btn--done {
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-accent-green);
  border-color: rgba(34, 197, 94, 0.35);
}
.upload-btn--error {
  background: rgba(239, 68, 68, 0.12);
  color: var(--color-accent-red);
  border-color: rgba(239, 68, 68, 0.35);
}

/* ── Upload Progress Bar ────────────────────────────────────────────────── */
.upload-progress-track {
  height: 6px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--color-border-default);
  overflow: hidden;
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
}
.upload-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent-purple), var(--color-accent-cyan));
  box-shadow: 0 0 10px rgba(147, 51, 234, 0.5);
  transition: width 0.3s ease;
}

/* ── Timeline ───────────────────────────────────────────────────────────── */
.timeline-track {
  display: flex;
  align-items: end;
  min-width: max-content;
  height: 64px;
  padding: 4px 0;
}

.timeline-block {
  position: relative;
  flex-shrink: 0;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-width: 1px;
  font-family: ui-monospace, monospace;
  color: white;
  cursor: pointer;
  user-select: none;
  transition: box-shadow 0.15s, transform 0.1s;
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));
}
.timeline-block:hover {
  transform: translateY(-1px);
}
.timeline-block--selected {
  box-shadow: 0 0 16px var(--neon-color, rgba(147, 51, 234, 0.5)), 0 0 4px var(--neon-color, rgba(147, 51, 234, 0.3));
  outline: 2px solid var(--color-accent-purple);
  outline-offset: 1px;
  z-index: 2;
}

.drag-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  transition: background-color 0.15s, box-shadow 0.15s;
  border-radius: 0 2px 2px 0;
}
.drag-handle:hover {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}
</style>

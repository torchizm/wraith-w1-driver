<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

// Drawing state
const isDrawing = ref(false)
const activeButton = ref(-1)
let lastX = 0
let lastY = 0

// Stats
const mouseX = ref(0)
const mouseY = ref(0)
const speed = ref(0)
const totalDistance = ref(0)
const pollingRate = ref(0)

// Speed / polling tracking
let lastMoveTime = 0
let moveCountInSecond = 0
let pollingInterval: ReturnType<typeof setInterval> | null = null

// Angle snap test
const angleSnapMode = ref(false)
let angleSnapStartY = 0
let maxDeviation = ref(0)
let angleSnapLineActive = false

function getButtonColor(button: number): string {
  switch (button) {
    case 0: return '#ef4444'  // left - red
    case 2: return '#22d3ee'  // right - blue (using cyan to match theme)
    case 1: return '#22c55e'  // middle - green
    default: return '#ef4444'
  }
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  // Save current drawing
  const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height)
  canvas.width = rect.width * devicePixelRatio
  canvas.height = rect.height * devicePixelRatio
  ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(devicePixelRatio, devicePixelRatio)
  // Restore drawing
  if (imageData) {
    ctx.putImageData(imageData, 0, 0)
  }
  if (angleSnapMode.value) drawReferenceLine()
}

function drawReferenceLine() {
  if (!ctx || !canvasRef.value) return
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const midY = rect.height / 2
  ctx.save()
  ctx.setLineDash([6, 4])
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, midY)
  ctx.lineTo(rect.width, midY)
  ctx.stroke()
  ctx.restore()
}

function clearCanvas() {
  if (!ctx || !canvasRef.value) return
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  ctx.clearRect(0, 0, rect.width * devicePixelRatio, rect.height * devicePixelRatio)
  totalDistance.value = 0
  maxDeviation.value = 0
  angleSnapLineActive = false
  if (angleSnapMode.value) drawReferenceLine()
}

function onMouseDown(e: MouseEvent) {
  if (!ctx || !canvasRef.value) return
  e.preventDefault()
  isDrawing.value = true
  activeButton.value = e.button
  const rect = canvasRef.value.getBoundingClientRect()
  lastX = e.clientX - rect.left
  lastY = e.clientY - rect.top

  if (angleSnapMode.value) {
    angleSnapStartY = lastY
    angleSnapLineActive = true
    maxDeviation.value = 0
  }
}

function onMouseMove(e: MouseEvent) {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  mouseX.value = Math.round(x)
  mouseY.value = Math.round(y)

  // Speed calculation
  const now = performance.now()
  if (lastMoveTime > 0) {
    const dt = (now - lastMoveTime) / 1000
    if (dt > 0) {
      const dx = e.movementX
      const dy = e.movementY
      const dist = Math.sqrt(dx * dx + dy * dy)
      speed.value = Math.round(dist / dt)
    }
  }
  lastMoveTime = now

  // Polling rate counter
  moveCountInSecond++

  if (!isDrawing.value || !ctx) return

  const dx = x - lastX
  const dy = y - lastY
  const dist = Math.sqrt(dx * dx + dy * dy)
  totalDistance.value += dist

  // Angle snap deviation
  if (angleSnapMode.value && angleSnapLineActive) {
    const dev = Math.abs(y - angleSnapStartY)
    if (dev > maxDeviation.value) {
      maxDeviation.value = Math.round(dev * 10) / 10
    }
  }

  ctx.strokeStyle = getButtonColor(activeButton.value)
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke()

  lastX = x
  lastY = y
}

function onMouseUp() {
  isDrawing.value = false
  activeButton.value = -1
}

function onContextMenu(e: Event) {
  e.preventDefault()
}

function toggleAngleSnap() {
  angleSnapMode.value = !angleSnapMode.value
  clearCanvas()
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  resizeCanvas()

  window.addEventListener('resize', resizeCanvas)

  // Polling rate measurement: count events per second
  pollingInterval = setInterval(() => {
    pollingRate.value = moveCountInSecond
    moveCountInSecond = 0
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (pollingInterval) clearInterval(pollingInterval)
})

const formattedDistance = computed(() => {
  if (totalDistance.value > 10000) {
    return `${(totalDistance.value / 1000).toFixed(1)}k`
  }
  return Math.round(totalDistance.value).toString()
})
</script>

<template>
  <div class="mouse-test-wrapper">
    <!-- Toolbar above canvas -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="toolbar-legend">
          <div class="legend-item">
            <span class="legend-dot legend-dot--red" />
            <span class="legend-label">{{ t('mouseTest.left') }}</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot legend-dot--green" />
            <span class="legend-label">{{ t('mouseTest.middle') }}</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot legend-dot--cyan" />
            <span class="legend-label">{{ t('mouseTest.right') }}</span>
          </div>
        </div>
      </div>

      <div class="toolbar-right">
        <!-- Angle snap deviation (inline in toolbar when active) -->
        <div v-if="angleSnapMode" class="deviation-inline">
          <span class="deviation-label">{{ t('mouseTest.maxDeviation') }}</span>
          <span class="deviation-value">{{ maxDeviation.toFixed(1) }}<span class="deviation-unit">px</span></span>
        </div>

        <button
          @click="toggleAngleSnap"
          class="toolbar-btn"
          :class="angleSnapMode ? 'toolbar-btn--active' : ''"
        >
          <span class="toolbar-indicator" :class="angleSnapMode ? 'toolbar-indicator--on' : ''" />
          <span>{{ t('mouseTest.angleSnap') }}</span>
        </button>
        <button @click="clearCanvas" class="toolbar-btn toolbar-btn--danger">
          {{ t('mouseTest.clear') }}
        </button>
      </div>
    </div>

    <!-- Canvas -->
    <div class="canvas-container">
      <canvas
        ref="canvasRef"
        class="sensor-canvas"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
        @contextmenu="onContextMenu"
      />
    </div>

    <!-- Stats bar below canvas -->
    <div class="stats-bar">
      <div class="stat-tile stat-tile--cyan">
        <span class="stat-label">{{ t('mouseTest.position') }}</span>
        <span class="stat-value">{{ mouseX }}<span class="stat-sep">,</span>{{ mouseY }}</span>
      </div>
      <div class="stat-tile stat-tile--orange">
        <span class="stat-label">{{ t('mouseTest.speed') }}</span>
        <span class="stat-value">{{ speed }}<span class="stat-unit">px/s</span></span>
      </div>
      <div class="stat-tile stat-tile--green">
        <span class="stat-label">{{ t('mouseTest.distance') }}</span>
        <span class="stat-value">{{ formattedDistance }}<span class="stat-unit">px</span></span>
      </div>
      <div class="stat-tile stat-tile--purple">
        <span class="stat-label">{{ t('mouseTest.pollingRate') }}</span>
        <span class="stat-value">{{ pollingRate }}<span class="stat-unit">Hz</span></span>
      </div>
    </div>

    <!-- Hint -->
    <p class="hint-text">{{ t('mouseTest.hint') }}</p>
  </div>
</template>

<style scoped>
.mouse-test-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* -- Toolbar -- */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-legend {
  display: flex;
  align-items: center;
  gap: 14px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  transform: rotate(45deg);
}
.legend-dot--red   { background: var(--color-accent-red); }
.legend-dot--green { background: var(--color-accent-green); }
.legend-dot--cyan  { background: var(--color-accent-cyan); }

.legend-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
  font-family: var(--font-mono, monospace);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.deviation-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(6, 182, 212, 0.06);
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 6px;
}
.deviation-label {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(6, 182, 212, 0.6);
}
.deviation-value {
  font-family: var(--font-mono, monospace);
  font-size: 14px;
  font-weight: 700;
  color: var(--color-accent-cyan);
  line-height: 1;
}
.deviation-unit {
  font-size: 9px;
  opacity: 0.5;
  margin-left: 1px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-default);
  border-radius: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.toolbar-btn:hover {
  border-color: var(--color-accent-purple);
  color: var(--color-text-primary);
}
.toolbar-btn--active {
  border-color: var(--color-accent-purple);
  color: var(--color-accent-purple);
  background: rgba(128, 60, 238, 0.08);
  box-shadow: 0 0 10px rgba(128, 60, 238, 0.15);
}
.toolbar-btn--danger {
  color: var(--color-accent-red);
  border-color: rgba(239, 68, 68, 0.25);
  background: rgba(239, 68, 68, 0.05);
}
.toolbar-btn--danger:hover {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.4);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.15);
}

.toolbar-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-text-muted);
  transition: all 0.2s;
}
.toolbar-indicator--on {
  background: var(--color-accent-purple);
  box-shadow: 0 0 8px var(--color-accent-purple);
}

/* -- Canvas -- */
.canvas-container {
  position: relative;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  overflow: hidden;
}

.sensor-canvas {
  display: block;
  width: 100%;
  height: 500px;
  cursor: crosshair;
}

/* -- Stats Bar -- */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.stat-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 10px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  gap: 6px;
  transition: box-shadow 0.2s;
}

.stat-tile--cyan   { border-color: rgba(6, 182, 212, 0.2); }
.stat-tile--orange  { border-color: rgba(249, 115, 22, 0.2); }
.stat-tile--green   { border-color: rgba(34, 197, 94, 0.2); }
.stat-tile--purple  { border-color: rgba(128, 60, 238, 0.2); }

.stat-tile--cyan:hover   { box-shadow: 0 0 14px rgba(6, 182, 212, 0.12); }
.stat-tile--orange:hover  { box-shadow: 0 0 14px rgba(249, 115, 22, 0.12); }
.stat-tile--green:hover   { box-shadow: 0 0 14px rgba(34, 197, 94, 0.12); }
.stat-tile--purple:hover  { box-shadow: 0 0 14px rgba(128, 60, 238, 0.12); }

.stat-label {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.stat-value {
  font-family: var(--font-mono, monospace);
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
  color: var(--color-text-primary);
}

.stat-tile--cyan .stat-value   { color: var(--color-accent-cyan); }
.stat-tile--orange .stat-value  { color: var(--color-accent-orange); }
.stat-tile--green .stat-value   { color: var(--color-accent-green); }
.stat-tile--purple .stat-value  { color: var(--color-accent-purple); }

.stat-sep {
  opacity: 0.4;
  margin: 0 1px;
}
.stat-unit {
  font-size: 9px;
  opacity: 0.5;
  margin-left: 2px;
}

/* -- Hint -- */
.hint-text {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.5;
}
</style>

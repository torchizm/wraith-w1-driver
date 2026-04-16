<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { useToast } from '../composables/useToast'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'

const store = useDeviceStore()
const { showToast } = useToast()
const { t } = useI18n()
const connecting = ref(false)

async function handleConnect() {
  connecting.value = true
  try {
    await store.connect()
  } catch (e: any) {
    showToast(e.message || 'Failed to connect', 'error')
  } finally {
    connecting.value = false
  }
}
</script>

<template>
  <div class="connect-screen">
    <!-- Background grid pattern -->
    <div class="connect-grid" />

    <!-- Radial glow behind device -->
    <div class="connect-glow" />

    <div class="connect-content">
      <!-- Device silhouette / brand mark -->
      <div class="device-visual">
        <svg class="device-icon" width="120" height="120" viewBox="0 0 120 120" fill="none">
          <!-- Outer hexagonal frame -->
          <path
            d="M60 8L104 32V80L60 112L16 80V32L60 8Z"
            stroke="currentColor"
            stroke-width="0.5"
            opacity="0.15"
          />
          <path
            d="M60 20L92 38V74L60 100L28 74V38L60 20Z"
            stroke="currentColor"
            stroke-width="0.5"
            opacity="0.25"
          />
          <!-- Inner mouse silhouette -->
          <path
            d="M60 35C48 35 42 42 42 52V72C42 82 48 90 60 90C72 90 78 82 78 72V52C78 42 72 35 60 35Z"
            stroke="currentColor"
            stroke-width="1.2"
            opacity="0.5"
            fill="none"
          />
          <!-- Center line -->
          <line x1="60" y1="38" x2="60" y2="58" stroke="currentColor" stroke-width="0.8" opacity="0.3" />
          <!-- Scroll wheel -->
          <rect x="57" y="45" width="6" height="10" rx="3" stroke="currentColor" stroke-width="0.8" opacity="0.4" fill="none" />
          <!-- Sensor dot -->
          <circle cx="60" cy="75" r="2.5" fill="currentColor" opacity="0.4" />
          <!-- Pulsing ring -->
          <circle cx="60" cy="75" r="6" stroke="currentColor" stroke-width="0.5" opacity="0.2" class="pulse-ring" />
        </svg>
      </div>

      <!-- Brand text -->
      <div class="connect-brand">
        <h1 class="connect-title">WRAITH <span class="connect-title-accent">W1</span></h1>
        <p class="connect-subtitle">{{ t('dashboard.connectPrompt') }}</p>
      </div>

      <!-- Connect button -->
      <button
        class="connect-btn"
        :class="{ 'connect-btn--loading': connecting }"
        @click="handleConnect"
        :disabled="connecting"
      >
        <svg v-if="!connecting" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14"/>
          <path d="M12 5l7 7-7 7"/>
        </svg>
        <svg v-else class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
        </svg>
        <span>{{ connecting ? 'Connecting...' : t('dashboard.connectBtn') }}</span>
      </button>

      <!-- Supported browsers hint -->
      <div class="connect-hint">
        <span class="hint-label">WebHID</span>
        <span class="hint-sep">/</span>
        <span>Chrome, Edge, Opera</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.connect-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-base);
  z-index: 30;
}

/* Subtle grid */
.connect-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--color-border-subtle) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-border-subtle) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.5;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black, transparent);
}

/* Radial glow */
.connect-glow {
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 200, 255, 0.06) 0%, transparent 70%);
  pointer-events: none;
}

.connect-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  z-index: 1;
}

/* Device visual */
.device-visual {
  position: relative;
}
.device-icon {
  color: var(--color-accent-primary);
  filter: drop-shadow(0 0 30px rgba(0, 200, 255, 0.15));
}

@keyframes pulse-ring {
  0%, 100% { r: 6; opacity: 0.2; }
  50% { r: 10; opacity: 0; }
}
.pulse-ring {
  animation: pulse-ring 3s ease-in-out infinite;
}

/* Brand */
.connect-brand {
  text-align: center;
  max-width: 420px;
}
.connect-title {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--color-text-primary);
  margin: 0 0 12px;
}
.connect-title-accent {
  color: var(--color-accent-primary);
  font-weight: 600;
}
.connect-subtitle {
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin: 0;
}

/* Connect button */
.connect-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 36px;
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #0b0e14;
  background: var(--color-accent-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}
.connect-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%);
  pointer-events: none;
}
.connect-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 40px rgba(0, 200, 255, 0.3), 0 8px 32px rgba(0, 0, 0, 0.3);
}
.connect-btn:active:not(:disabled) {
  transform: translateY(0);
}
.connect-btn--loading {
  opacity: 0.8;
  cursor: wait;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 0.8s linear infinite;
}

/* Hint */
.connect-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-muted);
}
.hint-label {
  font-weight: 600;
  color: var(--color-text-secondary);
}
.hint-sep {
  opacity: 0.4;
}

/* Light mode */
[data-theme="light"] .connect-btn {
  color: #ffffff;
}
[data-theme="light"] .connect-glow {
  background: radial-gradient(circle, rgba(0, 148, 204, 0.06) 0%, transparent 70%);
}
</style>

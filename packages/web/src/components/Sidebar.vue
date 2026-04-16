<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../composables/useTheme'
import { useLocale } from '../composables/useLocale'

const store = useDeviceStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { theme, toggle: toggleTheme } = useTheme()
const { locale, setLocale } = useLocale()

const currentDPI = computed(() => {
  const idx = store.currentDPIIndex
  const levels = store.dpiLevels
  return levels.length > idx ? levels[idx] : 0
})

const batteryPercent = computed(() => Math.max(0, Math.min(100, store.batteryLevel)))

const batteryColor = computed(() => {
  if (store.isCharging) return '#34d399'
  if (store.batteryLevel <= 15) return '#f87171'
  if (store.batteryLevel <= 30) return '#fb923c'
  return '#34d399'
})

const navItems = computed(() => [
  { path: '/', label: t('nav.dashboard'), name: 'overview', icon: 'grid' },
  { path: '/performance', label: t('nav.performance'), name: 'performance', icon: 'sliders' },
  { path: '/buttons', label: t('nav.buttons'), name: 'buttons', icon: 'mouse' },
  { path: '/macros', label: t('nav.macros'), name: 'macros', icon: 'command' },
  { path: '/profiles', label: t('nav.profiles'), name: 'profiles', icon: 'layers' },
  { path: '/mouse-test', label: t('nav.mouseTest'), name: 'mousetest', icon: 'crosshair' },
])

function navigate(path: string) {
  router.push(path)
}
</script>

<template>
  <aside class="sidebar">
    <!-- Brand -->
    <div class="sidebar-brand">
      <div class="brand-mark">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/>
          <path d="M12 6L6 9v6l6 3 6-3V9l-6-3z" fill="currentColor" opacity="0.6"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      </div>
      <div class="brand-text">
        <span class="brand-name">WRAITH</span>
        <span class="brand-model">W1</span>
      </div>
    </div>

    <!-- Device status strip -->
    <div class="device-status">
      <div class="status-row">
        <span class="status-label">BATTERY</span>
        <span class="status-value" :style="{ color: batteryColor }">
          {{ store.isCharging ? 'CHG' : `${store.batteryLevel}%` }}
        </span>
      </div>
      <div class="battery-track">
        <div
          class="battery-fill"
          :style="{
            width: `${batteryPercent}%`,
            backgroundColor: batteryColor,
            boxShadow: `0 0 8px ${batteryColor}40`
          }"
        />
      </div>

      <div class="status-grid">
        <div class="status-cell">
          <span class="status-label">POLL</span>
          <span class="status-value">{{ store.pollingRateHz >= 1000 ? `${store.pollingRateHz / 1000}K` : store.pollingRateHz }}Hz</span>
        </div>
        <div class="status-cell">
          <span class="status-label">DPI</span>
          <span class="status-value">{{ currentDPI }}</span>
        </div>
        <div class="status-cell">
          <span class="status-label">PROFILE</span>
          <span class="status-value">P{{ store.currentProfile + 1 }}</span>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.name"
        class="nav-item"
        :class="{ 'nav-item--active': route.name === item.name }"
        @click="navigate(item.path)"
      >
        <span class="nav-accent" />
        <span class="nav-label">{{ item.label }}</span>
      </button>

      <div class="nav-separator" />

      <button
        class="nav-item"
        :class="{
          'nav-item--active': route.name === 'daemon',
          'nav-item--daemon-connected': store.daemonConnected && route.name !== 'daemon'
        }"
        @click="navigate('/daemon')"
      >
        <span class="nav-accent" />
        <span class="nav-label">{{ t('nav.daemon') }}</span>
        <span
          v-if="store.daemonConnected"
          class="daemon-dot"
        />
      </button>
    </nav>

    <!-- Bottom controls -->
    <div class="sidebar-footer">
      <div class="footer-controls">
        <!-- Theme toggle -->
        <button
          class="control-btn"
          @click="toggleTheme"
          :title="theme === 'dark' ? 'Light mode' : 'Dark mode'"
        >
          <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>

        <!-- Language toggle -->
        <div class="lang-toggle">
          <button
            class="lang-btn"
            :class="{ 'lang-btn--active': locale === 'en' }"
            @click="setLocale('en')"
          >EN</button>
          <button
            class="lang-btn"
            :class="{ 'lang-btn--active': locale === 'tr' }"
            @click="setLocale('tr')"
          >TR</button>
        </div>
      </div>

      <!-- Disconnect -->
      <button
        class="disconnect-btn"
        @click="store.disconnect()"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        {{ t('nav.disconnect') }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--color-bg-raised);
  border-right: 1px solid var(--color-border-subtle);
  display: flex;
  flex-direction: column;
  z-index: 40;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── Brand ───────────────────── */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 22px 20px;
}
.brand-mark {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent-primary);
}
.brand-text {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.brand-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--color-text-primary);
}
.brand-model {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-accent-primary);
  opacity: 0.8;
}

/* ── Device status ───────────── */
.device-status {
  margin: 0 14px 8px;
  padding: 14px;
  background: var(--color-bg-base);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}
.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.status-label {
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
}
.status-value {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.battery-track {
  height: 3px;
  background: var(--color-border-subtle);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 14px;
}
.battery-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease, background-color 0.3s ease;
}
.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 2px;
}
.status-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 0;
  background: var(--color-bg-raised);
  border-radius: var(--radius-sm);
}

/* ── Navigation ──────────────── */
.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.15s ease;
  text-align: left;
}
.nav-accent {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  border-radius: 0 2px 2px 0;
  background: var(--color-accent-primary);
  transition: height 0.2s ease;
}
.nav-label {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: color 0.15s ease, font-weight 0.15s ease;
}
.nav-item:hover {
  background: var(--color-bg-overlay);
}
.nav-item:hover .nav-label {
  color: var(--color-text-primary);
}
.nav-item--active {
  background: rgba(0, 200, 255, 0.06);
}
.nav-item--active .nav-accent {
  height: 20px;
}
.nav-item--active .nav-label {
  color: var(--color-accent-primary);
  font-weight: 600;
}
.nav-item--daemon-connected .nav-label {
  color: var(--color-text-secondary);
}
.daemon-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.5);
  margin-left: auto;
}

.nav-separator {
  height: 1px;
  background: var(--color-border-subtle);
  margin: 6px 14px;
}

/* ── Footer ──────────────────── */
.sidebar-footer {
  padding: 14px;
  border-top: 1px solid var(--color-border-subtle);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.footer-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.control-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.control-btn:hover {
  color: var(--color-accent-secondary);
  border-color: var(--color-border-default);
  background: var(--color-bg-overlay);
}
.lang-toggle {
  display: flex;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.lang-btn {
  padding: 5px 10px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.lang-btn:hover {
  color: var(--color-text-primary);
}
.lang-btn--active {
  background: var(--color-accent-primary);
  color: #0b0e14;
}
.disconnect-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 8px;
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}
.disconnect-btn:hover {
  color: var(--color-danger);
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(248, 113, 113, 0.06);
}

/* Light mode adjustments */
[data-theme="light"] .nav-item--active {
  background: rgba(0, 148, 204, 0.08);
}
[data-theme="light"] .lang-btn--active {
  color: #ffffff;
}
</style>

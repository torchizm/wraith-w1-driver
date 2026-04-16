<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const store = useDeviceStore()
const { t } = useI18n()

const RELEASES_URL = 'https://github.com/torchizm/wraith-w1-driver/releases'
const BLOG_URL = 'https://blog.xn--tea.app/blog/reverse-engineering-a-gaming-mouse-building-a-macos-driver-for-the-wraith-w1-from-scratch'

const installPlatform = ref<'macos' | 'windows'>('macos')

const installSteps = computed(() => {
  if (installPlatform.value === 'macos') {
    return [1, 2, 3, 4, 5, 6].map(i => t(`daemon.macosStep${i}`))
  }
  return [1, 2, 3].map(i => t(`daemon.windowsStep${i}`))
})

const ccButtons = [
  { id: 'START',      labelKey: 'daemon.btnStart' },
  { id: 'STOP',       labelKey: 'daemon.btnStop' },
  { id: 'MACRO',      labelKey: 'daemon.btnMacro' },
  { id: 'ARROW_UP',   labelKey: 'daemon.btnArrowUp' },
  { id: 'ARROW_DOWN', labelKey: 'daemon.btnArrowDown' },
  { id: 'MUTE',       labelKey: 'daemon.btnMute' },
]

const actionTypes = [
  { value: 'none',               labelKey: 'daemon.actionNone' },
  { value: 'launch_app',         labelKey: 'daemon.actionLaunchApp' },
  { value: 'keyboard_shortcut',  labelKey: 'daemon.actionKeyboard' },
  { value: 'shell_command',      labelKey: 'daemon.actionShell' },
  { value: 'open_url',           labelKey: 'daemon.actionUrl' },
  { value: 'system',             labelKey: 'daemon.actionSystem' },
]

const systemActions = [
  { value: 'play_pause',      labelKey: 'daemon.sysPlayPause' },
  { value: 'next_track',      labelKey: 'daemon.sysNextTrack' },
  { value: 'prev_track',      labelKey: 'daemon.sysPrevTrack' },
  { value: 'volume_up',       labelKey: 'daemon.sysVolumeUp' },
  { value: 'volume_down',     labelKey: 'daemon.sysVolumeDown' },
  { value: 'volume_mute',     labelKey: 'daemon.sysVolumeMute' },
  { value: 'screenshot',      labelKey: 'daemon.sysScreenshot' },
  { value: 'lock_screen',     labelKey: 'daemon.sysLockScreen' },
  { value: 'show_desktop',    labelKey: 'daemon.sysShowDesktop' },
  { value: 'task_manager',    labelKey: 'daemon.sysTaskManager' },
  { value: 'mission_control', labelKey: 'daemon.sysMissionControl' },
]

const buttonActions = ref<Record<string, { type: string; value: string }>>({
  START:      { type: 'none', value: '' },
  STOP:       { type: 'none', value: '' },
  MACRO:      { type: 'none', value: '' },
  ARROW_UP:   { type: 'none', value: '' },
  ARROW_DOWN: { type: 'none', value: '' },
  MUTE:       { type: 'none', value: '' },
})

const appProfiles = ref<Record<string, number>>({})
const newAppId = ref('')
const newAppProfile = ref(0)

// Per-app button action overrides
// Structure: { [bundleId/exeName]: { [button]: { type, value } } }
const appActions = ref<Record<string, Record<string, { type: string; value: string }>>>({})
const newAppActionId = ref('')

const profilesExpanded = ref(false)
const appActionsExpanded = ref(false)

function loadFromDaemon() {
  if (!store.daemonConnected) return

  const pending = new Set(['cc_actions', 'app_profiles', 'app_actions'])
  const prevHandler = store.daemon.onMessage
  store.daemon.onMessage = (type, payload) => {
    handleLogMessage(type, payload)
    if (type === 'cc_actions' && payload) {
      for (const [button, actionData] of Object.entries(payload)) {
        const action = (actionData as any)?.value ?? actionData
        if (action && typeof action === 'object' && 'type' in action) {
          buttonActions.value[button] = {
            type: (action as any).type?.value ?? (action as any).type ?? 'none',
            value: (action as any).value?.value ?? (action as any).value ?? '',
          }
        }
      }
      pending.delete('cc_actions')
    } else if (type === 'app_profiles' && payload) {
      appProfiles.value = {}
      for (const [appId, profile] of Object.entries(payload as Record<string, number>)) {
        appProfiles.value[appId] = profile
      }
      pending.delete('app_profiles')
    } else if (type === 'app_actions' && payload) {
      appActions.value = {}
      for (const [appId, buttons] of Object.entries(payload as Record<string, Record<string, any>>)) {
        appActions.value[appId] = {}
        for (const [button, actionData] of Object.entries(buttons)) {
          const action = (actionData as any)?.value ?? actionData
          if (action && typeof action === 'object' && 'type' in action) {
            appActions.value[appId][button] = {
              type: (action as any).type?.value ?? (action as any).type ?? 'none',
              value: (action as any).value?.value ?? (action as any).value ?? '',
            }
          }
        }
      }
      pending.delete('app_actions')
    } else if (prevHandler) {
      prevHandler(type, payload)
    }
    if (pending.size === 0) {
      // Restore original handler but keep capturing log messages
      store.daemon.onMessage = (t, p) => {
        handleLogMessage(t, p)
        if (prevHandler) prevHandler(t, p)
      }
    }
  }

  store.daemon.send('get_cc_actions')
  store.daemon.send('get_app_profiles')
  store.daemon.send('get_app_actions')
}

onMounted(() => {
  if (store.daemonConnected) loadFromDaemon()
})
watch(() => store.daemonConnected, (connected) => {
  if (connected) loadFromDaemon()
})

function saveAction(buttonId: string) {
  const action = buttonActions.value[buttonId]
  store.daemon.send('set_cc_action', {
    button: buttonId,
    action: { type: action.type, value: action.value },
  })
}

function addAppProfile() {
  const appId = newAppId.value.trim()
  if (!appId) return
  store.daemon.send('set_app_profile', { bundleId: appId, profile: newAppProfile.value })
  appProfiles.value[appId] = newAppProfile.value
  newAppId.value = ''
  newAppProfile.value = 0
}

function removeAppProfile(appId: string) {
  store.daemon.send('set_app_profile', { bundleId: appId, profile: -1 })
  delete appProfiles.value[appId]
}

// -- Per-App Button Actions --

function addAppAction() {
  const appId = newAppActionId.value.trim()
  if (!appId || appActions.value[appId]) return
  // Initialize with all buttons set to "none"
  appActions.value[appId] = {}
  for (const btn of ccButtons) {
    appActions.value[appId][btn.id] = { type: 'none', value: '' }
  }
  newAppActionId.value = ''
}

function saveAppAction(appId: string, buttonId: string) {
  const action = appActions.value[appId]?.[buttonId]
  if (!action) return
  store.daemon.send('set_app_action', {
    bundleId: appId,
    button: buttonId,
    action: { type: action.type, value: action.value },
  })
}

function removeAppActions(appId: string) {
  store.daemon.send('delete_app_actions', { bundleId: appId })
  delete appActions.value[appId]
}

// -- Daemon Logs --

interface LogEntry {
  level: 'info' | 'warn' | 'error'
  message: string
  timestamp: number
}

const MAX_LOG_ENTRIES = 100
const logEntries = ref<LogEntry[]>([])
const logsExpanded = ref(true)
const logContainer = ref<HTMLElement | null>(null)

function handleLogMessage(type: string, payload: any) {
  if (type === 'log' && payload) {
    logEntries.value.push({
      level: payload.level ?? 'info',
      message: payload.message ?? '',
      timestamp: payload.timestamp ?? Date.now(),
    })
    if (logEntries.value.length > MAX_LOG_ENTRIES) {
      logEntries.value.splice(0, logEntries.value.length - MAX_LOG_ENTRIES)
    }
    nextTick(() => {
      if (logContainer.value) {
        logContainer.value.scrollTop = logContainer.value.scrollHeight
      }
    })
  }
}

function clearLogs() {
  logEntries.value = []
}

function formatLogTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Store the original handler so we can restore it on unmount.
const storeOriginalHandler = store.daemon.onMessage

onUnmounted(() => {
  // Restore the store's original handler (remove log wrapper)
  store.daemon.onMessage = storeOriginalHandler
})

function getPlaceholder(type: string): string {
  switch (type) {
    case 'launch_app': return 'C:\\Program Files\\App\\app.exe'
    case 'keyboard_shortcut': return 'ctrl+shift+4'
    case 'shell_command': return 'cmd /c start notepad'
    case 'open_url': return 'https://example.com'
    default: return 'Action value'
  }
}
</script>

<template>
  <!-- NOT CONNECTED STATE -->
  <div v-if="!store.daemonConnected" class="disconnected-container">
    <div class="disconnected-content">
      <!-- Icon -->
      <div class="disconnected-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-accent-purple">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>

      <!-- Heading -->
      <h2 class="disconnected-title">{{ t('daemon.notDetected') }}</h2>
      <p class="disconnected-desc">{{ t('daemon.notDetectedDesc') }}</p>

      <!-- Download button -->
      <a
        :href="RELEASES_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="download-btn"
      >
        {{ t('daemon.downloadBtn') }}
      </a>

      <!-- Platform install guide -->
      <div class="install-card">
        <!-- Platform tabs -->
        <div class="platform-tabs">
          <button
            @click="installPlatform = 'macos'"
            class="platform-tab"
            :class="installPlatform === 'macos' ? 'platform-tab--active' : ''"
          >macOS</button>
          <button
            @click="installPlatform = 'windows'"
            class="platform-tab"
            :class="installPlatform === 'windows' ? 'platform-tab--active' : ''"
          >Windows</button>
        </div>

        <!-- Steps -->
        <ol class="install-steps">
          <li
            v-for="(step, i) in installSteps"
            :key="i"
            class="install-step"
          >
            <span class="step-num">{{ i + 1 }}</span>
            <span class="step-text">{{ step }}</span>
          </li>
        </ol>
      </div>

      <!-- Blog link -->
      <a
        :href="BLOG_URL"
        target="_blank"
        rel="noopener noreferrer"
        class="blog-link"
      >
        {{ t('daemon.blogLink') }}
      </a>
    </div>
  </div>

  <!-- CONNECTED STATE -->
  <div v-else class="daemon-connected">
    <!-- Header -->
    <div class="connected-header">
      <h2 class="connected-title">{{ t('daemon.title') }}</h2>
      <div class="status-badge">
        <span class="status-dot" />
        <span class="status-text">CONNECTED v{{ store.daemonVersion }}</span>
      </div>
    </div>

    <!-- CC Button Actions - 2-column grid -->
    <section class="section-card">
      <div class="section-header">
        <h3 class="section-heading">{{ t('daemon.ccActions') }}</h3>
      </div>
      <p class="section-desc">{{ t('daemon.ccActionsDesc') }}</p>

      <div class="cc-grid">
        <div
          v-for="btn in ccButtons" :key="btn.id"
          class="action-card"
        >
          <div class="action-card-header">
            <span class="action-btn-name">{{ t(btn.labelKey) }}</span>
            <button
              @click="saveAction(btn.id)"
              class="btn-save"
            >{{ t('daemon.save') }}</button>
          </div>

          <select
            v-model="buttonActions[btn.id].type"
            class="ds-select"
          >
            <option v-for="opt in actionTypes" :key="opt.value" :value="opt.value">{{ t(opt.labelKey) }}</option>
          </select>

          <select
            v-if="buttonActions[btn.id].type === 'system'"
            v-model="buttonActions[btn.id].value"
            class="ds-select"
          >
            <option v-for="opt in systemActions" :key="opt.value" :value="opt.value">{{ t(opt.labelKey) }}</option>
          </select>

          <input
            v-else-if="buttonActions[btn.id].type !== 'none'"
            v-model="buttonActions[btn.id].value"
            :placeholder="getPlaceholder(buttonActions[btn.id].type)"
            class="ds-input"
          />
        </div>
      </div>
    </section>

    <!-- Per-App Profiles (collapsible) -->
    <section class="section-card">
      <button
        @click="profilesExpanded = !profilesExpanded"
        class="section-header section-header--toggle"
      >
        <h3 class="section-heading">{{ t('daemon.perAppTitle') }}</h3>
        <span class="collapse-chevron" :class="profilesExpanded ? 'collapse-chevron--open' : ''">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 3L7.5 6L4.5 9"/></svg>
        </span>
      </button>

      <div v-show="profilesExpanded" class="section-body">
        <p class="section-desc-inner">{{ t('daemon.perAppDesc') }}</p>

        <!-- Existing mappings -->
        <div v-if="Object.keys(appProfiles).length" class="profile-list">
          <div
            v-for="(profile, appId) in appProfiles" :key="appId"
            class="profile-row"
          >
            <span class="profile-app-id">{{ appId }}</span>
            <span class="profile-badge">P{{ profile + 1 }}</span>
            <button
              @click="removeAppProfile(appId as string)"
              class="btn-remove"
            >&#10005;</button>
          </div>
        </div>
        <p v-else class="empty-msg">{{ t('daemon.perAppEmpty') }}</p>

        <!-- Add new -->
        <div class="add-row">
          <input
            v-model="newAppId"
            :placeholder="t('daemon.perAppPlaceholder')"
            class="ds-input flex-1"
            @keyup.enter="addAppProfile"
          />
          <select v-model="newAppProfile" class="ds-select w-20">
            <option :value="0">P1</option>
            <option :value="1">P2</option>
            <option :value="2">P3</option>
            <option :value="3">P4</option>
          </select>
          <button @click="addAppProfile" class="btn-save">{{ t('daemon.perAppAdd') }}</button>
        </div>
      </div>
    </section>

    <!-- Per-App Button Actions (collapsible) -->
    <section class="section-card">
      <button
        @click="appActionsExpanded = !appActionsExpanded"
        class="section-header section-header--toggle"
      >
        <h3 class="section-heading">{{ t('daemon.perAppActionsTitle') }}</h3>
        <span class="collapse-chevron" :class="appActionsExpanded ? 'collapse-chevron--open' : ''">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 3L7.5 6L4.5 9"/></svg>
        </span>
      </button>

      <div v-show="appActionsExpanded" class="section-body">
        <p class="section-desc-inner">{{ t('daemon.perAppActionsDesc') }}</p>

        <div v-if="Object.keys(appActions).length" class="app-actions-list">
          <div
            v-for="(_buttons, appId) in appActions" :key="appId"
            class="nested-card"
          >
            <div class="nested-card-header">
              <span class="nested-card-title">{{ appId }}</span>
              <button
                @click="removeAppActions(appId as string)"
                class="btn-danger"
              >{{ t('daemon.perAppActionsRemove') }}</button>
            </div>
            <div class="nested-actions">
              <div
                v-for="btn in ccButtons" :key="btn.id"
                class="nested-action-row"
              >
                <span class="nested-btn-name">{{ t(btn.labelKey) }}</span>
                <select
                  v-model="appActions[appId as string][btn.id].type"
                  class="ds-select flex-1"
                >
                  <option v-for="opt in actionTypes" :key="opt.value" :value="opt.value">{{ t(opt.labelKey) }}</option>
                </select>
                <select
                  v-if="appActions[appId as string][btn.id].type === 'system'"
                  v-model="appActions[appId as string][btn.id].value"
                  class="ds-select flex-1"
                >
                  <option v-for="opt in systemActions" :key="opt.value" :value="opt.value">{{ t(opt.labelKey) }}</option>
                </select>
                <input
                  v-else-if="appActions[appId as string][btn.id].type !== 'none'"
                  v-model="appActions[appId as string][btn.id].value"
                  :placeholder="getPlaceholder(appActions[appId as string][btn.id].type)"
                  class="ds-input flex-1"
                />
                <button
                  @click="saveAppAction(appId as string, btn.id)"
                  class="btn-save"
                >{{ t('daemon.save') }}</button>
              </div>
            </div>
          </div>
        </div>
        <p v-else class="empty-msg">{{ t('daemon.perAppActionsEmpty') }}</p>

        <div class="add-row">
          <input
            v-model="newAppActionId"
            :placeholder="t('daemon.perAppActionsPlaceholder')"
            class="ds-input flex-1"
            @keyup.enter="addAppAction"
          />
          <button @click="addAppAction" class="btn-save">{{ t('daemon.perAppActionsAdd') }}</button>
        </div>
      </div>
    </section>

    <!-- Daemon Logs -->
    <section class="section-card terminal-section">
      <button
        @click="logsExpanded = !logsExpanded"
        class="section-header section-header--toggle"
      >
        <div class="flex items-center gap-3">
          <h3 class="section-heading section-heading--green">{{ t('daemon.logsTitle') }}</h3>
          <span v-if="logEntries.length" class="log-count">({{ logEntries.length }})</span>
        </div>
        <span class="collapse-chevron" :class="logsExpanded ? 'collapse-chevron--open' : ''">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 3L7.5 6L4.5 9"/></svg>
        </span>
      </button>

      <div v-show="logsExpanded" class="terminal-body">
        <div class="terminal-toolbar">
          <button @click="clearLogs" class="btn-danger text-[9px]">{{ t('daemon.logsClear') }}</button>
        </div>

        <div
          ref="logContainer"
          class="terminal-scroll"
        >
          <p v-if="!logEntries.length" class="empty-msg text-center py-4">
            {{ t('daemon.logsEmpty') }}
          </p>
          <div
            v-for="(entry, i) in logEntries"
            :key="i"
            class="log-row"
          >
            <span class="log-ts">{{ formatLogTime(entry.timestamp) }}</span>
            <span
              class="log-level"
              :class="{
                'log-level--info': entry.level === 'info',
                'log-level--warn': entry.level === 'warn',
                'log-level--error': entry.level === 'error',
              }"
            >{{ entry.level }}</span>
            <span class="log-msg">{{ entry.message }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ========================================
   DISCONNECTED STATE
   ======================================== */
.disconnected-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.disconnected-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  max-width: 520px;
  text-align: center;
}

.disconnected-icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(128, 60, 238, 0.12), rgba(128, 60, 238, 0.04));
  border: 1px solid rgba(128, 60, 238, 0.2);
  animation: icon-glow 2.5s ease-in-out infinite;
}
@keyframes icon-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(128, 60, 238, 0.1); }
  50% { box-shadow: 0 0 30px rgba(128, 60, 238, 0.25); }
}

.disconnected-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-text-primary);
}

.disconnected-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 440px;
}

.download-btn {
  display: inline-block;
  padding: 10px 28px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #fff;
  background: var(--color-accent-purple);
  border: none;
  border-radius: 8px;
  text-decoration: none;
  transition: filter 0.15s, box-shadow 0.15s;
  box-shadow: 0 0 15px rgba(128, 60, 238, 0.3);
}
.download-btn:hover {
  filter: brightness(1.15);
  box-shadow: 0 0 25px rgba(128, 60, 238, 0.5);
}

/* -- Install card -- */
.install-card {
  width: 100%;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.platform-tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--color-bg-primary);
  border-radius: 6px;
  width: fit-content;
}
.platform-tab {
  padding: 5px 16px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  color: var(--color-text-muted);
  background: transparent;
}
.platform-tab--active {
  background: var(--color-accent-purple);
  color: #fff;
}

.install-steps {
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.install-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.step-num {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-accent-purple);
  border: 1px solid rgba(128, 60, 238, 0.3);
  background: rgba(128, 60, 238, 0.08);
  border-radius: 5px;
  margin-top: 1px;
}
.step-text {
  font-size: 12px;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.blog-link {
  font-size: 11px;
  color: rgba(128, 60, 238, 0.6);
  text-decoration: none;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: color 0.15s;
}
.blog-link:hover {
  color: var(--color-accent-purple);
}

/* ========================================
   CONNECTED STATE
   ======================================== */
.daemon-connected {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.connected-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.connected-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-text-primary);
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid rgba(128, 60, 238, 0.3);
  background: rgba(128, 60, 238, 0.06);
  border-radius: 6px;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent-purple);
  box-shadow: 0 0 6px var(--color-accent-purple);
  animation: pulse-dot 1.5s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.status-text {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--color-accent-purple);
}

/* -- Section card -- */
.section-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: 10px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-default);
  background: rgba(128, 60, 238, 0.02);
}
.section-header--toggle {
  justify-content: space-between;
  cursor: pointer;
  width: 100%;
  border: none;
  background: rgba(128, 60, 238, 0.02);
  transition: background 0.15s;
}
.section-header--toggle:hover {
  background: rgba(128, 60, 238, 0.05);
}

.section-heading {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-accent-purple);
}
.section-heading--green {
  color: var(--color-accent-green);
}

.collapse-chevron {
  color: var(--color-text-muted);
  transition: transform 0.2s ease;
  display: flex;
  align-items: center;
}
.collapse-chevron--open {
  transform: rotate(90deg);
}

.section-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  padding: 10px 16px 0;
}
.section-desc-inner {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}

.section-body {
  padding: 16px;
}

/* -- CC Button Actions 2-col grid -- */
.cc-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 14px 16px 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
}
.action-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.action-btn-name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-red);
}

/* -- Shared form elements -- */
.ds-select {
  appearance: none;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  padding: 6px 10px;
  font-size: 11px;
  color: var(--color-text-primary);
  border-radius: 5px;
  outline: none;
  transition: border-color 0.15s;
}
.ds-select:focus {
  border-color: var(--color-accent-purple);
  box-shadow: 0 0 8px rgba(128, 60, 238, 0.2);
}

.ds-input {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  padding: 6px 10px;
  font-size: 11px;
  font-family: var(--font-mono, monospace);
  color: var(--color-text-primary);
  border-radius: 5px;
  outline: none;
  transition: border-color 0.15s;
}
.ds-input:focus {
  border-color: var(--color-accent-purple);
  box-shadow: 0 0 10px rgba(128, 60, 238, 0.25);
}
.ds-input::placeholder {
  color: var(--color-text-muted);
  opacity: 0.4;
}

/* -- Buttons -- */
.btn-save {
  padding: 5px 12px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent-purple);
  background: rgba(128, 60, 238, 0.1);
  border: 1px solid rgba(128, 60, 238, 0.3);
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  white-space: nowrap;
}
.btn-save:hover {
  background: rgba(128, 60, 238, 0.18);
  box-shadow: 0 0 10px rgba(128, 60, 238, 0.2);
}

.btn-danger {
  padding: 4px 10px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-accent-red);
  background: rgba(239, 68, 68, 0.06);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-danger:hover {
  background: rgba(239, 68, 68, 0.12);
}

.btn-remove {
  color: var(--color-text-muted);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  transition: color 0.15s;
  padding: 2px;
}
.btn-remove:hover {
  color: var(--color-accent-red);
}

/* -- Profile rows -- */
.profile-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.profile-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border-default);
  border-radius: 6px;
}
.profile-app-id {
  flex: 1;
  font-size: 11px;
  font-family: var(--font-mono, monospace);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.profile-badge {
  font-size: 9px;
  font-weight: 700;
  color: var(--color-accent-purple);
  padding: 2px 8px;
  border: 1px solid rgba(128, 60, 238, 0.3);
  background: rgba(128, 60, 238, 0.08);
  border-radius: 4px;
}

.add-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-msg {
  font-size: 11px;
  color: var(--color-text-muted);
  opacity: 0.5;
  font-style: italic;
  margin-bottom: 12px;
}

/* -- Nested cards (per-app actions) -- */
.app-actions-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 14px;
}

.nested-card {
  padding: 14px;
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-tertiary);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.nested-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nested-card-title {
  font-size: 11px;
  font-family: var(--font-mono, monospace);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.05em;
}
.nested-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.nested-action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: 6px;
}
.nested-btn-name {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-red);
  width: 80px;
  flex-shrink: 0;
}

/* -- Terminal / Logs -- */
.terminal-section {
  background: rgba(10, 10, 15, 0.7);
}

.terminal-body {
  border-top: 1px solid var(--color-border-default);
}

.terminal-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 6px 14px;
  border-bottom: 1px solid rgba(58, 31, 110, 0.3);
}

.terminal-scroll {
  max-height: 260px;
  overflow-y: auto;
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  line-height: 1.6;
}

.log-count {
  font-size: 9px;
  color: var(--color-text-muted);
  font-family: var(--font-mono, monospace);
}

.log-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 14px;
  border-bottom: 1px solid rgba(58, 31, 110, 0.1);
  transition: background 0.1s;
}
.log-row:hover {
  background: rgba(26, 26, 46, 0.35);
}

.log-ts {
  color: var(--color-accent-cyan);
  opacity: 0.65;
  flex-shrink: 0;
  width: 64px;
  font-size: 10px;
}
.log-level {
  flex-shrink: 0;
  width: 40px;
  font-weight: 700;
  text-transform: uppercase;
  text-align: center;
  font-size: 10px;
}
.log-level--info  { color: var(--color-accent-green); }
.log-level--warn  { color: #fbbf24; }
.log-level--error { color: var(--color-accent-red); }

.log-msg {
  color: rgba(34, 197, 94, 0.75);
  word-break: break-all;
}
</style>

<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { ref, watch, onMounted, computed } from 'vue'
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

function loadFromDaemon() {
  if (!store.daemonConnected) return

  const prevHandler = store.daemon.onMessage
  store.daemon.onMessage = (type, payload) => {
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
      store.daemon.onMessage = prevHandler
    } else if (type === 'app_profiles' && payload) {
      appProfiles.value = {}
      for (const [appId, profile] of Object.entries(payload as Record<string, number>)) {
        appProfiles.value[appId] = profile
      }
      store.daemon.onMessage = prevHandler
    } else if (prevHandler) {
      prevHandler(type, payload)
    }
  }

  store.daemon.send('get_cc_actions')
  store.daemon.send('get_app_profiles')
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
</script>

<template>
  <div v-if="!store.daemonConnected" class="flex flex-col items-center gap-6 py-8 max-w-lg mx-auto">
    <!-- Icon -->
    <div class="w-16 h-16 rounded-full bg-accent-purple/10 border-2 border-accent-purple/30 flex items-center justify-center">
      <div class="w-3 h-3 rounded-full bg-accent-purple/50" />
    </div>

    <!-- Heading + description -->
    <div class="text-center space-y-2">
      <h2 class="text-lg font-bold text-text-primary">{{ t('daemon.notDetected') }}</h2>
      <p class="text-xs text-text-secondary max-w-md">{{ t('daemon.notDetectedDesc') }}</p>
    </div>

    <!-- Download button -->
    <a
      :href="RELEASES_URL"
      target="_blank"
      rel="noopener noreferrer"
      class="px-5 py-2 text-xs font-semibold bg-accent-purple text-white rounded-full hover:bg-accent-purple/80 transition-colors"
    >
      {{ t('daemon.downloadBtn') }}
    </a>

    <!-- Platform tabs + steps -->
    <div class="w-full bg-bg-secondary rounded-xl border border-border-default p-4 space-y-4">
      <div class="flex gap-1 p-1 bg-bg-tertiary rounded-lg w-fit">
        <button
          @click="installPlatform = 'macos'"
          class="px-4 py-1 text-[10px] font-semibold rounded-md transition-colors"
          :class="installPlatform === 'macos' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary'"
        >macOS</button>
        <button
          @click="installPlatform = 'windows'"
          class="px-4 py-1 text-[10px] font-semibold rounded-md transition-colors"
          :class="installPlatform === 'windows' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary'"
        >Windows</button>
      </div>

      <ol class="space-y-2.5">
        <li
          v-for="(step, i) in installSteps"
          :key="i"
          class="flex items-start gap-3"
        >
          <span class="w-5 h-5 shrink-0 rounded-full bg-accent-purple/20 border border-accent-purple/30 text-accent-purple text-[9px] font-bold flex items-center justify-center mt-0.5">{{ i + 1 }}</span>
          <span class="text-[11px] text-text-secondary leading-relaxed font-mono">{{ step }}</span>
        </li>
      </ol>
    </div>

    <!-- Blog link -->
    <a
      :href="BLOG_URL"
      target="_blank"
      rel="noopener noreferrer"
      class="text-[10px] text-accent-purple/70 hover:text-accent-purple transition-colors"
    >
      {{ t('daemon.blogLink') }}
    </a>
  </div>

  <div v-else class="space-y-6">
    <div class="flex items-center gap-3">
      <h2 class="text-lg font-bold text-text-primary">{{ t('daemon.title') }}</h2>
      <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-purple/10 border border-accent-purple/30">
        <div class="w-1.5 h-1.5 rounded-full bg-accent-purple" />
        <span class="text-[9px] text-accent-purple font-semibold">CONNECTED v{{ store.daemonVersion }}</span>
      </div>
    </div>

    <!-- CC Button Actions -->
    <section class="bg-bg-secondary rounded-xl border border-border-default p-4 space-y-4">
      <h3 class="text-xs font-semibold text-text-secondary tracking-wider">{{ t('daemon.ccActions') }}</h3>
      <p class="text-[10px] text-text-muted">{{ t('daemon.ccActionsDesc') }}</p>

      <div class="space-y-3">
        <div
          v-for="btn in ccButtons" :key="btn.id"
          class="flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl"
        >
          <span class="text-xs font-bold text-accent-purple w-24">{{ t(btn.labelKey) }}</span>

          <select
            v-model="buttonActions[btn.id].type"
            class="bg-bg-secondary border border-border-default rounded-lg px-2 py-1 text-[10px] text-text-primary w-36"
          >
            <option v-for="opt in actionTypes" :key="opt.value" :value="opt.value">{{ t(opt.labelKey) }}</option>
          </select>

          <select
            v-if="buttonActions[btn.id].type === 'system'"
            v-model="buttonActions[btn.id].value"
            class="flex-1 bg-bg-secondary border border-border-default rounded-lg px-2 py-1 text-[10px] text-text-primary"
          >
            <option v-for="opt in systemActions" :key="opt.value" :value="opt.value">{{ t(opt.labelKey) }}</option>
          </select>

          <input
            v-else-if="buttonActions[btn.id].type !== 'none'"
            v-model="buttonActions[btn.id].value"
            :placeholder="
              buttonActions[btn.id].type === 'launch_app' ? 'C:\\Program Files\\App\\app.exe' :
              buttonActions[btn.id].type === 'keyboard_shortcut' ? 'ctrl+shift+4' :
              buttonActions[btn.id].type === 'shell_command' ? 'cmd /c start notepad' :
              buttonActions[btn.id].type === 'open_url' ? 'https://example.com' :
              'Action value'"
            class="flex-1 bg-bg-secondary border border-border-default rounded-lg px-2 py-1 text-[10px] text-text-primary placeholder:text-text-muted/30"
          />

          <button
            @click="saveAction(btn.id)"
            class="px-3 py-1 text-[9px] font-semibold bg-accent-purple/20 text-accent-purple border border-accent-purple/30 rounded-full hover:bg-accent-purple/30 transition"
          >{{ t('daemon.save') }}</button>
        </div>
      </div>
    </section>

    <!-- Per-app Profiles -->
    <section class="bg-bg-secondary rounded-xl border border-border-default p-4 space-y-4">
      <h3 class="text-xs font-semibold text-text-secondary tracking-wider">{{ t('daemon.perAppTitle') }}</h3>
      <p class="text-[10px] text-text-muted">{{ t('daemon.perAppDesc') }}</p>

      <!-- Existing mappings -->
      <div v-if="Object.keys(appProfiles).length" class="space-y-2">
        <div
          v-for="(profile, appId) in appProfiles" :key="appId"
          class="flex items-center gap-3 p-2.5 bg-bg-tertiary rounded-xl"
        >
          <span class="flex-1 text-[10px] text-text-primary font-mono truncate">{{ appId }}</span>
          <span class="text-[9px] font-bold text-accent-purple px-2 py-0.5 rounded-full bg-accent-purple/10 border border-accent-purple/30">
            P{{ profile + 1 }}
          </span>
          <button
            @click="removeAppProfile(appId as string)"
            class="text-text-muted hover:text-accent-red transition text-xs leading-none"
          >✕</button>
        </div>
      </div>
      <p v-else class="text-[10px] text-text-muted/40 italic">{{ t('daemon.perAppEmpty') }}</p>

      <!-- Add new mapping -->
      <div class="flex items-center gap-2 pt-1">
        <input
          v-model="newAppId"
          :placeholder="t('daemon.perAppPlaceholder')"
          class="flex-1 bg-bg-tertiary border border-border-default rounded-lg px-2 py-1 text-[10px] text-text-primary placeholder:text-text-muted/30"
          @keyup.enter="addAppProfile"
        />
        <select
          v-model="newAppProfile"
          class="bg-bg-tertiary border border-border-default rounded-lg px-2 py-1 text-[10px] text-text-primary"
        >
          <option :value="0">P1</option>
          <option :value="1">P2</option>
          <option :value="2">P3</option>
          <option :value="3">P4</option>
        </select>
        <button
          @click="addAppProfile"
          class="px-3 py-1 text-[9px] font-semibold bg-accent-purple/20 text-accent-purple border border-accent-purple/30 rounded-full hover:bg-accent-purple/30 transition"
        >{{ t('daemon.perAppAdd') }}</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useDeviceStore } from '../stores/device'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useTheme } from '../composables/useTheme'
import { useLocale } from '../composables/useLocale'

const store = useDeviceStore()
const route = useRoute()
const { t } = useI18n()
const { theme, toggle: toggleTheme } = useTheme()
const { locale, setLocale } = useLocale()

const batteryColor = computed(() => {
  if (store.isCharging) return 'text-accent-green'
  if (store.batteryLevel <= 15) return 'text-accent-red'
  if (store.batteryLevel <= 30) return 'text-accent-orange'
  return 'text-accent-green'
})

const navItems = computed(() => [
  { path: '/', label: t('nav.dashboard'), name: 'dashboard' },
  { path: '/performance', label: t('nav.performance'), name: 'performance' },
  { path: '/buttons', label: t('nav.buttons'), name: 'buttons' },
  { path: '/macros', label: t('nav.macros'), name: 'macros' },
  { path: '/profiles', label: t('nav.profiles'), name: 'profiles' },
  { path: '/mouse-test', label: t('nav.mouseTest'), name: 'mouseTest' },
])

async function handleConnect() {
  try {
    await store.connect()
  } catch (e: any) {
    alert(e.message || 'Failed to connect')
  }
}
</script>

<template>
  <!-- Brand gradient bar -->
  <div class="h-0.5 bg-gradient-to-r from-accent-purple to-accent-gold" />

  <nav class="bg-bg-secondary border-b border-border-default">
    <div class="max-w-5xl mx-auto px-4 flex items-center h-12 gap-6">
      <!-- Logo -->
      <div class="flex items-center gap-2 shrink-0">
        <div
          class="w-2 h-2 rounded-full"
          :class="store.connected ? 'bg-accent-green' : 'bg-accent-red'"
        />
        <span class="text-sm font-bold tracking-wider text-text-primary">WRAITH</span>
      </div>

      <!-- Nav links -->
      <div class="flex items-center gap-1" v-if="store.connected">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="item.path"
          class="px-3 py-1.5 text-xs rounded-full transition-colors font-medium"
          :class="route.name === item.name
            ? 'bg-accent-purple/20 text-accent-purple'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'"
        >
          {{ item.label }}
        </router-link>

        <!-- Daemon tab -->
        <router-link
          to="/daemon"
          class="px-3 py-1.5 text-xs rounded-full transition-colors font-medium flex items-center gap-1"
          :class="route.name === 'daemon'
            ? 'bg-accent-purple/20 text-accent-purple'
            : store.daemonConnected
              ? 'text-accent-purple/60 hover:text-accent-purple hover:bg-accent-purple/10'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'"
        >
          <span v-if="!store.daemonConnected" class="text-[9px] leading-none">↓</span>
          {{ t('nav.daemon') }}
        </router-link>
      </div>

      <div class="flex-1" />

      <!-- Battery + Status -->
      <div v-if="store.connected" class="flex items-center gap-3">
        <!-- Daemon indicator -->
        <div
          v-if="store.daemonConnected"
          class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-purple/10 border border-accent-purple/30"
        >
          <div class="w-1.5 h-1.5 rounded-full bg-accent-purple" />
          <span class="text-[9px] text-accent-purple font-semibold">DAEMON</span>
        </div>

        <!-- Battery -->
        <div class="flex items-center gap-1.5">
          <div class="relative w-7 h-3 border border-border-light rounded-sm">
            <div
              class="absolute inset-0.5 rounded-[1px] transition-all"
              :class="batteryColor.replace('text-', 'bg-')"
              :style="{ width: `${Math.max(2, store.batteryLevel)}%` }"
            />
            <div class="absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-border-light rounded-r-sm" />
          </div>
          <span class="text-[10px] font-semibold" :class="batteryColor">
            {{ store.isCharging ? 'CHG' : `${store.batteryLevel}%` }}
          </span>
        </div>

        <!-- Device name -->
        <span class="text-[10px] text-text-muted">W1 Freestyle</span>
      </div>

      <!-- Theme toggle -->
      <button
        @click="toggleTheme"
        class="w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors text-sm"
        :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <span v-if="theme === 'dark'">☀</span>
        <span v-else>☾</span>
      </button>

      <!-- Language toggle -->
      <div class="flex items-center rounded-full border border-border-default overflow-hidden text-[10px] font-semibold shrink-0">
        <button
          @click="setLocale('en')"
          class="px-2 py-0.5 transition-colors"
          :class="locale === 'en' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary'"
        >EN</button>
        <button
          @click="setLocale('tr')"
          class="px-2 py-0.5 transition-colors"
          :class="locale === 'tr' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary'"
        >TR</button>
      </div>

      <!-- Connect button -->
      <button
        v-if="!store.connected"
        @click="handleConnect"
        class="px-4 py-1.5 text-xs font-semibold bg-accent-purple text-white rounded-full hover:bg-accent-purple/80 transition-colors"
      >
        {{ t('nav.connect') }}
      </button>
      <button
        v-else
        @click="store.disconnect()"
        class="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
      >
        {{ t('nav.disconnect') }}
      </button>
    </div>
  </nav>
</template>

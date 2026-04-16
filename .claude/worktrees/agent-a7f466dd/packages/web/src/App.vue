<script setup lang="ts">
import { useDeviceStore } from './stores/device'
import Sidebar from './components/Sidebar.vue'
import ConnectScreen from './components/ConnectScreen.vue'
import Toast from './components/Toast.vue'

const store = useDeviceStore()
</script>

<template>
  <div class="app-root">
    <!-- Not connected: full-page connect screen -->
    <Transition name="shell">
      <ConnectScreen v-if="!store.connected" key="connect" />
    </Transition>

    <!-- Connected: sidebar + content -->
    <Transition name="shell">
      <div v-if="store.connected" key="app" class="app-shell">
        <Sidebar />
        <main class="app-content">
          <router-view v-slot="{ Component }">
            <Transition name="page" mode="out-in">
              <component :is="Component" />
            </Transition>
          </router-view>
        </main>
      </div>
    </Transition>

    <Toast />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
  background: var(--color-bg-base);
}

.app-shell {
  display: flex;
  min-height: 100vh;
}

.app-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  padding: 32px 40px;
  max-width: calc(100vw - var(--sidebar-width));
  min-height: 100vh;
}
</style>

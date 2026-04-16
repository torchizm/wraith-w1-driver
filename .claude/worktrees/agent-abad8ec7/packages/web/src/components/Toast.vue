<script setup lang="ts">
import { useToast } from '../composables/useToast'
import type { ToastType } from '../composables/useToast'

const { toasts } = useToast()

function accentColor(type: ToastType) {
  return {
    success: 'toast--success',
    error: 'toast--error',
    info: 'toast--info',
  }[type]
}
</script>

<template>
  <div class="fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-2.5 pointer-events-none">
    <Transition
      v-for="toast in toasts"
      :key="toast.id"
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100 scale-100"
      leave-to-class="translate-y-2 opacity-0 scale-95"
    >
      <div
        v-if="toast.visible"
        class="toast-item pointer-events-auto"
        :class="accentColor(toast.type)"
      >
        <div class="toast-accent-bar" />
        <span class="toast-text">{{ toast.message }}</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 340px;
  padding: 10px 16px 10px 12px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: 6px;
  overflow: hidden;
}

.toast-accent-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  border-radius: 3px 0 0 3px;
}

.toast-text {
  font-family: var(--font-body, 'Poppins', system-ui, sans-serif);
  font-size: 12px;
  line-height: 1.4;
  padding-left: 4px;
}

/* -- Success -- */
.toast--success {
  border-color: rgba(34, 197, 94, 0.3);
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.12), 0 0 1px rgba(34, 197, 94, 0.2);
}
.toast--success .toast-accent-bar {
  background: var(--color-accent-green);
  box-shadow: 0 0 8px var(--color-accent-green);
}
.toast--success .toast-text {
  color: var(--color-accent-green);
}

/* -- Error -- */
.toast--error {
  border-color: rgba(239, 68, 68, 0.3);
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.12), 0 0 1px rgba(239, 68, 68, 0.2);
}
.toast--error .toast-accent-bar {
  background: var(--color-accent-red);
  box-shadow: 0 0 8px var(--color-accent-red);
}
.toast--error .toast-text {
  color: var(--color-accent-red);
}

/* -- Info -- */
.toast--info {
  border-color: rgba(6, 182, 212, 0.3);
  box-shadow: 0 4px 20px rgba(6, 182, 212, 0.12), 0 0 1px rgba(6, 182, 212, 0.2);
}
.toast--info .toast-accent-bar {
  background: var(--color-accent-cyan);
  box-shadow: 0 0 8px var(--color-accent-cyan);
}
.toast--info .toast-text {
  color: var(--color-accent-cyan);
}
</style>

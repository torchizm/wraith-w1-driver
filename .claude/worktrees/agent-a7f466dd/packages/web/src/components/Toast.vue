<script setup lang="ts">
import { useToast } from '../composables/useToast'
import type { ToastType } from '../composables/useToast'

const { toasts } = useToast()

function typeColor(type: ToastType) {
  return {
    success: 'var(--color-success)',
    error: 'var(--color-danger)',
    info: 'var(--color-accent-primary)',
  }[type]
}
</script>

<template>
  <div class="toast-container">
    <TransitionGroup
      name="toast"
      tag="div"
      class="toast-list"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        v-show="toast.visible"
        class="toast-item"
        :style="{
          borderLeftColor: typeColor(toast.type),
          boxShadow: `0 4px 16px rgba(0,0,0,0.3), inset 3px 0 0 ${typeColor(toast.type)}`
        }"
      >
        <span class="toast-text">{{ toast.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 100;
  pointer-events: none;
}
.toast-list {
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
}
.toast-item {
  pointer-events: auto;
  background: var(--color-bg-raised);
  border: 1px solid var(--color-border-subtle);
  border-left: 3px solid;
  border-radius: var(--radius-md);
  padding: 12px 16px;
  max-width: 320px;
}
.toast-text {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.95);
}
</style>

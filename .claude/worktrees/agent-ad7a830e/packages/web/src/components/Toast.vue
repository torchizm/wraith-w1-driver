<script setup lang="ts">
import { useToast } from '../composables/useToast'
import type { ToastType } from '../composables/useToast'

const { toasts } = useToast()

function accentColor(type: ToastType) {
  return {
    success: 'border-accent-green text-accent-green',
    error: 'border-accent-red text-accent-red',
    info: 'border-accent-cyan text-accent-cyan',
  }[type]
}

function glowStyle(type: ToastType) {
  const colors: Record<ToastType, string> = {
    success: '0 0 12px rgba(34,197,94,0.3)',
    error: '0 0 12px rgba(239,68,68,0.3)',
    info: '0 0 12px rgba(6,182,212,0.3)',
  }
  return { boxShadow: colors[type] }
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
    <Transition
      v-for="toast in toasts"
      :key="toast.id"
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="toast.visible"
        class="pointer-events-auto bg-bg-secondary border-l-4 px-4 py-3 font-data text-sm max-w-xs toast-clip"
        :class="accentColor(toast.type)"
        :style="glowStyle(toast.type)"
      >
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

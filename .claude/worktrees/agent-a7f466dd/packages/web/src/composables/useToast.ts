import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
  visible: boolean
}

let nextId = 0
const toasts = ref<Toast[]>([])

export function useToast() {
  function showToast(message: string, type: ToastType = 'info') {
    const id = nextId++
    const toast: Toast = { id, message, type, visible: true }
    toasts.value.push(toast)

    setTimeout(() => {
      const t = toasts.value.find((t) => t.id === id)
      if (t) t.visible = false
      setTimeout(() => {
        toasts.value = toasts.value.filter((t) => t.id !== id)
      }, 300)
    }, 3000)
  }

  return { toasts, showToast }
}

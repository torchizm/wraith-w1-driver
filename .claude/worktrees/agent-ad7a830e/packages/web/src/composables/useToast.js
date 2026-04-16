import { ref } from 'vue';
let nextId = 0;
const toasts = ref([]);
export function useToast() {
    function showToast(message, type = 'info') {
        const id = nextId++;
        const toast = { id, message, type, visible: true };
        toasts.value.push(toast);
        setTimeout(() => {
            const t = toasts.value.find((t) => t.id === id);
            if (t)
                t.visible = false;
            setTimeout(() => {
                toasts.value = toasts.value.filter((t) => t.id !== id);
            }, 300);
        }, 3000);
    }
    return { toasts, showToast };
}

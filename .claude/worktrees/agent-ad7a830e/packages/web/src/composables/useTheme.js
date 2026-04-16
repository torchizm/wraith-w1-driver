import { ref, watchEffect } from 'vue';
const theme = ref(localStorage.getItem('wraith:theme') ?? 'dark');
watchEffect(() => {
    document.documentElement.setAttribute('data-theme', theme.value);
    localStorage.setItem('wraith:theme', theme.value);
});
export function useTheme() {
    function toggle() {
        theme.value = theme.value === 'dark' ? 'light' : 'dark';
    }
    return { theme, toggle };
}

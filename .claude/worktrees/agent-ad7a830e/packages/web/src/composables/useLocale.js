import { useI18n } from 'vue-i18n';
export function useLocale() {
    const { locale } = useI18n();
    function setLocale(lang) {
        locale.value = lang;
        localStorage.setItem('wraith:locale', lang);
    }
    return { locale, setLocale };
}

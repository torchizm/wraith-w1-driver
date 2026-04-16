import { useI18n } from 'vue-i18n'

export function useLocale() {
  const { locale } = useI18n()

  function setLocale(lang: 'en' | 'tr') {
    locale.value = lang
    localStorage.setItem('wraith:locale', lang)
  }

  return { locale, setLocale }
}

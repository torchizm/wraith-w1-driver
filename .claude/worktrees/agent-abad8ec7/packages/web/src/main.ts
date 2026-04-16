import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import './style.css'

import en from './locales/en.json'
import tr from './locales/tr.json'

import Dashboard from './views/Dashboard.vue'
import Performance from './views/Performance.vue'
import ButtonRemap from './views/ButtonRemap.vue'
import Macros from './views/Macros.vue'
import Profiles from './views/Profiles.vue'
import DaemonSettings from './views/DaemonSettings.vue'
import MouseTest from './views/MouseTest.vue'

// Apply saved theme before mount to prevent flash
const savedTheme = (localStorage.getItem('wraith:theme') as 'dark' | 'light') ?? 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/performance', name: 'performance', component: Performance },
    { path: '/buttons', name: 'buttons', component: ButtonRemap },
    { path: '/macros', name: 'macros', component: Macros },
    { path: '/profiles', name: 'profiles', component: Profiles },
    { path: '/daemon', name: 'daemon', component: DaemonSettings },
    { path: '/mouse-test', name: 'mouseTest', component: MouseTest },
  ],
})

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('wraith:locale') ?? 'en',
  fallbackLocale: 'en',
  messages: { en, tr },
})

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')

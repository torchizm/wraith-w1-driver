/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from '../stores/device';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTheme } from '../composables/useTheme';
import { useLocale } from '../composables/useLocale';
const store = useDeviceStore();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { theme, toggle: toggleTheme } = useTheme();
const { locale, setLocale } = useLocale();
const currentDPI = computed(() => {
    const idx = store.currentDPIIndex;
    const levels = store.dpiLevels;
    return levels.length > idx ? levels[idx] : 0;
});
const batteryPercent = computed(() => Math.max(0, Math.min(100, store.batteryLevel)));
const batteryColor = computed(() => {
    if (store.isCharging)
        return '#34d399';
    if (store.batteryLevel <= 15)
        return '#f87171';
    if (store.batteryLevel <= 30)
        return '#fb923c';
    return '#34d399';
});
const navItems = computed(() => [
    { path: '/', label: t('nav.dashboard'), name: 'overview', icon: 'grid' },
    { path: '/performance', label: t('nav.performance'), name: 'performance', icon: 'sliders' },
    { path: '/buttons', label: t('nav.buttons'), name: 'buttons', icon: 'mouse' },
    { path: '/macros', label: t('nav.macros'), name: 'macros', icon: 'command' },
    { path: '/profiles', label: t('nav.profiles'), name: 'profiles', icon: 'layers' },
    { path: '/mouse-test', label: t('nav.mouseTest'), name: 'mousetest', icon: 'crosshair' },
]);
function navigate(path) {
    router.push(path);
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['control-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['lang-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['disconnect-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['lang-btn--active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "sidebar" },
});
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-brand" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-brand']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-mark" },
});
/** @type {__VLS_StyleScopedClasses['brand-mark']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M12 2L2 7v10l10 5 10-5V7L12 2z",
    stroke: "currentColor",
    'stroke-width': "1.5",
    fill: "none",
    opacity: "0.3",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M12 6L6 9v6l6 3 6-3V9l-6-3z",
    fill: "currentColor",
    opacity: "0.6",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "12",
    cy: "12",
    r: "2",
    fill: "currentColor",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-text" },
});
/** @type {__VLS_StyleScopedClasses['brand-text']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "brand-name" },
});
/** @type {__VLS_StyleScopedClasses['brand-name']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "brand-model" },
});
/** @type {__VLS_StyleScopedClasses['brand-model']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "device-status" },
});
/** @type {__VLS_StyleScopedClasses['device-status']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "status-row" },
});
/** @type {__VLS_StyleScopedClasses['status-row']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-label" },
});
/** @type {__VLS_StyleScopedClasses['status-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-value" },
    ...{ style: ({ color: __VLS_ctx.batteryColor }) },
});
/** @type {__VLS_StyleScopedClasses['status-value']} */ ;
(__VLS_ctx.store.isCharging ? 'CHG' : `${__VLS_ctx.store.batteryLevel}%`);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "battery-track" },
});
/** @type {__VLS_StyleScopedClasses['battery-track']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "battery-fill" },
    ...{ style: ({
            width: `${__VLS_ctx.batteryPercent}%`,
            backgroundColor: __VLS_ctx.batteryColor,
            boxShadow: `0 0 8px ${__VLS_ctx.batteryColor}40`
        }) },
});
/** @type {__VLS_StyleScopedClasses['battery-fill']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "status-grid" },
});
/** @type {__VLS_StyleScopedClasses['status-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "status-cell" },
});
/** @type {__VLS_StyleScopedClasses['status-cell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-label" },
});
/** @type {__VLS_StyleScopedClasses['status-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-value" },
});
/** @type {__VLS_StyleScopedClasses['status-value']} */ ;
(__VLS_ctx.store.pollingRateHz >= 1000 ? `${__VLS_ctx.store.pollingRateHz / 1000}K` : __VLS_ctx.store.pollingRateHz);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "status-cell" },
});
/** @type {__VLS_StyleScopedClasses['status-cell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-label" },
});
/** @type {__VLS_StyleScopedClasses['status-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-value" },
});
/** @type {__VLS_StyleScopedClasses['status-value']} */ ;
(__VLS_ctx.currentDPI);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "status-cell" },
});
/** @type {__VLS_StyleScopedClasses['status-cell']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-label" },
});
/** @type {__VLS_StyleScopedClasses['status-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "status-value" },
});
/** @type {__VLS_StyleScopedClasses['status-value']} */ ;
(__VLS_ctx.store.currentProfile + 1);
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
    ...{ class: "sidebar-nav" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-nav']} */ ;
for (const [item] of __VLS_vFor((__VLS_ctx.navItems))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.navigate(item.path);
                // @ts-ignore
                [batteryColor, batteryColor, batteryColor, store, store, store, store, store, store, batteryPercent, currentDPI, navItems, navigate,];
            } },
        key: (item.name),
        ...{ class: "nav-item" },
        ...{ class: ({ 'nav-item--active': __VLS_ctx.route.name === item.name }) },
    });
    /** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
    /** @type {__VLS_StyleScopedClasses['nav-item--active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "nav-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['nav-accent']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "nav-label" },
    });
    /** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
    (item.label);
    // @ts-ignore
    [route,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "nav-separator" },
});
/** @type {__VLS_StyleScopedClasses['nav-separator']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.navigate('/daemon');
            // @ts-ignore
            [navigate,];
        } },
    ...{ class: "nav-item" },
    ...{ class: ({
            'nav-item--active': __VLS_ctx.route.name === 'daemon',
            'nav-item--daemon-connected': __VLS_ctx.store.daemonConnected && __VLS_ctx.route.name !== 'daemon'
        }) },
});
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item--active']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item--daemon-connected']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span)({
    ...{ class: "nav-accent" },
});
/** @type {__VLS_StyleScopedClasses['nav-accent']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "nav-label" },
});
/** @type {__VLS_StyleScopedClasses['nav-label']} */ ;
(__VLS_ctx.t('nav.daemon'));
if (__VLS_ctx.store.daemonConnected) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span)({
        ...{ class: "daemon-dot" },
    });
    /** @type {__VLS_StyleScopedClasses['daemon-dot']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "sidebar-footer" },
});
/** @type {__VLS_StyleScopedClasses['sidebar-footer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "footer-controls" },
});
/** @type {__VLS_StyleScopedClasses['footer-controls']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.toggleTheme) },
    ...{ class: "control-btn" },
    title: (__VLS_ctx.theme === 'dark' ? 'Light mode' : 'Dark mode'),
});
/** @type {__VLS_StyleScopedClasses['control-btn']} */ ;
if (__VLS_ctx.theme === 'dark') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
        cx: "12",
        cy: "12",
        r: "5",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "12",
        y1: "1",
        x2: "12",
        y2: "3",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "12",
        y1: "21",
        x2: "12",
        y2: "23",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "4.22",
        y1: "4.22",
        x2: "5.64",
        y2: "5.64",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "18.36",
        y1: "18.36",
        x2: "19.78",
        y2: "19.78",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "1",
        y1: "12",
        x2: "3",
        y2: "12",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "21",
        y1: "12",
        x2: "23",
        y2: "12",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "4.22",
        y1: "19.78",
        x2: "5.64",
        y2: "18.36",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "18.36",
        y1: "5.64",
        x2: "19.78",
        y2: "4.22",
    });
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    });
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "lang-toggle" },
});
/** @type {__VLS_StyleScopedClasses['lang-toggle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setLocale('en');
            // @ts-ignore
            [store, store, route, route, t, toggleTheme, theme, theme, setLocale,];
        } },
    ...{ class: "lang-btn" },
    ...{ class: ({ 'lang-btn--active': __VLS_ctx.locale === 'en' }) },
});
/** @type {__VLS_StyleScopedClasses['lang-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['lang-btn--active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setLocale('tr');
            // @ts-ignore
            [setLocale, locale,];
        } },
    ...{ class: "lang-btn" },
    ...{ class: ({ 'lang-btn--active': __VLS_ctx.locale === 'tr' }) },
});
/** @type {__VLS_StyleScopedClasses['lang-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['lang-btn--active']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.store.disconnect();
            // @ts-ignore
            [store, locale,];
        } },
    ...{ class: "disconnect-btn" },
});
/** @type {__VLS_StyleScopedClasses['disconnect-btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.polyline)({
    points: "16 17 21 12 16 7",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line)({
    x1: "21",
    y1: "12",
    x2: "9",
    y2: "12",
});
(__VLS_ctx.t('nav.disconnect'));
// @ts-ignore
[t,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

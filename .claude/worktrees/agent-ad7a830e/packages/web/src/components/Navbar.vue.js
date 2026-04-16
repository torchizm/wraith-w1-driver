/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from '../stores/device';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useTheme } from '../composables/useTheme';
import { useLocale } from '../composables/useLocale';
const store = useDeviceStore();
const route = useRoute();
const { t } = useI18n();
const { theme, toggle: toggleTheme } = useTheme();
const { locale, setLocale } = useLocale();
const batteryColor = computed(() => {
    if (store.isCharging)
        return 'text-accent-green';
    if (store.batteryLevel <= 15)
        return 'text-accent-red';
    if (store.batteryLevel <= 30)
        return 'text-accent-orange';
    return 'text-accent-green';
});
const navItems = computed(() => [
    { path: '/', label: t('nav.dashboard'), name: 'dashboard' },
    { path: '/performance', label: t('nav.performance'), name: 'performance' },
    { path: '/buttons', label: t('nav.buttons'), name: 'buttons' },
    { path: '/macros', label: t('nav.macros'), name: 'macros' },
    { path: '/profiles', label: t('nav.profiles'), name: 'profiles' },
]);
async function handleConnect() {
    try {
        await store.connect();
    }
    catch (e) {
        alert(e.message || 'Failed to connect');
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "h-0.5 bg-gradient-to-r from-accent-purple to-accent-gold" },
});
/** @type {__VLS_StyleScopedClasses['h-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-gradient-to-r']} */ ;
/** @type {__VLS_StyleScopedClasses['from-accent-purple']} */ ;
/** @type {__VLS_StyleScopedClasses['to-accent-gold']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)({
    ...{ class: "bg-bg-secondary border-b border-border-default" },
});
/** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "max-w-5xl mx-auto px-4 flex items-center h-12 gap-6" },
});
/** @type {__VLS_StyleScopedClasses['max-w-5xl']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['h-12']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center gap-2 shrink-0" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "w-2 h-2 rounded-full" },
    ...{ class: (__VLS_ctx.store.connected ? 'bg-accent-green' : 'bg-accent-red') },
});
/** @type {__VLS_StyleScopedClasses['w-2']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "text-sm font-bold tracking-wider text-text-primary" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
/** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
if (__VLS_ctx.store.connected) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    for (const [item] of __VLS_vFor((__VLS_ctx.navItems))) {
        let __VLS_0;
        /** @ts-ignore @type {typeof __VLS_components.routerLink | typeof __VLS_components.RouterLink | typeof __VLS_components.routerLink | typeof __VLS_components.RouterLink} */
        routerLink;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
            key: (item.name),
            to: (item.path),
            ...{ class: "px-3 py-1.5 text-xs rounded-full transition-colors font-medium" },
            ...{ class: (__VLS_ctx.route.name === item.name
                    ? 'bg-accent-purple/20 text-accent-purple'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary') },
        }));
        const __VLS_2 = __VLS_1({
            key: (item.name),
            to: (item.path),
            ...{ class: "px-3 py-1.5 text-xs rounded-full transition-colors font-medium" },
            ...{ class: (__VLS_ctx.route.name === item.name
                    ? 'bg-accent-purple/20 text-accent-purple'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary') },
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        const { default: __VLS_5 } = __VLS_3.slots;
        (item.label);
        // @ts-ignore
        [store, store, navItems, route,];
        var __VLS_3;
        // @ts-ignore
        [];
    }
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.routerLink | typeof __VLS_components.RouterLink | typeof __VLS_components.routerLink | typeof __VLS_components.RouterLink} */
    routerLink;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        to: "/daemon",
        ...{ class: "px-3 py-1.5 text-xs rounded-full transition-colors font-medium flex items-center gap-1" },
        ...{ class: (__VLS_ctx.route.name === 'daemon'
                ? 'bg-accent-purple/20 text-accent-purple'
                : __VLS_ctx.store.daemonConnected
                    ? 'text-accent-purple/60 hover:text-accent-purple hover:bg-accent-purple/10'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary') },
    }));
    const __VLS_8 = __VLS_7({
        to: "/daemon",
        ...{ class: "px-3 py-1.5 text-xs rounded-full transition-colors font-medium flex items-center gap-1" },
        ...{ class: (__VLS_ctx.route.name === 'daemon'
                ? 'bg-accent-purple/20 text-accent-purple'
                : __VLS_ctx.store.daemonConnected
                    ? 'text-accent-purple/60 hover:text-accent-purple hover:bg-accent-purple/10'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary') },
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    const { default: __VLS_11 } = __VLS_9.slots;
    if (!__VLS_ctx.store.daemonConnected) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[9px] leading-none" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-none']} */ ;
    }
    (__VLS_ctx.t('nav.daemon'));
    // @ts-ignore
    [store, store, route, t,];
    var __VLS_9;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "flex-1" },
});
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
if (__VLS_ctx.store.connected) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    if (__VLS_ctx.store.daemonConnected) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-purple/10 border border-accent-purple/30" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent-purple/10']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent-purple/30']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "w-1.5 h-1.5 rounded-full bg-accent-purple" },
        });
        /** @type {__VLS_StyleScopedClasses['w-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent-purple']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[9px] text-accent-purple font-semibold" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "relative w-7 h-3 border border-border-light rounded-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['relative']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-7']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-light']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-sm']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute inset-0.5 rounded-[1px] transition-all" },
        ...{ class: (__VLS_ctx.batteryColor.replace('text-', 'bg-')) },
        ...{ style: ({ width: `${Math.max(2, __VLS_ctx.store.batteryLevel)}%` }) },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['inset-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-[1px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-border-light rounded-r-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
    /** @type {__VLS_StyleScopedClasses['-right-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['top-1/2']} */ ;
    /** @type {__VLS_StyleScopedClasses['-translate-y-1/2']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-0.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-border-light']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-r-sm']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] font-semibold" },
        ...{ class: (__VLS_ctx.batteryColor) },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    (__VLS_ctx.store.isCharging ? 'CHG' : `${__VLS_ctx.store.batteryLevel}%`);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.toggleTheme) },
    ...{ class: "w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors text-sm" },
    title: (__VLS_ctx.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'),
});
/** @type {__VLS_StyleScopedClasses['w-7']} */ ;
/** @type {__VLS_StyleScopedClasses['h-7']} */ ;
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:bg-bg-tertiary']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
if (__VLS_ctx.theme === 'dark') {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center rounded-full border border-border-default overflow-hidden text-[10px] font-semibold shrink-0" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setLocale('en');
            // @ts-ignore
            [store, store, store, store, store, batteryColor, batteryColor, toggleTheme, theme, theme, setLocale,];
        } },
    ...{ class: "px-2 py-0.5 transition-colors" },
    ...{ class: (__VLS_ctx.locale === 'en' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary') },
});
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.setLocale('tr');
            // @ts-ignore
            [setLocale, locale,];
        } },
    ...{ class: "px-2 py-0.5 transition-colors" },
    ...{ class: (__VLS_ctx.locale === 'tr' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary') },
});
/** @type {__VLS_StyleScopedClasses['px-2']} */ ;
/** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
if (!__VLS_ctx.store.connected) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.handleConnect) },
        ...{ class: "px-4 py-1.5 text-xs font-semibold bg-accent-purple text-white rounded-full hover:bg-accent-purple/80 transition-colors" },
    });
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent-purple']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-accent-purple/80']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    (__VLS_ctx.t('nav.connect'));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.store.connected))
                    return;
                __VLS_ctx.store.disconnect();
                // @ts-ignore
                [store, store, t, locale, handleConnect,];
            } },
        ...{ class: "text-[10px] text-text-muted hover:text-text-secondary transition-colors" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    (__VLS_ctx.t('nav.disconnect'));
}
// @ts-ignore
[t,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

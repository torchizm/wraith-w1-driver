/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from '../stores/device';
import { useI18n } from 'vue-i18n';
import { cmdSwitchProfile } from '../protocol/commands';
const store = useDeviceStore();
const { t } = useI18n();
const profileKeys = [
    'profiles.profile1',
    'profiles.profile2',
    'profiles.profile3',
    'profiles.profile4',
];
async function switchProfile(index) {
    await store.sendFeatureReport(cmdSwitchProfile(store.customerCode, index));
    store.updateState({ currentProfile: index });
    await store.readDPIConfig();
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (!__VLS_ctx.store.connected) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center text-text-muted py-20 text-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-20']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_ctx.t('profiles.connectFirst'));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-6" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-lg font-bold text-text-primary" },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
    (__VLS_ctx.t('profiles.title'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-2 gap-4" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
    for (const [key, i] of __VLS_vFor((__VLS_ctx.profileKeys))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.store.connected))
                        return;
                    __VLS_ctx.switchProfile(i);
                    // @ts-ignore
                    [store, t, t, profileKeys, switchProfile,];
                } },
            key: (i),
            ...{ class: "bg-bg-secondary rounded-xl border p-6 text-center transition-all hover:border-accent-purple/50" },
            ...{ class: (__VLS_ctx.store.currentProfile === i
                    ? 'border-accent-purple shadow-[0_0_20px_rgba(128,60,238,0.15)]'
                    : 'border-border-default') },
        });
        /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:border-accent-purple/50']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-3xl font-black mb-2" },
            ...{ class: (__VLS_ctx.store.currentProfile === i ? 'text-accent-purple' : 'text-text-muted/30') },
        });
        /** @type {__VLS_StyleScopedClasses['text-3xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-black']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
        (i + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-xs font-medium" },
            ...{ class: (__VLS_ctx.store.currentProfile === i ? 'text-accent-purple' : 'text-text-secondary') },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
        (__VLS_ctx.t(key));
        if (__VLS_ctx.store.currentProfile === i) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "mt-2 text-[9px] text-accent-purple/60 font-semibold" },
            });
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent-purple/60']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
            (__VLS_ctx.t('profiles.active'));
        }
        // @ts-ignore
        [store, store, store, store, t, t,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-[9px] text-text-muted/40 p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-muted/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    (__VLS_ctx.t('profiles.hint'));
}
// @ts-ignore
[t,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

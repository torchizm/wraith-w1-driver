/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from '../stores/device';
import { ref, watch, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
const store = useDeviceStore();
const { t } = useI18n();
const RELEASES_URL = 'https://github.com/torchizm/wraith-w1-driver/releases';
const BLOG_URL = 'https://blog.xn--tea.app/blog/reverse-engineering-a-gaming-mouse-building-a-macos-driver-for-the-wraith-w1-from-scratch';
const installPlatform = ref('macos');
const installSteps = computed(() => {
    if (installPlatform.value === 'macos') {
        return [1, 2, 3, 4, 5, 6].map(i => t(`daemon.macosStep${i}`));
    }
    return [1, 2, 3].map(i => t(`daemon.windowsStep${i}`));
});
const ccButtons = [
    { id: 'START', labelKey: 'daemon.btnStart' },
    { id: 'STOP', labelKey: 'daemon.btnStop' },
    { id: 'MACRO', labelKey: 'daemon.btnMacro' },
    { id: 'ARROW_UP', labelKey: 'daemon.btnArrowUp' },
    { id: 'ARROW_DOWN', labelKey: 'daemon.btnArrowDown' },
    { id: 'MUTE', labelKey: 'daemon.btnMute' },
];
const actionTypes = [
    { value: 'none', labelKey: 'daemon.actionNone' },
    { value: 'launch_app', labelKey: 'daemon.actionLaunchApp' },
    { value: 'keyboard_shortcut', labelKey: 'daemon.actionKeyboard' },
    { value: 'shell_command', labelKey: 'daemon.actionShell' },
    { value: 'open_url', labelKey: 'daemon.actionUrl' },
    { value: 'system', labelKey: 'daemon.actionSystem' },
];
const systemActions = [
    { value: 'play_pause', labelKey: 'daemon.sysPlayPause' },
    { value: 'next_track', labelKey: 'daemon.sysNextTrack' },
    { value: 'prev_track', labelKey: 'daemon.sysPrevTrack' },
    { value: 'volume_up', labelKey: 'daemon.sysVolumeUp' },
    { value: 'volume_down', labelKey: 'daemon.sysVolumeDown' },
    { value: 'volume_mute', labelKey: 'daemon.sysVolumeMute' },
    { value: 'screenshot', labelKey: 'daemon.sysScreenshot' },
    { value: 'lock_screen', labelKey: 'daemon.sysLockScreen' },
    { value: 'show_desktop', labelKey: 'daemon.sysShowDesktop' },
    { value: 'task_manager', labelKey: 'daemon.sysTaskManager' },
    { value: 'mission_control', labelKey: 'daemon.sysMissionControl' },
];
const buttonActions = ref({
    START: { type: 'none', value: '' },
    STOP: { type: 'none', value: '' },
    MACRO: { type: 'none', value: '' },
    ARROW_UP: { type: 'none', value: '' },
    ARROW_DOWN: { type: 'none', value: '' },
    MUTE: { type: 'none', value: '' },
});
const appProfiles = ref({});
const newAppId = ref('');
const newAppProfile = ref(0);
function loadFromDaemon() {
    if (!store.daemonConnected)
        return;
    const prevHandler = store.daemon.onMessage;
    store.daemon.onMessage = (type, payload) => {
        if (type === 'cc_actions' && payload) {
            for (const [button, actionData] of Object.entries(payload)) {
                const action = actionData?.value ?? actionData;
                if (action && typeof action === 'object' && 'type' in action) {
                    buttonActions.value[button] = {
                        type: action.type?.value ?? action.type ?? 'none',
                        value: action.value?.value ?? action.value ?? '',
                    };
                }
            }
            store.daemon.onMessage = prevHandler;
        }
        else if (type === 'app_profiles' && payload) {
            appProfiles.value = {};
            for (const [appId, profile] of Object.entries(payload)) {
                appProfiles.value[appId] = profile;
            }
            store.daemon.onMessage = prevHandler;
        }
        else if (prevHandler) {
            prevHandler(type, payload);
        }
    };
    store.daemon.send('get_cc_actions');
    store.daemon.send('get_app_profiles');
}
onMounted(() => {
    if (store.daemonConnected)
        loadFromDaemon();
});
watch(() => store.daemonConnected, (connected) => {
    if (connected)
        loadFromDaemon();
});
function saveAction(buttonId) {
    const action = buttonActions.value[buttonId];
    store.daemon.send('set_cc_action', {
        button: buttonId,
        action: { type: action.type, value: action.value },
    });
}
function addAppProfile() {
    const appId = newAppId.value.trim();
    if (!appId)
        return;
    store.daemon.send('set_app_profile', { bundleId: appId, profile: newAppProfile.value });
    appProfiles.value[appId] = newAppProfile.value;
    newAppId.value = '';
    newAppProfile.value = 0;
}
function removeAppProfile(appId) {
    store.daemon.send('set_app_profile', { bundleId: appId, profile: -1 });
    delete appProfiles.value[appId];
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (!__VLS_ctx.store.daemonConnected) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col items-center gap-6 py-8 max-w-lg mx-auto" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-8']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "w-16 h-16 rounded-full bg-accent-purple/10 border-2 border-accent-purple/30 flex items-center justify-center" },
    });
    /** @type {__VLS_StyleScopedClasses['w-16']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-16']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent-purple/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent-purple/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "w-3 h-3 rounded-full bg-accent-purple/50" },
    });
    /** @type {__VLS_StyleScopedClasses['w-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent-purple/50']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center space-y-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-lg font-bold text-text-primary" },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
    (__VLS_ctx.t('daemon.notDetected'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-xs text-text-secondary max-w-md" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['max-w-md']} */ ;
    (__VLS_ctx.t('daemon.notDetectedDesc'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: (__VLS_ctx.RELEASES_URL),
        target: "_blank",
        rel: "noopener noreferrer",
        ...{ class: "px-5 py-2 text-xs font-semibold bg-accent-purple text-white rounded-full hover:bg-accent-purple/80 transition-colors" },
    });
    /** @type {__VLS_StyleScopedClasses['px-5']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent-purple']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-accent-purple/80']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    (__VLS_ctx.t('daemon.downloadBtn'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "w-full bg-bg-secondary rounded-xl border border-border-default p-4 space-y-4" },
    });
    /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex gap-1 p-1 bg-bg-tertiary rounded-lg w-fit" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg-tertiary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-fit']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.store.daemonConnected))
                    return;
                __VLS_ctx.installPlatform = 'macos';
                // @ts-ignore
                [store, t, t, t, RELEASES_URL, installPlatform,];
            } },
        ...{ class: "px-4 py-1 text-[10px] font-semibold rounded-md transition-colors" },
        ...{ class: (__VLS_ctx.installPlatform === 'macos' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary') },
    });
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(!__VLS_ctx.store.daemonConnected))
                    return;
                __VLS_ctx.installPlatform = 'windows';
                // @ts-ignore
                [installPlatform, installPlatform,];
            } },
        ...{ class: "px-4 py-1 text-[10px] font-semibold rounded-md transition-colors" },
        ...{ class: (__VLS_ctx.installPlatform === 'windows' ? 'bg-accent-purple text-white' : 'text-text-muted hover:text-text-primary') },
    });
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.ol, __VLS_intrinsics.ol)({
        ...{ class: "space-y-2.5" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-2.5']} */ ;
    for (const [step, i] of __VLS_vFor((__VLS_ctx.installSteps))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.li, __VLS_intrinsics.li)({
            key: (i),
            ...{ class: "flex items-start gap-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-start']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "w-5 h-5 shrink-0 rounded-full bg-accent-purple/20 border border-accent-purple/30 text-accent-purple text-[9px] font-bold flex items-center justify-center mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent-purple/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent-purple/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (i + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[11px] text-text-secondary leading-relaxed font-mono" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['leading-relaxed']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
        (step);
        // @ts-ignore
        [installPlatform, installSteps,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)({
        href: (__VLS_ctx.BLOG_URL),
        target: "_blank",
        rel: "noopener noreferrer",
        ...{ class: "text-[10px] text-accent-purple/70 hover:text-accent-purple transition-colors" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent-purple/70']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-accent-purple']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
    (__VLS_ctx.t('daemon.blogLink'));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-6" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-lg font-bold text-text-primary" },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
    (__VLS_ctx.t('daemon.title'));
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
    (__VLS_ctx.store.daemonVersion);
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "bg-bg-secondary rounded-xl border border-border-default p-4 space-y-4" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "text-xs font-semibold text-text-secondary tracking-wider" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    (__VLS_ctx.t('daemon.ccActions'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
    (__VLS_ctx.t('daemon.ccActionsDesc'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    for (const [btn] of __VLS_vFor((__VLS_ctx.ccButtons))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (btn.id),
            ...{ class: "flex items-center gap-3 p-3 bg-bg-tertiary rounded-xl" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg-tertiary']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs font-bold text-accent-purple w-24" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-24']} */ ;
        (__VLS_ctx.t(btn.labelKey));
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            value: (__VLS_ctx.buttonActions[btn.id].type),
            ...{ class: "bg-bg-secondary border border-border-default rounded-lg px-2 py-1 text-[10px] text-text-primary w-36" },
        });
        /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-36']} */ ;
        for (const [opt] of __VLS_vFor((__VLS_ctx.actionTypes))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                key: (opt.value),
                value: (opt.value),
            });
            (__VLS_ctx.t(opt.labelKey));
            // @ts-ignore
            [store, t, t, t, t, t, t, BLOG_URL, ccButtons, buttonActions, actionTypes,];
        }
        if (__VLS_ctx.buttonActions[btn.id].type === 'system') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                value: (__VLS_ctx.buttonActions[btn.id].value),
                ...{ class: "flex-1 bg-bg-secondary border border-border-default rounded-lg px-2 py-1 text-[10px] text-text-primary" },
            });
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
            for (const [opt] of __VLS_vFor((__VLS_ctx.systemActions))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    key: (opt.value),
                    value: (opt.value),
                });
                (__VLS_ctx.t(opt.labelKey));
                // @ts-ignore
                [t, buttonActions, buttonActions, systemActions,];
            }
        }
        else if (__VLS_ctx.buttonActions[btn.id].type !== 'none') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                placeholder: (__VLS_ctx.buttonActions[btn.id].type === 'launch_app' ? 'C:\\Program Files\\App\\app.exe' :
                    __VLS_ctx.buttonActions[btn.id].type === 'keyboard_shortcut' ? 'ctrl+shift+4' :
                        __VLS_ctx.buttonActions[btn.id].type === 'shell_command' ? 'cmd /c start notepad' :
                            __VLS_ctx.buttonActions[btn.id].type === 'open_url' ? 'https://example.com' :
                                'Action value'),
                ...{ class: "flex-1 bg-bg-secondary border border-border-default rounded-lg px-2 py-1 text-[10px] text-text-primary placeholder:text-text-muted/30" },
            });
            (__VLS_ctx.buttonActions[btn.id].value);
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['placeholder:text-text-muted/30']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.store.daemonConnected))
                        return;
                    __VLS_ctx.saveAction(btn.id);
                    // @ts-ignore
                    [buttonActions, buttonActions, buttonActions, buttonActions, buttonActions, buttonActions, saveAction,];
                } },
            ...{ class: "px-3 py-1 text-[9px] font-semibold bg-accent-purple/20 text-accent-purple border border-accent-purple/30 rounded-full hover:bg-accent-purple/30 transition" },
        });
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent-purple/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent-purple/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent-purple/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        (__VLS_ctx.t('daemon.save'));
        // @ts-ignore
        [t,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "bg-bg-secondary rounded-xl border border-border-default p-4 space-y-4" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "text-xs font-semibold text-text-secondary tracking-wider" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    (__VLS_ctx.t('daemon.perAppTitle'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-[10px] text-text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
    (__VLS_ctx.t('daemon.perAppDesc'));
    if (Object.keys(__VLS_ctx.appProfiles).length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        for (const [profile, appId] of __VLS_vFor((__VLS_ctx.appProfiles))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (appId),
                ...{ class: "flex items-center gap-3 p-2.5 bg-bg-tertiary rounded-xl" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-2.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg-tertiary']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "flex-1 text-[10px] text-text-primary font-mono truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-mono']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (appId);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[9px] font-bold text-accent-purple px-2 py-0.5 rounded-full bg-accent-purple/10 border border-accent-purple/30" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-0.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-accent-purple/10']} */ ;
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent-purple/30']} */ ;
            (profile + 1);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.daemonConnected))
                            return;
                        if (!(Object.keys(__VLS_ctx.appProfiles).length))
                            return;
                        __VLS_ctx.removeAppProfile(appId);
                        // @ts-ignore
                        [t, t, appProfiles, appProfiles, removeAppProfile,];
                    } },
                ...{ class: "text-text-muted hover:text-accent-red transition text-xs leading-none" },
            });
            /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['hover:text-accent-red']} */ ;
            /** @type {__VLS_StyleScopedClasses['transition']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['leading-none']} */ ;
            // @ts-ignore
            [];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-text-muted/40 italic" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted/40']} */ ;
        /** @type {__VLS_StyleScopedClasses['italic']} */ ;
        (__VLS_ctx.t('daemon.perAppEmpty'));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-2 pt-1" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['pt-1']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onKeyup: (__VLS_ctx.addAppProfile) },
        placeholder: (__VLS_ctx.t('daemon.perAppPlaceholder')),
        ...{ class: "flex-1 bg-bg-tertiary border border-border-default rounded-lg px-2 py-1 text-[10px] text-text-primary placeholder:text-text-muted/30" },
    });
    (__VLS_ctx.newAppId);
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg-tertiary']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
    /** @type {__VLS_StyleScopedClasses['placeholder:text-text-muted/30']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.newAppProfile),
        ...{ class: "bg-bg-tertiary border border-border-default rounded-lg px-2 py-1 text-[10px] text-text-primary" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg-tertiary']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (0),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (1),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (2),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (3),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.addAppProfile) },
        ...{ class: "px-3 py-1 text-[9px] font-semibold bg-accent-purple/20 text-accent-purple border border-accent-purple/30 rounded-full hover:bg-accent-purple/30 transition" },
    });
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-accent-purple/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent-purple/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:bg-accent-purple/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition']} */ ;
    (__VLS_ctx.t('daemon.perAppAdd'));
}
// @ts-ignore
[t, t, t, addAppProfile, addAppProfile, newAppId, newAppProfile,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

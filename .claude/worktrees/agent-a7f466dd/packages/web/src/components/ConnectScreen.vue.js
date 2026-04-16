/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from '../stores/device';
import { useI18n } from 'vue-i18n';
import { ref } from 'vue';
const store = useDeviceStore();
const { t } = useI18n();
const connecting = ref(false);
async function handleConnect() {
    connecting.value = true;
    try {
        await store.connect();
    }
    catch (e) {
        alert(e.message || 'Failed to connect');
    }
    finally {
        connecting.value = false;
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['connect-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['connect-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['connect-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['connect-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['connect-glow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "connect-screen" },
});
/** @type {__VLS_StyleScopedClasses['connect-screen']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "connect-grid" },
});
/** @type {__VLS_StyleScopedClasses['connect-grid']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div)({
    ...{ class: "connect-glow" },
});
/** @type {__VLS_StyleScopedClasses['connect-glow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "connect-content" },
});
/** @type {__VLS_StyleScopedClasses['connect-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "device-visual" },
});
/** @type {__VLS_StyleScopedClasses['device-visual']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
    ...{ class: "device-icon" },
    width: "120",
    height: "120",
    viewBox: "0 0 120 120",
    fill: "none",
});
/** @type {__VLS_StyleScopedClasses['device-icon']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M60 8L104 32V80L60 112L16 80V32L60 8Z",
    stroke: "currentColor",
    'stroke-width': "0.5",
    opacity: "0.15",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M60 20L92 38V74L60 100L28 74V38L60 20Z",
    stroke: "currentColor",
    'stroke-width': "0.5",
    opacity: "0.25",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.path)({
    d: "M60 35C48 35 42 42 42 52V72C42 82 48 90 60 90C72 90 78 82 78 72V52C78 42 72 35 60 35Z",
    stroke: "currentColor",
    'stroke-width': "1.2",
    opacity: "0.5",
    fill: "none",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.line)({
    x1: "60",
    y1: "38",
    x2: "60",
    y2: "58",
    stroke: "currentColor",
    'stroke-width': "0.8",
    opacity: "0.3",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
    x: "57",
    y: "45",
    width: "6",
    height: "10",
    rx: "3",
    stroke: "currentColor",
    'stroke-width': "0.8",
    opacity: "0.4",
    fill: "none",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "60",
    cy: "75",
    r: "2.5",
    fill: "currentColor",
    opacity: "0.4",
});
__VLS_asFunctionalElement1(__VLS_intrinsics.circle)({
    cx: "60",
    cy: "75",
    r: "6",
    stroke: "currentColor",
    'stroke-width': "0.5",
    opacity: "0.2",
    ...{ class: "pulse-ring" },
});
/** @type {__VLS_StyleScopedClasses['pulse-ring']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "connect-brand" },
});
/** @type {__VLS_StyleScopedClasses['connect-brand']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "connect-title" },
});
/** @type {__VLS_StyleScopedClasses['connect-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "connect-title-accent" },
});
/** @type {__VLS_StyleScopedClasses['connect-title-accent']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "connect-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['connect-subtitle']} */ ;
(__VLS_ctx.t('dashboard.connectPrompt'));
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.handleConnect) },
    ...{ class: "connect-btn" },
    ...{ class: ({ 'connect-btn--loading': __VLS_ctx.connecting }) },
    disabled: (__VLS_ctx.connecting),
});
/** @type {__VLS_StyleScopedClasses['connect-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['connect-btn--loading']} */ ;
if (!__VLS_ctx.connecting) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "18",
        height: "18",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M5 12h14",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M12 5l7 7-7 7",
    });
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        ...{ class: "spin" },
        width: "18",
        height: "18",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    /** @type {__VLS_StyleScopedClasses['spin']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M12 2a10 10 0 0 1 10 10",
        'stroke-linecap': "round",
    });
}
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
(__VLS_ctx.connecting ? 'Connecting...' : __VLS_ctx.t('dashboard.connectBtn'));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "connect-hint" },
});
/** @type {__VLS_StyleScopedClasses['connect-hint']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "hint-label" },
});
/** @type {__VLS_StyleScopedClasses['hint-label']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "hint-sep" },
});
/** @type {__VLS_StyleScopedClasses['hint-sep']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
// @ts-ignore
[t, t, handleConnect, connecting, connecting, connecting, connecting,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

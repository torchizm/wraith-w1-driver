/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from '../stores/device';
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { cmdReadKeyFunction, parseKeyFunctionResponse, cmdSetKeyFunction, } from '../protocol/commands';
import { DEFAULT_KEY_FUNCTIONS } from '../protocol/constants';
const store = useDeviceStore();
const { t } = useI18n();
const buttons = ref([
    { id: 'left', labelKey: 'buttons.btnLeft', buttonId: 0, currentFunction: 0, currentLabel: '' },
    { id: 'right', labelKey: 'buttons.btnRight', buttonId: 1, currentFunction: 0, currentLabel: '' },
    { id: 'middle', labelKey: 'buttons.btnMiddle', buttonId: 2, currentFunction: 0, currentLabel: '' },
    { id: 'back', labelKey: 'buttons.btnBack', buttonId: 3, currentFunction: 0, currentLabel: '' },
    { id: 'forward', labelKey: 'buttons.btnForward', buttonId: 4, currentFunction: 0, currentLabel: '' },
    { id: 'dpi', labelKey: 'buttons.btnDpi', buttonId: 5, currentFunction: 0, currentLabel: '' },
]);
const actionOptions = [
    { label: 'Left Click', value: DEFAULT_KEY_FUNCTIONS['left-click'] },
    { label: 'Right Click', value: DEFAULT_KEY_FUNCTIONS['right-click'] },
    { label: 'Middle Click', value: DEFAULT_KEY_FUNCTIONS['middle-click'] },
    { label: 'Forward', value: DEFAULT_KEY_FUNCTIONS['forward'] },
    { label: 'Back', value: DEFAULT_KEY_FUNCTIONS['back'] },
    { label: 'DPI Cycle', value: DEFAULT_KEY_FUNCTIONS['dpi-cycle'] },
    { label: 'DPI +', value: DEFAULT_KEY_FUNCTIONS['dpi-plus'] },
    { label: 'DPI -', value: DEFAULT_KEY_FUNCTIONS['dpi-minus'] },
    { label: 'Profile Switch', value: DEFAULT_KEY_FUNCTIONS['profile-switch'] },
    { label: 'Disable', value: DEFAULT_KEY_FUNCTIONS['disable'] },
];
function functionToLabel(value) {
    for (const [name, v] of Object.entries(DEFAULT_KEY_FUNCTIONS)) {
        if (v === value)
            return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return `Custom (0x${value.toString(16).padStart(8, '0')})`;
}
async function readButtons() {
    if (!store.connected)
        return;
    for (const btn of buttons.value) {
        btn.currentLabel = t('buttons.loading');
        const resp = await store.sendAndRead(cmdReadKeyFunction(btn.buttonId), 200);
        if (resp) {
            const parsed = parseKeyFunctionResponse(resp);
            if (parsed) {
                btn.currentFunction = parsed.functionValue;
                btn.currentLabel = functionToLabel(parsed.functionValue);
            }
        }
    }
}
async function setButton(btn, value) {
    await store.sendFeatureReport(cmdSetKeyFunction(btn.buttonId, value));
    btn.currentFunction = value;
    btn.currentLabel = functionToLabel(value);
}
onMounted(readButtons);
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
    (__VLS_ctx.t('buttons.connectFirst'));
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
    (__VLS_ctx.t('buttons.title'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    for (const [btn] of __VLS_vFor((__VLS_ctx.buttons))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (btn.id),
            ...{ class: "bg-bg-secondary rounded-xl border border-border-default p-4 flex items-center gap-4" },
        });
        /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "w-28 shrink-0" },
        });
        /** @type {__VLS_StyleScopedClasses['w-28']} */ ;
        /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-xs font-semibold text-text-primary" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
        (__VLS_ctx.t(btn.labelKey));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[9px] text-text-muted mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (__VLS_ctx.t('buttons.btnLabel'));
        (btn.buttonId);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-1" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-text-muted mb-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
        (__VLS_ctx.t('buttons.current'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-accent-cyan" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent-cyan']} */ ;
        (btn.currentLabel);
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            ...{ onChange: (...[$event]) => {
                    if (!!(!__VLS_ctx.store.connected))
                        return;
                    __VLS_ctx.setButton(btn, Number($event.target.value));
                    // @ts-ignore
                    [store, t, t, t, t, t, buttons, setButton,];
                } },
            value: (btn.currentFunction),
            ...{ class: "w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary" },
        });
        /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg-tertiary']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
        for (const [opt] of __VLS_vFor((__VLS_ctx.actionOptions))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                key: (opt.value),
                value: (opt.value),
            });
            (opt.label);
            // @ts-ignore
            [actionOptions,];
        }
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-[9px] text-text-muted/40 p-2" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-muted/40']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
    (__VLS_ctx.t('buttons.comingSoon'));
}
// @ts-ignore
[t,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

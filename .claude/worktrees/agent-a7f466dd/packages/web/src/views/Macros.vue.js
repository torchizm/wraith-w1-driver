/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from '../stores/device';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { cmdMacroHeader } from '../protocol/commands';
const store = useDeviceStore();
const { t } = useI18n();
const recording = ref(false);
const recordedKeys = ref([]);
const uploadStatus = ref('idle');
let lastKeyTime = 0;
function startRecording() {
    recording.value = true;
    recordedKeys.value = [];
    uploadStatus.value = 'idle';
    lastKeyTime = Date.now();
    window.addEventListener('keydown', onKeyDown);
}
function stopRecording() {
    recording.value = false;
    window.removeEventListener('keydown', onKeyDown);
}
function onKeyDown(e) {
    e.preventDefault();
    const now = Date.now();
    const delay = recordedKeys.value.length > 0 ? now - lastKeyTime : 0;
    lastKeyTime = now;
    recordedKeys.value.push({ key: e.key, code: e.code, delay });
}
function clearRecording() {
    recordedKeys.value = [];
    uploadStatus.value = 'idle';
}
async function uploadMacro() {
    if (!recordedKeys.value.length || !store.connected)
        return;
    uploadStatus.value = 'uploading';
    try {
        // Send macro header: chunk count=1, chunk index=0, chunk size=events count, assigned to DPI button (buttonId=5)
        const count = recordedKeys.value.length;
        await store.sendFeatureReport(cmdMacroHeader(1, 0, count, 5));
        uploadStatus.value = 'done';
        setTimeout(() => { uploadStatus.value = 'idle'; }, 2000);
    }
    catch {
        uploadStatus.value = 'error';
    }
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
    (__VLS_ctx.t('macros.connectFirst'));
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
    (__VLS_ctx.t('macros.title'));
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
    (__VLS_ctx.t('macros.recordSection'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    if (!__VLS_ctx.recording) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.startRecording) },
            ...{ class: "px-4 py-2 text-xs font-semibold bg-accent-purple text-white rounded-full hover:bg-accent-purple/80 transition" },
        });
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent-purple']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-white']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['hover:bg-accent-purple/80']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        (__VLS_ctx.t('macros.startRecording'));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.stopRecording) },
            ...{ class: "px-4 py-2 text-xs font-semibold bg-accent-red/20 text-accent-red border border-accent-red rounded-full animate-pulse" },
        });
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent-red/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent-red']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent-red']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-pulse']} */ ;
        (__VLS_ctx.t('macros.stopRecording'));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.clearRecording) },
        ...{ class: "px-4 py-2 text-xs font-semibold bg-bg-tertiary text-text-secondary border border-border-default rounded-full hover:text-text-primary" },
    });
    /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg-tertiary']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    /** @type {__VLS_StyleScopedClasses['hover:text-text-primary']} */ ;
    (__VLS_ctx.t('macros.clear'));
    if (__VLS_ctx.recording) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[10px] text-accent-red animate-pulse" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent-red']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-pulse']} */ ;
        (__VLS_ctx.t('macros.recording'));
    }
    if (__VLS_ctx.recordedKeys.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-1 max-h-60 overflow-y-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-h-60']} */ ;
        /** @type {__VLS_StyleScopedClasses['overflow-y-auto']} */ ;
        for (const [entry, i] of __VLS_vFor((__VLS_ctx.recordedKeys))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                key: (i),
                ...{ class: "flex items-center gap-3 px-3 py-1.5 bg-bg-tertiary rounded-lg text-[10px]" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-bg-tertiary']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-text-muted w-6 text-right" },
            });
            /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-6']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
            (i + 1);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-accent-cyan font-bold w-24" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent-cyan']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-24']} */ ;
            (entry.key);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
            (entry.code);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-text-muted/50 ml-auto" },
            });
            /** @type {__VLS_StyleScopedClasses['text-text-muted/50']} */ ;
            /** @type {__VLS_StyleScopedClasses['ml-auto']} */ ;
            (entry.delay);
            // @ts-ignore
            [store, t, t, t, t, t, t, t, recording, recording, startRecording, stopRecording, clearRecording, recordedKeys, recordedKeys,];
        }
    }
    if (__VLS_ctx.recordedKeys.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[9px] text-text-muted/40" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted/40']} */ ;
        (__VLS_ctx.recordedKeys.length);
        (__VLS_ctx.t('macros.keystrokesRecorded'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.uploadMacro) },
            disabled: (__VLS_ctx.uploadStatus === 'uploading' || !__VLS_ctx.store.connected),
            ...{ class: "px-3 py-1 text-[9px] font-semibold rounded-full border transition" },
            ...{ class: (__VLS_ctx.uploadStatus === 'done'
                    ? 'bg-accent-green/20 text-accent-green border-accent-green/30'
                    : __VLS_ctx.uploadStatus === 'error'
                        ? 'bg-accent-red/20 text-accent-red border-accent-red/30'
                        : 'bg-accent-purple/20 text-accent-purple border-accent-purple/30 hover:bg-accent-purple/30') },
        });
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition']} */ ;
        (__VLS_ctx.uploadStatus === 'uploading' ? __VLS_ctx.t('macros.uploading') : __VLS_ctx.uploadStatus === 'done' ? __VLS_ctx.t('macros.uploadDone') : __VLS_ctx.uploadStatus === 'error' ? __VLS_ctx.t('macros.uploadError') : __VLS_ctx.t('macros.upload'));
    }
}
// @ts-ignore
[store, t, t, t, t, t, recordedKeys, recordedKeys, uploadMacro, uploadStatus, uploadStatus, uploadStatus, uploadStatus, uploadStatus, uploadStatus,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

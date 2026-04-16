/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from '../stores/device';
import { ref, computed, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/useToast';
import { cmdMacroHeader, cmdSetKeyFunction, encodeMacro, JS_KEY_TO_HID } from '../protocol/commands';
import { BUTTON_IDS, DEFAULT_KEY_FUNCTIONS } from '../protocol/constants';
const store = useDeviceStore();
const { t } = useI18n();
const { showToast } = useToast();
const recording = ref(false);
const recordedKeys = ref([]);
const uploadStatus = ref('idle');
const uploadProgress = ref('');
const selectedButton = ref('dpi');
const selectedStep = ref(null);
const insertingAt = ref(null);
let lastKeyTime = 0;
// Drag state
const draggingIndex = ref(null);
const dragDelayPreview = ref(null);
const MAX_KEYSTROKES = 80;
const MACRO_REPORT_ID = 9;
const MIN_BLOCK_WIDTH = 40;
const PIXELS_PER_MS = 0.3;
const buttonOptions = [
    { id: 'left', labelKey: 'macros.btnLeft' },
    { id: 'right', labelKey: 'macros.btnRight' },
    { id: 'middle', labelKey: 'macros.btnMiddle' },
    { id: 'back', labelKey: 'macros.btnBack' },
    { id: 'forward', labelKey: 'macros.btnForward' },
    { id: 'dpi', labelKey: 'macros.btnDpi' },
];
// Default functions to restore when clearing a macro
const defaultFunctions = {
    left: DEFAULT_KEY_FUNCTIONS['left-click'],
    right: DEFAULT_KEY_FUNCTIONS['right-click'],
    middle: DEFAULT_KEY_FUNCTIONS['middle-click'],
    back: DEFAULT_KEY_FUNCTIONS['back'],
    forward: DEFAULT_KEY_FUNCTIONS['forward'],
    dpi: DEFAULT_KEY_FUNCTIONS['dpi-cycle'],
};
const totalDuration = computed(() => recordedKeys.value.reduce((sum, k) => sum + k.delay, 0));
const uploadPercent = computed(() => {
    if (uploadStatus.value !== 'uploading' || !uploadProgress.value)
        return 0;
    const match = uploadProgress.value.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match)
        return 0;
    return Math.round((parseInt(match[1]) / parseInt(match[2])) * 100);
});
function keyBorderColor(code) {
    if (/^(ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|MetaLeft|MetaRight)$/.test(code))
        return 'border-l-blue-400';
    if (/^Key[A-Z]$/.test(code))
        return 'border-l-emerald-400';
    if (/^F\d+$/.test(code))
        return 'border-l-orange-400';
    return 'border-l-gray-400';
}
function keyColor(code) {
    if (/^(ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|MetaLeft|MetaRight)$/.test(code))
        return 'bg-blue-600/80 border-blue-400/50';
    if (/^Key[A-Z]$/.test(code))
        return 'bg-emerald-600/80 border-emerald-400/50';
    if (/^F\d+$/.test(code))
        return 'bg-orange-600/80 border-orange-400/50';
    return 'bg-gray-600/80 border-gray-400/50';
}
function keyColorDot(code) {
    if (/^(ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|MetaLeft|MetaRight)$/.test(code))
        return 'bg-blue-400';
    if (/^Key[A-Z]$/.test(code))
        return 'bg-emerald-400';
    if (/^F\d+$/.test(code))
        return 'bg-orange-400';
    return 'bg-gray-400';
}
function timelineNeonColor(code) {
    if (/^(ShiftLeft|ShiftRight|ControlLeft|ControlRight|AltLeft|AltRight|MetaLeft|MetaRight)$/.test(code))
        return 'rgba(96, 165, 250, 0.6)';
    if (/^Key[A-Z]$/.test(code))
        return 'rgba(52, 211, 153, 0.6)';
    if (/^F\d+$/.test(code))
        return 'rgba(251, 146, 60, 0.6)';
    return 'rgba(156, 163, 175, 0.4)';
}
function blockWidth(delay) {
    return Math.max(MIN_BLOCK_WIDTH, delay * PIXELS_PER_MS);
}
function formatMs(ms) {
    if (ms >= 1000)
        return (ms / 1000).toFixed(1) + 's';
    return ms + 'ms';
}
function startRecording() {
    recording.value = true;
    recordedKeys.value = [];
    uploadStatus.value = 'idle';
    uploadProgress.value = '';
    selectedStep.value = null;
    lastKeyTime = Date.now();
    window.addEventListener('keydown', onKeyDown);
}
function stopRecording() {
    recording.value = false;
    window.removeEventListener('keydown', onKeyDown);
}
function onKeyDown(e) {
    e.preventDefault();
    if (recordedKeys.value.length >= MAX_KEYSTROKES) {
        stopRecording();
        showToast(t('macros.tooManyKeystrokes'), 'info');
        return;
    }
    const now = Date.now();
    const delay = recordedKeys.value.length > 0 ? now - lastKeyTime : 0;
    lastKeyTime = now;
    recordedKeys.value.push({ key: e.key, code: e.code, delay });
}
function clearRecording() {
    recordedKeys.value = [];
    uploadStatus.value = 'idle';
    uploadProgress.value = '';
    selectedStep.value = null;
    insertingAt.value = null;
}
function isRecognizedKey(code) {
    return code in JS_KEY_TO_HID;
}
// Step editing
function selectStep(index) {
    selectedStep.value = selectedStep.value === index ? null : index;
}
function deleteStep(index) {
    recordedKeys.value.splice(index, 1);
    if (selectedStep.value === index)
        selectedStep.value = null;
    else if (selectedStep.value !== null && selectedStep.value > index)
        selectedStep.value--;
    showToast(t('macros.stepDeleted'), 'info');
}
function duplicateStep(index) {
    if (recordedKeys.value.length >= MAX_KEYSTROKES) {
        showToast(t('macros.tooManyKeystrokes'), 'info');
        return;
    }
    const entry = { ...recordedKeys.value[index] };
    recordedKeys.value.splice(index + 1, 0, entry);
    selectedStep.value = index + 1;
    showToast(t('macros.stepDuplicated'), 'success');
}
function updateDelay(index, value) {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
        recordedKeys.value[index].delay = num;
    }
}
// Insert step
function startInsert(index) {
    insertingAt.value = index;
    window.addEventListener('keydown', onInsertKeyDown);
}
function cancelInsert() {
    insertingAt.value = null;
    window.removeEventListener('keydown', onInsertKeyDown);
}
function onInsertKeyDown(e) {
    e.preventDefault();
    if (insertingAt.value === null)
        return;
    if (recordedKeys.value.length >= MAX_KEYSTROKES) {
        showToast(t('macros.tooManyKeystrokes'), 'info');
        cancelInsert();
        return;
    }
    const newEntry = { key: e.key, code: e.code, delay: 50 };
    recordedKeys.value.splice(insertingAt.value + 1, 0, newEntry);
    selectedStep.value = insertingAt.value + 1;
    showToast(t('macros.stepInserted'), 'success');
    cancelInsert();
}
// Drag to adjust delay
function onDragStart(index, event) {
    event.preventDefault();
    event.stopPropagation();
    draggingIndex.value = index;
    const startX = event.clientX;
    const nextIndex = index + 1;
    if (nextIndex >= recordedKeys.value.length)
        return;
    const originalDelay = recordedKeys.value[nextIndex].delay;
    function onMouseMove(e) {
        const dx = e.clientX - startX;
        const newDelay = Math.max(0, Math.round(originalDelay + dx / PIXELS_PER_MS));
        dragDelayPreview.value = newDelay;
        recordedKeys.value[nextIndex].delay = newDelay;
    }
    function onMouseUp() {
        draggingIndex.value = null;
        dragDelayPreview.value = null;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
}
onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keydown', onInsertKeyDown);
});
async function uploadMacro() {
    if (!recordedKeys.value.length || !store.connected)
        return;
    uploadStatus.value = 'uploading';
    const buttonId = BUTTON_IDS[selectedButton.value];
    if (buttonId === undefined) {
        uploadStatus.value = 'error';
        showToast(t('macros.uploadFailed'), 'error');
        return;
    }
    try {
        // Encode keystrokes into chunks
        const keystrokes = recordedKeys.value.map(k => ({ code: k.code, delay: k.delay }));
        const chunks = encodeMacro(keystrokes);
        const chunkCount = chunks.length;
        // Step 1: Send macro header + data for each chunk
        for (let i = 0; i < chunkCount; i++) {
            uploadProgress.value = t('macros.uploadProgress', { current: i + 1, total: chunkCount });
            // Send header for this chunk
            await store.sendFeatureReport(cmdMacroHeader(chunkCount, i, 32, buttonId));
            await new Promise(r => setTimeout(r, 50));
            // Send data chunk via OUTPUT report
            await store.sendReport(MACRO_REPORT_ID, chunks[i]);
            await new Promise(r => setTimeout(r, 50));
        }
        // Step 2: Assign macro mode to the selected button
        const macroAssign = new Uint8Array([6, buttonId, 9, 0, buttonId, 0, 0, 0]);
        await store.sendFeatureReport(macroAssign);
        uploadStatus.value = 'done';
        uploadProgress.value = '';
        const btnLabel = t(buttonOptions.find(b => b.id === selectedButton.value)?.labelKey ?? 'macros.btnDpi');
        showToast(t('macros.uploadSuccess', { button: btnLabel }), 'success');
        setTimeout(() => { uploadStatus.value = 'idle'; }, 3000);
    }
    catch (err) {
        console.error('Macro upload failed:', err);
        uploadStatus.value = 'error';
        uploadProgress.value = '';
        showToast(t('macros.uploadFailed'), 'error');
    }
}
async function deleteMacro() {
    if (!store.connected)
        return;
    const buttonId = BUTTON_IDS[selectedButton.value];
    if (buttonId === undefined)
        return;
    try {
        const defaultFn = defaultFunctions[selectedButton.value] ?? DEFAULT_KEY_FUNCTIONS['left-click'];
        await store.sendFeatureReport(cmdSetKeyFunction(buttonId, defaultFn));
        const btnLabel = t(buttonOptions.find(b => b.id === selectedButton.value)?.labelKey ?? 'macros.btnDpi');
        showToast(t('macros.deleteSuccess', { button: btnLabel }), 'success');
    }
    catch (err) {
        console.error('Macro delete failed:', err);
        showToast(t('macros.deleteFailed'), 'error');
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['middle-split']} */ ;
/** @type {__VLS_StyleScopedClasses['macro-select']} */ ;
/** @type {__VLS_StyleScopedClasses['macro-btn-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['macro-btn-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['macro-btn-outline']} */ ;
/** @type {__VLS_StyleScopedClasses['record-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['record-btn--active']} */ ;
/** @type {__VLS_StyleScopedClasses['record-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['led-counter--sm']} */ ;
/** @type {__VLS_StyleScopedClasses['led-digit']} */ ;
/** @type {__VLS_StyleScopedClasses['step-card']} */ ;
/** @type {__VLS_StyleScopedClasses['step-delay-input']} */ ;
/** @type {__VLS_StyleScopedClasses['step-action-btn--cyan']} */ ;
/** @type {__VLS_StyleScopedClasses['step-action-btn--red']} */ ;
/** @type {__VLS_StyleScopedClasses['step-action-btn--purple']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-block']} */ ;
/** @type {__VLS_StyleScopedClasses['drag-handle']} */ ;
if (!__VLS_ctx.store.connected) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-center text-text-muted py-20 text-sm font-display tracking-wider" },
    });
    /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-20']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-display']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    (__VLS_ctx.t('macros.connectFirst'));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "macro-page" },
    });
    /** @type {__VLS_StyleScopedClasses['macro-page']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-lg font-bold text-text-primary font-display tracking-widest uppercase mb-5" },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-display']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-widest']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
    (__VLS_ctx.t('macros.title'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "top-bar hud-card bg-bg-secondary border border-border-default p-4" },
    });
    /** @type {__VLS_StyleScopedClasses['top-bar']} */ ;
    /** @type {__VLS_StyleScopedClasses['hud-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "top-bar-inner" },
    });
    /** @type {__VLS_StyleScopedClasses['top-bar-inner']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] text-text-muted font-data tracking-wider uppercase whitespace-nowrap" },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    /** @type {__VLS_StyleScopedClasses['whitespace-nowrap']} */ ;
    (__VLS_ctx.t('macros.targetButton'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "macro-select-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['macro-select-wrap']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.selectedButton),
        ...{ class: "macro-select" },
    });
    /** @type {__VLS_StyleScopedClasses['macro-select']} */ ;
    for (const [btn] of __VLS_vFor((__VLS_ctx.buttonOptions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (btn.id),
            value: (btn.id),
        });
        (__VLS_ctx.t(btn.labelKey));
        // @ts-ignore
        [store, t, t, t, t, selectedButton, buttonOptions,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "macro-select-arrow" },
    });
    /** @type {__VLS_StyleScopedClasses['macro-select-arrow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        width: "10",
        height: "6",
        viewBox: "0 0 10 6",
        fill: "none",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M1 1L5 5L9 1",
        stroke: "currentColor",
        'stroke-width': "1.5",
        'stroke-linecap': "square",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.deleteMacro) },
        disabled: (__VLS_ctx.uploadStatus === 'uploading'),
        ...{ class: "macro-btn-danger" },
    });
    /** @type {__VLS_StyleScopedClasses['macro-btn-danger']} */ ;
    (__VLS_ctx.t('macros.deleteMacro'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    if (!__VLS_ctx.recording) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.startRecording) },
            ...{ class: "record-btn" },
        });
        /** @type {__VLS_StyleScopedClasses['record-btn']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "record-dot" },
        });
        /** @type {__VLS_StyleScopedClasses['record-dot']} */ ;
        (__VLS_ctx.t('macros.startRecording'));
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.stopRecording) },
            ...{ class: "record-btn record-btn--active" },
        });
        /** @type {__VLS_StyleScopedClasses['record-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['record-btn--active']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "stop-icon" },
        });
        /** @type {__VLS_StyleScopedClasses['stop-icon']} */ ;
        (__VLS_ctx.t('macros.stopRecording'));
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.clearRecording) },
        ...{ class: "macro-btn-outline" },
    });
    /** @type {__VLS_StyleScopedClasses['macro-btn-outline']} */ ;
    (__VLS_ctx.t('macros.clear'));
    if (__VLS_ctx.recordedKeys.length || __VLS_ctx.recording) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "led-counter" },
        });
        /** @type {__VLS_StyleScopedClasses['led-counter']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "led-digit" },
        });
        /** @type {__VLS_StyleScopedClasses['led-digit']} */ ;
        (String(__VLS_ctx.recordedKeys.length).padStart(2, '0'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "led-sep" },
        });
        /** @type {__VLS_StyleScopedClasses['led-sep']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "led-digit led-digit--max" },
        });
        /** @type {__VLS_StyleScopedClasses['led-digit']} */ ;
        /** @type {__VLS_StyleScopedClasses['led-digit--max']} */ ;
        (__VLS_ctx.MAX_KEYSTROKES);
    }
    if (__VLS_ctx.recording) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center gap-2 mt-2" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "inline-block w-2 h-2 rounded-full bg-accent-red animate-pulse" },
        });
        /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-accent-red']} */ ;
        /** @type {__VLS_StyleScopedClasses['animate-pulse']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-accent-red font-data tracking-wider uppercase" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent-red']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        (__VLS_ctx.t('macros.recording'));
    }
    if (__VLS_ctx.recording) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[9px] text-text-muted/60 font-data mt-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted/60']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
        (__VLS_ctx.t('macros.maxKeystrokesWarning'));
    }
    if (__VLS_ctx.recordedKeys.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "middle-split" },
        });
        /** @type {__VLS_StyleScopedClasses['middle-split']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "keystroke-panel hud-card bg-bg-secondary border border-border-default p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['keystroke-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['hud-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "text-[10px] font-bold text-text-secondary font-display tracking-wider uppercase mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-display']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "keystroke-list" },
        });
        /** @type {__VLS_StyleScopedClasses['keystroke-list']} */ ;
        for (const [entry, i] of __VLS_vFor((__VLS_ctx.recordedKeys))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.connected))
                            return;
                        if (!(__VLS_ctx.recordedKeys.length))
                            return;
                        __VLS_ctx.selectStep(i);
                        // @ts-ignore
                        [t, t, t, t, t, t, deleteMacro, uploadStatus, recording, recording, recording, recording, startRecording, stopRecording, clearRecording, recordedKeys, recordedKeys, recordedKeys, recordedKeys, MAX_KEYSTROKES, selectStep,];
                    } },
                key: (i),
                ...{ class: "step-card" },
                ...{ class: ([
                        __VLS_ctx.keyBorderColor(entry.code),
                        __VLS_ctx.selectedStep === i ? 'step-card--selected' : ''
                    ]) },
            });
            /** @type {__VLS_StyleScopedClasses['step-card']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-text-muted w-5 text-right shrink-0 font-data text-[9px]" },
            });
            /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-5']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
            (String(i + 1).padStart(2, '0'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "w-2 h-2 rounded-full shrink-0" },
                ...{ class: (__VLS_ctx.keyColorDot(entry.code)) },
            });
            /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "font-bold font-data shrink-0 text-[11px] min-w-[48px]" },
                ...{ class: (__VLS_ctx.isRecognizedKey(entry.code) ? 'text-accent-cyan' : 'text-accent-red/60') },
            });
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['min-w-[48px]']} */ ;
            (entry.key);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-text-muted font-data text-[9px] truncate" },
            });
            /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            (entry.code);
            if (!__VLS_ctx.isRecognizedKey(entry.code)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-accent-red/40 text-[8px] font-data shrink-0" },
                });
                /** @type {__VLS_StyleScopedClasses['text-accent-red/40']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[8px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
                /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "ml-auto flex items-center gap-1.5 shrink-0" },
            });
            /** @type {__VLS_StyleScopedClasses['ml-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onInput: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.connected))
                            return;
                        if (!(__VLS_ctx.recordedKeys.length))
                            return;
                        __VLS_ctx.updateDelay(i, $event.target.value);
                        // @ts-ignore
                        [keyBorderColor, selectedStep, keyColorDot, isRecognizedKey, isRecognizedKey, updateDelay,];
                    } },
                ...{ onClick: () => { } },
                type: "number",
                value: (entry.delay),
                min: "0",
                ...{ class: "step-delay-input" },
            });
            /** @type {__VLS_StyleScopedClasses['step-delay-input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[8px] text-text-muted/40 font-data" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[8px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text-muted/40']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.connected))
                            return;
                        if (!(__VLS_ctx.recordedKeys.length))
                            return;
                        __VLS_ctx.duplicateStep(i);
                        // @ts-ignore
                        [duplicateStep,];
                    } },
                ...{ class: "step-action-btn step-action-btn--cyan" },
                title: "Duplicate",
            });
            /** @type {__VLS_StyleScopedClasses['step-action-btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['step-action-btn--cyan']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                width: "11",
                height: "11",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                'stroke-width': "2",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
                x: "9",
                y: "9",
                width: "13",
                height: "13",
                rx: "1",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.connected))
                            return;
                        if (!(__VLS_ctx.recordedKeys.length))
                            return;
                        __VLS_ctx.deleteStep(i);
                        // @ts-ignore
                        [deleteStep,];
                    } },
                ...{ class: "step-action-btn step-action-btn--red" },
                title: "Delete",
            });
            /** @type {__VLS_StyleScopedClasses['step-action-btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['step-action-btn--red']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                width: "11",
                height: "11",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                'stroke-width': "2",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M18 6L6 18M6 6l12 12",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.connected))
                            return;
                        if (!(__VLS_ctx.recordedKeys.length))
                            return;
                        __VLS_ctx.startInsert(i);
                        // @ts-ignore
                        [startInsert,];
                    } },
                ...{ class: "step-action-btn step-action-btn--purple" },
                title: "Insert after",
            });
            /** @type {__VLS_StyleScopedClasses['step-action-btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['step-action-btn--purple']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                width: "11",
                height: "11",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                'stroke-width': "2",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                d: "M12 5v14M5 12h14",
            });
            // @ts-ignore
            [];
        }
        if (__VLS_ctx.insertingAt !== null) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "insert-capture-bar mt-3" },
            });
            /** @type {__VLS_StyleScopedClasses['insert-capture-bar']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "inline-block w-2 h-2 rounded-full bg-accent-purple animate-pulse" },
            });
            /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['bg-accent-purple']} */ ;
            /** @type {__VLS_StyleScopedClasses['animate-pulse']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-accent-purple font-data tracking-wider" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            (__VLS_ctx.t('macros.insertCapture'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.cancelInsert) },
                ...{ class: "ml-auto macro-btn-outline text-[9px]" },
            });
            /** @type {__VLS_StyleScopedClasses['ml-auto']} */ ;
            /** @type {__VLS_StyleScopedClasses['macro-btn-outline']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
            (__VLS_ctx.t('macros.insertCancelCapture'));
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "timeline-panel hud-card bg-bg-secondary border border-border-default p-4" },
        });
        /** @type {__VLS_StyleScopedClasses['timeline-panel']} */ ;
        /** @type {__VLS_StyleScopedClasses['hud-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "text-[10px] font-bold text-text-secondary font-display tracking-wider uppercase" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-display']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        (__VLS_ctx.t('macros.timelineSection'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "led-counter led-counter--sm" },
        });
        /** @type {__VLS_StyleScopedClasses['led-counter']} */ ;
        /** @type {__VLS_StyleScopedClasses['led-counter--sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[9px] font-data text-text-muted/50 mr-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['mr-1.5']} */ ;
        (__VLS_ctx.t('macros.totalDuration'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "led-digit" },
        });
        /** @type {__VLS_StyleScopedClasses['led-digit']} */ ;
        (__VLS_ctx.formatMs(__VLS_ctx.totalDuration));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center gap-4 text-[9px] text-text-muted font-data tracking-wide mb-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center gap-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "w-2 h-2 bg-blue-400 inline-block" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-blue-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center gap-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "w-2 h-2 bg-emerald-400 inline-block" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-emerald-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center gap-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "w-2 h-2 bg-orange-400 inline-block" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-orange-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "flex items-center gap-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-1.5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "w-2 h-2 bg-gray-400 inline-block" },
            ...{ style: {} },
        });
        /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-gray-400']} */ ;
        /** @type {__VLS_StyleScopedClasses['inline-block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "overflow-x-auto pb-2" },
        });
        /** @type {__VLS_StyleScopedClasses['overflow-x-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['pb-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "timeline-track" },
        });
        /** @type {__VLS_StyleScopedClasses['timeline-track']} */ ;
        for (const [entry, i] of __VLS_vFor((__VLS_ctx.recordedKeys))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.connected))
                            return;
                        if (!(__VLS_ctx.recordedKeys.length))
                            return;
                        __VLS_ctx.selectStep(i);
                        // @ts-ignore
                        [t, t, t, t, recordedKeys, selectStep, insertingAt, cancelInsert, formatMs, totalDuration,];
                    } },
                key: ('tl-' + i),
                ...{ class: "timeline-block" },
                ...{ class: ([
                        __VLS_ctx.keyColor(entry.code),
                        __VLS_ctx.selectedStep === i ? 'timeline-block--selected' : '',
                        __VLS_ctx.draggingIndex === i ? 'opacity-80' : ''
                    ]) },
                ...{ style: ({
                        width: __VLS_ctx.blockWidth(i === 0 ? 50 : entry.delay) + 'px',
                        marginRight: '2px',
                        '--neon-color': __VLS_ctx.timelineNeonColor(entry.code)
                    }) },
            });
            /** @type {__VLS_StyleScopedClasses['timeline-block']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "truncate px-1 text-[8px] font-bold font-data" },
            });
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['px-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-[8px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            (entry.key);
            if (entry.delay > 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "absolute -top-4 left-0 right-0 text-center text-[7px] font-data" },
                    ...{ class: (__VLS_ctx.draggingIndex === i - 1 ? 'text-accent-gold font-bold' : 'text-text-muted/50') },
                });
                /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
                /** @type {__VLS_StyleScopedClasses['-top-4']} */ ;
                /** @type {__VLS_StyleScopedClasses['left-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['right-0']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-[7px]']} */ ;
                /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
                (__VLS_ctx.draggingIndex === i - 1 && __VLS_ctx.dragDelayPreview !== null ? __VLS_ctx.dragDelayPreview : entry.delay);
            }
            if (i < __VLS_ctx.recordedKeys.length - 1) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ onMousedown: (...[$event]) => {
                            if (!!(!__VLS_ctx.store.connected))
                                return;
                            if (!(__VLS_ctx.recordedKeys.length))
                                return;
                            if (!(i < __VLS_ctx.recordedKeys.length - 1))
                                return;
                            __VLS_ctx.onDragStart(i, $event);
                            // @ts-ignore
                            [recordedKeys, selectedStep, keyColor, draggingIndex, draggingIndex, draggingIndex, blockWidth, timelineNeonColor, dragDelayPreview, dragDelayPreview, onDragStart,];
                        } },
                    ...{ class: "drag-handle" },
                });
                /** @type {__VLS_StyleScopedClasses['drag-handle']} */ ;
            }
            // @ts-ignore
            [];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex-shrink-0 h-10 flex items-center pl-3 border-l-2 border-accent-gold/40" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-10']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['pl-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-l-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent-gold/40']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "led-counter led-counter--sm" },
        });
        /** @type {__VLS_StyleScopedClasses['led-counter']} */ ;
        /** @type {__VLS_StyleScopedClasses['led-counter--sm']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "led-digit text-accent-gold" },
        });
        /** @type {__VLS_StyleScopedClasses['led-digit']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent-gold']} */ ;
        (__VLS_ctx.formatMs(__VLS_ctx.totalDuration));
    }
    if (__VLS_ctx.recordedKeys.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
            ...{ class: "hud-card bg-bg-secondary border border-border-default p-4 mt-4" },
        });
        /** @type {__VLS_StyleScopedClasses['hud-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-between" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-text-muted/50 font-data" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        (__VLS_ctx.recordedKeys.length);
        (__VLS_ctx.MAX_KEYSTROKES);
        (__VLS_ctx.t('macros.keystrokesRecorded'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.uploadMacro) },
            disabled: (__VLS_ctx.uploadStatus === 'uploading' || !__VLS_ctx.store.connected),
            ...{ class: "upload-btn" },
            ...{ class: ({
                    'upload-btn--done': __VLS_ctx.uploadStatus === 'done',
                    'upload-btn--error': __VLS_ctx.uploadStatus === 'error',
                }) },
        });
        /** @type {__VLS_StyleScopedClasses['upload-btn']} */ ;
        /** @type {__VLS_StyleScopedClasses['upload-btn--done']} */ ;
        /** @type {__VLS_StyleScopedClasses['upload-btn--error']} */ ;
        (__VLS_ctx.uploadStatus === 'uploading' ? __VLS_ctx.t('macros.uploading') : __VLS_ctx.uploadStatus === 'done' ? __VLS_ctx.t('macros.uploadDone') : __VLS_ctx.uploadStatus === 'error' ? __VLS_ctx.t('macros.uploadError') : __VLS_ctx.t('macros.upload'));
        if (__VLS_ctx.uploadStatus === 'uploading') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "upload-progress-track mt-3" },
            });
            /** @type {__VLS_StyleScopedClasses['upload-progress-track']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "upload-progress-fill" },
                ...{ style: ({ width: __VLS_ctx.uploadPercent + '%' }) },
            });
            /** @type {__VLS_StyleScopedClasses['upload-progress-fill']} */ ;
        }
        if (__VLS_ctx.uploadProgress) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "text-[9px] text-accent-purple/70 font-data tracking-wide mt-2" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent-purple/70']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
            (__VLS_ctx.uploadProgress);
        }
    }
}
// @ts-ignore
[store, t, t, t, t, t, uploadStatus, uploadStatus, uploadStatus, uploadStatus, uploadStatus, uploadStatus, uploadStatus, recordedKeys, recordedKeys, MAX_KEYSTROKES, formatMs, totalDuration, uploadMacro, uploadPercent, uploadProgress, uploadProgress,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

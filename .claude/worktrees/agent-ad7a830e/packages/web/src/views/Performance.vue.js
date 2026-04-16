/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from '../stores/device';
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { cmdSetPollingRate, cmdSetLOD, cmdSetAngleSnap, cmdSetMotionSync, cmdSetRipple, cmdSetPerfMode, cmdSetDebounce, cmdSetSleepTime, cmdSetDPIValue, cmdSetDPIConfig, } from '../protocol/commands';
import { SLEEP_TIMES, PERF_MODES } from '../protocol/constants';
const store = useDeviceStore();
const { t } = useI18n();
const saving = ref(false);
// Device always has exactly 4 DPI slots (one per on-board configuration)
const DPI_SLOT_COUNT = 4;
const dpiSlots = ref(Array(DPI_SLOT_COUNT).fill(800));
const currentDPISlot = ref(0);
const maxDPI = computed(() => store.deviceInfo?.maxDPI ?? 26000);
// Reactively sync DPI slots from store — fires on connect, profile switch, and any readDPIConfig call
watch(() => store.dpiLevels, (levels) => {
    if (levels.length > 0) {
        // Pad/trim to exactly 4 slots
        const arr = [...levels];
        while (arr.length < DPI_SLOT_COUNT)
            arr.push(800);
        dpiSlots.value = arr.slice(0, DPI_SLOT_COUNT);
        currentDPISlot.value = store.currentDPIIndex;
    }
    else {
        // Fallback: try localStorage while device config is still loading
        try {
            const cached = localStorage.getItem('wraith:lastState');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.dpiLevels?.length) {
                    const arr = [...parsed.dpiLevels];
                    while (arr.length < DPI_SLOT_COUNT)
                        arr.push(800);
                    dpiSlots.value = arr.slice(0, DPI_SLOT_COUNT);
                    currentDPISlot.value = parsed.currentDPIIndex ?? 0;
                }
            }
        }
        catch { }
    }
}, { immediate: true });
// Keep active-slot highlight in sync when user cycles DPI on the physical mouse
watch(() => store.currentDPIIndex, (idx) => { currentDPISlot.value = idx; });
async function setPollingRate(hz) {
    saving.value = true;
    try {
        await store.sendFeatureReport(cmdSetPollingRate(store.customerCode, hz));
        store.updateState({ pollingRateHz: hz });
    }
    finally {
        saving.value = false;
    }
}
async function setLOD(value) {
    saving.value = true;
    try {
        await store.sendFeatureReport(cmdSetLOD(store.customerCode, value));
        store.updateState({ lodValue: value });
    }
    finally {
        saving.value = false;
    }
}
async function setDebounce(ms) {
    saving.value = true;
    try {
        await store.sendFeatureReport(cmdSetDebounce(store.customerCode, ms));
        store.updateState({ debounceTime: ms });
    }
    finally {
        saving.value = false;
    }
}
async function setSleepTime(seconds) {
    saving.value = true;
    try {
        await store.sendFeatureReport(cmdSetSleepTime(store.customerCode, seconds));
        store.updateState({ sleepTime: seconds });
    }
    finally {
        saving.value = false;
    }
}
async function toggleAngleSnap() {
    const newVal = !store.angleSnap;
    await store.sendFeatureReport(cmdSetAngleSnap(store.customerCode, newVal));
    store.updateState({ angleSnap: newVal });
}
async function toggleMotionSync() {
    const newVal = !store.motionSync;
    await store.sendFeatureReport(cmdSetMotionSync(store.customerCode, newVal));
    store.updateState({ motionSync: newVal });
}
async function toggleRipple() {
    const newVal = !store.rippleEffect;
    await store.sendFeatureReport(cmdSetRipple(store.customerCode, newVal));
    store.updateState({ rippleEffect: newVal });
}
const perfModeApplying = ref(null);
async function setPerfMode(mode) {
    perfModeApplying.value = mode;
    await store.sendFeatureReport(cmdSetPerfMode(store.customerCode, mode));
    // Device firmware needs ~1.5s to apply sensor mode changes
    await new Promise(resolve => setTimeout(resolve, 1500));
    store.updateState({ performanceMode: mode });
    perfModeApplying.value = null;
}
async function updateDPISlot(index, value) {
    dpiSlots.value[index] = value;
    await store.sendFeatureReport(cmdSetDPIValue(store.customerCode, index, value));
}
async function selectDPISlot(index) {
    currentDPISlot.value = index;
    await store.sendFeatureReport(cmdSetDPIConfig(store.customerCode, DPI_SLOT_COUNT, index));
    store.updateState({ currentDPIIndex: index });
}
const pollingRates = [125, 250, 500, 1000, 2000, 4000, 8000];
const lodOptions = computed(() => [
    { v: 2, label: t('perf.lodLow') }, // 0.7 mm
    { v: 0, label: t('perf.lodMedium') }, // 1 mm
    { v: 1, label: t('perf.lodHigh') }, // 2 mm
]);
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
    (__VLS_ctx.t('perf.connectFirst'));
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
    (__VLS_ctx.t('perf.title'));
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
    (__VLS_ctx.t('perf.dpiLevels'));
    for (const [dpi, i] of __VLS_vFor((__VLS_ctx.dpiSlots))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            key: (i),
            ...{ class: "flex items-center gap-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.store.connected))
                        return;
                    __VLS_ctx.selectDPISlot(i);
                    // @ts-ignore
                    [store, t, t, t, dpiSlots, selectDPISlot,];
                } },
            ...{ class: "text-[10px] font-bold w-16 text-left transition-colors" },
            ...{ class: (i === __VLS_ctx.currentDPISlot ? 'text-accent-orange' : 'text-text-muted hover:text-text-secondary') },
            title: (__VLS_ctx.t('perf.slotActivate')),
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-16']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-left']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
        (__VLS_ctx.t('perf.slot'));
        (i + 1);
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            ...{ onChange: (...[$event]) => {
                    if (!!(!__VLS_ctx.store.connected))
                        return;
                    __VLS_ctx.updateDPISlot(i, Number($event.target.value));
                    // @ts-ignore
                    [t, t, currentDPISlot, updateDPISlot,];
                } },
            type: "range",
            min: (50),
            max: (__VLS_ctx.maxDPI),
            step: (50),
            value: (dpi),
            ...{ class: "flex-1 h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-orange" },
        });
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg-tertiary']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
        /** @type {__VLS_StyleScopedClasses['appearance-none']} */ ;
        /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
        /** @type {__VLS_StyleScopedClasses['accent-accent-orange']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-xs font-bold text-text-primary w-16 text-right" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
        /** @type {__VLS_StyleScopedClasses['w-16']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
        (dpi);
        // @ts-ignore
        [maxDPI,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "text-xs font-semibold text-text-secondary tracking-wider" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    (__VLS_ctx.t('perf.pollingRate'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex gap-2 flex-wrap" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    for (const [hz] of __VLS_vFor((__VLS_ctx.pollingRates))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.store.connected))
                        return;
                    __VLS_ctx.setPollingRate(hz);
                    // @ts-ignore
                    [t, pollingRates, setPollingRate,];
                } },
            key: (hz),
            ...{ class: "px-3 py-1.5 text-[10px] font-semibold rounded-full border transition-all" },
            ...{ class: (__VLS_ctx.store.pollingRateHz === hz
                    ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan'
                    : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary') },
        });
        /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        (hz);
        // @ts-ignore
        [store,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "text-xs font-semibold text-text-secondary tracking-wider" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    (__VLS_ctx.t('perf.liftOff'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    for (const [lod] of __VLS_vFor((__VLS_ctx.lodOptions))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.store.connected))
                        return;
                    __VLS_ctx.setLOD(lod.v);
                    // @ts-ignore
                    [t, lodOptions, setLOD,];
                } },
            key: (lod.v),
            ...{ class: "px-4 py-1.5 text-[10px] font-semibold rounded-full border transition-all" },
            ...{ class: (__VLS_ctx.store.lodValue === lod.v
                    ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan'
                    : 'bg-bg-tertiary border-border-default text-text-secondary hover:text-text-primary') },
        });
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        (lod.label);
        // @ts-ignore
        [store,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-2 gap-4" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "text-xs font-semibold text-text-secondary tracking-wider" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    (__VLS_ctx.t('perf.debounce'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex items-center gap-3" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (...[$event]) => {
                if (!!(!__VLS_ctx.store.connected))
                    return;
                __VLS_ctx.setDebounce(Number($event.target.value));
                // @ts-ignore
                [t, setDebounce,];
            } },
        type: "range",
        min: (0),
        max: (30),
        step: (1),
        value: (__VLS_ctx.store.debounceTime),
        ...{ class: "flex-1 h-1 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent-purple" },
    });
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg-tertiary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['appearance-none']} */ ;
    /** @type {__VLS_StyleScopedClasses['cursor-pointer']} */ ;
    /** @type {__VLS_StyleScopedClasses['accent-accent-purple']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-xs font-bold text-text-primary w-12 text-right" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
    /** @type {__VLS_StyleScopedClasses['w-12']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-right']} */ ;
    (__VLS_ctx.store.debounceTime);
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "text-xs font-semibold text-text-secondary tracking-wider" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    (__VLS_ctx.t('perf.sleep'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        ...{ onChange: (...[$event]) => {
                if (!!(!__VLS_ctx.store.connected))
                    return;
                __VLS_ctx.setSleepTime(Number($event.target.value));
                // @ts-ignore
                [store, store, t, setSleepTime,];
            } },
        value: (__VLS_ctx.store.sleepTime),
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
    for (const [t2] of __VLS_vFor((__VLS_ctx.SLEEP_TIMES))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (t2),
            value: (t2),
        });
        (t2 < 60 ? `${t2}s` : `${t2 / 60}m`);
        // @ts-ignore
        [store, SLEEP_TIMES,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "text-xs font-semibold text-text-secondary tracking-wider" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    (__VLS_ctx.t('perf.sensorFeatures'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "grid grid-cols-3 gap-3" },
    });
    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
    /** @type {__VLS_StyleScopedClasses['grid-cols-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.toggleAngleSnap) },
        ...{ class: "flex items-center gap-2 p-3 rounded-xl border transition-all" },
        ...{ class: (__VLS_ctx.store.angleSnap
                ? 'bg-accent-green/10 border-accent-green/30'
                : 'bg-bg-tertiary border-border-default') },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "w-2 h-2 rounded-full" },
        ...{ class: (__VLS_ctx.store.angleSnap ? 'bg-accent-green' : 'bg-text-muted/30') },
    });
    /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] font-semibold" },
        ...{ class: (__VLS_ctx.store.angleSnap ? 'text-accent-green' : 'text-text-muted') },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    (__VLS_ctx.t('perf.angleSnap'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.toggleMotionSync) },
        ...{ class: "flex items-center gap-2 p-3 rounded-xl border transition-all" },
        ...{ class: (__VLS_ctx.store.motionSync
                ? 'bg-accent-green/10 border-accent-green/30'
                : 'bg-bg-tertiary border-border-default') },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "w-2 h-2 rounded-full" },
        ...{ class: (__VLS_ctx.store.motionSync ? 'bg-accent-green' : 'bg-text-muted/30') },
    });
    /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] font-semibold" },
        ...{ class: (__VLS_ctx.store.motionSync ? 'text-accent-green' : 'text-text-muted') },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    (__VLS_ctx.t('perf.motionSync'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.toggleRipple) },
        ...{ class: "flex items-center gap-2 p-3 rounded-xl border transition-all" },
        ...{ class: (__VLS_ctx.store.rippleEffect
                ? 'bg-accent-green/10 border-accent-green/30'
                : 'bg-bg-tertiary border-border-default') },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ class: "w-2 h-2 rounded-full" },
        ...{ class: (__VLS_ctx.store.rippleEffect ? 'bg-accent-green' : 'bg-text-muted/30') },
    });
    /** @type {__VLS_StyleScopedClasses['w-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['h-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-[10px] font-semibold" },
        ...{ class: (__VLS_ctx.store.rippleEffect ? 'text-accent-green' : 'text-text-muted') },
    });
    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    (__VLS_ctx.t('perf.ripple'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "bg-bg-secondary rounded-xl border border-border-default p-4 space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
        ...{ class: "text-xs font-semibold text-text-secondary tracking-wider" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
    (__VLS_ctx.t('perf.perfMode'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    for (const [label, code] of __VLS_vFor((__VLS_ctx.PERF_MODES))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.store.connected))
                        return;
                    __VLS_ctx.setPerfMode(Number(code));
                    // @ts-ignore
                    [store, store, store, store, store, store, store, store, store, t, t, t, t, t, toggleAngleSnap, toggleMotionSync, toggleRipple, PERF_MODES, setPerfMode,];
                } },
            key: (code),
            disabled: (__VLS_ctx.perfModeApplying !== null),
            ...{ class: "px-4 py-1.5 text-[10px] font-semibold rounded-full border transition-all flex-1 text-center disabled:cursor-wait" },
            ...{ class: (__VLS_ctx.perfModeApplying === Number(code)
                    ? 'border-accent-purple/50 bg-accent-purple/5 text-accent-purple/60 animate-pulse'
                    : __VLS_ctx.store.performanceMode === Number(code)
                        ? 'border-accent-purple bg-accent-purple/10 text-accent-purple'
                        : 'bg-bg-tertiary border-border-default text-text-secondary hover:border-accent-purple/40 hover:text-text-primary') },
        });
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-1.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['disabled:cursor-wait']} */ ;
        (__VLS_ctx.perfModeApplying === Number(code) ? '…' : label);
        // @ts-ignore
        [store, perfModeApplying, perfModeApplying, perfModeApplying,];
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

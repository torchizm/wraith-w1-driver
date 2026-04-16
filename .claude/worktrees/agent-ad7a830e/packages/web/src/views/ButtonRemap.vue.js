/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from '../stores/device';
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from '../composables/useToast';
import { cmdReadKeyFunction, parseKeyFunctionResponse, cmdSetKeyFunction, } from '../protocol/commands';
import { DEFAULT_KEY_FUNCTIONS } from '../protocol/constants';
const store = useDeviceStore();
const { t } = useI18n();
const { showToast } = useToast();
const savingButton = ref(null);
// --- HID key code mapping ---
const HID_KEY_CODES = {
    KeyA: 0x04, KeyB: 0x05, KeyC: 0x06, KeyD: 0x07, KeyE: 0x08, KeyF: 0x09,
    KeyG: 0x0A, KeyH: 0x0B, KeyI: 0x0C, KeyJ: 0x0D, KeyK: 0x0E, KeyL: 0x0F,
    KeyM: 0x10, KeyN: 0x11, KeyO: 0x12, KeyP: 0x13, KeyQ: 0x14, KeyR: 0x15,
    KeyS: 0x16, KeyT: 0x17, KeyU: 0x18, KeyV: 0x19, KeyW: 0x1A, KeyX: 0x1B,
    KeyY: 0x1C, KeyZ: 0x1D,
    Digit1: 0x1E, Digit2: 0x1F, Digit3: 0x20, Digit4: 0x21, Digit5: 0x22,
    Digit6: 0x23, Digit7: 0x24, Digit8: 0x25, Digit9: 0x26, Digit0: 0x27,
    Enter: 0x28, Escape: 0x29, Backspace: 0x2A, Tab: 0x2B, Space: 0x2C,
    Minus: 0x2D, Equal: 0x2E, BracketLeft: 0x2F, BracketRight: 0x30,
    Backslash: 0x31, Semicolon: 0x33, Quote: 0x34, Backquote: 0x35,
    Comma: 0x36, Period: 0x37, Slash: 0x38,
    F1: 0x3A, F2: 0x3B, F3: 0x3C, F4: 0x3D, F5: 0x3E, F6: 0x3F,
    F7: 0x40, F8: 0x41, F9: 0x42, F10: 0x43, F11: 0x44, F12: 0x45,
    PrintScreen: 0x46, ScrollLock: 0x47, Pause: 0x48,
    Insert: 0x49, Home: 0x4A, PageUp: 0x4B, Delete: 0x4C, End: 0x4D,
    PageDown: 0x4E, ArrowRight: 0x4F, ArrowLeft: 0x50, ArrowDown: 0x51,
    ArrowUp: 0x52,
};
const HID_KEY_NAMES = {};
for (const [code, hid] of Object.entries(HID_KEY_CODES)) {
    let name = code
        .replace(/^Key/, '')
        .replace(/^Digit/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2');
    HID_KEY_NAMES[hid] = name;
}
// --- Modifier bit helpers ---
const MODIFIER_BITS = { ctrl: 0x01, shift: 0x02, alt: 0x04, meta: 0x08 };
function encodeKeyboardCombo(modifiers, hidKeyCode) {
    return ((0x00) | (modifiers << 8) | (hidKeyCode << 16) | (0x00 << 24)) >>> 0;
}
function decodeKeyboardCombo(value) {
    const byte0 = value & 0xFF;
    const byte1 = (value >> 8) & 0xFF;
    const byte2 = (value >> 16) & 0xFF;
    if (byte0 !== 0)
        return null;
    if (byte2 === 0)
        return null;
    if (isKnownConstant(value))
        return null;
    return { modifiers: byte1, keyCode: byte2 };
}
function isKnownConstant(value) {
    for (const v of Object.values(DEFAULT_KEY_FUNCTIONS)) {
        if (v === value)
            return true;
    }
    return false;
}
function isFireKeyValue(value) {
    return value === 0x0219000A;
}
function modifierString(mods) {
    const parts = [];
    if (mods & MODIFIER_BITS.ctrl)
        parts.push('Ctrl');
    if (mods & MODIFIER_BITS.shift)
        parts.push('Shift');
    if (mods & MODIFIER_BITS.alt)
        parts.push('Alt');
    if (mods & MODIFIER_BITS.meta)
        parts.push('Win');
    return parts.join('+');
}
function keyComboPartsFromValue(value) {
    const decoded = decodeKeyboardCombo(value);
    if (!decoded)
        return null;
    const parts = [];
    if (decoded.modifiers & MODIFIER_BITS.ctrl)
        parts.push('Ctrl');
    if (decoded.modifiers & MODIFIER_BITS.shift)
        parts.push('Shift');
    if (decoded.modifiers & MODIFIER_BITS.alt)
        parts.push('Alt');
    if (decoded.modifiers & MODIFIER_BITS.meta)
        parts.push('Win');
    const keyName = HID_KEY_NAMES[decoded.keyCode];
    parts.push(keyName ?? `Key(0x${decoded.keyCode.toString(16)})`);
    return parts;
}
function keyComboLabel(value) {
    const decoded = decodeKeyboardCombo(value);
    if (!decoded)
        return null;
    const parts = [];
    const ms = modifierString(decoded.modifiers);
    if (ms)
        parts.push(ms);
    const keyName = HID_KEY_NAMES[decoded.keyCode];
    parts.push(keyName ?? `Key(0x${decoded.keyCode.toString(16)})`);
    return parts.join('+');
}
// --- Dangerous combo detection ---
const DANGEROUS_COMBOS = [
    { mods: MODIFIER_BITS.meta, code: 'KeyQ', label: 'Cmd+Q' },
    { mods: MODIFIER_BITS.meta, code: 'KeyW', label: 'Cmd+W' },
    { mods: MODIFIER_BITS.ctrl, code: 'KeyQ', label: 'Ctrl+Q' },
    { mods: MODIFIER_BITS.ctrl, code: 'KeyW', label: 'Ctrl+W' },
    { mods: MODIFIER_BITS.ctrl | MODIFIER_BITS.alt, code: 'Delete', label: 'Ctrl+Alt+Delete' },
    { mods: MODIFIER_BITS.alt, code: 'F4', label: 'Alt+F4' },
];
function isDangerousCombo(modMask, code) {
    for (const dc of DANGEROUS_COMBOS) {
        if (dc.mods === modMask && dc.code === code)
            return dc.label;
    }
    return null;
}
const fireKeyConfigs = reactive({});
const buttons = ref([
    { id: 'left', labelKey: 'buttons.btnLeft', buttonId: 0, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'LMB' },
    { id: 'right', labelKey: 'buttons.btnRight', buttonId: 1, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'RMB' },
    { id: 'middle', labelKey: 'buttons.btnMiddle', buttonId: 2, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'MMB' },
    { id: 'back', labelKey: 'buttons.btnBack', buttonId: 3, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'M4' },
    { id: 'forward', labelKey: 'buttons.btnForward', buttonId: 4, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'M5' },
    { id: 'dpi', labelKey: 'buttons.btnDpi', buttonId: 5, currentFunction: 0, currentLabel: '', selectedAction: 'preset', capturedShortcut: '', capturedValue: 0, isCapturing: false, icon: 'DPI' },
]);
// --- Selected button for config panel ---
const selectedButtonId = ref(null);
const selectedButton = computed(() => buttons.value.find(b => b.id === selectedButtonId.value) ?? null);
function selectButton(id) {
    selectedButtonId.value = selectedButtonId.value === id ? null : id;
}
// --- Modal capture state ---
const capturingButton = ref(null);
const liveModifiers = reactive({ ctrl: false, shift: false, alt: false, meta: false });
const liveKey = ref(null);
const dangerousWarning = ref(null);
const isModalOpen = computed(() => capturingButton.value !== null);
const liveKeyParts = computed(() => {
    const parts = [];
    if (liveModifiers.ctrl)
        parts.push('Ctrl');
    if (liveModifiers.shift)
        parts.push('Shift');
    if (liveModifiers.alt)
        parts.push('Alt');
    if (liveModifiers.meta)
        parts.push('Win');
    if (liveKey.value)
        parts.push(liveKey.value);
    return parts;
});
// Sentinel values for grouped dropdown
const ACTION_CUSTOM_SHORTCUT = -1;
const ACTION_FIRE_KEY = -2;
// --- Grouped action options ---
const actionGroups = [
    {
        label: 'Mouse Buttons',
        options: [
            { label: 'Left Click', value: DEFAULT_KEY_FUNCTIONS['left-click'] },
            { label: 'Right Click', value: DEFAULT_KEY_FUNCTIONS['right-click'] },
            { label: 'Middle Click', value: DEFAULT_KEY_FUNCTIONS['middle-click'] },
            { label: 'Forward', value: DEFAULT_KEY_FUNCTIONS['forward'] },
            { label: 'Back', value: DEFAULT_KEY_FUNCTIONS['back'] },
        ],
    },
    {
        label: 'DPI',
        options: [
            { label: 'DPI Cycle', value: DEFAULT_KEY_FUNCTIONS['dpi-cycle'] },
            { label: 'DPI +', value: DEFAULT_KEY_FUNCTIONS['dpi-plus'] },
            { label: 'DPI -', value: DEFAULT_KEY_FUNCTIONS['dpi-minus'] },
        ],
    },
    {
        label: 'Special',
        options: [
            { label: 'Profile Switch', value: DEFAULT_KEY_FUNCTIONS['profile-switch'] },
            { label: 'Disable', value: DEFAULT_KEY_FUNCTIONS['disable'] },
        ],
    },
    {
        label: 'Custom',
        options: [
            { label: 'Custom Shortcut...', value: ACTION_CUSTOM_SHORTCUT },
            { label: 'Fire Key...', value: ACTION_FIRE_KEY },
        ],
    },
];
// --- Human-readable label for any function value ---
function functionToLabel(value) {
    for (const [name, v] of Object.entries(DEFAULT_KEY_FUNCTIONS)) {
        if (v === value)
            return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    const combo = keyComboLabel(value);
    if (combo)
        return combo;
    if (isFireKeyValue(value))
        return 'Fire Key';
    if (value === 0)
        return 'Disable';
    return `Custom (0x${value.toString(16).padStart(8, '0')})`;
}
function functionToLabelWithFireConfig(value, buttonId) {
    if (isFireKeyValue(value) && fireKeyConfigs[buttonId]) {
        const cfg = fireKeyConfigs[buttonId];
        return `Fire Key (${cfg.count}x, ${cfg.intervalMs}ms)`;
    }
    return functionToLabel(value);
}
// --- Determine the select value for current function ---
function selectValueForFunction(value) {
    for (const v of Object.values(DEFAULT_KEY_FUNCTIONS)) {
        if (v === value)
            return value;
    }
    if (decodeKeyboardCombo(value))
        return ACTION_CUSTOM_SHORTCUT;
    if (isFireKeyValue(value))
        return ACTION_FIRE_KEY;
    return value;
}
// --- Read buttons from device ---
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
                btn.currentLabel = functionToLabelWithFireConfig(parsed.functionValue, btn.buttonId);
                if (decodeKeyboardCombo(parsed.functionValue)) {
                    btn.selectedAction = 'custom-shortcut';
                    btn.capturedValue = parsed.functionValue;
                    btn.capturedShortcut = keyComboLabel(parsed.functionValue) ?? '';
                }
                else if (isFireKeyValue(parsed.functionValue)) {
                    btn.selectedAction = 'fire-key';
                    if (!fireKeyConfigs[btn.buttonId]) {
                        fireKeyConfigs[btn.buttonId] = { count: 3, intervalMs: 50 };
                    }
                }
                else {
                    btn.selectedAction = 'preset';
                }
            }
        }
    }
}
// --- Set button action ---
async function setButton(btn, value) {
    savingButton.value = btn.buttonId;
    try {
        await store.sendFeatureReport(cmdSetKeyFunction(btn.buttonId, value));
        // Verify
        const resp = await store.sendAndRead(cmdReadKeyFunction(btn.buttonId), 200);
        const verified = resp ? (parseKeyFunctionResponse(resp)?.functionValue === value) : false;
        btn.currentFunction = value;
        btn.currentLabel = functionToLabelWithFireConfig(value, btn.buttonId);
        showToast(verified
            ? `${t(btn.labelKey)} set to ${btn.currentLabel}`
            : `${t(btn.labelKey)} set to ${btn.currentLabel} (unverified)`, verified ? 'success' : 'info');
    }
    finally {
        savingButton.value = null;
    }
}
// --- Handle dropdown change ---
function onActionChange(btn, rawValue) {
    if (rawValue === ACTION_CUSTOM_SHORTCUT) {
        btn.selectedAction = 'custom-shortcut';
        btn.capturedShortcut = '';
        btn.capturedValue = 0;
    }
    else if (rawValue === ACTION_FIRE_KEY) {
        btn.selectedAction = 'fire-key';
        if (!fireKeyConfigs[btn.buttonId]) {
            fireKeyConfigs[btn.buttonId] = { count: 3, intervalMs: 50 };
        }
    }
    else {
        btn.selectedAction = 'preset';
        setButton(btn, rawValue);
    }
}
// --- Modal-based keyboard shortcut capture ---
function startCapture(btn) {
    liveModifiers.ctrl = false;
    liveModifiers.shift = false;
    liveModifiers.alt = false;
    liveModifiers.meta = false;
    liveKey.value = null;
    dangerousWarning.value = null;
    capturingButton.value = btn;
}
function closeModal() {
    const btn = capturingButton.value;
    capturingButton.value = null;
    liveKey.value = null;
    dangerousWarning.value = null;
    if (btn && !btn.capturedValue && !decodeKeyboardCombo(btn.currentFunction)) {
        btn.selectedAction = 'preset';
    }
}
function handleModalKeyDown(e) {
    if (!capturingButton.value)
        return;
    e.preventDefault();
    e.stopPropagation();
    liveModifiers.ctrl = e.ctrlKey;
    liveModifiers.shift = e.shiftKey;
    liveModifiers.alt = e.altKey;
    liveModifiers.meta = e.metaKey;
    if (e.key === 'Escape') {
        closeModal();
        return;
    }
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key))
        return;
    const hidCode = HID_KEY_CODES[e.code];
    if (!hidCode) {
        showToast(t('buttons.unsupportedKey', { key: e.code }), 'error');
        return;
    }
    const keyName = e.code
        .replace(/^Key/, '')
        .replace(/^Digit/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2');
    liveKey.value = keyName;
    let modMask = 0;
    if (e.ctrlKey)
        modMask |= MODIFIER_BITS.ctrl;
    if (e.shiftKey)
        modMask |= MODIFIER_BITS.shift;
    if (e.altKey)
        modMask |= MODIFIER_BITS.alt;
    if (e.metaKey)
        modMask |= MODIFIER_BITS.meta;
    const danger = isDangerousCombo(modMask, e.code);
    if (danger) {
        dangerousWarning.value = danger;
        showToast(t('buttons.dangerousCombo', { combo: danger }), 'info');
    }
    const functionValue = encodeKeyboardCombo(modMask, hidCode);
    const label = keyComboLabel(functionValue);
    const btn = capturingButton.value;
    btn.capturedValue = functionValue;
    btn.capturedShortcut = label ?? '';
    btn.isCapturing = false;
    setTimeout(() => {
        capturingButton.value = null;
        liveKey.value = null;
        dangerousWarning.value = null;
        setButton(btn, functionValue);
    }, 350);
}
function handleModalKeyUp(e) {
    if (!capturingButton.value)
        return;
    e.preventDefault();
    e.stopPropagation();
    liveModifiers.ctrl = e.ctrlKey;
    liveModifiers.shift = e.shiftKey;
    liveModifiers.alt = e.altKey;
    liveModifiers.meta = e.metaKey;
}
// --- Fire key ---
async function applyFireKey(btn) {
    const cfg = fireKeyConfigs[btn.buttonId];
    if (!cfg)
        return;
    cfg.count = Math.max(1, Math.min(10, cfg.count));
    cfg.intervalMs = Math.max(10, Math.min(500, cfg.intervalMs));
    savingButton.value = btn.buttonId;
    try {
        const fireKeyFunctionValue = 0x0219000A;
        await store.sendFeatureReport(cmdSetKeyFunction(btn.buttonId, fireKeyFunctionValue));
        const reportId = store.customerCode ? 5 : 9;
        const params = new Uint8Array(8);
        params[0] = reportId;
        params[1] = 2;
        params[2] = cfg.count;
        params[3] = cfg.intervalMs;
        params[4] = 0;
        params[5] = 0;
        params[6] = 0;
        params[7] = 0;
        await store.sendFeatureReport(params);
        btn.currentFunction = fireKeyFunctionValue;
        btn.currentLabel = `Fire Key (${cfg.count}x, ${cfg.intervalMs}ms)`;
        showToast(`${t(btn.labelKey)} set to Fire Key (${cfg.count}x, ${cfg.intervalMs}ms)`, 'success');
    }
    finally {
        savingButton.value = null;
    }
}
// Global key handlers for the capture modal
function globalKeyDownHandler(e) {
    if (capturingButton.value) {
        handleModalKeyDown(e);
    }
}
function globalKeyUpHandler(e) {
    if (capturingButton.value) {
        handleModalKeyUp(e);
    }
}
onMounted(() => {
    readButtons();
    document.addEventListener('keydown', globalKeyDownHandler, true);
    document.addEventListener('keyup', globalKeyUpHandler, true);
});
onUnmounted(() => {
    document.removeEventListener('keydown', globalKeyDownHandler, true);
    document.removeEventListener('keyup', globalKeyUpHandler, true);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['remap-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['zone']} */ ;
/** @type {__VLS_StyleScopedClasses['zone--active']} */ ;
/** @type {__VLS_StyleScopedClasses['zone-label']} */ ;
/** @type {__VLS_StyleScopedClasses['status-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hud-select']} */ ;
/** @type {__VLS_StyleScopedClasses['hud-select']} */ ;
/** @type {__VLS_StyleScopedClasses['hud-number-input']} */ ;
/** @type {__VLS_StyleScopedClasses['hud-btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['hud-btn-accent']} */ ;
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
    (__VLS_ctx.t('buttons.connectFirst'));
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "space-y-5" },
    });
    /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-lg font-bold text-text-primary font-display tracking-widest uppercase" },
    });
    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-text-primary']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-display']} */ ;
    /** @type {__VLS_StyleScopedClasses['tracking-widest']} */ ;
    /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
    (__VLS_ctx.t('buttons.title'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "remap-layout" },
    });
    /** @type {__VLS_StyleScopedClasses['remap-layout']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mouse-diagram-panel hud-card bg-bg-secondary border border-border-default p-6" },
    });
    /** @type {__VLS_StyleScopedClasses['mouse-diagram-panel']} */ ;
    /** @type {__VLS_StyleScopedClasses['hud-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-6']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mouse-body" },
    });
    /** @type {__VLS_StyleScopedClasses['mouse-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
        viewBox: "0 0 200 340",
        ...{ class: "mouse-svg" },
        xmlns: "http://www.w3.org/2000/svg",
    });
    /** @type {__VLS_StyleScopedClasses['mouse-svg']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
        d: "M30 120 Q30 20, 100 10 Q170 20, 170 120 L170 260 Q170 330, 100 335 Q30 330, 30 260 Z",
        ...{ class: "mouse-outline" },
        fill: "none",
        'stroke-width': "2",
    });
    /** @type {__VLS_StyleScopedClasses['mouse-outline']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.line)({
        x1: "100",
        y1: "10",
        x2: "100",
        y2: "130",
        ...{ class: "mouse-divider" },
        'stroke-width': "1",
    });
    /** @type {__VLS_StyleScopedClasses['mouse-divider']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
        x: "88",
        y: "60",
        width: "24",
        height: "40",
        rx: "12",
        ...{ class: "mouse-wheel-shape" },
        'stroke-width': "1.5",
    });
    /** @type {__VLS_StyleScopedClasses['mouse-wheel-shape']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
        x: "18",
        y: "155",
        width: "18",
        height: "30",
        rx: "3",
        ...{ class: "mouse-side-btn-shape" },
        'stroke-width': "1.5",
    });
    /** @type {__VLS_StyleScopedClasses['mouse-side-btn-shape']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.rect)({
        x: "18",
        y: "195",
        width: "18",
        height: "30",
        rx: "3",
        ...{ class: "mouse-side-btn-shape" },
        'stroke-width': "1.5",
    });
    /** @type {__VLS_StyleScopedClasses['mouse-side-btn-shape']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.ellipse)({
        cx: "100",
        cy: "145",
        rx: "14",
        ry: "8",
        ...{ class: "mouse-dpi-shape" },
        'stroke-width': "1.5",
    });
    /** @type {__VLS_StyleScopedClasses['mouse-dpi-shape']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.store.connected))
                    return;
                __VLS_ctx.selectButton('left');
                // @ts-ignore
                [store, t, t, selectButton,];
            } },
        ...{ class: "zone zone-left" },
        ...{ class: ({ 'zone--active': __VLS_ctx.selectedButtonId === 'left', 'zone--saving': __VLS_ctx.savingButton === 0 }) },
    });
    /** @type {__VLS_StyleScopedClasses['zone']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone-left']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--active']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--saving']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "zone-label" },
    });
    /** @type {__VLS_StyleScopedClasses['zone-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.store.connected))
                    return;
                __VLS_ctx.selectButton('right');
                // @ts-ignore
                [selectButton, selectedButtonId, savingButton,];
            } },
        ...{ class: "zone zone-right" },
        ...{ class: ({ 'zone--active': __VLS_ctx.selectedButtonId === 'right', 'zone--saving': __VLS_ctx.savingButton === 1 }) },
    });
    /** @type {__VLS_StyleScopedClasses['zone']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone-right']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--active']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--saving']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "zone-label" },
    });
    /** @type {__VLS_StyleScopedClasses['zone-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.store.connected))
                    return;
                __VLS_ctx.selectButton('middle');
                // @ts-ignore
                [selectButton, selectedButtonId, savingButton,];
            } },
        ...{ class: "zone zone-middle" },
        ...{ class: ({ 'zone--active': __VLS_ctx.selectedButtonId === 'middle', 'zone--saving': __VLS_ctx.savingButton === 2 }) },
    });
    /** @type {__VLS_StyleScopedClasses['zone']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone-middle']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--active']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--saving']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "zone-label" },
    });
    /** @type {__VLS_StyleScopedClasses['zone-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.store.connected))
                    return;
                __VLS_ctx.selectButton('back');
                // @ts-ignore
                [selectButton, selectedButtonId, savingButton,];
            } },
        ...{ class: "zone zone-back" },
        ...{ class: ({ 'zone--active': __VLS_ctx.selectedButtonId === 'back', 'zone--saving': __VLS_ctx.savingButton === 3 }) },
    });
    /** @type {__VLS_StyleScopedClasses['zone']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone-back']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--active']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--saving']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "zone-label" },
    });
    /** @type {__VLS_StyleScopedClasses['zone-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.store.connected))
                    return;
                __VLS_ctx.selectButton('forward');
                // @ts-ignore
                [selectButton, selectedButtonId, savingButton,];
            } },
        ...{ class: "zone zone-forward" },
        ...{ class: ({ 'zone--active': __VLS_ctx.selectedButtonId === 'forward', 'zone--saving': __VLS_ctx.savingButton === 4 }) },
    });
    /** @type {__VLS_StyleScopedClasses['zone']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone-forward']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--active']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--saving']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "zone-label" },
    });
    /** @type {__VLS_StyleScopedClasses['zone-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.store.connected))
                    return;
                __VLS_ctx.selectButton('dpi');
                // @ts-ignore
                [selectButton, selectedButtonId, savingButton,];
            } },
        ...{ class: "zone zone-dpi" },
        ...{ class: ({ 'zone--active': __VLS_ctx.selectedButtonId === 'dpi', 'zone--saving': __VLS_ctx.savingButton === 5 }) },
    });
    /** @type {__VLS_StyleScopedClasses['zone']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone-dpi']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--active']} */ ;
    /** @type {__VLS_StyleScopedClasses['zone--saving']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "zone-label" },
    });
    /** @type {__VLS_StyleScopedClasses['zone-label']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "mt-6 space-y-1.5" },
    });
    /** @type {__VLS_StyleScopedClasses['mt-6']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
    for (const [btn] of __VLS_vFor((__VLS_ctx.buttons))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.store.connected))
                        return;
                    __VLS_ctx.selectButton(btn.id);
                    // @ts-ignore
                    [selectButton, selectedButtonId, savingButton, buttons,];
                } },
            key: (btn.id),
            ...{ class: "status-row" },
            ...{ class: ({ 'status-row--active': __VLS_ctx.selectedButtonId === btn.id }) },
        });
        /** @type {__VLS_StyleScopedClasses['status-row']} */ ;
        /** @type {__VLS_StyleScopedClasses['status-row--active']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "status-icon font-data text-[10px]" },
        });
        /** @type {__VLS_StyleScopedClasses['status-icon']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        (btn.icon);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-text-secondary truncate flex-1" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
        (__VLS_ctx.t(btn.labelKey));
        if (__VLS_ctx.savingButton === btn.buttonId) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[9px] text-accent-cyan animate-pulse font-data" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent-cyan']} */ ;
            /** @type {__VLS_StyleScopedClasses['animate-pulse']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        }
        else if (__VLS_ctx.keyComboPartsFromValue(btn.currentFunction)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "inline-flex items-center gap-0.5" },
            });
            /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-0.5']} */ ;
            for (const [part, idx] of __VLS_vFor((__VLS_ctx.keyComboPartsFromValue(btn.currentFunction)))) {
                (idx);
                if (idx > 0) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-accent-purple text-[8px] font-bold" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-[8px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "keycap keycap-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['keycap']} */ ;
                /** @type {__VLS_StyleScopedClasses['keycap-xs']} */ ;
                (part);
                // @ts-ignore
                [t, selectedButtonId, savingButton, keyComboPartsFromValue, keyComboPartsFromValue,];
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[9px] text-accent-cyan font-data truncate max-w-[100px]" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent-cyan']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['truncate']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-w-[100px]']} */ ;
            (btn.currentLabel);
        }
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "config-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['config-panel']} */ ;
    if (__VLS_ctx.selectedButton) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hud-card bg-bg-secondary border border-border-default p-5 space-y-5" },
        });
        /** @type {__VLS_StyleScopedClasses['hud-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center gap-3" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "config-badge" },
        });
        /** @type {__VLS_StyleScopedClasses['config-badge']} */ ;
        (__VLS_ctx.selectedButton.icon);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({
            ...{ class: "text-sm font-bold text-accent-cyan font-display tracking-wider uppercase" },
        });
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-accent-cyan']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-display']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        (__VLS_ctx.t(__VLS_ctx.selectedButton.labelKey));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-[9px] text-text-muted font-data mt-0.5" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[9px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
        (__VLS_ctx.selectedButton.buttonId);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "ml-auto" },
        });
        /** @type {__VLS_StyleScopedClasses['ml-auto']} */ ;
        if (__VLS_ctx.savingButton === __VLS_ctx.selectedButton.buttonId) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-accent-cyan animate-pulse font-data tracking-wider" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent-cyan']} */ ;
            /** @type {__VLS_StyleScopedClasses['animate-pulse']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "current-assignment" },
        });
        /** @type {__VLS_StyleScopedClasses['current-assignment']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "text-[10px] text-text-muted font-data" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        (__VLS_ctx.t('buttons.current'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "mt-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
        if (__VLS_ctx.keyComboPartsFromValue(__VLS_ctx.selectedButton.currentFunction)) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "inline-flex items-center gap-1" },
            });
            /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
            for (const [part, idx] of __VLS_vFor((__VLS_ctx.keyComboPartsFromValue(__VLS_ctx.selectedButton.currentFunction)))) {
                (idx);
                if (idx > 0) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-accent-purple text-[10px] font-bold" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "keycap" },
                });
                /** @type {__VLS_StyleScopedClasses['keycap']} */ ;
                (part);
                // @ts-ignore
                [t, t, savingButton, keyComboPartsFromValue, keyComboPartsFromValue, selectedButton, selectedButton, selectedButton, selectedButton, selectedButton, selectedButton, selectedButton,];
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-sm text-accent-cyan font-data font-bold" },
            });
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent-cyan']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
            (__VLS_ctx.selectedButton.currentLabel);
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "space-y-2" },
        });
        /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
            ...{ class: "text-[10px] text-text-muted font-data tracking-wider uppercase" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hud-select-wrap" },
        });
        /** @type {__VLS_StyleScopedClasses['hud-select-wrap']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            ...{ onChange: (...[$event]) => {
                    if (!!(!__VLS_ctx.store.connected))
                        return;
                    if (!(__VLS_ctx.selectedButton))
                        return;
                    __VLS_ctx.onActionChange(__VLS_ctx.selectedButton, Number($event.target.value));
                    // @ts-ignore
                    [selectedButton, selectedButton, onActionChange,];
                } },
            value: (__VLS_ctx.selectValueForFunction(__VLS_ctx.selectedButton.currentFunction)),
            disabled: (__VLS_ctx.savingButton === __VLS_ctx.selectedButton.buttonId),
            ...{ class: "hud-select" },
        });
        /** @type {__VLS_StyleScopedClasses['hud-select']} */ ;
        for (const [group] of __VLS_vFor((__VLS_ctx.actionGroups))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.optgroup, __VLS_intrinsics.optgroup)({
                key: (group.label),
                label: (group.label),
            });
            for (const [opt] of __VLS_vFor((group.options))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    key: (opt.value),
                    value: (opt.value),
                });
                (opt.label);
                // @ts-ignore
                [savingButton, selectedButton, selectedButton, selectValueForFunction, actionGroups,];
            }
            // @ts-ignore
            [];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hud-select-arrow" },
        });
        /** @type {__VLS_StyleScopedClasses['hud-select-arrow']} */ ;
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
        if (__VLS_ctx.selectedButton.selectedAction === 'custom-shortcut') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "shortcut-section" },
            });
            /** @type {__VLS_StyleScopedClasses['shortcut-section']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center gap-3 flex-wrap" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
            if (__VLS_ctx.selectedButton.capturedShortcut && __VLS_ctx.keyComboPartsFromValue(__VLS_ctx.selectedButton.capturedValue)) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "inline-flex items-center gap-1" },
                });
                /** @type {__VLS_StyleScopedClasses['inline-flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
                for (const [part, idx] of __VLS_vFor((__VLS_ctx.keyComboPartsFromValue(__VLS_ctx.selectedButton.capturedValue)))) {
                    (idx);
                    if (idx > 0) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "text-accent-purple text-[10px] font-bold" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
                        /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
                    }
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "keycap" },
                    });
                    /** @type {__VLS_StyleScopedClasses['keycap']} */ ;
                    (part);
                    // @ts-ignore
                    [keyComboPartsFromValue, keyComboPartsFromValue, selectedButton, selectedButton, selectedButton, selectedButton,];
                }
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.connected))
                            return;
                        if (!(__VLS_ctx.selectedButton))
                            return;
                        if (!(__VLS_ctx.selectedButton.selectedAction === 'custom-shortcut'))
                            return;
                        __VLS_ctx.startCapture(__VLS_ctx.selectedButton);
                        // @ts-ignore
                        [selectedButton, startCapture,];
                    } },
                ...{ class: "hud-btn-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['hud-btn-sm']} */ ;
            (__VLS_ctx.selectedButton.capturedShortcut ? __VLS_ctx.t('buttons.recapture') : __VLS_ctx.t('buttons.captureKey'));
        }
        if (__VLS_ctx.selectedButton.selectedAction === 'fire-key') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "fire-section" },
            });
            /** @type {__VLS_StyleScopedClasses['fire-section']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-2 gap-3" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "space-y-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-text-muted font-data tracking-wider" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            (__VLS_ctx.t('buttons.fireCount'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onInput: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.connected))
                            return;
                        if (!(__VLS_ctx.selectedButton))
                            return;
                        if (!(__VLS_ctx.selectedButton.selectedAction === 'fire-key'))
                            return;
                        __VLS_ctx.fireKeyConfigs[__VLS_ctx.selectedButton.buttonId] = { ...(__VLS_ctx.fireKeyConfigs[__VLS_ctx.selectedButton.buttonId] ?? { count: 3, intervalMs: 50 }), count: Number($event.target.value) };
                        // @ts-ignore
                        [t, t, t, selectedButton, selectedButton, selectedButton, selectedButton, fireKeyConfigs, fireKeyConfigs,];
                    } },
                type: "number",
                value: (__VLS_ctx.fireKeyConfigs[__VLS_ctx.selectedButton.buttonId]?.count ?? 3),
                min: "1",
                max: "10",
                step: "1",
                ...{ class: "hud-number-input w-full" },
            });
            /** @type {__VLS_StyleScopedClasses['hud-number-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "space-y-1.5" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-1.5']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[10px] text-text-muted font-data tracking-wider" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
            (__VLS_ctx.t('buttons.fireInterval'));
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onInput: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.connected))
                            return;
                        if (!(__VLS_ctx.selectedButton))
                            return;
                        if (!(__VLS_ctx.selectedButton.selectedAction === 'fire-key'))
                            return;
                        __VLS_ctx.fireKeyConfigs[__VLS_ctx.selectedButton.buttonId] = { ...(__VLS_ctx.fireKeyConfigs[__VLS_ctx.selectedButton.buttonId] ?? { count: 3, intervalMs: 50 }), intervalMs: Number($event.target.value) };
                        // @ts-ignore
                        [t, selectedButton, selectedButton, selectedButton, fireKeyConfigs, fireKeyConfigs, fireKeyConfigs,];
                    } },
                type: "number",
                value: (__VLS_ctx.fireKeyConfigs[__VLS_ctx.selectedButton.buttonId]?.intervalMs ?? 50),
                min: "10",
                max: "500",
                step: "10",
                ...{ class: "hud-number-input w-full" },
            });
            /** @type {__VLS_StyleScopedClasses['hud-number-input']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.store.connected))
                            return;
                        if (!(__VLS_ctx.selectedButton))
                            return;
                        if (!(__VLS_ctx.selectedButton.selectedAction === 'fire-key'))
                            return;
                        __VLS_ctx.applyFireKey(__VLS_ctx.selectedButton);
                        // @ts-ignore
                        [selectedButton, selectedButton, fireKeyConfigs, applyFireKey,];
                    } },
                ...{ class: "hud-btn-accent mt-3 w-full" },
            });
            /** @type {__VLS_StyleScopedClasses['hud-btn-accent']} */ ;
            /** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            (__VLS_ctx.t('buttons.fireApply'));
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "hud-card bg-bg-secondary border border-border-default p-8 flex flex-col items-center justify-center min-h-[300px] text-center" },
        });
        /** @type {__VLS_StyleScopedClasses['hud-card']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-border-default']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-h-[300px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
            ...{ class: "w-12 h-12 text-text-muted/30 mb-4" },
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "1",
        });
        /** @type {__VLS_StyleScopedClasses['w-12']} */ ;
        /** @type {__VLS_StyleScopedClasses['h-12']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted/30']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
            d: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122",
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-xs text-text-muted font-display tracking-wider" },
        });
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-display']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        (__VLS_ctx.t('buttons.selectButton'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-[10px] text-text-muted/50 mt-2 font-data" },
        });
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted/50']} */ ;
        /** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        (__VLS_ctx.t('buttons.noSelection'));
    }
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.Teleport | typeof __VLS_components.Teleport} */
    Teleport;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        to: "body",
    }));
    const __VLS_2 = __VLS_1({
        to: "body",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const { default: __VLS_5 } = __VLS_3.slots;
    let __VLS_6;
    /** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        name: "capture-modal",
    }));
    const __VLS_8 = __VLS_7({
        name: "capture-modal",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const { default: __VLS_11 } = __VLS_9.slots;
    if (__VLS_ctx.isModalOpen) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ onClick: (__VLS_ctx.closeModal) },
            ...{ class: "fixed inset-0 z-50 flex items-center justify-center" },
        });
        /** @type {__VLS_StyleScopedClasses['fixed']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['z-50']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
            ...{ class: "absolute inset-0 bg-black/80 backdrop-blur-md" },
        });
        /** @type {__VLS_StyleScopedClasses['absolute']} */ ;
        /** @type {__VLS_StyleScopedClasses['inset-0']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-black/80']} */ ;
        /** @type {__VLS_StyleScopedClasses['backdrop-blur-md']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "capture-modal-frame" },
        });
        /** @type {__VLS_StyleScopedClasses['capture-modal-frame']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "scan-line" },
        });
        /** @type {__VLS_StyleScopedClasses['scan-line']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "corner-accent corner-tl" },
        });
        /** @type {__VLS_StyleScopedClasses['corner-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['corner-tl']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "corner-accent corner-tr" },
        });
        /** @type {__VLS_StyleScopedClasses['corner-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['corner-tr']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "corner-accent corner-bl" },
        });
        /** @type {__VLS_StyleScopedClasses['corner-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['corner-bl']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "corner-accent corner-br" },
        });
        /** @type {__VLS_StyleScopedClasses['corner-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['corner-br']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-center text-sm text-text-secondary mb-8 font-display tracking-wider uppercase" },
        });
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-display']} */ ;
        /** @type {__VLS_StyleScopedClasses['tracking-wider']} */ ;
        /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
        (__VLS_ctx.t('buttons.pressKey'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex items-center justify-center gap-2.5 min-h-[56px] mb-8" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2.5']} */ ;
        /** @type {__VLS_StyleScopedClasses['min-h-[56px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
        if (__VLS_ctx.liveKeyParts.length > 0) {
            for (const [part, idx] of __VLS_vFor((__VLS_ctx.liveKeyParts))) {
                (idx);
                if (idx > 0) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-accent-purple text-lg font-bold select-none" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-accent-purple']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-lg']} */ ;
                    /** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
                    /** @type {__VLS_StyleScopedClasses['select-none']} */ ;
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "keycap keycap-lg" },
                });
                /** @type {__VLS_StyleScopedClasses['keycap']} */ ;
                /** @type {__VLS_StyleScopedClasses['keycap-lg']} */ ;
                (part);
                // @ts-ignore
                [t, t, t, t, isModalOpen, closeModal, liveKeyParts, liveKeyParts,];
            }
        }
        else {
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-text-muted text-xs font-data tracking-widest uppercase" },
            });
            /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-widest']} */ ;
            /** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
            (__VLS_ctx.t('buttons.captureWaiting'));
        }
        if (__VLS_ctx.dangerousWarning) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "danger-banner" },
            });
            /** @type {__VLS_StyleScopedClasses['danger-banner']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.svg, __VLS_intrinsics.svg)({
                ...{ class: "w-4 h-4 text-accent-orange shrink-0" },
                fill: "none",
                viewBox: "0 0 24 24",
                stroke: "currentColor",
                'stroke-width': "2",
            });
            /** @type {__VLS_StyleScopedClasses['w-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['h-4']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent-orange']} */ ;
            /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.path)({
                'stroke-linecap': "square",
                'stroke-linejoin': "miter",
                d: "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-[11px] text-accent-orange font-data tracking-wide" },
            });
            /** @type {__VLS_StyleScopedClasses['text-[11px]']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-accent-orange']} */ ;
            /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
            /** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
            (__VLS_ctx.t('buttons.dangerousComboWarning', { combo: __VLS_ctx.dangerousWarning }));
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "text-center text-[10px] text-text-muted mb-5 font-data" },
        });
        /** @type {__VLS_StyleScopedClasses['text-center']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-[10px]']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        (__VLS_ctx.t('buttons.modifierOnlyHint'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "flex justify-center" },
        });
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (__VLS_ctx.closeModal) },
            ...{ class: "hud-btn-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['hud-btn-sm']} */ ;
        (__VLS_ctx.t('buttons.cancelCapture'));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "keycap keycap-xs ml-1.5" },
        });
        /** @type {__VLS_StyleScopedClasses['keycap']} */ ;
        /** @type {__VLS_StyleScopedClasses['keycap-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['ml-1.5']} */ ;
    }
    // @ts-ignore
    [t, t, t, t, closeModal, dangerousWarning, dangerousWarning,];
    var __VLS_9;
    // @ts-ignore
    [];
    var __VLS_3;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

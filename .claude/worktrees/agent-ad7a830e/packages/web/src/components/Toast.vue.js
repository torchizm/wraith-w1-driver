/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useToast } from '../composables/useToast';
const { toasts } = useToast();
function accentColor(type) {
    return {
        success: 'border-accent-green text-accent-green',
        error: 'border-accent-red text-accent-red',
        info: 'border-accent-cyan text-accent-cyan',
    }[type];
}
function glowStyle(type) {
    const colors = {
        success: '0 0 12px rgba(34,197,94,0.3)',
        error: '0 0 12px rgba(239,68,68,0.3)',
        info: '0 0 12px rgba(6,182,212,0.3)',
    };
    return { boxShadow: colors[type] };
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none" },
});
/** @type {__VLS_StyleScopedClasses['fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['bottom-4']} */ ;
/** @type {__VLS_StyleScopedClasses['right-4']} */ ;
/** @type {__VLS_StyleScopedClasses['z-50']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col-reverse']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
for (const [toast] of __VLS_vFor((__VLS_ctx.toasts))) {
    let __VLS_0;
    /** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
    Transition;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        key: (toast.id),
        enterActiveClass: "transition duration-300 ease-out",
        enterFromClass: "translate-y-4 opacity-0",
        enterToClass: "translate-y-0 opacity-100",
        leaveActiveClass: "transition duration-300 ease-in",
        leaveFromClass: "translate-y-0 opacity-100",
        leaveToClass: "translate-y-4 opacity-0",
    }));
    const __VLS_2 = __VLS_1({
        key: (toast.id),
        enterActiveClass: "transition duration-300 ease-out",
        enterFromClass: "translate-y-4 opacity-0",
        enterToClass: "translate-y-0 opacity-100",
        leaveActiveClass: "transition duration-300 ease-in",
        leaveFromClass: "translate-y-0 opacity-100",
        leaveToClass: "translate-y-4 opacity-0",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const { default: __VLS_5 } = __VLS_3.slots;
    if (toast.visible) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "pointer-events-auto bg-bg-secondary border-l-4 px-4 py-3 font-data text-sm max-w-xs toast-clip" },
            ...{ class: (__VLS_ctx.accentColor(toast.type)) },
            ...{ style: (__VLS_ctx.glowStyle(toast.type)) },
        });
        /** @type {__VLS_StyleScopedClasses['pointer-events-auto']} */ ;
        /** @type {__VLS_StyleScopedClasses['bg-bg-secondary']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-l-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['px-4']} */ ;
        /** @type {__VLS_StyleScopedClasses['py-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['font-data']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
        /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['toast-clip']} */ ;
        (toast.message);
    }
    // @ts-ignore
    [toasts, accentColor, glowStyle,];
    var __VLS_3;
    // @ts-ignore
    [];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

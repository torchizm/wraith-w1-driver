/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useToast } from '../composables/useToast';
const { toasts } = useToast();
function typeColor(type) {
    return {
        success: 'var(--color-success)',
        error: 'var(--color-danger)',
        info: 'var(--color-accent-primary)',
    }[type];
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "toast-container" },
});
/** @type {__VLS_StyleScopedClasses['toast-container']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.TransitionGroup | typeof __VLS_components.TransitionGroup} */
TransitionGroup;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "toast",
    tag: "div",
    ...{ class: "toast-list" },
}));
const __VLS_2 = __VLS_1({
    name: "toast",
    tag: "div",
    ...{ class: "toast-list" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['toast-list']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
for (const [toast] of __VLS_vFor((__VLS_ctx.toasts))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (toast.id),
        ...{ class: "toast-item" },
        ...{ style: ({
                borderLeftColor: __VLS_ctx.typeColor(toast.type),
                boxShadow: `0 4px 16px rgba(0,0,0,0.3), inset 3px 0 0 ${__VLS_ctx.typeColor(toast.type)}`
            }) },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow, {})(null, { ...__VLS_directiveBindingRestFields, value: (toast.visible) }, null, null);
    /** @type {__VLS_StyleScopedClasses['toast-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "toast-text" },
    });
    /** @type {__VLS_StyleScopedClasses['toast-text']} */ ;
    (toast.message);
    // @ts-ignore
    [toasts, typeColor, typeColor,];
}
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

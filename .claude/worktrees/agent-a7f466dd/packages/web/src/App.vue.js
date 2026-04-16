/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { useDeviceStore } from './stores/device';
import Sidebar from './components/Sidebar.vue';
import ConnectScreen from './components/ConnectScreen.vue';
import Toast from './components/Toast.vue';
const store = useDeviceStore();
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "app-root" },
});
/** @type {__VLS_StyleScopedClasses['app-root']} */ ;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    name: "shell",
}));
const __VLS_2 = __VLS_1({
    name: "shell",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const { default: __VLS_5 } = __VLS_3.slots;
if (!__VLS_ctx.store.connected) {
    const __VLS_6 = ConnectScreen;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        key: "connect",
    }));
    const __VLS_8 = __VLS_7({
        key: "connect",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
}
// @ts-ignore
[store,];
var __VLS_3;
let __VLS_11;
/** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
Transition;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent1(__VLS_11, new __VLS_11({
    name: "shell",
}));
const __VLS_13 = __VLS_12({
    name: "shell",
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
const { default: __VLS_16 } = __VLS_14.slots;
if (__VLS_ctx.store.connected) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: "app",
        ...{ class: "app-shell" },
    });
    /** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
    const __VLS_17 = Sidebar;
    // @ts-ignore
    const __VLS_18 = __VLS_asFunctionalComponent1(__VLS_17, new __VLS_17({}));
    const __VLS_19 = __VLS_18({}, ...__VLS_functionalComponentArgsRest(__VLS_18));
    __VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
        ...{ class: "app-content" },
    });
    /** @type {__VLS_StyleScopedClasses['app-content']} */ ;
    let __VLS_22;
    /** @ts-ignore @type {typeof __VLS_components.routerView | typeof __VLS_components.RouterView | typeof __VLS_components.routerView | typeof __VLS_components.RouterView} */
    routerView;
    // @ts-ignore
    const __VLS_23 = __VLS_asFunctionalComponent1(__VLS_22, new __VLS_22({}));
    const __VLS_24 = __VLS_23({}, ...__VLS_functionalComponentArgsRest(__VLS_23));
    {
        const { default: __VLS_27 } = __VLS_25.slots;
        const [{ Component }] = __VLS_vSlot(__VLS_27);
        let __VLS_28;
        /** @ts-ignore @type {typeof __VLS_components.Transition | typeof __VLS_components.Transition} */
        Transition;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
            name: "page",
            mode: "out-in",
        }));
        const __VLS_30 = __VLS_29({
            name: "page",
            mode: "out-in",
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        const { default: __VLS_33 } = __VLS_31.slots;
        const __VLS_34 = (Component);
        // @ts-ignore
        const __VLS_35 = __VLS_asFunctionalComponent1(__VLS_34, new __VLS_34({}));
        const __VLS_36 = __VLS_35({}, ...__VLS_functionalComponentArgsRest(__VLS_35));
        // @ts-ignore
        [store,];
        var __VLS_31;
        // @ts-ignore
        [];
        __VLS_25.slots['' /* empty slot name completion */];
    }
    var __VLS_25;
}
// @ts-ignore
[];
var __VLS_14;
const __VLS_39 = Toast;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent1(__VLS_39, new __VLS_39({}));
const __VLS_41 = __VLS_40({}, ...__VLS_functionalComponentArgsRest(__VLS_40));
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};

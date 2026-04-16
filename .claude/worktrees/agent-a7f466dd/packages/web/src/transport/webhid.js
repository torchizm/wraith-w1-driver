// WebHID transport layer for Wraith W1
import { ref } from 'vue';
import { VENDOR_ID, PRODUCT_ID_WIRELESS, USAGE_PAGE_VENDOR, REPORT_ID } from '../protocol/constants';
import { parseInputReport } from '../protocol/parser';
import { cmdIdentify, parseIdentifyResponse, cmdReadPollingRate, cmdReadDPIConfig, cmdReadDPIValue, cmdReadSensorParam, cmdReadDebounce, cmdReadSleepTime, } from '../protocol/commands';
import { POLLING_RATE_MAP, PARAM } from '../protocol/constants';
const defaultState = {
    batteryLevel: 0,
    isCharging: false,
    currentDPIIndex: 0,
    pollingRateCode: 0,
    pollingRateHz: 0,
    currentProfile: 0,
    debounceTime: 0,
    sleepTime: 0,
    lodValue: 0,
    rippleEffect: false,
    angleSnap: false,
    motionSync: false,
    dpiLevels: [],
    performanceMode: 2,
};
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function dvToBytes(dv) {
    const bytes = [];
    for (let i = 0; i < dv.byteLength; i++)
        bytes.push(dv.getUint8(i));
    return bytes;
}
export function createWebHIDTransport() {
    const device = ref(null);
    const connected = ref(false);
    const deviceInfo = ref(null);
    const state = ref({ ...defaultState });
    const lastButton = ref(null);
    const rawHex = ref('');
    const debugLog = ref([]);
    let writeLockUntil = 0; // timestamp — ignore input report state updates until this time
    function log(msg) {
        console.log('[WebHID]', msg);
        debugLog.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
        if (debugLog.value.length > 50)
            debugLog.value.pop();
    }
    const transport = {
        device,
        connected,
        deviceInfo,
        state,
        lastButton,
        rawHex,
        debugLog,
        onStateUpdate: null,
        onButtonPress: null,
        async connect() {
            if (!('hid' in navigator)) {
                throw new Error('WebHID not supported. Use Chrome or Edge.');
            }
            // Load cached state
            try {
                const cached = localStorage.getItem('wraith:lastState');
                if (cached) {
                    state.value = { ...defaultState, ...JSON.parse(cached) };
                    log('Loaded cached state');
                }
            }
            catch { }
            const devices = await navigator.hid.requestDevice({
                filters: [
                    { vendorId: VENDOR_ID, productId: PRODUCT_ID_WIRELESS, usagePage: USAGE_PAGE_VENDOR },
                ],
            });
            if (!devices.length)
                throw new Error('No device selected.');
            const dev = devices[0];
            if (!dev.opened)
                await dev.open();
            device.value = dev;
            connected.value = true;
            log(`Device opened: ${dev.productName}`);
            // Input reports — PRIMARY data source for live state
            dev.addEventListener('inputreport', (event) => {
                if (event.reportId !== REPORT_ID)
                    return;
                const parsed = parseInputReport(event.data);
                rawHex.value = parsed.rawBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
                // Button presses always processed
                if (parsed.buttonPress) {
                    lastButton.value = parsed.buttonPress;
                    if (transport.onButtonPress)
                        transport.onButtonPress(parsed.buttonPress);
                }
                // Skip state overwrites during write lock (prevents reverting optimistic updates)
                if (Date.now() < writeLockUntil)
                    return;
                // Update state from input report, preserving feature-report-only fields
                const prevDpiLevels = state.value.dpiLevels;
                const prevPerfMode = state.value.performanceMode;
                state.value = {
                    ...parsed.state,
                    dpiLevels: prevDpiLevels.length > 0 ? prevDpiLevels : [],
                    performanceMode: prevPerfMode,
                };
                try {
                    localStorage.setItem('wraith:lastState', JSON.stringify(state.value));
                }
                catch { }
                if (transport.onStateUpdate)
                    transport.onStateUpdate(state.value);
            });
            navigator.hid.addEventListener('disconnect', (event) => {
                if (event.device === dev) {
                    connected.value = false;
                    device.value = null;
                    deviceInfo.value = null;
                    log('Device disconnected');
                }
            });
            // Read full config via feature reports
            await transport.readFullConfig();
            log('Ready.');
        },
        /**
         * Clear buffer + send command + read response.
         * The w1.software pattern: flush stale data, send command, wait, read fresh response.
         */
        async freshRead(label, cmd, delayMs = 200) {
            try {
                // Step 1: Clear stale buffer with a dummy read
                try {
                    await transport.readFeatureReport();
                }
                catch { }
                await delay(10);
                // Step 2: Send command
                await transport.sendFeatureReport(cmd);
                // Step 3: Wait for device to process
                await delay(delayMs);
                // Step 4: Read response
                const resp = await transport.readFeatureReport();
                if (resp) {
                    const bytes = dvToBytes(resp);
                    log(`${label}: [${Array.from(cmd).map(b => b.toString(16)).join(',')}] -> [${bytes.map(b => b.toString(16)).join(',')}]`);
                    return bytes;
                }
                log(`${label}: no response`);
                return null;
            }
            catch (e) {
                log(`${label}: error: ${e}`);
                return null;
            }
        },
        async readFullConfig() {
            // Step 1: Identify
            const identBytes = await transport.freshRead('Identify', cmdIdentify(), 500);
            if (identBytes) {
                const hexDump = identBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
                log(`Identify raw: ${hexDump}`);
                const dv = new DataView(new Uint8Array(identBytes).buffer);
                deviceInfo.value = parseIdentifyResponse(dv);
                if (deviceInfo.value) {
                    log(`Device: ${deviceInfo.value.mouseType}, cc=${deviceInfo.value.customerCode}, sensor=${deviceInfo.value.sensorType}, ${deviceInfo.value.connectionMode}`);
                }
            }
            const cc = deviceInfo.value?.customerCode ?? false;
            log(`Reading config (cc=${cc})...`);
            // Step 2: Polling rate
            const pollBytes = await transport.freshRead('PollRate', cmdReadPollingRate(cc), 300);
            if (pollBytes && pollBytes.length >= 3 && pollBytes[0] === 9) {
                const code = pollBytes[2];
                const hz = POLLING_RATE_MAP[code];
                if (hz) {
                    state.value = { ...state.value, pollingRateCode: code, pollingRateHz: hz };
                    log(`Poll rate: ${hz}Hz`);
                }
            }
            // Step 3: DPI config
            const dpiConfBytes = await transport.freshRead('DPIConfig', cmdReadDPIConfig(cc), 300);
            let totalLevels = 1;
            let currentIdx = 0;
            if (dpiConfBytes && dpiConfBytes.length >= 4 && dpiConfBytes[0] === 9) {
                totalLevels = dpiConfBytes[2] || 1;
                currentIdx = dpiConfBytes[3] || 0;
                log(`DPI: ${totalLevels} levels, current=${currentIdx}`);
            }
            // Step 4: DPI slot values
            const dpiLevels = [];
            for (let i = 0; i < Math.min(totalLevels, 6); i++) {
                const dpiBytes = await transport.freshRead(`DPI[${i}]`, cmdReadDPIValue(cc, i), 300);
                if (dpiBytes && dpiBytes.length >= 5 && dpiBytes[0] === 9) {
                    const hexDump = dpiBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
                    // Response: [reportId=9, cmd, slot_echo, lo, hi, ...]
                    // Try slot_echo at [2]: lo=[3], hi=[4]  (documented format)
                    // Try no slot_echo:     lo=[2], hi=[3]  (alternative)
                    const rawA = (dpiBytes[4] << 8) | dpiBytes[3]; // lo=[3], hi=[4]
                    const rawB = (dpiBytes[3] << 8) | dpiBytes[2]; // lo=[2], hi=[3]
                    const dpiA = (rawA + 1) * 50;
                    const dpiB = (rawB + 1) * 50;
                    log(`DPI[${i}] raw: ${hexDump} | fmt-A(lo@3)=${dpiA} fmt-B(lo@2)=${dpiB}`);
                    // Use format-A (lo at bytes[3]) per protocol documentation
                    dpiLevels.push(dpiA);
                }
                else {
                    log(`DPI[${i}] no response or wrong reportId: ${dpiBytes?.map(b => b.toString(16)).join(' ')}`);
                    dpiLevels.push(800);
                }
            }
            state.value = { ...state.value, currentDPIIndex: currentIdx, dpiLevels };
            // Step 5: Sensor params
            async function readParam(label, paramId) {
                const bytes = await transport.freshRead(label, cmdReadSensorParam(cc, paramId), 200);
                if (bytes && bytes.length >= 4 && bytes[0] === 9) {
                    return bytes[3];
                }
                return -1; // -1 means read failed, keep existing value
            }
            const lodVal = await readParam('LOD', PARAM.SILENT_ALTITUDE);
            const angleSnapVal = await readParam('AngleSnap', PARAM.LINEAR_CORRECTION);
            const motionSyncVal = await readParam('MotionSync', PARAM.MOTION_SYNC);
            const rippleVal = await readParam('Ripple', PARAM.WAVE_CONTROL);
            const perfModeVal = await readParam('PerfMode', PARAM.PERF_MODE);
            // Step 6: Debounce
            const debBytes = await transport.freshRead('Debounce', cmdReadDebounce(cc), 200);
            let debounceMs = -1;
            if (debBytes && debBytes.length >= 5 && debBytes[0] === 9) {
                debounceMs = (debBytes[4] << 8) | debBytes[3];
            }
            // Step 7: Sleep
            const sleepBytes = await transport.freshRead('Sleep', cmdReadSleepTime(cc), 200);
            let sleepSec = -1;
            if (sleepBytes && sleepBytes.length >= 5 && sleepBytes[0] === 9) {
                sleepSec = (sleepBytes[4] << 8) | sleepBytes[3];
            }
            // Apply only successful reads (value >= 0)
            const updates = {};
            if (lodVal >= 0)
                updates.lodValue = lodVal;
            if (angleSnapVal >= 0)
                updates.angleSnap = angleSnapVal !== 0;
            if (motionSyncVal >= 0)
                updates.motionSync = motionSyncVal !== 0;
            if (rippleVal >= 0)
                updates.rippleEffect = rippleVal !== 0;
            if (perfModeVal >= 0)
                updates.performanceMode = perfModeVal;
            if (debounceMs >= 0)
                updates.debounceTime = debounceMs;
            if (sleepSec >= 0)
                updates.sleepTime = sleepSec;
            state.value = { ...state.value, ...updates };
            try {
                localStorage.setItem('wraith:lastState', JSON.stringify(state.value));
            }
            catch { }
            log('Config read complete');
            if (transport.onStateUpdate)
                transport.onStateUpdate(state.value);
        },
        async readDPIConfig() {
            const cc = deviceInfo.value?.customerCode ?? false;
            log(`Reading DPI config (cc=${cc})...`);
            const dpiConfBytes = await transport.freshRead('DPIConfig', cmdReadDPIConfig(cc), 300);
            let totalLevels = state.value.dpiLevels.length || 1;
            let currentIdx = state.value.currentDPIIndex;
            if (dpiConfBytes && dpiConfBytes.length >= 4 && dpiConfBytes[0] === 9) {
                totalLevels = dpiConfBytes[2] || 1;
                currentIdx = dpiConfBytes[3] || 0;
                log(`DPI: ${totalLevels} levels, current=${currentIdx}`);
            }
            const dpiLevels = [];
            for (let i = 0; i < Math.min(totalLevels, 6); i++) {
                const dpiBytes = await transport.freshRead(`DPI[${i}]`, cmdReadDPIValue(cc, i), 300);
                if (dpiBytes && dpiBytes.length >= 5 && dpiBytes[0] === 9) {
                    const hexDump = dpiBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
                    const rawA = (dpiBytes[4] << 8) | dpiBytes[3];
                    const rawB = (dpiBytes[3] << 8) | dpiBytes[2];
                    const dpiA = (rawA + 1) * 50;
                    const dpiB = (rawB + 1) * 50;
                    log(`DPI[${i}] raw: ${hexDump} | fmt-A(lo@3)=${dpiA} fmt-B(lo@2)=${dpiB}`);
                    dpiLevels.push(dpiA);
                }
                else {
                    log(`DPI[${i}] no response or wrong reportId: ${dpiBytes?.map(b => b.toString(16)).join(' ')}`);
                    dpiLevels.push(800);
                }
            }
            state.value = { ...state.value, currentDPIIndex: currentIdx, dpiLevels };
            try {
                localStorage.setItem('wraith:lastState', JSON.stringify(state.value));
            }
            catch { }
            if (transport.onStateUpdate)
                transport.onStateUpdate(state.value);
        },
        updateStateField(partial) {
            // Lock out input report state overwrites for 3 seconds
            writeLockUntil = Date.now() + 3000;
            state.value = { ...state.value, ...partial };
            try {
                localStorage.setItem('wraith:lastState', JSON.stringify(state.value));
            }
            catch { }
            if (transport.onStateUpdate)
                transport.onStateUpdate(state.value);
            log(`Write lock active for 3s (updated: ${Object.keys(partial).join(', ')})`);
        },
        disconnect() {
            if (device.value?.opened)
                device.value.close();
            device.value = null;
            connected.value = false;
            deviceInfo.value = null;
            state.value = { ...defaultState };
        },
        async sendFeatureReport(data) {
            if (!device.value?.opened)
                throw new Error('Device not connected');
            await device.value.sendFeatureReport(REPORT_ID, data);
        },
        async readFeatureReport() {
            if (!device.value?.opened)
                return null;
            try {
                return await device.value.receiveFeatureReport(REPORT_ID);
            }
            catch {
                return null;
            }
        },
        async sendAndRead(data, delayMs = 200) {
            await transport.sendFeatureReport(data);
            await delay(delayMs);
            return transport.readFeatureReport();
        },
    };
    return transport;
}

// Feature report command builders for writing device config
// All commands: sendFeatureReport(9, Uint8Array[8])
import { getCommandIDs, POLLING_RATE_REVERSE, PARAM, TIMING_PARAM } from './constants';
function makePayload(...bytes) {
    const buf = new Uint8Array(8);
    for (let i = 0; i < Math.min(bytes.length, 8); i++) {
        buf[i] = bytes[i];
    }
    return buf;
}
// Device identification
export function cmdIdentify() {
    return makePayload(143, 0);
}
export function parseIdentifyResponse(data) {
    if (data.byteLength < 8)
        return null;
    const bytes = [];
    for (let i = 0; i < data.byteLength; i++)
        bytes.push(data.getUint8(i));
    // Response format: [reportId=9, cmd=143, firmware, mouseType, connMode, ?, sensor, ?, customerCode]
    //                          [0]      [1]     [2]       [3]        [4]   [5]  [6]  [7]       [8]
    // customerCode is at byte[8]: macOS byte[7] maps to buf[8] after the report-ID prefix.
    if (bytes[0] !== 9 || bytes[1] !== 143)
        return null;
    const firmwareValid = bytes[2] === 1;
    const mouseTypeRaw = bytes[3];
    const mouseType = mouseTypeRaw === 20 ? 'type3' : mouseTypeRaw === 18 ? 'type5' : `unknown(${mouseTypeRaw})`;
    const connMode = bytes[4] === 1 ? '1k' : bytes[4] === 2 ? '8k' : `unknown(${bytes[4]})`;
    const sensorType = bytes[6] === 241 ? 1 : 0;
    const customerCode = bytes[8] === 64;
    const maxDPI = sensorType === 1 ? 30000 : 26000;
    return { mouseType, customerCode, sensorType, connectionMode: connMode, firmwareValid, maxDPI };
}
// Polling rate
export function cmdSetPollingRate(isCustomer, hz) {
    const cmd = getCommandIDs(isCustomer);
    const code = POLLING_RATE_REVERSE[hz];
    if (code === undefined)
        throw new Error(`Invalid polling rate: ${hz}`);
    return makePayload(cmd.setPollingRate, code);
}
export function cmdReadPollingRate(isCustomer) {
    return makePayload(getCommandIDs(isCustomer).readPollingRate, 0);
}
// DPI
export function cmdSetDPIValue(isCustomer, slot, dpiValue) {
    const cmd = getCommandIDs(isCustomer);
    const encoded = Math.round(dpiValue / 50 - 1);
    return makePayload(cmd.setDPIValue, slot, encoded & 0xff, (encoded >> 8) & 0xff);
}
export function cmdSetDPIConfig(isCustomer, totalLevels, currentIndex) {
    const cmd = getCommandIDs(isCustomer);
    return makePayload(cmd.setDPIConfig, totalLevels, currentIndex);
}
export function cmdReadDPIConfig(isCustomer) {
    return makePayload(getCommandIDs(isCustomer).readDPIConfig, 0);
}
export function cmdReadDPIValue(isCustomer, slot) {
    return makePayload(getCommandIDs(isCustomer).readDPIValue, slot);
}
export function parseDPIConfigResponse(data) {
    if (data.byteLength < 4)
        return null;
    const bytes = [];
    for (let i = 0; i < data.byteLength; i++)
        bytes.push(data.getUint8(i));
    if (bytes[0] !== 9)
        return null;
    return { totalLevels: bytes[2], currentIndex: bytes[3] };
}
export function parseDPIValueResponse(data) {
    if (data.byteLength < 5)
        return null;
    const bytes = [];
    for (let i = 0; i < data.byteLength; i++)
        bytes.push(data.getUint8(i));
    if (bytes[0] !== 9)
        return null;
    const rawValue = (bytes[4] << 8) | bytes[3];
    return { slot: bytes[2], dpiValue: (rawValue + 1) * 50 };
}
// Sensor parameters (LOD, Angle Snap, Motion Sync, Ripple, Performance Mode)
export function cmdSetSensorParam(isCustomer, paramId, value) {
    return makePayload(getCommandIDs(isCustomer).setSensorMode, paramId, value);
}
export function cmdReadSensorParam(isCustomer, paramId) {
    return makePayload(getCommandIDs(isCustomer).readSensorSetting, paramId);
}
// Convenience
export const cmdSetLOD = (c, v) => cmdSetSensorParam(c, PARAM.SILENT_ALTITUDE, v);
export const cmdSetAngleSnap = (c, on) => cmdSetSensorParam(c, PARAM.LINEAR_CORRECTION, on ? 1 : 0);
export const cmdSetMotionSync = (c, on) => cmdSetSensorParam(c, PARAM.MOTION_SYNC, on ? 1 : 0);
export const cmdSetRipple = (c, on) => cmdSetSensorParam(c, PARAM.WAVE_CONTROL, on ? 1 : 0);
export const cmdSetPerfMode = (c, mode) => cmdSetSensorParam(c, PARAM.PERF_MODE, mode);
// Debounce and Sleep
export function cmdSetDebounce(isCustomer, ms) {
    return makePayload(getCommandIDs(isCustomer).setParameter, TIMING_PARAM.KEY_DEBOUNCING, ms);
}
export function cmdSetSleepTime(isCustomer, seconds) {
    return makePayload(getCommandIDs(isCustomer).setParameter, TIMING_PARAM.DEEP_SLEEP, seconds & 0xff, (seconds >> 8) & 0xff);
}
export function cmdReadDebounce(isCustomer) {
    return makePayload(getCommandIDs(isCustomer).readDebounce, TIMING_PARAM.KEY_DEBOUNCING);
}
export function cmdReadSleepTime(isCustomer) {
    return makePayload(getCommandIDs(isCustomer).readDebounce, TIMING_PARAM.DEEP_SLEEP);
}
// Key/Button mapping
export function cmdSetKeyFunction(buttonId, functionValue) {
    return makePayload(6, buttonId, functionValue & 0xff, (functionValue >> 8) & 0xff, (functionValue >> 16) & 0xff, (functionValue >> 24) & 0xff);
}
export function cmdReadKeyFunction(buttonId) {
    return makePayload(134, buttonId);
}
export function parseKeyFunctionResponse(data) {
    if (data.byteLength < 7)
        return null;
    const bytes = [];
    for (let i = 0; i < data.byteLength; i++)
        bytes.push(data.getUint8(i));
    if (bytes[0] !== 9)
        return null;
    const functionValue = bytes[3] | (bytes[4] << 8) | (bytes[5] << 16) | (bytes[6] << 24);
    return { buttonId: bytes[2], functionValue: functionValue >>> 0 };
}
// Profile switching
export function cmdSwitchProfile(isCustomer, profileIndex) {
    return makePayload(getCommandIDs(isCustomer).switchProfile, 6, profileIndex & 0xff, (profileIndex >> 8) & 0xff);
}
// Macro upload
export function cmdMacroHeader(chunkCount, chunkIndex, chunkSize, buttonId) {
    return makePayload(7, chunkCount, chunkIndex, chunkSize, buttonId & 0xff);
}

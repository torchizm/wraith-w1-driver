// Pinia store for device state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createWebHIDTransport } from '../transport/webhid'
import { createDaemonClient } from '../transport/websocket'
import type { ButtonPress, DeviceState } from '../protocol/parser'

export interface EventLogEntry {
  button: string
  timestamp: number
  rawHex: string
}

export const useDeviceStore = defineStore('device', () => {
  // Transport instances
  const hid = createWebHIDTransport()
  const daemon = createDaemonClient()

  // Reactive state
  const connected = computed(() => hid.connected.value)
  const daemonConnected = computed(() => daemon.connected.value)
  const daemonVersion = computed(() => daemon.version.value)
  const state = computed(() => hid.state.value)
  const deviceInfo = computed(() => hid.deviceInfo.value)
  const rawHex = computed(() => hid.rawHex.value)
  const activeButton = ref<string | null>(null)
  const eventLog = ref<EventLogEntry[]>([])

  let clearTimer: number | null = null

  // Wire up callbacks
  hid.onStateUpdate = () => {}
  hid.onButtonPress = (press: ButtonPress) => {
    activeButton.value = press.button
    eventLog.value.unshift({
      button: press.button,
      timestamp: press.timestamp,
      rawHex: hid.rawHex.value,
    })
    if (eventLog.value.length > 50) eventLog.value.pop()

    if (clearTimer) clearTimeout(clearTimer)
    clearTimer = window.setTimeout(() => { activeButton.value = null }, 300)
  }

  // Daemon message handler
  daemon.onMessage = (type, payload) => {
    if (type === 'button' && payload?.button) {
      activeButton.value = payload.button
      eventLog.value.unshift({
        button: payload.button,
        timestamp: payload.timestamp ?? Date.now(),
        rawHex: '',
      })
      if (eventLog.value.length > 50) eventLog.value.pop()

      if (clearTimer) clearTimeout(clearTimer)
      clearTimer = window.setTimeout(() => { activeButton.value = null }, 300)
    }
  }

  // Actions
  async function connect() {
    await hid.connect()
    daemon.connect()
  }

  function disconnect() {
    hid.disconnect()
    daemon.disconnect()
  }

  async function sendFeatureReport(data: Uint8Array) {
    await hid.sendFeatureReport(data)
  }

  async function sendAndRead(data: Uint8Array, delayMs?: number) {
    return hid.sendAndRead(data, delayMs)
  }

  // Optimistically update UI state after a write (don't wait for input report)
  function updateState(partial: Partial<DeviceState>) {
    hid.updateStateField(partial)
  }

  // Computed helpers
  const batteryLevel = computed(() => state.value.batteryLevel)
  const isCharging = computed(() => state.value.isCharging)
  const pollingRateHz = computed(() => state.value.pollingRateHz)
  const currentDPIIndex = computed(() => state.value.currentDPIIndex)
  const currentProfile = computed(() => state.value.currentProfile)
  const debounceTime = computed(() => state.value.debounceTime)
  const sleepTime = computed(() => state.value.sleepTime)
  const lodValue = computed(() => state.value.lodValue)
  const angleSnap = computed(() => state.value.angleSnap)
  const motionSync = computed(() => state.value.motionSync)
  const rippleEffect = computed(() => state.value.rippleEffect)
  const customerCode = computed(() => deviceInfo.value?.customerCode ?? false)
  const dpiLevels = computed(() => state.value.dpiLevels)
  const performanceMode = computed(() => state.value.performanceMode)

  async function readFullConfig() {
    await hid.readFullConfig()
  }

  async function readDPIConfig() {
    await hid.readDPIConfig()
  }

  return {
    // State
    connected,
    daemonConnected,
    daemonVersion,
    state,
    deviceInfo,
    rawHex,
    activeButton,
    eventLog,

    // Helpers
    batteryLevel,
    isCharging,
    pollingRateHz,
    currentDPIIndex,
    currentProfile,
    debounceTime,
    sleepTime,
    lodValue,
    angleSnap,
    motionSync,
    rippleEffect,
    customerCode,
    dpiLevels,
    performanceMode,

    // Actions
    connect,
    disconnect,
    sendFeatureReport,
    sendAndRead,
    readFullConfig,
    readDPIConfig,
    updateState,

    // Raw transport access
    hid,
    daemon,
  }
})

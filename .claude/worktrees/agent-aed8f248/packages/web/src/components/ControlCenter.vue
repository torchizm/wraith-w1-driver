<script setup lang="ts">
import { useDeviceStore } from '../stores/device'

const store = useDeviceStore()

// Returns Tailwind classes for a CC button that has a matching HID event
function btnClass(event: string) {
  return store.activeButton === event
    ? 'bg-accent-red/90 text-white border-accent-red shadow-[0_0_14px_rgba(239,68,68,0.5)]'
    : 'bg-bg-tertiary text-text-secondary border-border-default hover:border-accent-purple/40 hover:text-text-primary'
}

// Static buttons (no HID event — physical device buttons, always inactive)
const staticClass = 'bg-bg-primary text-text-muted/40 border-border-default/40 cursor-default select-none'
</script>

<template>
  <div class="bg-bg-secondary rounded-xl border border-border-default p-4">
    <div class="text-[9px] text-text-muted font-semibold tracking-widest mb-3">CONTROL CENTER</div>

    <!--
      5-column grid — col 5 spans both rows (knob + brand display).
      Row 1: START | MACRO | ▲  | EDIT | ╮
      Row 2: STOP  | DPI   | ▼  | SAVE | ╯  (knob + WRAITH)
    -->
    <div class="grid gap-2" style="grid-template-columns: repeat(4, 1fr) auto; grid-template-rows: 1fr 1fr;">

      <!-- ── Row 1 ── -->

      <!-- START -->
      <button
        class="py-2 text-[10px] font-bold rounded-lg border transition-all text-center tracking-wide"
        :class="btnClass('START')"
      >START</button>

      <!-- MACRO -->
      <button
        class="py-2 text-[10px] font-bold rounded-lg border transition-all text-center tracking-wide"
        :class="btnClass('MACRO')"
      >MACRO</button>

      <!-- ARROW UP (static — separate physical button, no HID event) -->
      <div class="py-2 text-[10px] rounded-lg border text-center" :class="staticClass">▲</div>

      <!-- EDIT (static) -->
      <div class="py-2 text-[10px] rounded-lg border text-center" :class="staticClass">EDIT</div>

      <!-- ── Knob — spans rows 1 & 2 ── -->
      <div
        class="row-span-2 flex flex-col items-center justify-between px-4 py-2 rounded-xl border border-border-default bg-bg-primary gap-1"
        style="min-width: 80px;"
      >
        <!-- VOL + -->
        <div
          class="flex items-center gap-1 text-[9px] font-semibold transition-all px-1.5 py-0.5 rounded-full"
          :class="store.activeButton === 'ARROW_UP'
            ? 'text-accent-green bg-accent-green/10'
            : 'text-text-muted/40'"
        >
          <span>▲</span><span>VOL+</span>
        </div>

        <!-- Knob dial -->
        <div class="relative flex items-center justify-center">
          <!-- Outer glow ring on MUTE press -->
          <div
            class="absolute inset-0 rounded-full transition-all duration-200"
            :class="store.activeButton === 'MUTE'
              ? 'shadow-[0_0_18px_rgba(239,68,68,0.6)] bg-accent-red/10'
              : ''"
          />
          <!-- Knob body -->
          <div
            class="w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-200 relative z-10"
            :class="store.activeButton === 'MUTE'
              ? 'border-accent-red bg-accent-red/20'
              : 'border-border-light bg-bg-tertiary'"
          >
            <!-- Grip notch indicator at the top -->
            <div
              class="w-1 h-3 rounded-full transition-colors"
              :class="store.activeButton === 'MUTE' ? 'bg-accent-red' : 'bg-text-muted/30'"
            />
          </div>
        </div>

        <!-- PRESS label -->
        <div
          class="text-[8px] font-semibold tracking-wider transition-all"
          :class="store.activeButton === 'MUTE' ? 'text-accent-red' : 'text-text-muted/30'"
        >PRESS</div>

        <!-- VOL - -->
        <div
          class="flex items-center gap-1 text-[9px] font-semibold transition-all px-1.5 py-0.5 rounded-full"
          :class="store.activeButton === 'ARROW_DOWN'
            ? 'text-accent-green bg-accent-green/10'
            : 'text-text-muted/40'"
        >
          <span>▼</span><span>VOL-</span>
        </div>

        <!-- Divider -->
        <div class="w-full h-px bg-border-default/40" />

        <!-- WRAITH brand / active display -->
        <div class="text-center">
          <div
            v-if="store.activeButton"
            class="text-[10px] font-black text-accent-red animate-pulse tracking-wider"
          >{{ store.activeButton }}</div>
          <div
            v-else
            class="text-[8px] font-bold tracking-[0.25em] text-text-muted/25"
          >WRAITH.</div>
        </div>
      </div>

      <!-- ── Row 2 ── -->

      <!-- STOP -->
      <button
        class="py-2 text-[10px] font-bold rounded-lg border transition-all text-center tracking-wide"
        :class="btnClass('STOP')"
      >STOP</button>

      <!-- DPI (static) -->
      <div class="py-2 text-[10px] rounded-lg border text-center" :class="staticClass">DPI</div>

      <!-- ARROW DOWN (static — separate physical button, no HID event) -->
      <div class="py-2 text-[10px] rounded-lg border text-center" :class="staticClass">▼</div>

      <!-- SAVE (static) -->
      <div class="py-2 text-[10px] rounded-lg border text-center" :class="staticClass">SAVE</div>

    </div>
  </div>
</template>

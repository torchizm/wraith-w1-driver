<script setup lang="ts">
const props = withDefaults(defineProps<{
  highlightButton?: string
  buttonLabels?: Record<string, string>
}>(), {
  highlightButton: '',
  buttonLabels: () => ({}),
})

const zones = [
  { id: 'left',    label: 'L',  default: 'Left Click' },
  { id: 'right',   label: 'R',  default: 'Right Click' },
  { id: 'middle',  label: 'M',  default: 'Middle Click' },
  { id: 'back',    label: 'B',  default: 'Back' },
  { id: 'forward', label: 'F',  default: 'Forward' },
  { id: 'dpi',     label: 'D',  default: 'DPI Cycle' },
]

function isHighlighted(id: string) {
  return props.highlightButton === id
}

function labelFor(id: string) {
  return props.buttonLabels[id] ?? zones.find(z => z.id === id)?.default ?? ''
}
</script>

<template>
  <svg
    viewBox="0 0 180 280"
    width="180"
    height="280"
    xmlns="http://www.w3.org/2000/svg"
    class="mouse-visual"
  >
    <!-- Mouse body outline -->
    <path
      d="M 40 80 Q 40 20, 90 12 Q 140 20, 140 80 L 140 210 Q 140 268, 90 272 Q 40 268, 40 210 Z"
      fill="var(--color-bg-tertiary)"
      stroke="var(--color-border-default)"
      stroke-width="2"
    />

    <!-- Left button zone -->
    <path
      d="M 44 82 Q 44 24, 87 16 L 87 110 L 44 110 Z"
      :fill="isHighlighted('left') ? 'rgba(147, 51, 234, 0.35)' : 'rgba(147, 51, 234, 0.08)'"
      :stroke="isHighlighted('left') ? 'var(--color-accent-purple)' : 'rgba(147, 51, 234, 0.25)'"
      stroke-width="1.5"
      class="zone-path"
      data-zone="left"
    />
    <text x="65" y="72" text-anchor="middle" class="zone-label" :class="{ highlighted: isHighlighted('left') }">
      {{ labelFor('left') }}
    </text>

    <!-- Right button zone -->
    <path
      d="M 136 82 Q 136 24, 93 16 L 93 110 L 136 110 Z"
      :fill="isHighlighted('right') ? 'rgba(6, 182, 212, 0.35)' : 'rgba(6, 182, 212, 0.08)'"
      :stroke="isHighlighted('right') ? 'var(--color-accent-cyan)' : 'rgba(6, 182, 212, 0.25)'"
      stroke-width="1.5"
      class="zone-path"
      data-zone="right"
    />
    <text x="115" y="72" text-anchor="middle" class="zone-label" :class="{ highlighted: isHighlighted('right') }">
      {{ labelFor('right') }}
    </text>

    <!-- Middle / scroll button zone -->
    <rect
      x="78" y="112" width="24" height="32" rx="6"
      :fill="isHighlighted('middle') ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.08)'"
      :stroke="isHighlighted('middle') ? 'var(--color-accent-green)' : 'rgba(34, 197, 94, 0.25)'"
      stroke-width="1.5"
      class="zone-path"
      data-zone="middle"
    />
    <!-- Scroll wheel lines -->
    <line x1="84" y1="122" x2="96" y2="122" stroke="var(--color-text-muted)" stroke-width="0.8" opacity="0.4" />
    <line x1="84" y1="128" x2="96" y2="128" stroke="var(--color-text-muted)" stroke-width="0.8" opacity="0.4" />
    <line x1="84" y1="134" x2="96" y2="134" stroke="var(--color-text-muted)" stroke-width="0.8" opacity="0.4" />
    <text x="90" y="155" text-anchor="middle" class="zone-label zone-label-sm" :class="{ highlighted: isHighlighted('middle') }">
      {{ labelFor('middle') }}
    </text>

    <!-- DPI button zone (below scroll wheel) -->
    <rect
      x="80" y="160" width="20" height="14" rx="4"
      :fill="isHighlighted('dpi') ? 'rgba(249, 115, 22, 0.35)' : 'rgba(249, 115, 22, 0.08)'"
      :stroke="isHighlighted('dpi') ? 'var(--color-accent-orange)' : 'rgba(249, 115, 22, 0.25)'"
      stroke-width="1.5"
      class="zone-path"
      data-zone="dpi"
    />
    <text x="90" y="183" text-anchor="middle" class="zone-label zone-label-sm" :class="{ highlighted: isHighlighted('dpi') }">
      {{ labelFor('dpi') }}
    </text>

    <!-- Back button (side, left) -->
    <rect
      x="34" y="130" width="14" height="24" rx="4"
      :fill="isHighlighted('back') ? 'rgba(251, 191, 36, 0.35)' : 'rgba(251, 191, 36, 0.08)'"
      :stroke="isHighlighted('back') ? 'var(--color-accent-gold)' : 'rgba(251, 191, 36, 0.25)'"
      stroke-width="1.5"
      class="zone-path"
      data-zone="back"
    />
    <text x="26" y="146" text-anchor="middle" class="zone-label zone-label-sm" :class="{ highlighted: isHighlighted('back') }">
      {{ labelFor('back') }}
    </text>

    <!-- Forward button (side, left, above back) -->
    <rect
      x="34" y="100" width="14" height="24" rx="4"
      :fill="isHighlighted('forward') ? 'rgba(251, 191, 36, 0.35)' : 'rgba(251, 191, 36, 0.08)'"
      :stroke="isHighlighted('forward') ? 'var(--color-accent-gold)' : 'rgba(251, 191, 36, 0.25)'"
      stroke-width="1.5"
      class="zone-path"
      data-zone="forward"
    />
    <text x="26" y="116" text-anchor="middle" class="zone-label zone-label-sm" :class="{ highlighted: isHighlighted('forward') }">
      {{ labelFor('forward') }}
    </text>
  </svg>
</template>

<style scoped>
.mouse-visual {
  user-select: none;
}

.zone-path {
  transition: fill 0.2s ease, stroke 0.2s ease, filter 0.2s ease;
  cursor: pointer;
}

.zone-path:hover {
  filter: brightness(1.4);
}

.zone-label {
  font-family: var(--font-mono);
  font-size: 7px;
  fill: var(--color-text-muted);
  transition: fill 0.2s ease;
  pointer-events: none;
}

.zone-label-sm {
  font-size: 6px;
}

.zone-label.highlighted {
  fill: var(--color-text-primary);
}
</style>

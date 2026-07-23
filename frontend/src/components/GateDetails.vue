<template>
  <span class="gate-detail">
    <span class="gd-kills">{{ gate.kills }} kill{{ gate.kills > 1 ? 's' : '' }}</span>
    <span class="gd-dest">hacia {{ gate.destination || '?' }}</span>
    <span v-if="gate.has_dictors" class="gd-badge gd-d">D</span>
    <span v-if="gate.has_hictors" class="gd-badge gd-h">H</span>
    <span v-if="gate.has_smartbombs" class="gd-badge gd-s">S</span>
  </span>
</template>

<script setup>
defineProps({
  gate: { type: Object, required: true },
})
</script>

<style scoped>
.gate-detail {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1.3;
}

.gd-kills {
  font-weight: 700;
  color: var(--ink);
  min-width: 48px;
}

.gd-dest {
  color: var(--ink-dim);
  font-style: italic;
}

.gd-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 14px;
  font-size: 9px;
  font-weight: 700;
  border-radius: 2px;
}

.gd-d { color: var(--hostile); background: rgba(209, 72, 63, 0.15); }
.gd-h { color: var(--contested); background: rgba(224, 168, 62, 0.15); }
.gd-s { color: var(--hostile); background: rgba(209, 72, 63, 0.15); }
</style>

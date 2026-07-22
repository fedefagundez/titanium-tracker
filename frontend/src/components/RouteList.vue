<template>
  <div class="route-list">
    <div class="route-header">
      <div class="route-meta">
        <span class="route-jumps display">{{ route.jump_count }} saltos</span>
        <span class="route-flag badge" :class="flagClass">{{ flagLabel }}</span>
      </div>
      <p class="route-endpoints mono">{{ route.origin.name }} → {{ route.destination.name }}</p>
    </div>

    <div class="divider" style="margin: 16px 0;"></div>

    <ol class="step-list">
      <li
        v-for="(sys, i) in route.route"
        :key="sys.id"
        class="step"
        :class="{ 'is-origin': i === 0, 'is-dest': i === route.route.length - 1 }"
      >
        <span class="step-num">{{ i }}</span>
        <span class="sec-dot" :class="sys.security_level"></span>
        <span class="step-name">{{ sys.name }}</span>
        <span v-if="i === 0" class="step-label">ORIGEN</span>
        <span v-else-if="i === route.route.length - 1" class="step-label">DESTINO</span>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FLAG_LABELS } from '../constants'

const props = defineProps({
  route: { type: Object, required: true },
})

const FLAG_CLASSES = { secure: 'allied', shortest: 'neutral', insecure: 'hostile' }

const flagLabel = computed(() => FLAG_LABELS[props.route.flag] || props.route.flag)
const flagClass = computed(() => FLAG_CLASSES[props.route.flag] || 'neutral')
</script>

<style scoped>
.route-list {
  padding: 20px;
}

.route-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.route-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.route-jumps {
  font-size: 22px;
  color: var(--ink);
}

.route-endpoints {
  font-size: 13px;
  color: var(--ink-dim);
}

.step-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 3px;
  font-size: 14px;
  font-weight: 600;
}

.step:nth-child(odd) {
  background: var(--panel-alt);
}

.step.is-origin,
.step.is-dest {
  background: rgba(58, 143, 199, 0.1);
}

.step-num {
  width: 24px;
  text-align: right;
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  color: var(--ink-dim);
}

.step-name {
  flex: 1;
  color: var(--ink);
}

.step-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--steel-blue);
}
</style>

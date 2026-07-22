<template>
  <div class="view-toggle" role="tablist">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="toggle-btn"
      :class="{ active: modelValue === opt.value }"
      role="tab"
      :aria-selected="modelValue === opt.value"
      @click="$emit('update:modelValue', opt.value)"
    >
      <svg v-if="opt.value === 'list'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
      <svg v-if="opt.value === 'map'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
      </svg>
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, required: true },
})
defineEmits(['update:modelValue'])

const options = [
  { value: 'list', label: 'Ruta' },
  { value: 'map', label: 'Mapa' },
]
</script>

<style scoped>
.view-toggle {
  display: flex;
  background: var(--panel-alt);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 2px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: transparent;
  border: none;
  border-radius: 2px;
  color: var(--ink-dim);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn:hover {
  color: var(--ink);
}

.toggle-btn.active {
  background: var(--steel-blue);
  color: var(--void);
}
</style>

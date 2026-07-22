<template>
  <div class="autocomplete" ref="root">
    <label v-if="label" class="autocomplete-label">{{ label }}</label>
    <div class="autocomplete-input-wrap">
      <input
        v-model="query"
        type="text"
        class="autocomplete-input"
        :placeholder="placeholder"
        @input="onInput"
        @focus="showDropdown = true"
        @keydown.escape="showDropdown = false"
        @keydown.down.prevent="moveSelection(1)"
        @keydown.up.prevent="moveSelection(-1)"
        @keydown.enter.prevent="selectCurrent"
      />
      <div v-if="selected" class="autocomplete-selected-tag">
        <span class="tag-name">{{ selected.name }}</span>
        <button class="tag-remove" @click="clear">&times;</button>
      </div>
    </div>
    <div v-if="showDropdown && results.length > 0" class="autocomplete-dropdown">
      <button
        v-for="(sys, i) in results"
        :key="sys.id"
        class="autocomplete-option"
        :class="{ active: i === activeIndex }"
        @mousedown.prevent="selectSystem(sys)"
      >
        <span class="sec-dot" :class="sys.security_level"></span>
        <span class="sys-name">{{ sys.name }}</span>
        <span class="sys-region">{{ sys.constellation_id ? `#${sys.id}` : '' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { searchSystems } from '../api'

const props = defineProps({
  modelValue: { type: Object, default: null },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Buscar sistema...' },
})

const emit = defineEmits(['update:modelValue'])

const query = ref(props.modelValue?.name || '')
const results = ref([])
const showDropdown = ref(false)
const activeIndex = ref(-1)
const selected = ref(props.modelValue)
const root = ref(null)

let debounceTimer = null

function onInput() {
  selected.value = null
  emit('update:modelValue', null)
  activeIndex.value = -1

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    if (query.value.length < 2) {
      results.value = []
      return
    }
    try {
      results.value = await searchSystems(query.value)
    } catch {
      results.value = []
    }
  }, 300)
}

function selectSystem(sys) {
  selected.value = sys
  query.value = sys.name
  showDropdown.value = false
  results.value = []
  emit('update:modelValue', sys)
}

function clear() {
  selected.value = null
  query.value = ''
  results.value = []
  emit('update:modelValue', null)
}

function moveSelection(dir) {
  if (!showDropdown.value) return
  activeIndex.value = Math.max(-1, Math.min(results.value.length - 1, activeIndex.value + dir))
}

function selectCurrent() {
  if (activeIndex.value >= 0 && activeIndex.value < results.value.length) {
    selectSystem(results.value[activeIndex.value])
  }
}

function handleClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) {
    showDropdown.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<style scoped>
.autocomplete {
  position: relative;
}

.autocomplete-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-dim);
  margin-bottom: 6px;
}

.autocomplete-input-wrap {
  position: relative;
}

.autocomplete-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--panel-alt);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink);
  font-size: 15px;
  font-weight: 600;
}

.autocomplete-input:focus {
  outline: none;
  border-color: var(--steel-blue);
}

.autocomplete-input::placeholder {
  color: var(--ink-dim);
  font-weight: 500;
}

.autocomplete-selected-tag {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(58, 143, 199, 0.15);
  border: 1px solid rgba(58, 143, 199, 0.3);
  border-radius: 3px;
  padding: 3px 8px;
  pointer-events: auto;
}

.tag-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--steel-bright);
}

.tag-remove {
  background: none;
  border: none;
  color: var(--ink-dim);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.tag-remove:hover {
  color: var(--hostile);
}

.autocomplete-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 20;
  margin-top: 4px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
  box-shadow: 0 14px 26px rgba(0, 0, 0, 0.5);
  max-height: 220px;
  overflow-y: auto;
}

.autocomplete-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  color: var(--ink);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.autocomplete-option:hover,
.autocomplete-option.active {
  background: rgba(95, 201, 255, 0.1);
  color: var(--steel-bright);
}

.sys-name {
  flex: 1;
}

.sys-region {
  font-size: 12px;
  color: var(--ink-dim);
  font-family: 'Space Mono', monospace;
}
</style>

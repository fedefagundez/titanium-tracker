<template>
  <div class="route-planner">
    <div class="planner-form">
      <div class="form-row">
        <SystemAutocomplete v-model="origin" label="Origen" placeholder="Ej: Jita" />
      </div>

      <div class="form-row">
        <SystemAutocomplete v-model="destination" label="Destino" placeholder="Ej: Amarr" />
      </div>

      <div class="form-row">
        <SystemAutocomplete v-model="avoidInput" label="Sistemas a evitar" placeholder="Agregar sistema..." />
        <button v-if="avoidInput" class="btn btn-sm btn-secondary avoid-add" @click="addAvoid">+ Agregar</button>
      </div>

      <div v-if="avoidList.length > 0" class="avoid-tags">
        <span v-for="(sys, i) in avoidList" :key="sys.id" class="avoid-tag">
          {{ sys.name }}
          <button class="tag-x" @click="removeAvoid(i)">&times;</button>
        </span>
      </div>

      <div class="form-row">
        <label class="field-label">Tipo de ruta</label>
        <div class="flag-selector">
          <button
            v-for="opt in FLAG_OPTIONS"
            :key="opt.value"
            class="flag-btn"
            :class="{ active: flag === opt.value }"
            @click="flag = opt.value"
          >
            <span class="flag-icon">{{ opt.icon }}</span>
            {{ opt.label }}
          </button>
        </div>
      </div>

      <details class="advanced-settings">
        <summary class="advanced-toggle">Configuración avanzada</summary>
        <div class="advanced-fields">
          <div class="form-row-inline">
            <label class="field-label">Velocidad de warp (AU/s)</label>
            <input
              v-model.number="customWarpSpeed"
              type="number"
              class="field-input"
              placeholder="5.0"
              min="1"
              max="8"
              step="0.5"
            />
          </div>
          <div class="form-row-inline">
            <label class="field-label">Tiempo de alineación (s)</label>
            <input
              v-model.number="customAlignTime"
              type="number"
              class="field-input"
              placeholder="5"
              min="1"
              max="30"
              step="1"
            />
          </div>
        </div>
      </details>

      <button
        class="btn btn-primary btn-block"
        :disabled="!canSubmit || loading"
        @click="calculate"
      >
        {{ loading ? 'Calculando...' : 'Calcular ruta' }}
      </button>
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import SystemAutocomplete from './SystemAutocomplete.vue'
import { calculateRoute, getCharacterShip } from '../api'
import { FLAG_OPTIONS, DEFAULT_WARP_SPEED, DEFAULT_ALIGN_TIME } from '../constants'

const emit = defineEmits(['route-calculated'])

const origin = ref(null)
const destination = ref(null)
const avoidInput = ref(null)
const avoidList = ref([])
const flag = ref('safe')
const loading = ref(false)
const error = ref('')
const customWarpSpeed = ref(null)
const customAlignTime = ref(null)

const canSubmit = computed(() => origin.value && destination.value && !loading.value)

function addAvoid() {
  if (avoidInput.value && !avoidList.value.find((s) => s.id === avoidInput.value.id)) {
    avoidList.value.push(avoidInput.value)
  }
  avoidInput.value = null
}

function removeAvoid(i) {
  avoidList.value.splice(i, 1)
}

async function calculate() {
  loading.value = true
  error.value = ''

  try {
    let shipTypeId = null
    try {
      const ship = await getCharacterShip()
      shipTypeId = ship.ship_type_id
    } catch {}

    const result = await calculateRoute({
      origin_id: origin.value.id,
      destination_id: destination.value.id,
      flag: flag.value,
      avoid_ids: avoidList.value.map((s) => s.id),
      ship_type_id: shipTypeId,
      warp_speed: customWarpSpeed.value || null,
      align_time: customAlignTime.value || null,
    })
    emit('route-calculated', result)
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.planner-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.flag-selector {
  display: flex;
  gap: 8px;
}

.flag-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  background: var(--panel-alt);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink-dim);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: all 0.15s;
}

.flag-btn:hover {
  border-color: var(--steel-blue);
  color: var(--ink);
}

.flag-btn.active {
  background: rgba(58, 143, 199, 0.15);
  border-color: var(--steel-blue);
  color: var(--steel-bright);
}

.flag-icon {
  font-size: 16px;
}

.avoid-add {
  align-self: flex-start;
  margin-top: 4px;
}

.avoid-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.avoid-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(209, 72, 63, 0.12);
  border: 1px solid rgba(209, 72, 63, 0.3);
  border-radius: 3px;
  font-size: 12px;
  font-weight: 700;
  color: var(--hostile);
}

.tag-x {
  background: none;
  border: none;
  color: var(--hostile);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.error-msg {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(209, 72, 63, 0.1);
  border: 1px solid rgba(209, 72, 63, 0.3);
  border-radius: 4px;
  color: var(--hostile);
  font-size: 14px;
  font-weight: 600;
}

.advanced-settings {
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
}

.advanced-toggle {
  padding: 10px 14px;
  background: var(--panel-alt);
  color: var(--ink-dim);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  user-select: none;
}

.advanced-toggle:hover {
  color: var(--ink);
}

.advanced-fields {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--panel);
}

.form-row-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field-input {
  width: 80px;
  padding: 6px 10px;
  background: var(--panel-alt);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink);
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  text-align: right;
}

.field-input:focus {
  outline: none;
  border-color: var(--steel-blue);
}

.field-input::placeholder {
  color: var(--ink-dim);
  opacity: 0.5;
}
</style>

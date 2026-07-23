<template>
  <div class="threat-panel">
    <div class="threat-header">
      <div class="threat-meta">
        <span class="threat-jumps display">{{ route.jump_count }} saltos</span>
        <span class="threat-flag badge" :class="flagClass">{{ flagLabel }}</span>
        <span v-if="route.estimated_time_seconds" class="threat-time">
          ~{{ formatTime(route.estimated_time_seconds) }}
        </span>
        <span v-if="currentShip" class="threat-ship">
          <img v-if="currentShip.ship_type_id" :src="'https://images.evetech.net/types/' + currentShip.ship_type_id + '/icon?size=32'" class="ship-icon" :alt="currentShip.ship_type_name" />
          {{ currentShip.ship_type_name || currentShip.ship_name }}
        </span>
        <span v-if="loadingThreats" class="threats-loading">
          <span class="loading-dot"></span> Analizando amenazas...
        </span>
      </div>
      <p class="threat-endpoints mono">{{ route.origin.name }} → {{ route.destination.name }}</p>
    </div>

    <div class="progress-section" v-if="currentSystemIndex >= 0">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="progress-info">
        <span class="progress-text">{{ currentSystemIndex }}/{{ route.route.length - 1 }} sistemas</span>
        <span class="progress-percent">{{ progressPercent }}%</span>
        <span v-if="estimatedMinutes > 0" class="progress-time">~{{ estimatedMinutes }} min restantes</span>
      </div>
    </div>

    <div class="divider" style="margin: 16px 0;"></div>

    <table class="threat-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-region">Región</th>
          <th class="col-system">Sistema / Sec</th>
          <th class="col-pos">Pos</th>
          <th class="col-kills">Kills (1h)</th>
          <th class="col-info">Info</th>
          <th class="col-score">Riesgo</th>
          <th class="col-links">Links</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(sys, i) in route.route"
          :key="sys.id"
          :class="rowClass(sys, i)"
        >
          <td class="cell-num">{{ i }}</td>
          <td class="cell-region">{{ sys.region_name }}</td>
          <td class="cell-system">
            <span class="sec-dot" :class="sys.security_level"></span>
            <span class="sys-name">{{ sys.name }}</span>
            <span class="sys-sec mono">{{ sys.security_status.toFixed(1) }}</span>
          </td>
          <td class="cell-pos">
            <span v-if="currentSystemId === sys.id" class="pos-indicator">
              <span class="pos-dot"></span>
            </span>
            <span v-else-if="i < currentSystemIndex" class="pos-visited">✓</span>
          </td>
          <td class="cell-kills">
            <span v-if="!loadingThreats && threats[sys.id]" class="kills-count" :class="'threat-' + (threats[sys.id]?.threat_level || 'safe')">
              {{ threats[sys.id]?.threat_level === 'safe' ? '-' : threats[sys.id]?.kill_count }}
            </span>
            <span v-else-if="loadingThreats" class="kills-loading">...</span>
          </td>
          <td class="cell-info">
            <span v-if="!loadingThreats && threats[sys.id] && threats[sys.id].threat_level === 'safe'" class="info-text threat-safe">Sin actividad en puertas</span>
            <div v-else-if="!loadingThreats && threats[sys.id] && threats[sys.id].gate_details && threats[sys.id].gate_details.length" class="gate-list">
              <div v-for="(g, gi) in threats[sys.id].gate_details" :key="gi" class="gate-item">
                <span class="gate-kills-count">{{ g.kills }} kill{{ g.kills > 1 ? 's' : '' }}</span>
                <span class="gate-destination">hacia {{ g.destination || '?' }}</span>
                <span v-if="g.has_dictors" class="gate-badge badge-d">D</span>
                <span v-if="g.has_hictors" class="gate-badge badge-h">H</span>
                <span v-if="g.has_smartbombs" class="gate-badge badge-s">S</span>
              </div>
            </div>
            <span v-else-if="!loadingThreats && threats[sys.id]" class="info-text" :class="'threat-' + (threats[sys.id]?.threat_level || 'safe')">
              {{ infoText(threats[sys.id]) }}
            </span>
          </td>
          <td class="cell-score">
            <span v-if="!loadingThreats && threats[sys.id]" class="score-badge" :class="'score-' + (threats[sys.id]?.threat_level || 'safe')">
              {{ riskScore(threats[sys.id]) }}
            </span>
          </td>
          <td class="cell-links">
            <a :href="'https://zkillboard.com/system/' + sys.id + '/'" target="_blank" rel="noopener" class="link-zkb">zKb</a>
            <span class="link-sep">·</span>
            <a :href="'https://evemaps.dotlan.net/system/' + sys.name" target="_blank" rel="noopener" class="link-dotlan">Dotlan</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { FLAG_LABELS } from '../constants'
import { getThreats, getCharacterLocation, getCharacterShip } from '../api'
import { formatTime } from '../data/warp'

const props = defineProps({
  route: { type: Object, required: true },
})

const FLAG_CLASSES = { secure: 'allied', shortest: 'neutral', insecure: 'hostile' }
const JUMP_TIME_MINUTES = 5

const threats = ref({})
const loadingThreats = ref(false)
const currentSystemId = ref(null)
const currentShip = ref(null)
let locationInterval = null

const flagLabel = computed(() => FLAG_LABELS[props.route.flag] || props.route.flag)
const flagClass = computed(() => FLAG_CLASSES[props.route.flag] || 'neutral')

const currentSystemIndex = computed(() => {
  if (!currentSystemId.value) return -1
  return props.route.route.findIndex((s) => s.id === currentSystemId.value)
})

const progressPercent = computed(() => {
  if (currentSystemIndex.value < 0) return 0
  return Math.round((currentSystemIndex.value / (props.route.route.length - 1)) * 100)
})

const estimatedMinutes = computed(() => {
  if (currentSystemIndex.value < 0 || !props.route.estimated_time_seconds) return 0
  const totalSeconds = props.route.estimated_time_seconds
  const remaining = props.route.route.length - 1 - currentSystemIndex.value
  const total = props.route.route.length - 1
  return Math.ceil((remaining / total) * totalSeconds / 60)
})

function riskScore(threat) {
  if (!threat) return '-'
  if (threat.threat_level === 'safe') return '0'
  if (threat.threat_level === 'warning') return '50'
  return '100'
}

function infoText(threat) {
  if (!threat) return ''
  if (threat.threat_level === 'safe') return 'Sin actividad en puertas'
  const parts = []
  if (threat.kill_count > 0) {
    parts.push(`${threat.kill_count} kill${threat.kill_count > 1 ? 's' : ''} en puertas`)
  }
  if (threat.has_dictors) parts.push('Dictors')
  if (threat.has_hictors) parts.push('Hictors')
  if (threat.has_smartbombs) parts.push('Smartbombs')
  return parts.join(' · ')
}

function rowClass(sys, i) {
  const t = threats.value[sys.id]
  const classes = {}
  if (currentSystemId.value === sys.id) classes['row-current'] = true
  else if (i < currentSystemIndex.value) classes['row-visited'] = true
  if (t && !loadingThreats.value) {
    classes['row-' + t.threat_level] = true
  }
  return classes
}

async function fetchThreats() {
  if (!props.route?.route) return
  loadingThreats.value = true
  threats.value = {}
  try {
    const ids = props.route.route.map((s) => s.id)
    threats.value = await getThreats(ids)
  } catch {
    threats.value = {}
  } finally {
    loadingThreats.value = false
  }
}

async function fetchLocation() {
  try {
    const data = await getCharacterLocation()
    currentSystemId.value = data.solar_system_id
  } catch (err) {
    console.warn('[RouteList] No se pudo obtener ubicación:', err.message)
    currentSystemId.value = null
  }
}

async function fetchShip() {
  try {
    const data = await getCharacterShip()
    currentShip.value = data
  } catch (err) {
    console.warn('[RouteList] No se pudo obtener nave:', err.message)
    currentShip.value = null
  }
}

onMounted(() => {
  fetchThreats()
  fetchLocation()
  fetchShip()
  locationInterval = setInterval(fetchLocation, 30000)
})

onUnmounted(() => {
  if (locationInterval) clearInterval(locationInterval)
})

watch(() => props.route, fetchThreats)
</script>

<style scoped>
.threat-panel {
  padding: 20px;
}

.threat-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.threat-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.threat-jumps {
  font-size: 22px;
  color: var(--ink);
}

.threat-time {
  font-family: 'Space Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--steel-bright);
  padding: 4px 10px;
  background: rgba(95, 201, 255, 0.1);
  border: 1px solid rgba(95, 201, 255, 0.3);
  border-radius: 4px;
}

.threat-ship {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-dim);
  padding: 4px 10px;
  background: var(--panel-alt);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.ship-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.threats-loading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--steel-bright);
  font-weight: 600;
}

.loading-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--steel-bright);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.threat-endpoints {
  font-size: 13px;
  color: var(--ink-dim);
}

/* Progress */
.progress-section {
  margin-top: 16px;
}

.progress-bar {
  height: 6px;
  background: var(--line-dim);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--steel-blue);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
}

.progress-text {
  color: var(--ink-dim);
  font-weight: 600;
}

.progress-percent {
  color: var(--steel-bright);
  font-family: 'Space Mono', monospace;
  font-weight: 700;
}

.progress-time {
  color: var(--ink-dim);
  font-weight: 600;
}

/* Table */
.threat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.threat-table thead tr {
  border-bottom: 1px solid var(--line);
}

.threat-table tbody tr {
  border-bottom: 1px solid var(--line-dim);
}

.threat-table th {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-dim);
  text-align: left;
  padding: 10px 10px;
  white-space: nowrap;
}

.threat-table td {
  padding: 10px 10px;
}

.cell-system {
  white-space: nowrap;
  vertical-align: middle;
}

.cell-region {
  white-space: nowrap;
  vertical-align: middle;
}

.cell-pos {
  white-space: nowrap;
  text-align: center;
  vertical-align: middle;
}

.cell-kills {
  white-space: nowrap;
  text-align: center;
  vertical-align: middle;
}

.cell-info {
  vertical-align: middle;
}

.cell-score {
  white-space: nowrap;
  text-align: center;
  vertical-align: middle;
}

.cell-links {
  white-space: nowrap;
  vertical-align: middle;
}

.col-num { width: 28px; }
.col-region { width: 90px; }
.col-system { min-width: 120px; }
.col-pos { width: 30px; text-align: center; }
.col-kills { width: 55px; text-align: center; }
.col-info { width: 260px; }
.col-score { width: 45px; text-align: center; }
.col-links { width: 70px; }

/* Row states */
.row-safe { background: transparent; }

.row-warning {
  background: rgba(224, 168, 62, 0.08);
}

.row-danger {
  background: rgba(209, 72, 63, 0.08);
}

.row-warning td:first-child,
.row-danger td:first-child {
  border-left: 3px solid;
  background: transparent;
}

.row-warning td:first-child { border-left-color: var(--contested); }
.row-danger td:first-child { border-left-color: var(--hostile); }

.row-current td {
  background: rgba(58, 143, 199, 0.1) !important;
  border-left: 3px solid var(--steel-blue) !important;
}

.row-visited td {
  opacity: 0.5;
}

/* Cell styles */
.cell-num {
  font-family: 'Space Mono', monospace;
  font-size: 12px;
  color: var(--ink-dim);
}

.cell-region {
  font-size: 13px;
  color: var(--ink-dim);
}

.cell-system {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sys-name {
  font-weight: 700;
  color: var(--ink);
}

.sys-sec {
  font-size: 12px;
  color: var(--ink-dim);
}

/* Position */
.cell-pos {
  text-align: center;
}

.pos-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pos-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--steel-bright);
  animation: posPulse 1.5s ease-in-out infinite;
}

@keyframes posPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
}

.pos-visited {
  color: var(--online);
  font-size: 12px;
  font-weight: 700;
}

/* Kills */
.cell-kills { text-align: center; }

.kills-count {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 700;
}

.kills-count.threat-safe { color: var(--ink-dim); }
.kills-count.threat-warning { color: var(--contested); }
.kills-count.threat-danger { color: var(--hostile); }

.kills-loading { color: var(--ink-dim); font-size: 12px; }

.info-text {
  font-size: 13px;
  font-weight: 600;
}

.info-text.threat-safe { color: var(--online); }
.info-text.threat-warning { color: var(--contested); }
.info-text.threat-danger { color: var(--hostile); }

/* Score */
.cell-score { text-align: center; }

.score-badge {
  display: inline-block;
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
}

.score-badge.score-safe {
  color: var(--online);
  background: rgba(61, 220, 151, 0.12);
}

.score-badge.score-warning {
  color: var(--contested);
  background: rgba(224, 168, 62, 0.15);
}

.score-badge.score-danger {
  color: var(--hostile);
  background: rgba(209, 72, 63, 0.15);
}

/* Links */
.cell-links { white-space: nowrap; }

.link-zkb,
.link-dotlan {
  font-size: 12px;
  font-weight: 700;
  color: var(--steel-bright);
  text-decoration: none;
}

.link-zkb:hover,
.link-dotlan:hover { text-decoration: underline; }

.link-sep {
  color: var(--ink-dim);
  margin: 0 4px;
}

/* Gate details */
.gate-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gate-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1.3;
}

.gate-kills-count {
  font-weight: 700;
  color: var(--ink);
  min-width: 48px;
}

.gate-destination {
  color: var(--ink-dim);
  font-style: italic;
}

.gate-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 14px;
  font-size: 9px;
  font-weight: 700;
  border-radius: 2px;
}

.badge-d {
  color: var(--hostile);
  background: rgba(209, 72, 63, 0.15);
}

.badge-h {
  color: var(--contested);
  background: rgba(224, 168, 62, 0.15);
}

.badge-s {
  color: var(--hostile);
  background: rgba(209, 72, 63, 0.15);
}
</style>

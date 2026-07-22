<template>
  <div class="threat-panel">
    <div class="threat-header">
      <div class="threat-meta">
        <span class="threat-jumps display">{{ route.jump_count }} saltos</span>
        <span class="threat-flag badge" :class="flagClass">{{ flagLabel }}</span>
        <span v-if="loadingThreats" class="threats-loading">
          <span class="loading-dot"></span> Analizando amenazas...
        </span>
      </div>
      <p class="threat-endpoints mono">{{ route.origin.name }} → {{ route.destination.name }}</p>
    </div>

    <div class="divider" style="margin: 16px 0;"></div>

    <table class="threat-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-region">Región</th>
          <th class="col-system">Sistema / Sec</th>
          <th class="col-kills">Kills (1h)</th>
          <th class="col-info">Info</th>
          <th class="col-links">Links</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(sys, i) in route.route"
          :key="sys.id"
          :class="rowClass(sys)"
        >
          <td class="cell-num">{{ i }}</td>
          <td class="cell-region">{{ sys.region_name }}</td>
          <td class="cell-system">
            <span class="sec-dot" :class="sys.security_level"></span>
            <span class="sys-name">{{ sys.name }}</span>
            <span class="sys-sec mono">{{ formatSec(sys.security_status) }}</span>
          </td>
          <td class="cell-kills">
            <span v-if="!loadingThreats && threats[sys.id]" class="kills-count" :class="'threat-' + (threats[sys.id]?.threat_level || 'safe')">
              {{ threats[sys.id]?.threat_level === 'safe' ? '-' : threats[sys.id]?.kill_count }}
            </span>
            <span v-else-if="loadingThreats" class="kills-loading">...</span>
          </td>
          <td class="cell-info">
            <span v-if="!loadingThreats && threats[sys.id]" class="info-text" :class="'threat-' + (threats[sys.id]?.threat_level || 'safe')">
              {{ infoText(threats[sys.id]) }}
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
import { ref, computed, onMounted, watch } from 'vue'
import { FLAG_LABELS } from '../constants'
import { getThreats } from '../api'

const props = defineProps({
  route: { type: Object, required: true },
})

const FLAG_CLASSES = { secure: 'allied', shortest: 'neutral', insecure: 'hostile' }

const threats = ref({})
const loadingThreats = ref(false)

const flagLabel = computed(() => FLAG_LABELS[props.route.flag] || props.route.flag)
const flagClass = computed(() => FLAG_CLASSES[props.route.flag] || 'neutral')

function formatSec(val) {
  return val.toFixed(1)
}

function infoText(threat) {
  if (!threat) return ''
  const parts = []
  if (threat.threat_level === 'safe') {
    return 'Sin actividad en puertas'
  }
  if (threat.kill_count > 0) {
    parts.push(`${threat.kill_count} kill${threat.kill_count > 1 ? 's' : ''} en puertas`)
  }
  if (threat.has_dictors) parts.push('Dictors')
  if (threat.has_hictors) parts.push('Hictors')
  if (threat.has_smartbombs) parts.push('Smartbombs')
  return parts.join(' · ')
}

function rowClass(sys) {
  const t = threats.value[sys.id]
  if (!t || loadingThreats.value) return {}
  return { ['row-' + t.threat_level]: true }
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

onMounted(fetchThreats)
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

/* Table */
.threat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.threat-table th {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-dim);
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  white-space: nowrap;
}

.threat-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line-dim);
  vertical-align: middle;
}

.col-num { width: 36px; }
.col-region { width: 130px; }
.col-kills { width: 70px; text-align: center; }
.col-info { min-width: 180px; }
.col-links { width: 110px; }

/* Row states */
.row-safe td {
  background: transparent;
}

.row-warning td {
  background: rgba(224, 168, 62, 0.06);
}

.row-danger td {
  background: rgba(209, 72, 63, 0.06);
}

.row-warning td:first-child,
.row-danger td:first-child {
  border-left: 3px solid;
}

.row-warning td:first-child {
  border-left-color: var(--contested);
}

.row-danger td:first-child {
  border-left-color: var(--hostile);
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

.cell-kills {
  text-align: center;
}

.kills-count {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  font-weight: 700;
}

.kills-count.threat-safe {
  color: var(--ink-dim);
}

.kills-count.threat-warning {
  color: var(--contested);
}

.kills-count.threat-danger {
  color: var(--hostile);
}

.kills-loading {
  color: var(--ink-dim);
  font-size: 12px;
}

.info-text {
  font-size: 13px;
  font-weight: 600;
}

.info-text.threat-safe {
  color: var(--online);
}

.info-text.threat-warning {
  color: var(--contested);
}

.info-text.threat-danger {
  color: var(--hostile);
}

/* Links */
.cell-links {
  white-space: nowrap;
}

.link-zkb,
.link-dotlan {
  font-size: 12px;
  font-weight: 700;
  color: var(--steel-bright);
  text-decoration: none;
}

.link-zkb:hover,
.link-dotlan:hover {
  text-decoration: underline;
}

.link-sep {
  color: var(--ink-dim);
  margin: 0 4px;
}
</style>

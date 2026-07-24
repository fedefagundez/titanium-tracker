<template>
  <div class="map-root" ref="root">
    <div class="pilot-info" :class="{ 'pilot-off-route': currentSystemId && !pilotOnRoute }">
      <span class="pilot-dot"></span>
      <span v-if="pilotOnRoute">{{ currentSystemName }}</span>
      <span v-else-if="currentSystemId">{{ currentSystemName }} — fuera de ruta</span>
      <span v-else>Ubicando piloto...</span>
    </div>

    <svg class="map-svg" :viewBox="viewBox" ref="mapSvg">
      <g :transform="mapTransform">
        <line v-for="(seg, i) in segments" :key="i"
          :x1="seg.x1" :y1="seg.y1" :x2="seg.x2" :y2="seg.y2"
          stroke="#3a8fc7" stroke-width="2" stroke-opacity="0.8"
          vector-effect="non-scaling-stroke"/>

        <circle v-for="n in nodes" :key="n.id"
          :cx="n.x" :cy="n.y" :r="nodeRadius(n.ep)"
          :fill="n.color" :stroke="hover===n.id?'#fff':'#2a3a42'" :stroke-width="hover===n.id?2:1"
          vector-effect="non-scaling-stroke"
          style="cursor:pointer"
          @mouseenter="enterNode($event, n)" @mouseleave="leaveNode()"/>

        <g v-for="n in threatNodes" :key="'tri'+n.id"
          :transform="`translate(${n.x},${n.y}) scale(${invZoom})`">
          <polygon
            points="0,-22 -6,-12 6,-12"
            :fill="n.threat_level==='danger'?'#d1483f':'#e0a83e'"
            class="threat-triangle"/>
        </g>

        <g v-if="pilotNode"
          :transform="`translate(${pilotNode.x},${pilotNode.y}) scale(${invZoom})`">
          <circle r="14" fill="none" stroke="#5fc9ff" stroke-width="2" stroke-opacity="0.6"
            class="pulse-ring"/>
        </g>
      </g>
    </svg>

    <div v-if="tipData" class="tip" :style="tipStyle">
      <div class="tip-header">
        <span class="sec-dot" :class="tipData.level"></span>
        <b>{{tipData.name}}</b> <span class="tip-sec">{{tipData.sec}}</span>
      </div>
      <div class="tip-region">{{tipData.region}}</div>
      <div v-if="tipData.threat_raw != null && tipData.threat_raw > 0" class="tip-kills" :class="'tl-' + (tipData.threat_level || 'safe')">
        <span class="tip-kills-num">{{ tipData.threat_raw }}</span>
        <span class="tip-kills-label">kills en puertas (1h)</span>
      </div>
      <div v-if="tipData.gate_details && tipData.gate_details.length" class="tip-gates">
        <div v-for="(g, i) in tipData.gate_details" :key="i" class="tip-gate">
          <GateDetails :gate="g" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { THREAT_COLORS, SECURITY_COLORS } from '../constants'
import { usePilotLocation } from '../composables/usePilotLocation'
import { useThreats } from '../composables/useThreats'
import GateDetails from './GateDetails.vue'

const props = defineProps({ route: Object })

const root = ref(null)
const mapSvg = ref(null)
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
const dragStart = ref({x:0,y:0,px:0,py:0})
const hover = ref(null)
const tipData = ref(null)
const tipStyle = ref({})

const routeRef = computed(() => props.route)
const { threats } = useThreats(routeRef)
const { currentSystemId, currentSystemName } = usePilotLocation(routeRef)

const nodes = computed(() => {
  if (!props.route?.route) return []
  const r = props.route.route
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  for (const s of r) { if (s.x < x0) x0 = s.x; if (s.x > x1) x1 = s.x; if (s.z < z0) z0 = s.z; if (s.z > z1) z1 = s.z }
  const sc = 500 / Math.max(x1 - x0 || 1, z1 - z0 || 1)
  return r.map((s, i) => {
    const t = threats.value?.[s.id]
    let c = SECURITY_COLORS[s.security_level] || SECURITY_COLORS.unknown
    if (t) c = THREAT_COLORS[t.threat_level] || c
    if (i === 0 || i === r.length - 1) c = '#5fc9ff'
    return {
      id: s.id, name: s.name, x: (s.x - x0) * sc, y: (s.z - z0) * sc,
      sec: s.security_status?.toFixed(1) || '?', level: s.security_level || 'unknown',
      region: s.region_name || '',
      threat_raw: t ? t.kill_count : null,
      threat_level: t ? t.threat_level : null,
      gate_details: t && t.gate_details ? t.gate_details : [],
      color: c, ep: i === 0 || i === r.length - 1,
    }
  })
})

const segments = computed(() => {
  const s = []
  for (let i = 0; i < nodes.value.length - 1; i++)
    s.push({ x1: nodes.value[i].x, y1: nodes.value[i].y, x2: nodes.value[i + 1].x, y2: nodes.value[i + 1].y })
  return s
})

const threatNodes = computed(() => {
  return nodes.value.filter(n => n.threat_level === 'warning' || n.threat_level === 'danger')
})

const viewBox = computed(() => {
  if (!nodes.value.length) return '0 0 100 100'
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const n of nodes.value) { if (n.x < x0) x0 = n.x; if (n.x > x1) x1 = n.x; if (n.y < y0) y0 = n.y; if (n.y > y1) y1 = n.y }
  return `${x0 - 80} ${y0 - 80} ${x1 - x0 + 160} ${y1 - y0 + 160}`
})

const mapTransform = computed(() => `translate(${panX.value},${panY.value}) scale(${zoom.value})`)

const invZoom = computed(() => 1 / zoom.value)

function nodeRadius(ep) {
  const base = ep ? 8 : 5
  return base / Math.sqrt(zoom.value)
}

const pilotNode = computed(() => {
  if (!currentSystemId.value) return null
  return nodes.value.find(n => n.id === currentSystemId.value) || null
})

const pilotOnRoute = computed(() => {
  if (!currentSystemId.value || !props.route?.route) return false
  return props.route.route.some(s => s.id === currentSystemId.value)
})

function enterNode(e, n) {
  hover.value = n.id
  tipData.value = n
  const r = root.value.getBoundingClientRect()
  tipStyle.value = { left: (e.clientX - r.left + 16) + 'px', top: (e.clientY - r.top - 10) + 'px' }
}

function leaveNode() {
  hover.value = null
  tipData.value = null
}

let zoomAnim = null

function animateZoom(targetZoom, targetPanX, targetPanY) {
  if (zoomAnim) cancelAnimationFrame(zoomAnim)
  const startZoom = zoom.value
  const startX = panX.value
  const startY = panY.value
  const startTime = performance.now()
  const duration = 50

  function step(now) {
    const t = Math.min((now - startTime) / duration, 1)
    zoom.value = startZoom + (targetZoom - startZoom) * t
    panX.value = startX + (targetPanX - startX) * t
    panY.value = startY + (targetPanY - startY) * t
    if (t < 1) zoomAnim = requestAnimationFrame(step)
  }
  zoomAnim = requestAnimationFrame(step)
}

onMounted(() => {
  const el = mapSvg.value

  el.addEventListener('mousedown', e => {
    if (e.button !== 0) return
    dragging.value = true
    dragStart.value = { x: e.clientX, y: e.clientY, px: panX.value, py: panY.value }
    e.preventDefault()
  })

  window.addEventListener('mousemove', e => {
    if (!dragging.value) return
    panX.value = dragStart.value.px + (e.clientX - dragStart.value.x)
    panY.value = dragStart.value.py + (e.clientY - dragStart.value.y)
  })

  window.addEventListener('mouseup', () => { dragging.value = false })

  el.addEventListener('wheel', e => {
    e.preventDefault()
    const d = e.deltaY > 0 ? 0.9 : 1.1
    const nz = Math.max(0.1, Math.min(10, zoom.value * d))
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top
    const npx = mx - (mx - panX.value) * (nz / zoom.value)
    const npy = my - (my - panY.value) * (nz / zoom.value)
    animateZoom(nz, npx, npy)
  }, { passive: false })
})
</script>

<style scoped>
.map-root {
  width: 100%;
  height: 100%;
  min-height: 300px;
  background: #070a0c;
  position: relative;
  overflow: hidden;
}

.map-svg {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%;
  height: 100%;
  cursor: grab;
}

.map-svg:active {
  cursor: grabbing;
}

.pilot-info {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #0e1417;
  border: 1px solid #2a3a42;
  border-left: 3px solid #5fc9ff;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #dbe6ea;
}

.pilot-info.pilot-off-route {
  border-left-color: #e0a83e;
  color: #e0a83e;
}

.pilot-dot {
  width: 8px;
  height: 8px;
  background: #5fc9ff;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.pilot-off-route .pilot-dot {
  background: #e0a83e;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

.pulse-ring {
  animation: ring-pulse 2s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% { stroke-opacity: 0.6; r: 14; }
  50% { stroke-opacity: 0.2; r: 18; }
}

.threat-triangle {
  filter: drop-shadow(0 0 4px currentColor);
  animation: tri-pulse 1.2s ease-in-out infinite;
}

@keyframes tri-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.tip {
  position: absolute;
  background: #0e1417;
  border: 1px solid #2a3a42;
  border-top: 2px solid #3a8fc7;
  padding: 10px 14px;
  font-size: 13px;
  pointer-events: none;
  z-index: 50;
  min-width: 160px;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
}

.tip-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tip-sec {
  font-size: 12px;
  color: #8ea0a8;
  font-family: 'Space Mono', monospace;
}

.tip-region {
  font-size: 12px;
  color: #8ea0a8;
  margin-top: 2px;
}

.tip-kills {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 4px;
}

.tip-kills.tl-safe { background: rgba(61, 220, 151, 0.1); }
.tip-kills.tl-warning { background: rgba(224, 168, 62, 0.12); }
.tip-kills.tl-danger { background: rgba(209, 72, 63, 0.12); }

.tip-kills-num {
  font-size: 20px;
  font-weight: 700;
  font-family: 'Space Mono', monospace;
}

.tl-safe .tip-kills-num { color: #3ddc97; }
.tl-warning .tip-kills-num { color: #e0a83e; }
.tl-danger .tip-kills-num { color: #d1483f; }

.tip-kills-label {
  font-size: 11px;
  color: #8ea0a8;
}

.tip-gates {
  margin-top: 6px;
}

.tip-gate {
  padding: 3px 0;
  border-bottom: 1px solid #1a2a32;
}

.tip-gate:last-child {
  border-bottom: none;
}
</style>

<template>
  <div class="main-content">
    <div class="main-toolbar">
      <ViewToggle v-model="view" />
      <span v-if="route" class="toolbar-route mono">
        <span class="route-from">{{ route.origin.name }}</span>
        <span class="route-arrow">→</span>
        <span class="route-to">{{ route.destination.name }}</span>
        <span class="route-jumps">{{ route.jump_count }} saltos</span>
      </span>
    </div>
    <div class="main-viewport">
      <RouteList v-if="view === 'list' && route" :route="route" />
      <RouteMap v-if="view === 'map'" :route="route" />
      <div v-if="!route" class="empty-state">
        <p class="display empty-title">Sin ruta calculada</p>
        <p class="empty-desc">Completá el panel de planificación y hacé clic en "Calcular ruta" para ver el resultado aquí.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import ViewToggle from './ViewToggle.vue'
import RouteList from './RouteList.vue'
import RouteMap from './RouteMap.vue'

const props = defineProps({
  modelRoute: { type: Object, default: null },
})

const route = computed(() => props.modelRoute)
const view = ref('list')
</script>

<style scoped>
.main-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--void);
}

.main-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid var(--line-dim);
  background: var(--panel);
  flex-shrink: 0;
}

.toolbar-route {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.route-from {
  color: var(--steel-bright);
  font-weight: 700;
}

.route-arrow {
  color: var(--ink-dim);
}

.route-to {
  color: var(--steel-bright);
  font-weight: 700;
}

.route-jumps {
  color: var(--ink-dim);
  margin-left: 4px;
}

.main-viewport {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  text-align: center;
  gap: 8px;
}

.empty-title {
  font-size: 18px;
  color: var(--ink-dim);
}

.empty-desc {
  font-size: 14px;
  color: var(--ink-dim);
  max-width: 320px;
  line-height: 1.5;
}
</style>

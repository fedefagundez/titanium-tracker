<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <h2 v-if="!collapsed" class="display sidebar-title">Planificar Ruta</h2>
      <button class="sidebar-toggle" @click="$emit('update:collapsed', !collapsed)" :title="collapsed ? 'Expandir' : 'Colapsar'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline v-if="collapsed" points="9 18 15 12 9 6" />
          <polyline v-else points="15 18 9 12 15 6" />
        </svg>
      </button>
    </div>
    <div class="sidebar-content" v-show="!collapsed">
      <RoutePlanner @route-calculated="$emit('route-calculated', $event)" />
    </div>
  </aside>
</template>

<script setup>
import RoutePlanner from './RoutePlanner.vue'

defineProps({
  collapsed: { type: Boolean, default: false },
})

defineEmits(['update:collapsed', 'route-calculated'])
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--line);
  background: var(--panel);
  overflow: hidden;
  transition: width 0.25s ease;
}

.sidebar.collapsed {
  width: 48px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line-dim);
  flex-shrink: 0;
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
  padding: 14px 0;
}

.sidebar-title {
  font-size: 16px;
  color: var(--ink);
  white-space: nowrap;
}

.sidebar-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: none;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink-dim);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}

.sidebar-toggle:hover {
  border-color: var(--steel-blue);
  color: var(--steel-bright);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
}
</style>

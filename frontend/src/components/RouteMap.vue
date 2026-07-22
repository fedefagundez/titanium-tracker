<template>
  <div class="route-map-placeholder">
    <div class="placeholder-icon">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    </div>
    <p class="display placeholder-title">Vista de Mapa</p>
    <p class="placeholder-desc">Próximamente se integrará un mapa interactivo con la ruta calculada.</p>
    <div v-if="route" class="placeholder-route mono">
      {{ route.origin.name }} → {{ route.destination.name }} ({{ route.jump_count }} saltos)
    </div>
  </div>
</template>

<script setup>
defineProps({
  route: { type: Object, default: null },
})
</script>

<style scoped>
.route-map-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 400px;
  text-align: center;
  gap: 12px;
}

.placeholder-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(58, 143, 199, 0.1);
  color: var(--steel-blue);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

.placeholder-title {
  font-size: 20px;
  color: var(--ink);
}

.placeholder-desc {
  font-size: 14px;
  color: var(--ink-dim);
  max-width: 300px;
}

.placeholder-route {
  margin-top: 8px;
  font-size: 13px;
  color: var(--steel-bright);
  padding: 8px 16px;
  background: var(--panel-alt);
  border: 1px solid var(--line);
  border-radius: 4px;
}
</style>

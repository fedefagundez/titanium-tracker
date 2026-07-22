<template>
  <div class="home-shell">
    <header class="app-header">
      <div class="header-inner wrap">
        <div class="brand">
          <div class="brand-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <p class="brand-name display">TITANIUM TRACKER</p>
            <p class="brand-tag mono">Titanium State Logistics</p>
          </div>
        </div>

        <div class="header-user" v-if="user">
          <img :src="user.avatarUrl" :alt="user.characterName" class="user-avatar" />
          <div class="user-info">
            <span class="user-name">{{ user.characterName }}</span>
            <span class="user-role-badge" :class="'role-' + user.role">{{ roleLabel }}</span>
          </div>
          <button class="btn btn-sm btn-secondary" @click="handleLogout">Salir</button>
        </div>
      </div>
    </header>

    <main class="home-content wrap">
      <div class="welcome-panel panel no-clip">
        <h1 class="display welcome-title">Bienvenido, {{ roleLabel }} {{ user?.characterName }}</h1>
        <p class="welcome-sub">Conectado como {{ roleLabel }} de {{ user?.corporationId ? 'Titanium State Logistics' : 'tu corporación' }}</p>
        <div class="divider" style="margin: 24px 0;"></div>
        <p class="welcome-info">El tracker de rutas y alertas está en desarrollo. Próximamente podrás planificar rutas, recibir alertas de peligro y compartir con tu flota.</p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { authState, logout } from '../auth'

const ROLE_LABELS = { admin: 'Director', officer: 'Oficial', member: 'Miembro' }

const router = useRouter()
const user = computed(() => authState.user)
const roleLabel = computed(() => ROLE_LABELS[user.value?.role] || 'Miembro')

function handleLogout() {
  logout()
  router.push('/login')
}
</script>

<style scoped>
.home-shell {
  min-height: 100vh;
}

.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
  background: rgba(7, 10, 12, 0.96);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--line);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--steel-blue);
  color: var(--void);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

.brand-name {
  font-size: 21px;
  line-height: 1;
  color: var(--ink);
}

.brand-tag {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--steel-bright);
  margin-top: 3px;
  letter-spacing: 0.06em;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--line);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
}

.user-role-badge {
  display: inline-block;
  width: fit-content;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 3px;
}

.role-admin {
  background: rgba(224, 168, 62, 0.18);
  color: var(--contested);
}

.role-officer {
  background: rgba(58, 143, 199, 0.18);
  color: var(--steel-bright);
}

.role-member {
  background: rgba(61, 220, 151, 0.12);
  color: var(--online);
}

.home-content {
  padding-top: 100px;
}

.welcome-panel {
  max-width: 640px;
  padding: 36px;
}

.welcome-title {
  font-size: 28px;
  color: var(--ink);
}

.welcome-sub {
  margin-top: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink-dim);
}

.welcome-info {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.55;
  color: var(--ink-dim);
}
</style>

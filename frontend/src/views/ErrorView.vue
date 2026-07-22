<template>
  <main class="error-shell">
    <div class="error-bg"></div>

    <div class="error-box panel no-clip">
      <div class="error-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>

      <p class="display error-title">{{ title }}</p>
      <p class="error-msg">{{ message }}</p>

      <div class="divider"></div>

      <button class="btn btn-secondary btn-block" @click="goLogin">
        Volver al login
      </button>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const errorMessages = {
  'no-corp': {
    title: 'ACCESO RESTRINGIDO',
    message: 'Tu personaje no pertenece a la corporación autorizada. Si creés que es un error, contactá a un director.',
  },
  'auth-failed': {
    title: 'ERROR DE AUTENTICACIÓN',
    message: 'No se pudo completar el login con EVE SSO. Intentá de nuevo.',
  },
  'expired': {
    title: 'SESIÓN EXPIRADA',
    message: 'Tu sesión ha expirado. Iniciá sesión nuevamente.',
  },
  'default': {
    title: 'ERROR',
    message: 'Ocurrió un error inesperado.',
  },
}

const errorKey = computed(() => route.query.type || 'default')
const title = computed(() => errorMessages[errorKey.value]?.title || errorMessages.default.title)
const message = computed(() => errorMessages[errorKey.value]?.message || errorMessages.default.message)

function goLogin() {
  router.push('/login')
}
</script>

<style scoped>
.error-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.error-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(209, 72, 63, 0.08), transparent 55%),
    radial-gradient(circle at 85% 15%, rgba(209, 72, 63, 0.1), transparent 40%);
}

.error-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.5;
  background-image:
    linear-gradient(90deg, rgba(209, 72, 63, 0.04) 1px, transparent 1px),
    linear-gradient(0deg, rgba(209, 72, 63, 0.04) 1px, transparent 1px);
  background-size: 48px 48px;
}

.error-box {
  position: relative;
  width: 100%;
  max-width: 400px;
  padding: 36px 32px;
  text-align: center;
  border-top-color: var(--hostile);
}

.error-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(209, 72, 63, 0.15);
  color: var(--hostile);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}

.error-title {
  font-size: 22px;
  color: var(--hostile);
  letter-spacing: 0.06em;
}

.error-msg {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-dim);
  line-height: 1.5;
}
</style>

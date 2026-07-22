<template>
  <main class="login-shell">
    <div class="login-bg"></div>

    <div class="login-box panel no-clip">
      <img
        class="login-corp-logo"
        src="https://images.evetech.net/corporations/98830206/logo?size=128"
        alt="Titanium State Logistics"
      />

      <p class="display login-title">TITANIUM TRACKER</p>
      <p class="login-sub">Navegación y alertas para la flota</p>

      <div class="divider"></div>

      <button class="btn btn-primary btn-block login-btn" @click="loginWithEve">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
        </svg>
        Iniciar sesión con EVE Online
      </button>

      <p class="login-foot mono">Autenticación OAuth2 vía login.eveonline.com</p>
    </div>
  </main>
</template>

<script setup>
import { getLoginUrl } from '../auth'

function loginWithEve() {
  window.location.href = getLoginUrl()
}
</script>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(58, 143, 199, 0.1), transparent 55%),
    radial-gradient(circle at 85% 15%, rgba(95, 201, 255, 0.12), transparent 40%);
}
.login-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.5;
  background-image:
    linear-gradient(90deg, rgba(58, 143, 199, 0.06) 1px, transparent 1px),
    linear-gradient(0deg, rgba(58, 143, 199, 0.06) 1px, transparent 1px);
  background-size: 48px 48px;
}

.login-box {
  position: relative;
  width: 100%;
  max-width: 400px;
  padding: 36px 32px;
  text-align: center;
}

.login-corp-logo {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  object-fit: contain;
}

.login-title {
  font-size: 26px;
  color: var(--ink);
  letter-spacing: 0.06em;
}

.login-sub {
  margin-top: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-dim);
}

.login-btn {
  margin-top: 4px;
}

.login-foot {
  margin-top: 18px;
  font-size: 11px;
  color: var(--ink-dim);
  letter-spacing: 0.04em;
}
</style>

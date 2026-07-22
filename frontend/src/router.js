import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './views/LoginView.vue'
import HomeView from './views/HomeView.vue'
import ErrorView from './views/ErrorView.vue'
import { authState, loadSession } from './auth.js'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { guest: true },
  },
  {
    path: '/error',
    name: 'error',
    component: ErrorView,
    meta: { guest: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, from, next) => {
  if (!authState.checked) {
    await loadSession()
  }
  if (to.meta.requiresAuth && !authState.user) {
    next({ name: 'login' })
  } else if (to.meta.guest && authState.user) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router

import { reactive } from 'vue'
import { API_URL } from './constants'

export const authState = reactive({
  user: null,
  checked: false,
})

export function captureTokenFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (token) {
    localStorage.setItem('session_token', token)
    window.history.replaceState({}, '', window.location.pathname)
  }
}

export function getToken() {
  return localStorage.getItem('session_token')
}

export async function loadSession() {
  captureTokenFromUrl()
  const token = getToken()
  if (!token) {
    authState.checked = true
    return
  }
  try {
    const resp = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) throw new Error()
    const data = await resp.json()
    authState.user = data.user
  } catch {
    localStorage.removeItem('session_token')
    authState.user = null
  }
  authState.checked = true
}

export function logout() {
  localStorage.removeItem('session_token')
  authState.user = null
}

export function isLoggedIn() {
  return !!authState.user
}

export function getLoginUrl() {
  return `${API_URL}/auth/eve/login`
}

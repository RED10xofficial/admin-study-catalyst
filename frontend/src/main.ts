import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { configureApiAuth, apiFetch } from './lib/api'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// ── Wire up the auth provider ──────────────────────────────────────────────
//
// This must happen after Pinia is installed so useAuthStore() works, but
// before app.mount() so every API call made during the first render already
// has access to the configured provider.
//
const authStore = useAuthStore(pinia)

configureApiAuth({
  getToken: () => authStore.accessToken,

  doRefresh: async () => {
    // apiFetch skips refresh retry for /auth/refresh, so this won't loop.
    const res = await apiFetch<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
    })
    if (res.status === 'success' && res.data?.accessToken) {
      authStore.setToken(res.data.accessToken)
      return res.data.accessToken
    }
    throw new Error('Refresh failed')
  },

  onAuthFailure: () => {
    authStore.clearToken()
    // Use the router that is already installed on the app.
    router.push({ name: 'login' })
  },
})

app.mount('#app')

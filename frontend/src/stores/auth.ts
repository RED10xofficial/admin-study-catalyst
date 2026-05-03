import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Central auth store.
 *
 * Token strategy:
 *   - Access token is held in a reactive `ref` (Pinia) so components and the
 *     router guard react to auth changes without polling localStorage.
 *   - It is also mirrored to localStorage so the session survives a hard page
 *     refresh (the ref is initialised from localStorage on first load).
 *   - The refresh token is an httpOnly cookie managed entirely by the backend;
 *     the frontend never reads or writes it.
 */
export const useAuthStore = defineStore('auth', () => {
  // Initialise from localStorage so the session persists across page refreshes.
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))

  const isAuthenticated = computed(() => !!accessToken.value)

  function setToken(token: string) {
    accessToken.value = token
    localStorage.setItem('accessToken', token)
  }

  function clearToken() {
    accessToken.value = null
    localStorage.removeItem('accessToken')
  }

  return { accessToken, isAuthenticated, setToken, clearToken }
})

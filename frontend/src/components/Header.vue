<template>
  <header
    class="sticky top-0 z-20 flex items-center justify-between gap-3 h-14 px-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shrink-0 transition-colors duration-200"
  >
    <!-- Sidebar toggle -->
    <button
      @click="$emit('update:modelValue', !modelValue)"
      class="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-150"
      :title="modelValue ? 'Collapse sidebar' : 'Expand sidebar'"
    >
      <Menu class="w-5 h-5" />
    </button>

    <!-- Right-side controls -->
    <div class="flex items-center gap-1">
      <!-- Theme toggle -->
      <button
        @click="toggle()"
        class="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-150"
        :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <Sun v-if="isDark" class="w-5 h-5" />
        <Moon v-else class="w-5 h-5" />
      </button>

      <!-- Logout button -->
      <button
        @click="handleLogout"
        :disabled="loggingOut"
        class="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
        title="Sign out"
      >
        <svg
          v-if="loggingOut"
          class="w-4 h-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <LogOut v-else class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, Sun, Moon, LogOut } from '@lucide/vue'
import { useTheme } from '@/composables/useTheme'
import { logoutApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { ROUTE_NAMES } from '@/lib/route'

defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { isDark, toggle } = useTheme()
const authStore = useAuthStore()
const router = useRouter()

const loggingOut = ref(false)

async function handleLogout() {
  loggingOut.value = true
  try {
    // Ask the backend to invalidate the refresh-token cookie.
    await logoutApi()
  } catch {
    // Even if the server call fails, clear the local session.
  } finally {
    loggingOut.value = false
  }
  authStore.clearToken()
  router.push({ name: ROUTE_NAMES.LOGIN })
}
</script>

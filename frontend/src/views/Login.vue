<template>
  <!-- Full-page dark gradient -->
  <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" :style="bgGradient">

    <!-- Subtle radial glow top-right -->
    <div class="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none" style="background: radial-gradient(circle, #4f7fff 0%, transparent 70%)" />
    <div class="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none" style="background: radial-gradient(circle, #4f7fff 0%, transparent 70%)" />

    <!-- Card -->
    <div class="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">

      <!-- Brand -->
      <div class="flex items-center gap-2 mb-8">
        <div class="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen class="w-4 h-4 text-white" />
        </div>
        <span class="text-sm font-bold text-gray-900 tracking-tight">Learning Catalyst</span>
      </div>

      <!-- Heading -->
      <div class="mb-6">
        <h1 class="text-xl font-bold text-gray-900">Login to your account</h1>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">

        <div>
          <label class="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="hello@example.com"
            autocomplete="email"
            class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-primary transition-all duration-150"
          />
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-gray-500">Password</label>
            <button type="button" class="text-xs font-semibold text-primary hover:text-primary/70 transition-colors duration-150">
              forgot?
            </button>
          </div>
          <div class="relative">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter your password"
              autocomplete="current-password"
              class="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-primary transition-all duration-150"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
            >
              <EyeOff v-if="showPassword" class="w-4 h-4" />
              <Eye v-else class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Error message -->
        <p v-if="errorMsg" class="text-xs text-red-500 font-medium -mb-1">{{ errorMsg }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all duration-150 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span v-if="loading" class="inline-flex items-center gap-2">
            <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Logging in…
          </span>
          <span v-else>Login now</span>
        </button>

      </form>


    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { BookOpen, Eye, EyeOff } from '@lucide/vue'
import { apiFetch, type LoginResponse } from '@/lib/api'
import { ROUTE_NAMES } from '@/lib/route'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({ email: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)
const errorMsg = ref('')

async function handleLogin() {
  errorMsg.value = ''
  loading.value = true

  try {
    const res: LoginResponse = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email: form.value.email, password: form.value.password },
    })

    if (res.status === 'success' && res.data?.accessToken) {
      // Store token in Pinia (also persists to localStorage inside setToken).
      authStore.setToken(res.data.accessToken)

      // Restore the page the user originally tried to access, if any.
      const redirect = route.query['redirect'] as string | undefined
      await router.push(redirect ?? { name: ROUTE_NAMES.DASHBOARD })
    } else {
      errorMsg.value = res.message || 'Login failed. Please try again.'
    }
  } catch {
    errorMsg.value = 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

const bgGradient = {
  background: 'linear-gradient(135deg, #0b1437 0%, #0f1f5c 50%, #0b1437 100%)',
}
</script>

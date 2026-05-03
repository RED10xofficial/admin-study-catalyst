<template>
  <div class="min-h-screen grid lg:grid-cols-[45%_1fr]">

    <!-- ── Left panel — dark gradient ───────────────────────────────────── -->
    <div class="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden" :style="bgGradient">

      <!-- Glow blobs -->
      <div class="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full opacity-20 pointer-events-none" style="background: radial-gradient(circle, #4f7fff 0%, transparent 70%)" />
      <div class="absolute bottom-[-60px] left-[-60px] w-64 h-64 rounded-full opacity-10 pointer-events-none" style="background: radial-gradient(circle, #4f7fff 0%, transparent 70%)" />

      <!-- Brand -->
      <div class="relative z-10 flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <BookOpen class="w-4 h-4 text-white" />
        </div>
        <span class="text-sm font-bold text-white tracking-tight">Learning Catalyst</span>
      </div>

      <!-- Hero text -->
      <div class="relative z-10">
        <p class="text-3xl font-light italic text-white/90 leading-relaxed">
          Welcome.<br />
          Start your journey<br />
          now with our<br />
          learning platform!
        </p>
      </div>

      <!-- Bottom feature hints -->
      <div class="relative z-10 flex flex-col gap-2.5">
        <div v-for="f in features" :key="f" class="flex items-center gap-2.5">
          <div class="w-1 h-1 rounded-full bg-white/50" />
          <span class="text-xs text-white/60">{{ f }}</span>
        </div>
      </div>
    </div>

    <!-- ── Right panel — white form ──────────────────────────────────────── -->
    <div class="flex flex-col justify-center px-8 py-12 sm:px-14 bg-white">

      <!-- Mobile brand -->
      <div class="flex items-center gap-2 mb-10 lg:hidden">
        <div class="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen class="w-4 h-4 text-white" />
        </div>
        <span class="text-sm font-bold text-gray-900">Learning Catalyst</span>
      </div>

      <div class="w-full max-w-sm mx-auto">

        <!-- Heading -->
        <div class="mb-7">
          <h1 class="text-xl font-bold text-gray-900">Create an account</h1>
          <p class="text-sm text-gray-400 mt-1">Fill in the details below to get started</p>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleRegister" class="space-y-4">

          <div>
            <label class="block text-xs font-semibold text-gray-500 mb-1.5">Full name</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Jane Doe"
              autocomplete="name"
              class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:bg-white focus:border-primary transition-all duration-150"
            />
          </div>

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
            <label class="block text-xs font-semibold text-gray-500 mb-1.5">Password</label>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Enter a password"
                autocomplete="new-password"
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

            <!-- Strength bar -->
            <div v-if="form.password" class="mt-2 space-y-1">
              <div class="flex gap-1">
                <div
                  v-for="i in 4" :key="i"
                  class="flex-1 h-1 rounded-full transition-colors duration-300"
                  :class="passwordStrength >= i ? strengthColor : 'bg-gray-100'"
                />
              </div>
              <p class="text-[10px] font-medium" :class="strengthTextColor">{{ strengthLabel }}</p>
            </div>
          </div>

          <button
            type="submit"
            class="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all duration-150 mt-1"
          >
            Create account
          </button>

          <!-- Google SSO placeholder -->
          <button
            type="button"
            class="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

        </form>

        <p class="text-center text-xs text-gray-400 mt-6">
          Already have an Account?
          <router-link :to="{ name: 'login' }" class="font-semibold text-primary hover:text-primary/70 transition-colors duration-150">
            Log in
          </router-link>
        </p>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { BookOpen, Eye, EyeOff } from '@lucide/vue'

const form = ref({ name: '', email: '', password: '' })
const showPassword = ref(false)

function handleRegister() {
  // wire up auth logic here
}

const passwordStrength = computed(() => {
  const p = form.value.password
  if (!p) return 0
  let s = 0
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p)) s++
  if (/[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return s
})

const strengthColor = computed(() => {
  if (passwordStrength.value <= 1) return 'bg-red-400'
  if (passwordStrength.value === 2) return 'bg-amber-400'
  if (passwordStrength.value === 3) return 'bg-yellow-400'
  return 'bg-emerald-400'
})

const strengthTextColor = computed(() => {
  if (passwordStrength.value <= 1) return 'text-red-400'
  if (passwordStrength.value === 2) return 'text-amber-500'
  if (passwordStrength.value === 3) return 'text-yellow-500'
  return 'text-emerald-500'
})

const strengthLabel = computed(() => ['', 'Weak', 'Fair', 'Good', 'Strong'][passwordStrength.value])

const features = [
  'Structured chapter-by-chapter content',
  'Audio lectures for on-the-go learning',
  'Practice exams with instant feedback',
]

const bgGradient = {
  background: 'linear-gradient(135deg, #0b1437 0%, #0f1f5c 50%, #0b1437 100%)',
}
</script>

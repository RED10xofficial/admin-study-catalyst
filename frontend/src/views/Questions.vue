<template>
  <div class="min-h-full bg-[#F7F8F9] dark:bg-gray-950 transition-colors duration-200 flex flex-col">

    <!-- ── Top navigation bar ──────────────────────────────────────────── -->
    <div class="pt-8 pb-4 flex items-center justify-between">
      <button
        @click="$router.push({ name: 'dashboard' })"
        class="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-150"
      >
        <ArrowLeft class="w-4 h-4" />
        Back to Dashboard
      </button>

      <button class="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/70 transition-colors duration-150">
        <LayoutGrid class="w-4 h-4" />
        View All Chapters
      </button>
    </div>

    <!-- ── Scrollable content ──────────────────────────────────────────── -->
    <div class="flex-1 pb-28 space-y-4">

      <!-- Chapter breadcrumb -->
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{{ question.chapter }}</span>
        <span class="text-gray-300 dark:text-gray-700">·</span>
        <span class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">{{ question.subject }}</span>
      </div>

      <!-- ── Card 1: Question + Options ──────────────────────────────── -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
        <p class="text-[10px] font-semibold uppercase tracking-widest text-primary mb-3">Question {{ question.current }}</p>
        <p class="text-base font-semibold text-gray-800 dark:text-gray-100 leading-relaxed mb-6">
          {{ question.text }}
        </p>

        <!-- Options -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="option in question.options"
            :key="option.key"
            @click="selectedOption = option.key"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150"
            :class="selectedOption === option.key
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600'"
          >
            <span
              class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-150"
              :class="selectedOption === option.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'"
            >
              {{ option.key }}
            </span>
            <span
              class="text-sm leading-snug transition-colors duration-150"
              :class="selectedOption === option.key
                ? 'text-gray-800 dark:text-gray-100 font-medium'
                : 'text-gray-600 dark:text-gray-400'"
            >
              {{ option.text }}
            </span>
          </button>
        </div>
      </div>

      <!-- ── Card 2: Description 70 / 30 ────────────────────────────── -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="flex flex-col lg:flex-row">

          <!-- 70% — Description text -->
          <div class="flex-[7] p-6 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-800">
            <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Context &amp; Explanation</p>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-[1.85]">
              {{ question.description }}
            </p>
          </div>

          <!-- 30% — Image + Audio -->
          <div class="flex-[3] flex flex-col">

            <!-- Image with always-visible fullscreen button -->
            <div class="p-4 flex-1">
              <div class="relative rounded-xl overflow-hidden h-full min-h-44">
                <img
                  :src="question.image"
                  :alt="question.imageCaption"
                  class="w-full h-full object-cover"
                />
                <!-- Gradient overlay for readability -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                <!-- Always-visible fullscreen button -->
                <button
                  @click="fullscreenSrc = question.image; showFullscreen = true"
                  class="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors duration-150"
                  title="View fullscreen"
                >
                  <Maximize2 class="w-4 h-4" />
                </button>

                <p class="absolute bottom-2.5 left-3 right-3 text-[11px] text-white/80 font-medium leading-snug">
                  {{ question.imageCaption }}
                </p>
              </div>
            </div>

            <!-- Audio player -->
            <div class="p-4 border-t border-gray-100 dark:border-gray-800">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Audio Reference</p>

              <div class="flex items-center gap-3">
                <button
                  @click="toggleAudio"
                  class="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90 active:scale-95 transition-all duration-150"
                >
                  <Pause v-if="isPlaying" class="w-4 h-4 text-white" />
                  <Play v-else class="w-4 h-4 text-white translate-x-px" />
                </button>

                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate mb-1.5">{{ question.audioTitle }}</p>
                  <div
                    class="relative h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden cursor-pointer"
                    @click="seekAudio"
                    ref="audioTrackRef"
                  >
                    <div
                      class="h-full bg-primary rounded-full transition-all duration-200"
                      :style="{ width: audioProgress + '%' }"
                    />
                  </div>
                  <div class="flex justify-between mt-1">
                    <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ formatTime(audioCurrentTime) }}</span>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ formatTime(question.audioDuration) }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>

    <!-- ── Sticky bottom bar ───────────────────────────────────────────── -->
    <div
      class="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-8 py-4 flex items-center justify-between"
      :style="{ paddingLeft: `calc(2rem + ${sidebarWidth})` }"
    >
      <!-- Counter + progress dots -->
      <div class="flex items-center gap-3">
        
        <div class="text-sm">
          <span class="font-bold text-gray-800 dark:text-gray-100">{{ question.current }}</span>
          <span class="text-gray-400 dark:text-gray-500 font-medium"> / {{ question.total }}</span>
          <span class="text-[11px] text-gray-400 dark:text-gray-500 ml-1.5">questions</span>
        </div>
        <div class="hidden sm:flex items-center gap-1">
          <div
            v-for="n in question.total"
            :key="n"
            class="rounded-full transition-all duration-200"
            :class="n < question.current
              ? 'w-1.5 h-1.5 bg-primary'
              : n === question.current
              ? 'w-3 h-1.5 bg-primary'
              : 'w-1.5 h-1.5 bg-gray-200 dark:bg-gray-700'"
          />
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-3">
        <button class="flex items-center gap-2 px-5 py-2.5 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors duration-150">
          <CheckCircle class="w-4 h-4" />
          Complete
        </button>
        <button class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150">
          <CheckCircle class="w-4 h-4" />
          Complete &amp; Next
          <ArrowRight class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- ── Fullscreen overlay ──────────────────────────────────────────── -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showFullscreen"
        class="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
        @click.self="showFullscreen = false"
      >
        <button
          @click="showFullscreen = false"
          class="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors duration-150"
        >
          <X class="w-5 h-5" />
        </button>
        <img
          :src="fullscreenSrc"
          alt="Fullscreen view"
          class="max-w-full max-h-full rounded-2xl object-contain"
        />
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import {
  ArrowLeft, LayoutGrid, Play, Pause,
  Maximize2, X, CheckCircle, ArrowRight,
  ChevronLeft, ChevronRight,
} from '@lucide/vue'

// ── Question data ──────────────────────────────────────────────────────────
const question = {
  current: 12,
  total: 20,
  chapter: 'Chapter 4 – Cellular Respiration',
  subject: 'Biology',
  text: 'Which organelle is primarily responsible for producing ATP through oxidative phosphorylation, and which stage of cellular respiration yields the greatest number of ATP molecules?',
  options: [
    { key: 'A', text: 'Nucleus – Glycolysis' },
    { key: 'B', text: 'Mitochondria – Electron Transport Chain' },
    { key: 'C', text: 'Ribosome – Krebs Cycle' },
    { key: 'D', text: 'Endoplasmic Reticulum – Fermentation' },
  ],
  audioTitle: 'Lecture: Cellular Respiration Overview',
  audioDuration: 214,
  image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=900&q=80',
  imageCaption: 'Mitochondria structure under electron microscope',
  description: 'Cellular respiration is the process by which cells break down glucose and other organic molecules to produce ATP, the primary energy currency of the cell. The process begins with glycolysis in the cytoplasm, where glucose is split into two pyruvate molecules, yielding a net gain of 2 ATP and 2 NADH.\n\nPyruvate then enters the mitochondrial matrix and undergoes oxidative decarboxylation to form acetyl-CoA, which feeds into the Krebs cycle. Each turn of the Krebs cycle generates 3 NADH, 1 FADH₂, and 1 GTP per acetyl-CoA molecule.\n\nThe electron carriers (NADH and FADH₂) donate electrons to the electron transport chain embedded in the inner mitochondrial membrane. The energy released drives proton pumping across the membrane, creating a proton gradient that powers ATP synthase — producing approximately 32–34 ATP molecules per glucose molecule via chemiosmosis.',
  descriptionImage: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&q=80',
}

// ── Selected option ────────────────────────────────────────────────────────
const selectedOption = ref<string | null>(null)

// ── Audio player ───────────────────────────────────────────────────────────
const isPlaying = ref(false)
const audioCurrentTime = ref(0)
const audioTrackRef = ref<HTMLElement | null>(null)

let audioInterval: ReturnType<typeof setInterval> | null = null

function toggleAudio() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    audioInterval = setInterval(() => {
      if (audioCurrentTime.value < question.audioDuration) {
        audioCurrentTime.value += 1
      } else {
        isPlaying.value = false
        audioCurrentTime.value = 0
        clearInterval(audioInterval!)
      }
    }, 1000)
  } else {
    if (audioInterval) clearInterval(audioInterval)
  }
}

function seekAudio(e: MouseEvent) {
  if (!audioTrackRef.value) return
  const rect = audioTrackRef.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  audioCurrentTime.value = Math.round(ratio * question.audioDuration)
}

const audioProgress = computed(() =>
  (audioCurrentTime.value / question.audioDuration) * 100,
)

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

onUnmounted(() => {
  if (audioInterval) clearInterval(audioInterval)
})

// ── Fullscreen ─────────────────────────────────────────────────────────────
const showFullscreen = ref(false)
const fullscreenSrc = ref(question.image)

// ── Sidebar offset for sticky bar ─────────────────────────────────────────
const sidebarWidth = '200px'
</script>

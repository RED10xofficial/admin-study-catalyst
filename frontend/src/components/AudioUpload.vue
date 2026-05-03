<template>
  <div>
    <!-- ── Audio player (when audio exists) ───────────────────────────── -->
    <div v-if="effectiveKey || uploadState === 'uploading'">
      <div
        class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 relative overflow-hidden"
      >
        <!-- Uploading overlay -->
        <Transition
          enter-active-class="transition-opacity duration-150"
          leave-active-class="transition-opacity duration-150"
          leave-to-class="opacity-0"
        >
          <div
            v-if="uploadState === 'uploading'"
            class="absolute inset-0 bg-gray-100/80 dark:bg-gray-800/80 flex items-center justify-center gap-2 z-10"
          >
            <svg class="w-4 h-4 animate-spin text-primary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span class="text-xs font-semibold text-primary">Uploading…</span>
          </div>
        </Transition>

        <!-- Play / Pause -->
        <button
          type="button"
          @click="togglePlay"
          :disabled="!audioSrc || uploadState === 'uploading'"
          class="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          <Pause v-if="isPlaying" class="w-4 h-4 text-white" />
          <Play v-else class="w-4 h-4 text-white translate-x-px" />
        </button>

        <!-- Track info -->
        <div class="flex-1 min-w-0">
          <p class="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate mb-1.5">
            {{ displayName }}
          </p>
          <!-- Progress bar -->
          <div
            ref="trackRef"
            class="h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden cursor-pointer"
            @click="seekAudio"
          >
            <div
              class="h-full bg-primary rounded-full transition-all duration-200"
              :style="{ width: `${progress}%` }"
            />
          </div>
          <div class="flex justify-between mt-1">
            <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ formatTime(currentTime) }}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ duration ? formatTime(duration) : '--:--' }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1 shrink-0">
          <button
            type="button"
            @click="triggerPicker"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/8 dark:hover:bg-primary/15 transition-colors duration-150"
            title="Change audio"
          >
            <UploadCloud class="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            @click="removeAudio"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150"
            title="Remove audio"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- ── Upload zone (no audio) ──────────────────────────────────────── -->
    <div
      v-else
      @click="triggerPicker"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
      role="button"
      tabindex="0"
      @keydown.enter.space.prevent="triggerPicker"
      class="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 select-none"
      :class="isDragging
        ? 'border-primary bg-primary/5 dark:bg-primary/10'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'"
      style="min-height: 90px"
    >
      <div class="text-center py-4 px-3">
        <Music
          class="w-7 h-7 mx-auto mb-2 transition-colors duration-150"
          :class="isDragging ? 'text-primary' : 'text-gray-300 dark:text-gray-600'"
        />
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ isDragging ? 'Drop to upload' : 'Click or drag audio file' }}
        </p>
        <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-1">MP3, OGG, WAV, M4A &bull; max 50 MB</p>
      </div>
    </div>

    <!-- Error -->
    <p v-if="errorMsg" class="mt-1.5 text-xs text-red-500 font-medium" role="alert">
      {{ errorMsg }}
    </p>

    <!-- Hidden elements -->
    <input
      ref="fileInputRef"
      type="file"
      accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav"
      class="sr-only"
      aria-hidden="true"
      @change="handleFileChange"
    />
    <audio
      ref="audioRef"
      :src="audioSrc ?? undefined"
      class="sr-only"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @ended="isPlaying = false"
      @error="isPlaying = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Play, Pause, UploadCloud, Trash2, Music } from '@lucide/vue'
import { getPresignedUpload, uploadToR2, getImageSrc } from '@/lib/api'

// ── Props ─────────────────────────────────────────────────────────────────

const props = defineProps<{
  /** R2 key currently stored in DB (question.audioUrl). */
  currentKey?: string | null
}>()

// ── Emits ─────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  change: [result: { key: string; mimeType: string } | null]
}>()

// ── State ─────────────────────────────────────────────────────────────────

const fileInputRef = ref<HTMLInputElement | null>(null)
const audioRef = ref<HTMLAudioElement | null>(null)
const trackRef = ref<HTMLElement | null>(null)

const isDragging = ref(false)
const uploadState = ref<'idle' | 'uploading' | 'error'>('idle')
const errorMsg = ref('')

const localPreviewUrl = ref<string | null>(null)
const uploadedKey = ref<string | null | undefined>(undefined)
const pendingFilename = ref('')

// ── Audio player state ────────────────────────────────────────────────────

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

// ── Computed ──────────────────────────────────────────────────────────────

const effectiveKey = computed(() => {
  if (uploadedKey.value !== undefined) return uploadedKey.value
  return props.currentKey ?? null
})

const audioSrc = computed<string | null>(() => {
  if (localPreviewUrl.value) return localPreviewUrl.value
  return getImageSrc(effectiveKey.value) // R2 public URL
})

const displayName = computed(() => {
  if (pendingFilename.value) return pendingFilename.value
  if (effectiveKey.value) {
    const parts = effectiveKey.value.split('/')
    return parts[parts.length - 1] ?? effectiveKey.value
  }
  return 'Audio file'
})

const progress = computed(() =>
  duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0,
)

// ── File handling ─────────────────────────────────────────────────────────

function triggerPicker() {
  fileInputRef.value?.click()
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (file) processFile(file)
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) processFile(file)
}

async function processFile(file: File) {
  const allowed = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav']
  if (!allowed.includes(file.type)) {
    errorMsg.value = 'Only MP3, M4A, OGG, and WAV audio files are allowed.'
    return
  }
  if (file.size > 50 * 1024 * 1024) {
    errorMsg.value = 'Audio file must be 50 MB or smaller.'
    return
  }

  stopAudio()
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value)
  localPreviewUrl.value = URL.createObjectURL(file)
  pendingFilename.value = file.name
  errorMsg.value = ''
  uploadState.value = 'uploading'

  try {
    const presignRes = await getPresignedUpload({
      type: 'question-audio',
      filename: file.name,
      mimeType: file.type,
    })

    if (presignRes.status !== 'success' || !presignRes.data) {
      throw new Error(presignRes.message || 'Failed to get upload URL.')
    }

    await uploadToR2(presignRes.data.uploadUrl, file)
    uploadedKey.value = presignRes.data.key
    uploadState.value = 'idle'
    emit('change', { key: presignRes.data.key, mimeType: file.type })
  } catch (err) {
    uploadState.value = 'error'
    errorMsg.value = err instanceof Error ? err.message : 'Upload failed. Please try again.'
    if (localPreviewUrl.value) {
      URL.revokeObjectURL(localPreviewUrl.value)
      localPreviewUrl.value = null
    }
    pendingFilename.value = ''
    uploadedKey.value = undefined
  }
}

// ── Audio controls ────────────────────────────────────────────────────────

function togglePlay() {
  if (!audioRef.value || !audioSrc.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
  } else {
    audioRef.value.play().then(() => { isPlaying.value = true }).catch(() => {
      errorMsg.value = 'Could not play audio. Check VITE_R2_PUBLIC_URL configuration.'
    })
  }
}

function stopAudio() {
  if (audioRef.value) {
    audioRef.value.pause()
    audioRef.value.currentTime = 0
  }
  isPlaying.value = false
  currentTime.value = 0
  duration.value = 0
}

function seekAudio(e: MouseEvent) {
  if (!audioRef.value || !trackRef.value || !duration.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  audioRef.value.currentTime = ratio * duration.value
}

function onTimeUpdate() {
  currentTime.value = audioRef.value?.currentTime ?? 0
}

function onLoadedMetadata() {
  duration.value = audioRef.value?.duration ?? 0
}

function formatTime(secs: number): string {
  if (!isFinite(secs)) return '--:--'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Remove ────────────────────────────────────────────────────────────────

function removeAudio() {
  stopAudio()
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value)
    localPreviewUrl.value = null
  }
  uploadedKey.value = null
  pendingFilename.value = ''
  uploadState.value = 'idle'
  errorMsg.value = ''
  emit('change', null)
}

// ── Reset (called by parent on modal open) ────────────────────────────────

function reset() {
  stopAudio()
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value)
  localPreviewUrl.value = null
  uploadedKey.value = undefined
  pendingFilename.value = ''
  uploadState.value = 'idle'
  errorMsg.value = ''
}

defineExpose({ reset })

// ── Cleanup ───────────────────────────────────────────────────────────────

onUnmounted(() => {
  stopAudio()
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value)
})
</script>

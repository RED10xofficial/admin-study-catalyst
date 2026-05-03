<template>
  <div>
    <!-- ── Preview (existing or newly uploaded image) ──────────────────── -->
    <div
      v-if="displaySrc || currentKey"
      class="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 group"
      style="aspect-ratio: 16 / 7"
    >
      <!-- Actual image (when public URL is resolvable) -->
      <img
        v-if="displaySrc"
        :src="displaySrc"
        alt="Unit image"
        class="w-full h-full object-cover"
      />

      <!-- Fallback: key exists but no public URL configured -->
      <div v-else class="w-full h-full flex items-center justify-center">
        <div class="text-center select-none">
          <ImageIcon class="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-1.5" />
          <p class="text-xs font-medium text-gray-400 dark:text-gray-500">Image stored</p>
          <p class="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5">Configure VITE_R2_PUBLIC_URL to preview</p>
        </div>
      </div>

      <!-- Upload progress overlay -->
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-150"
        leave-to-class="opacity-0"
      >
        <div
          v-if="uploadState === 'uploading'"
          class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2"
        >
          <svg class="w-6 h-6 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p class="text-xs font-semibold text-white">Uploading…</p>
        </div>
      </Transition>

      <!-- Hover actions (change / remove) -->
      <div
        v-if="uploadState !== 'uploading'"
        class="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center gap-2.5 opacity-0 group-hover:opacity-100"
      >
        <button
          type="button"
          @click="triggerPicker"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-xs font-semibold text-gray-700 transition-colors duration-150"
          title="Change image"
        >
          <UploadCloud class="w-3.5 h-3.5" />
          Change
        </button>
        <button
          type="button"
          @click="removeImage"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-xs font-semibold text-white transition-colors duration-150"
          title="Remove image"
        >
          <Trash2 class="w-3.5 h-3.5" />
          Remove
        </button>
      </div>
    </div>

    <!-- ── Upload zone (no image) ──────────────────────────────────────── -->
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
      style="min-height: 110px"
    >
      <div class="text-center py-4 px-3">
        <UploadCloud
          class="w-8 h-8 mx-auto mb-2 transition-colors duration-150"
          :class="isDragging ? 'text-primary' : 'text-gray-300 dark:text-gray-600'"
        />
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ isDragging ? 'Drop to upload' : 'Click or drag image here' }}
        </p>
        <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          JPEG, PNG, WebP &bull; max 5 MB
        </p>
      </div>
    </div>

    <!-- Error message -->
    <p v-if="errorMsg" class="mt-1.5 text-xs text-red-500 font-medium" role="alert">
      {{ errorMsg }}
    </p>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="sr-only"
      aria-hidden="true"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ImageIcon, UploadCloud, Trash2 } from '@lucide/vue'
import { getPresignedUpload, uploadToR2, getImageSrc } from '@/lib/api'

// ── Props ─────────────────────────────────────────────────────────────────

const props = defineProps<{
  /**
   * The R2 key currently stored in the DB (unit.imageUrl).
   * Pass null/undefined when creating a new unit.
   */
  currentKey?: string | null
}>()

// ── Emits ─────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  /**
   * Fires after a new image is successfully uploaded to R2.
   * Pass null when the user removes an image.
   */
  change: [result: { key: string; mimeType: string } | null]
}>()

// ── State ─────────────────────────────────────────────────────────────────

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const uploadState = ref<'idle' | 'uploading' | 'error'>('idle')
const errorMsg = ref('')

/** Object URL for a local file selected but not yet replaced on the server. */
const localPreviewUrl = ref<string | null>(null)
/**
 * Tracks the user's image action:
 *   undefined = not touched (use currentKey)
 *   null      = explicitly removed
 *   string    = new R2 key from a successful upload
 */
const uploadedKey = ref<string | null | undefined>(undefined)

// ── Computed display ──────────────────────────────────────────────────────

/**
 * The effective key to show: either the newly uploaded key, the current DB key,
 * or null when the user has explicitly removed the image.
 */
const effectiveKey = computed(() => {
  if (uploadedKey.value !== undefined) return uploadedKey.value
  return props.currentKey ?? null
})

/**
 * The src to display in the <img> tag.
 * Priority: local object URL (live preview) → public R2 URL.
 */
const displaySrc = computed<string | null>(() => {
  if (localPreviewUrl.value) return localPreviewUrl.value
  return getImageSrc(effectiveKey.value)
})

// ── File handling ─────────────────────────────────────────────────────────

function triggerPicker() {
  fileInputRef.value?.click()
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = '' // reset so the same file can be re-selected
  if (file) processFile(file)
}

function handleDrop(e: DragEvent) {
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file) processFile(file)
}

async function processFile(file: File) {
  // Validate type
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    errorMsg.value = 'Only JPEG, PNG, and WebP images are allowed.'
    return
  }
  // Validate size (5 MB)
  if (file.size > 5 * 1024 * 1024) {
    errorMsg.value = 'Image must be 5 MB or smaller.'
    return
  }

  // Show local preview immediately
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value)
  localPreviewUrl.value = URL.createObjectURL(file)
  errorMsg.value = ''
  uploadState.value = 'uploading'

  try {
    // Step 1: Get presigned PUT URL
    const presignRes = await getPresignedUpload({
      type: 'unit-image',
      filename: file.name,
      mimeType: file.type,
    })

    if (presignRes.status !== 'success' || !presignRes.data) {
      throw new Error(presignRes.message || 'Failed to get upload URL.')
    }

    const { uploadUrl, key } = presignRes.data

    // Step 2: PUT the file directly to R2
    await uploadToR2(uploadUrl, file)

    // Step 3: Store the key and notify the parent
    uploadedKey.value = key
    uploadState.value = 'idle'
    emit('change', { key, mimeType: file.type })
  } catch (err) {
    uploadState.value = 'error'
    errorMsg.value = err instanceof Error ? err.message : 'Upload failed. Please try again.'
    // Revert preview to the previous state
    if (localPreviewUrl.value) {
      URL.revokeObjectURL(localPreviewUrl.value)
      localPreviewUrl.value = null
    }
    uploadedKey.value = undefined
  }
}

function removeImage() {
  if (localPreviewUrl.value) {
    URL.revokeObjectURL(localPreviewUrl.value)
    localPreviewUrl.value = null
  }
  uploadedKey.value = null
  uploadState.value = 'idle'
  errorMsg.value = ''
  emit('change', null)
}

// ── Expose reset for parent (called on modal open) ────────────────────────
function reset() {
  if (localPreviewUrl.value) URL.revokeObjectURL(localPreviewUrl.value)
  localPreviewUrl.value = null
  uploadedKey.value = undefined
  uploadState.value = 'idle'
  errorMsg.value = ''
}

defineExpose({ reset })
</script>

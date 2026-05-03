<template>
  <div>
    <div
      class="min-h-[44px] w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-wrap gap-1.5 items-center cursor-text focus-within:bg-white dark:focus-within:bg-gray-900 focus-within:border-primary transition-all duration-150"
      @click="focusInput"
    >
      <span
        v-for="tag in modelValue"
        :key="tag"
        class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/8 dark:bg-primary/20 text-primary"
      >
        {{ tag }}
        <button
          type="button"
          @click.stop="removeTag(tag)"
          class="leading-none hover:opacity-60 transition-opacity duration-100"
          :aria-label="`Remove tag ${tag}`"
        >
          <X class="w-3 h-3" />
        </button>
      </span>

      <input
        ref="inputRef"
        v-model="current"
        type="text"
        :placeholder="modelValue.length === 0 ? 'Type and press Enter…' : ''"
        class="flex-1 min-w-[120px] bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none"
        @keydown.enter.prevent="addTag"
        @keydown="handleKeydown"
        @blur="addOnBlur"
      />
    </div>
    <p class="mt-1 text-[11px] text-gray-400 dark:text-gray-600">
      Press Enter or comma to add a tag.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { X } from '@lucide/vue'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const current = ref('')

function focusInput() {
  inputRef.value?.focus()
}

function addTag() {
  const value = current.value.trim().replace(/,+$/, '').trim()
  if (!value) return
  if (!props.modelValue.includes(value)) {
    emit('update:modelValue', [...props.modelValue, value])
  }
  current.value = ''
}

function removeTag(tag: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((t) => t !== tag),
  )
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === ',') {
    e.preventDefault()
    addTag()
    return
  }
  if (e.key === 'Backspace' && current.value === '' && props.modelValue.length > 0) {
    emit('update:modelValue', props.modelValue.slice(0, -1))
  }
}

function addOnBlur() {
  if (current.value.trim()) addTag()
}

/** Expose addTag so parent can commit pending input before form submit */
defineExpose({ addTag })
</script>

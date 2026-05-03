<template>
  <div class="px-4 py-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
    <button
      @click="$emit('prev')"
      :disabled="page === 1 || disabled"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
    >
      <ChevronLeft class="w-3.5 h-3.5" />
      Previous
    </button>

    <span class="text-xs text-gray-400 dark:text-gray-500">Page {{ page }}</span>

    <button
      @click="$emit('next')"
      :disabled="!hasMore || disabled"
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
    >
      Next
      <ChevronRight class="w-3.5 h-3.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'

defineProps<{
  page: number
  hasMore: boolean
  disabled?: boolean
}>()

defineEmits<{
  (e: 'prev'): void
  (e: 'next'): void
}>()
</script>

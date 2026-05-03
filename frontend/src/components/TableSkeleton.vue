<template>
  <tbody>
    <tr v-for="n in rows" :key="n" class="border-b border-gray-50 dark:border-gray-800/60">
      <td v-for="(width, ci) in effectiveWidths" :key="ci" class="px-4 py-3.5">
        <div
          class="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"
          :class="width"
        />
      </td>
    </tr>
  </tbody>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Number of skeleton rows to show */
    rows?: number
    /** Number of columns (used when colWidths is not provided) */
    cols: number
    /** Optional explicit width classes per column (Tailwind w-* classes) */
    colWidths?: string[]
  }>(),
  { rows: 5 },
)

const FALLBACK_WIDTHS = ['w-40', 'w-28', 'w-20', 'w-24', 'w-16', 'w-32']

const effectiveWidths = computed<string[]>(() => {
  if (props.colWidths && props.colWidths.length > 0) return props.colWidths
  return Array.from({ length: props.cols }, (_, i) => {
    if (i === 0) return 'w-40'
    if (i === props.cols - 1) return 'w-12'
    return FALLBACK_WIDTHS[i % FALLBACK_WIDTHS.length] ?? 'w-24'
  })
})
</script>

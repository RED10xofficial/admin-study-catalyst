<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        @click.self="emit('cancel')"
      >
        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0 scale-95 translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
        >
          <div
            v-if="show"
            class="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6"
            role="alertdialog"
            aria-modal="true"
            :aria-label="`Delete ${itemLabel}`"
          >
            <!-- Icon + text -->
            <div class="flex items-start gap-4 mb-5">
              <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 class="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  Delete {{ itemLabel }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Are you sure you want to delete
                  <span class="font-semibold text-gray-700 dark:text-gray-200">"{{ name }}"</span>?
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <!-- API error -->
            <p
              v-if="error"
              class="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-500/10 px-3 py-2.5 rounded-xl mb-4"
              role="alert"
            >
              {{ error }}
            </p>

            <!-- Actions -->
            <div class="flex items-center gap-3">
              <button
                @click="emit('cancel')"
                :disabled="loading"
                class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                @click="emit('confirm')"
                :disabled="loading"
                class="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
              >
                <span v-if="loading" class="inline-flex items-center justify-center gap-2">
                  <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Deleting…
                </span>
                <span v-else>Delete</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Trash2 } from '@lucide/vue'

withDefaults(
  defineProps<{
    show: boolean
    /** The name of the record being deleted — shown in quotes */
    name: string
    /** Label for the item type (e.g. "Exam Type", "Unit") */
    itemLabel?: string
    /** API error message to display below the description */
    error?: string
    loading?: boolean
  }>(),
  { itemLabel: 'Item', error: '', loading: false },
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

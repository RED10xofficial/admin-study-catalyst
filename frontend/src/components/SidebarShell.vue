<template>
  <div
    class="fixed top-0 left-0 h-full z-40 bg-white dark:bg-gray-900 shadow-lg dark:shadow-gray-950 flex flex-col transition-transform duration-300 ease-in-out"
    :class="modelValue ? 'translate-x-0' : '-translate-x-full'"
    style="width: 200px"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>

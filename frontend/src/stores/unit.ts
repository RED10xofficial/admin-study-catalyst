import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Unit } from '../lib/api'

export const useUnitStore = defineStore('unit', () => {
  const selectedUnitForQuestion = ref<Unit | null>(null);
  const setSelectedUnitForQuestion = (unit: Unit) => {
    selectedUnitForQuestion.value = unit;
  }

  return { selectedUnitForQuestion, setSelectedUnitForQuestion }
})

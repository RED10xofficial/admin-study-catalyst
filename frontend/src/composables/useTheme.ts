import { ref, watch } from 'vue'

// Module-level ref — shared across every component that imports this composable
const isDark = ref(false)

function init() {
  const stored = localStorage.getItem('theme')
  isDark.value = stored === 'dark'
  applyClass()
}

function applyClass() {
  document.documentElement.classList.toggle('dark', isDark.value)
}

function toggle() {
  isDark.value = !isDark.value
}

watch(isDark, (val) => {
  localStorage.setItem('theme', val ? 'dark' : 'light')
  applyClass()
})

// Run once when the module is first loaded
init()

export function useTheme() {
  return { isDark, toggle }
}

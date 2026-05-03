<template>
  <div class="min-h-full bg-[#F7F8F9] dark:bg-gray-950 transition-colors duration-200">

    <!-- ── Page heading ──────────────────────────────────────────────────── -->
    <div class="mb-6">
      <p class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Overview</p>
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
    </div>

    <!-- ── Stat cards ────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
      <router-link
        v-for="stat in statCards"
        :key="stat.label"
        :to="{ name: stat.route }"
        class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/8 dark:bg-primary/15">
            <component :is="stat.icon" class="w-4 h-4 text-primary" />
          </div>
          <ArrowUpRight class="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150" />
        </div>
        <div v-if="statsLoading" class="h-7 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mb-1" />
        <p v-else class="text-2xl font-black text-gray-900 dark:text-white tabular-nums">
          {{ stat.value }}<span v-if="stat.hasMore" class="text-base font-bold text-gray-400">+</span>
        </p>
        <p class="text-xs font-semibold text-gray-400 dark:text-gray-500">{{ stat.label }}</p>
      </router-link>
    </div>

    <!-- ─── Section 1: Exam Types ──────────────────────────────────────── -->
    <section class="mb-6 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-300/40 dark:border-gray-800">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Exam Types</h2>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">All available exam categories</p>
        </div>
        <router-link
          :to="{ name: ROUTE_NAMES.EXAM_TYPES }"
          class="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/70 transition-colors duration-150"
        >
          View All <ChevronRight class="w-3.5 h-3.5" />
        </router-link>
      </div>

      <!-- Loading skeleton -->
      <div v-if="examTypesLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="n in 3"
          :key="n"
          class="rounded-2xl p-4 flex items-center gap-4 border border-gray-100 dark:border-gray-800 animate-pulse"
        >
          <div class="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded" />
            <div class="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded" />
            <div class="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <p v-else-if="examTypesError" class="text-xs text-red-500 font-medium py-4">
        {{ examTypesError }}
      </p>

      <!-- Empty -->
      <div v-else-if="examTypes.length === 0" class="py-10 text-center">
        <p class="text-sm text-gray-400 dark:text-gray-500">No exam types created yet.</p>
        <router-link :to="{ name: ROUTE_NAMES.EXAM_TYPES }" class="text-xs text-primary font-semibold hover:underline mt-1 inline-block">Create one</router-link>
      </div>

      <!-- Grid (mirrors "Continue Learning" card style) -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="et in examTypes"
          :key="et.id"
          class="bg-white dark:bg-gray-900 rounded-2xl p-4 flex items-center gap-4 border border-gray-300/40 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
          @click="$router.push({ name: ROUTE_NAMES.EXAM_TYPES })"
        >
          <!-- Icon badge -->
          <div class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-primary/8 dark:bg-primary/15">
            <ClipboardList class="w-6 h-6 text-primary" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <!-- Tags row -->
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-1 flex-wrap">
                <span
                  v-for="tag in parseTags(et.tags).slice(0, 2)"
                  :key="tag"
                  class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/8 dark:bg-primary/20 text-primary"
                >
                  {{ tag }}
                </span>
                <span v-if="!parseTags(et.tags).length" class="text-[10px] text-gray-400 dark:text-gray-500">No tags</span>
              </div>
              <span class="text-[10px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                {{ et.examQuestionCount }} Q
              </span>
            </div>

            <h3 class="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug truncate mb-2.5 group-hover:text-primary transition-colors duration-150">
              {{ et.examName }}
            </h3>

            <!-- Accent bar -->
            <div class="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div class="h-full w-full rounded-full bg-primary/30" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Section 2: Units ─────────────────────────────────────────────── -->
    <section class="mb-6 bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-300/40 dark:border-gray-800">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Units</h2>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Browse available study units</p>
        </div>
        <router-link
          :to="{ name: ROUTE_NAMES.UNITS }"
          class="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/70 transition-colors duration-150"
        >
          View All <ChevronRight class="w-3.5 h-3.5" />
        </router-link>
      </div>

      <!-- Loading skeleton -->
      <div v-if="unitsLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          v-for="n in 4"
          :key="n"
          class="relative rounded-2xl overflow-hidden h-60 bg-gray-100 dark:bg-gray-800 animate-pulse"
        />
      </div>

      <!-- Error -->
      <p v-else-if="unitsError" class="text-xs text-red-500 font-medium py-4">{{ unitsError }}</p>

      <!-- Empty -->
      <div v-else-if="units.length === 0" class="py-10 text-center">
        <p class="text-sm text-gray-400 dark:text-gray-500">No units created yet.</p>
        <router-link :to="{ name: ROUTE_NAMES.UNITS }" class="text-xs text-primary font-semibold hover:underline mt-1 inline-block">Create one</router-link>
      </div>

      <!-- Grid — mirrors "Chapters" image card style -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          v-for="unit in previewUnits"
          :key="unit.id"
          class="relative rounded-2xl overflow-hidden h-60 group cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          @click="$router.push({ name: ROUTE_NAMES.QUESTION_LIST })"
        >
          <!-- Background: R2 image or dark neutral fallback -->
          <img
            v-if="getImageSrc(unit.imageUrl)"
            :src="getImageSrc(unit.imageUrl)!"
            :alt="unit.unitName"
            class="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
          />
          <div
            v-else
            class="absolute inset-0 bg-gray-800 dark:bg-gray-950"
          />

          <!-- Gradient overlay -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          <!-- Access badge -->
          <div class="absolute top-3 right-3">
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-md border bg-white/10 text-white/80 border-white/20">
              {{ unit.accessType === 'premium' ? 'Premium' : 'Free' }}
            </span>
          </div>

          <!-- Bottom info -->
          <div class="absolute bottom-0 left-0 right-0 p-4">
            <p class="text-sm font-bold text-white leading-snug mb-2.5">{{ unit.unitName }}</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in parseTags(unit.tags).slice(0, 3)"
                :key="tag"
                class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-white/90 border border-white/20"
              >
                {{ tag }}
              </span>
              <span v-if="!parseTags(unit.tags).length" class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-white/70 border border-white/20">
                {{ examTypeMap[unit.examTypeId] ?? '' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Section 3: Questions by Unit ────────────────────────────────── -->
    <section class="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-300/40 dark:border-gray-800">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Questions</h2>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Your recent performance</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Unit quick-selector -->
          <select
            v-model="selectedUnitId"
            @change="fetchDashboardQuestions"
            class="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 outline-none focus:border-primary transition-colors duration-150 max-w-[160px] truncate"
          >
            <option value="" disabled>Select unit…</option>
            <option v-for="u in units" :key="u.id" :value="u.id">{{ u.unitName }}</option>
          </select>
          <router-link
            :to="{ name: ROUTE_NAMES.QUESTION_LIST }"
            class="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/70 transition-colors duration-150 shrink-0"
          >
            View All <ChevronRight class="w-3.5 h-3.5" />
          </router-link>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="questionsLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="n in 4"
          :key="n"
          class="rounded-2xl p-4 flex items-center gap-4 border border-gray-100 dark:border-gray-800 animate-pulse"
        >
          <div class="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-3 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
            <div class="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <p v-else-if="questionsError" class="text-xs text-red-500 font-medium py-4">{{ questionsError }}</p>

      <!-- No unit selected -->
      <div v-else-if="!selectedUnitId" class="py-10 text-center">
        <p class="text-sm text-gray-400 dark:text-gray-500">Select a unit above to see questions.</p>
      </div>

      <!-- Empty -->
      <div v-else-if="dashboardQuestions.length === 0" class="py-10 text-center">
        <p class="text-sm text-gray-400 dark:text-gray-500">No questions in this unit yet.</p>
        <router-link
          :to="{ name: ROUTE_NAMES.ADD_QUESTION, query: { unitId: selectedUnitId } }"
          class="text-xs text-primary font-semibold hover:underline mt-1 inline-block"
        >
          Add the first question
        </router-link>
      </div>

      <!-- Grid — mirrors "My Exams" card style -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="q in dashboardQuestions"
          :key="q.id"
          class="bg-white dark:bg-gray-900 rounded-2xl p-4 flex items-start gap-4 border border-gray-300/40 dark:border-gray-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
          @click="$router.push({ name: ROUTE_NAMES.EDIT_QUESTION, params: { id: q.id } })"
        >
          <!-- Sequence badge (mirrors score badge) -->
          <div class="w-14 h-14 rounded-xl bg-primary/8 dark:bg-primary/15 flex items-center justify-center shrink-0">
            <span class="text-lg font-black text-primary leading-none">#</span>
            <span class="text-sm font-black text-primary">{{ q.sequenceOrder }}</span>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Question
              </span>
              <span class="text-[10px] font-semibold text-gray-400 dark:text-gray-500">
                {{ q.accessType === 'premium' ? 'Premium' : 'Free' }}
              </span>
            </div>

            <p class="text-sm font-bold text-gray-800 dark:text-gray-100 leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-150">
              {{ q.question }}
            </p>

            <!-- Correct answer hint -->
            <p class="text-[11px] text-primary font-medium flex items-center gap-1 truncate">
              <CheckCircle class="w-3 h-3 shrink-0" />
              <span class="truncate">{{ q.correctAnswer }}</span>
            </p>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronRight, ClipboardList, ListOrdered, HelpCircle,
  ArrowUpRight, CheckCircle,
} from '@lucide/vue'
import {
  listExamTypes, listUnits, listQuestions,
  parseTags, getImageSrc,
  type ExamType, type Unit, type Question,
} from '@/lib/api'
import { ROUTE_NAMES } from '@/lib/route'

// ── Constants ─────────────────────────────────────────────────────────────
const UNITS_PREVIEW_LIMIT = 8
const QUESTIONS_PREVIEW_LIMIT = 4

// ── Router ────────────────────────────────────────────────────────────────
const router = useRouter()

// ── Exam Types ────────────────────────────────────────────────────────────
const examTypes = ref<ExamType[]>([])
const examTypesLoading = ref(false)
const examTypesError = ref('')

async function fetchExamTypes() {
  examTypesLoading.value = true
  examTypesError.value = ''
  try {
    const res = await listExamTypes({ limit: 100 })
    if (res.status === 'success' && res.data) {
      examTypes.value = res.data.examTypes
    } else if (res.code === 401) {
      router.push({ name: ROUTE_NAMES.LOGIN })
    } else {
      examTypesError.value = res.message || 'Failed to load exam types.'
    }
  } catch {
    examTypesError.value = 'Network error.'
  } finally {
    examTypesLoading.value = false
  }
}

// ── Units ─────────────────────────────────────────────────────────────────
const units = ref<Unit[]>([])
const unitsLoading = ref(false)
const unitsError = ref('')

const previewUnits = computed(() => units.value.slice(0, UNITS_PREVIEW_LIMIT))

const examTypeMap = computed(() => {
  const map: Record<string, string> = {}
  for (const et of examTypes.value) map[et.id] = et.examName
  return map
})

async function fetchUnits() {
  unitsLoading.value = true
  unitsError.value = ''
  try {
    const res = await listUnits({ limit: 100 })
    if (res.status === 'success' && res.data) {
      units.value = res.data.units
    } else if (res.code === 401) {
      router.push({ name: ROUTE_NAMES.LOGIN })
    } else {
      unitsError.value = res.message || 'Failed to load units.'
    }
  } catch {
    unitsError.value = 'Network error.'
  } finally {
    unitsLoading.value = false
  }
}

// ── Questions ─────────────────────────────────────────────────────────────
const dashboardQuestions = ref<Question[]>([])
const questionsLoading = ref(false)
const questionsError = ref('')
const selectedUnitId = ref('')

async function fetchDashboardQuestions() {
  if (!selectedUnitId.value) return
  questionsLoading.value = true
  questionsError.value = ''
  try {
    const res = await listQuestions({ unitId: selectedUnitId.value, limit: QUESTIONS_PREVIEW_LIMIT })
    if (res.status === 'success' && res.data) {
      dashboardQuestions.value = res.data.questions
    } else {
      questionsError.value = res.message || 'Failed to load questions.'
    }
  } catch {
    questionsError.value = 'Network error.'
  } finally {
    questionsLoading.value = false
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────
const statsLoading = computed(() => examTypesLoading.value || unitsLoading.value)

const statCards = computed(() => [
  {
    label: 'Exam Types',
    value: examTypes.value.length,
    hasMore: false,
    route: ROUTE_NAMES.EXAM_TYPES,
    icon: ClipboardList,
  },
  {
    label: 'Units',
    value: units.value.length,
    hasMore: false,
    route: ROUTE_NAMES.UNITS,
    icon: ListOrdered,
  },
  {
    label: 'Questions',
    value: dashboardQuestions.value.length,
    hasMore: true,
    route: ROUTE_NAMES.QUESTION_LIST,
    icon: HelpCircle,
  },
])

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchExamTypes(), fetchUnits()])
  if (units.value.length > 0 && units.value[0]) {
    selectedUnitId.value = units.value[0].id
    await fetchDashboardQuestions()
  }
})
</script>

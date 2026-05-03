<template>
  <div>
    <!-- Back + Loading skeleton -->
    <button @click="router.back()"
      class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
      <ArrowLeft class="w-4 h-4" /> Back to Students
    </button>

    <!-- Loading state -->
    <div v-if="loadingStudent" class="space-y-4">
      <div class="h-8 w-64 bg-gray-200 animate-pulse rounded-lg" />
      <div class="h-4 w-40 bg-gray-200 animate-pulse rounded-lg" />
      <div class="h-40 bg-gray-200 animate-pulse rounded-xl mt-4" />
    </div>

    <!-- Not found -->
    <div v-else-if="!student" class="text-center py-20 text-gray-400">
      <UserX class="w-12 h-12 mx-auto mb-3 text-gray-300" />
      <p class="font-medium">Student not found</p>
    </div>

    <template v-else>
      <!-- Profile header -->
      <div class="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span class="text-xl font-bold text-primary">{{ initials(student.name) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-xl font-bold text-gray-900">{{ student.name }}</h1>
              <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                student.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600']">
                {{ student.isActive ? 'Active' : 'Inactive' }}
              </span>
              <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                student.membershipType === 'premium' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600']">
                <Star v-if="student.membershipType === 'premium'" class="w-3 h-3" />
                {{ student.membershipType === 'premium' ? 'Premium' : 'Normal' }}
              </span>
            </div>
            <p class="text-sm text-gray-500 mt-0.5">{{ student.email }}</p>
          </div>
          <!-- Toggle active button -->
          <button @click="promptToggleActive"
            :class="['flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
              student.isActive
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-green-200 text-green-700 hover:bg-green-50']">
            <UserX v-if="student.isActive" class="w-4 h-4" />
            <UserCheck v-else class="w-4 h-4" />
            {{ student.isActive ? 'Deactivate' : 'Activate' }}
          </button>
        </div>

        <!-- Quick info chips -->
        <div class="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
          <div v-if="student.phone" class="flex items-center gap-1.5 text-xs text-gray-600">
            <Phone class="w-3.5 h-3.5 text-gray-400" />
            {{ student.phone }}
          </div>
          <div v-if="student.membershipSource" class="flex items-center gap-1.5 text-xs text-gray-600">
            <Tag class="w-3.5 h-3.5 text-gray-400" />
            {{ formatSource(student.membershipSource) }}
          </div>
          <div class="flex items-center gap-1.5 text-xs text-gray-600">
            <Calendar class="w-3.5 h-3.5 text-gray-400" />
            Joined {{ formatDate(student.createdAt) }}
          </div>
        </div>
      </div>

      <!-- Summary stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 mb-1">Total Exams</p>
          <p class="text-2xl font-bold text-gray-900">{{ examHistory.length }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 mb-1">Submitted</p>
          <p class="text-2xl font-bold text-gray-900">{{ submittedCount }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 mb-1">Avg. Score</p>
          <p class="text-2xl font-bold text-gray-900">
            {{ avgScore !== null ? `${avgScore}%` : '—' }}
          </p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-xs text-gray-500 mb-1">Questions Answered</p>
          <p class="text-2xl font-bold text-gray-900">{{ progressItems.length }}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div class="flex border-b border-gray-200">
          <button v-for="tab in tabs" :key="tab.id"
            @click="activeTab = tab.id"
            :class="['flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-gray-500 border-transparent hover:text-gray-800']">
            <component :is="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Overview tab -->
        <div v-if="activeTab === 'overview'" class="p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Profile Information</h3>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt class="text-xs text-gray-500">Full Name</dt>
              <dd class="text-sm text-gray-900 mt-0.5">{{ student.name }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Email Address</dt>
              <dd class="text-sm text-gray-900 mt-0.5">{{ student.email }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Phone</dt>
              <dd class="text-sm text-gray-900 mt-0.5">{{ student.phone || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Membership Type</dt>
              <dd class="text-sm text-gray-900 mt-0.5 capitalize">{{ student.membershipType }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Membership Source</dt>
              <dd class="text-sm text-gray-900 mt-0.5">{{ formatSource(student.membershipSource) }}</dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Account Status</dt>
              <dd class="mt-0.5">
                <span :class="['inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                  student.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600']">
                  {{ student.isActive ? 'Active' : 'Inactive' }}
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500">Joined</dt>
              <dd class="text-sm text-gray-900 mt-0.5">{{ formatDate(student.createdAt) }}</dd>
            </div>
          </dl>

          <!-- Units practised summary -->
          <template v-if="unitProgress.size > 0">
            <h3 class="text-sm font-semibold text-gray-700 mt-6 mb-3">Units Practised</h3>
            <div class="space-y-2">
              <div v-for="[unitId, unit] in unitProgress" :key="unitId"
                class="flex items-center gap-3 py-2 px-3 rounded-lg bg-gray-50">
                <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen class="w-3.5 h-3.5 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ unit.unitName }}</p>
                </div>
                <span class="text-xs font-semibold text-primary">{{ unit.count }} Qs</span>
              </div>
            </div>
          </template>
        </div>

        <!-- Exam History tab -->
        <div v-else-if="activeTab === 'exams'" class="p-5">
          <div v-if="loadingExams" class="space-y-3">
            <div v-for="i in 4" :key="i" class="h-20 bg-gray-100 animate-pulse rounded-xl" />
          </div>
          <div v-else-if="examHistory.length === 0" class="text-center py-12 text-gray-400">
            <ClipboardList class="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p class="font-medium">No exams attended yet</p>
          </div>
          <div v-else class="space-y-3">
            <div v-for="exam in examHistory" :key="exam.id"
              class="border border-gray-200 rounded-xl p-4 hover:border-primary/30 transition-colors">
              <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <p class="text-sm font-semibold text-gray-800">{{ exam.unitName }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    <span :class="['text-xs px-2 py-0.5 rounded-full font-medium capitalize',
                      exam.difficulty === 'easy' ? 'bg-green-50 text-green-700'
                      : exam.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-red-50 text-red-600']">
                      {{ exam.difficulty }}
                    </span>
                    <span :class="['text-xs px-2 py-0.5 rounded-full font-medium',
                      exam.status === 'submitted' ? 'bg-primary/10 text-primary'
                      : exam.status === 'active' ? 'bg-blue-50 text-blue-600'
                      : 'bg-gray-100 text-gray-500']">
                      {{ exam.status }}
                    </span>
                  </div>
                </div>
                <div class="text-right">
                  <template v-if="exam.status === 'submitted' && exam.correctAnswers !== null">
                    <p class="text-lg font-bold text-gray-900">
                      {{ exam.correctAnswers }}/{{ exam.totalQuestions }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ scorePercent(exam) }}% accuracy
                    </p>
                  </template>
                  <p v-else class="text-sm text-gray-400">—</p>
                </div>
              </div>

              <!-- Score bar (only for submitted) -->
              <template v-if="exam.status === 'submitted' && exam.correctAnswers !== null">
                <div class="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div class="bg-primary h-1.5 rounded-full transition-all"
                    :style="{ width: `${scorePercent(exam)}%` }" />
                </div>
              </template>

              <div class="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span class="flex items-center gap-1">
                  <Calendar class="w-3 h-3" />
                  {{ formatDate(exam.startedAt) }}
                </span>
                <span v-if="exam.submittedAt" class="flex items-center gap-1">
                  <CheckCircle class="w-3 h-3 text-green-500" />
                  Submitted {{ formatDate(exam.submittedAt) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Question Progress tab -->
        <div v-else-if="activeTab === 'progress'" class="p-5">
          <div v-if="loadingProgress" class="space-y-3">
            <div v-for="i in 4" :key="i" class="h-20 bg-gray-100 animate-pulse rounded-xl" />
          </div>
          <div v-else-if="progressItems.length === 0" class="text-center py-12 text-gray-400">
            <BookOpen class="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p class="font-medium">No questions answered yet</p>
          </div>
          <div v-else>
            <p class="text-xs text-gray-500 mb-3">
              {{ progressItems.length }} question{{ progressItems.length !== 1 ? 's' : '' }} answered
              across {{ unitProgress.size }} unit{{ unitProgress.size !== 1 ? 's' : '' }}
            </p>
            <div class="space-y-3">
              <div v-for="[unitId, unit] in unitProgress" :key="unitId"
                class="border border-gray-200 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen class="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p class="text-sm font-semibold text-gray-800">{{ unit.unitName }}</p>
                  </div>
                  <span class="text-sm font-bold text-primary">{{ unit.count }} Qs</span>
                </div>
                <p class="text-xs text-gray-500 ml-9">
                  Last answered {{ formatDate(unit.lastAnswered) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Toggle Active Confirmation Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showToggleModal && student" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div :class="['w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                student.isActive ? 'bg-red-100' : 'bg-green-100']">
                <UserX v-if="student.isActive" class="w-5 h-5 text-red-600" />
                <UserCheck v-else class="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">
                  {{ student.isActive ? 'Deactivate Student' : 'Activate Student' }}
                </h3>
                <p class="text-sm text-gray-500">{{ student.name }}</p>
              </div>
            </div>
            <p class="text-sm text-gray-600 mb-5">
              {{
                student.isActive
                  ? 'This student will no longer be able to access the platform.'
                  : 'This student will regain access to the platform.'
              }}
            </p>
            <p v-if="toggleError" class="text-sm text-red-600 mb-3">{{ toggleError }}</p>
            <div class="flex gap-3">
              <button @click="showToggleModal = false; toggleError = ''"
                class="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button @click="confirmToggleActive"
                :disabled="toggling"
                :class="['flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors',
                  student.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700',
                  toggling ? 'opacity-60 cursor-not-allowed' : '']">
                {{ toggling ? 'Saving…' : (student.isActive ? 'Deactivate' : 'Activate') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  Star,
  UserX,
  UserCheck,
  Phone,
  Tag,
  Calendar,
  BookOpen,
  ClipboardList,
  CheckCircle,
  User,
} from '@lucide/vue'
import {
  getStudentApi,
  updateStudentApi,
  getStudentExamHistoryApi,
  getStudentProgressApi,
  extractApiError,
  type Student,
  type StudentExam,
  type StudentProgressItem,
} from '@/lib/api'

const route = useRoute()
const router = useRouter()

const studentId = route.params['id'] as string

// ── State ──────────────────────────────────────────────────────────────────
const student = ref<Student | null>(null)
const loadingStudent = ref(false)

const examHistory = ref<StudentExam[]>([])
const loadingExams = ref(false)

const progressItems = ref<StudentProgressItem[]>([])
const loadingProgress = ref(false)

const activeTab = ref<'overview' | 'exams' | 'progress'>('overview')

const showToggleModal = ref(false)
const toggling = ref(false)
const toggleError = ref('')

const tabs = [
  { id: 'overview' as const, label: 'Overview', icon: User },
  { id: 'exams' as const, label: 'Exam History', icon: ClipboardList },
  { id: 'progress' as const, label: 'Question Progress', icon: BookOpen },
]

// ── Computed ───────────────────────────────────────────────────────────────
const submittedCount = computed(() =>
  examHistory.value.filter((e) => e.status === 'submitted').length,
)

const avgScore = computed(() => {
  const submitted = examHistory.value.filter(
    (e) => e.status === 'submitted' && e.correctAnswers !== null && e.totalQuestions > 0,
  )
  if (submitted.length === 0) return null
  const total = submitted.reduce((sum, e) => sum + (e.correctAnswers! / e.totalQuestions) * 100, 0)
  return Math.round(total / submitted.length)
})

/** Group progress items by unit for the progress tab */
const unitProgress = computed(() => {
  const map = new Map<string, { unitName: string; count: number; lastAnswered: string }>()
  for (const item of progressItems.value) {
    const existing = map.get(item.unitId)
    if (existing) {
      existing.count++
      if (item.answeredAt > existing.lastAnswered) existing.lastAnswered = item.answeredAt
    } else {
      map.set(item.unitId, { unitName: item.unitName, count: 1, lastAnswered: item.answeredAt })
    }
  }
  return map
})

// ── Helpers ────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatSource(source: Student['membershipSource']) {
  if (!source) return '—'
  const map: Record<string, string> = {
    direct_registration: 'Direct Registration',
    book_qr: 'Book QR',
    manual_upgrade: 'Manual Upgrade',
  }
  return map[source] ?? source
}

function scorePercent(exam: StudentExam) {
  if (!exam.correctAnswers || exam.totalQuestions === 0) return 0
  return Math.round((exam.correctAnswers / exam.totalQuestions) * 100)
}

// ── Data fetching ──────────────────────────────────────────────────────────
async function fetchStudent() {
  loadingStudent.value = true
  const res = await getStudentApi(studentId)
  loadingStudent.value = false
  if (res.status === 'success' && res.data) {
    student.value = res.data.student
  }
}

async function fetchExamHistory() {
  loadingExams.value = true
  const res = await getStudentExamHistoryApi(studentId)
  loadingExams.value = false
  if (res.status === 'success' && res.data) {
    examHistory.value = res.data.exams
  }
}

async function fetchProgress() {
  loadingProgress.value = true
  const res = await getStudentProgressApi(studentId)
  loadingProgress.value = false
  if (res.status === 'success' && res.data) {
    progressItems.value = res.data.progress
  }
}

// ── Toggle active ──────────────────────────────────────────────────────────
function promptToggleActive() {
  showToggleModal.value = true
  toggleError.value = ''
}

async function confirmToggleActive() {
  if (!student.value) return
  toggling.value = true
  toggleError.value = ''

  const res = await updateStudentApi(student.value.id, {
    isActive: !student.value.isActive,
  })
  toggling.value = false

  if (res.status === 'success' && res.data) {
    student.value = { ...student.value, isActive: res.data.student.isActive }
    showToggleModal.value = false
  } else {
    toggleError.value = extractApiError(res)
  }
}

onMounted(() => {
  fetchStudent()
  fetchExamHistory()
  fetchProgress()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

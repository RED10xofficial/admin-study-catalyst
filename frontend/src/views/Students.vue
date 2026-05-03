<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Students</h1>
        <p class="text-sm text-gray-500 mt-0.5">Manage and monitor registered students</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap gap-3 items-end">
      <div class="flex flex-col gap-1 min-w-[160px]">
        <label class="text-xs font-medium text-gray-600">Membership</label>
        <select v-model="filterMembership" @change="handleFilterChange"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
          <option value="">All Memberships</option>
          <option value="normal">Normal</option>
          <option value="premium">Premium</option>
        </select>
      </div>
      <div class="flex flex-col gap-1 min-w-[140px]">
        <label class="text-xs font-medium text-gray-600">Status</label>
        <select v-model="filterActive" @change="handleFilterChange"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <div class="flex flex-col gap-1 min-w-[160px]">
        <label class="text-xs font-medium text-gray-600">Source</label>
        <select v-model="filterSource" @change="handleFilterChange"
          class="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
          <option value="">All Sources</option>
          <option value="direct_registration">Direct Registration</option>
          <option value="book_qr">Book QR</option>
          <option value="manual_upgrade">Manual Upgrade</option>
        </select>
      </div>
      <button v-if="filterMembership || filterActive || filterSource"
        @click="clearFilters"
        class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
        <X class="w-4 h-4" /> Clear
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="text-left px-4 py-3 font-semibold text-gray-600">Student</th>
            <th class="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
            <th class="text-left px-4 py-3 font-semibold text-gray-600">Membership</th>
            <th class="text-left px-4 py-3 font-semibold text-gray-600">Source</th>
            <th class="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
            <th class="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
            <th class="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          <TableSkeleton v-if="loading" :rows="8" :cols="7" />

          <tr v-else-if="students.length === 0">
            <td colspan="7" class="text-center py-16 text-gray-400">
              <Users class="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p class="font-medium">No students found</p>
              <p class="text-xs mt-1">Try adjusting the filters above</p>
            </td>
          </tr>

          <tr v-else v-for="student in students" :key="student.id"
            class="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span class="text-xs font-semibold text-primary">{{ initials(student.name) }}</span>
                </div>
                <div>
                  <p class="font-medium text-gray-900">{{ student.name }}</p>
                  <p class="text-xs text-gray-500">{{ student.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-gray-600">{{ student.phone || '—' }}</td>
            <td class="px-4 py-3">
              <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                student.membershipType === 'premium'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-gray-100 text-gray-600']">
                <Star v-if="student.membershipType === 'premium'" class="w-3 h-3" />
                {{ student.membershipType === 'premium' ? 'Premium' : 'Normal' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-600 text-xs">{{ formatSource(student.membershipSource) }}</td>
            <td class="px-4 py-3">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                student.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600']">
                {{ student.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-4 py-3 text-gray-500 text-xs">{{ formatDate(student.createdAt) }}</td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <button @click="viewStudent(student)"
                  class="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                  title="View Details">
                  <Eye class="w-4 h-4" />
                </button>
                <button @click="promptToggleActive(student)"
                  :class="['p-1.5 rounded-lg transition-colors',
                    student.isActive
                      ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50']"
                  :title="student.isActive ? 'Deactivate' : 'Activate'">
                  <UserX v-if="student.isActive" class="w-4 h-4" />
                  <UserCheck v-else class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <TablePagination
        v-if="!loading"
        :page="page"
        :has-more="hasMore"
        :loading="loadingMore"
        @prev="prevPage"
        @next="nextPage"
      />
    </div>

    <!-- Toggle Active Confirmation Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="toggleTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div :class="['w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                toggleTarget.isActive ? 'bg-red-100' : 'bg-green-100']">
                <UserX v-if="toggleTarget.isActive" class="w-5 h-5 text-red-600" />
                <UserCheck v-else class="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900">
                  {{ toggleTarget.isActive ? 'Deactivate Student' : 'Activate Student' }}
                </h3>
                <p class="text-sm text-gray-500">{{ toggleTarget.name }}</p>
              </div>
            </div>
            <p class="text-sm text-gray-600 mb-5">
              {{
                toggleTarget.isActive
                  ? 'This student will no longer be able to access the platform.'
                  : 'This student will regain access to the platform.'
              }}
            </p>
            <p v-if="toggleError" class="text-sm text-red-600 mb-3">{{ toggleError }}</p>
            <div class="flex gap-3">
              <button @click="toggleTarget = null; toggleError = ''"
                class="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button @click="confirmToggleActive"
                :disabled="toggling"
                :class="['flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors',
                  toggleTarget.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700',
                  toggling ? 'opacity-60 cursor-not-allowed' : '']">
                {{ toggling ? 'Saving…' : (toggleTarget.isActive ? 'Deactivate' : 'Activate') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, UserX, UserCheck, X, Users, Star } from '@lucide/vue'
import {
  listStudents,
  updateStudentApi,
  extractApiError,
  type Student,
  type StudentListParams,
} from '@/lib/api'
import { ROUTE_NAMES } from '@/lib/route'
import TableSkeleton from '@/components/TableSkeleton.vue'
import TablePagination from '@/components/TablePagination.vue'

const router = useRouter()

const LIMIT = 20

// ── State ──────────────────────────────────────────────────────────────────
const students = ref<Student[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(false)

const filterMembership = ref<'' | 'normal' | 'premium'>('')
const filterActive = ref<'' | 'true' | 'false'>('')
const filterSource = ref<'' | 'direct_registration' | 'book_qr' | 'manual_upgrade'>('')

const toggleTarget = ref<Student | null>(null)
const toggling = ref(false)
const toggleError = ref('')

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
    direct_registration: 'Direct',
    book_qr: 'Book QR',
    manual_upgrade: 'Manual',
  }
  return map[source] ?? source
}

function buildParams(): StudentListParams {
  const p: StudentListParams = { page: page.value, limit: LIMIT }
  if (filterMembership.value) p.membershipType = filterMembership.value
  if (filterSource.value) p.membershipSource = filterSource.value
  if (filterActive.value !== '') p.isActive = filterActive.value === 'true'
  return p
}

// ── Data fetching ──────────────────────────────────────────────────────────
async function fetchStudents(replace = true) {
  if (replace) {
    loading.value = true
  } else {
    loadingMore.value = true
  }

  const res = await listStudents(buildParams())

  if (replace) loading.value = false
  else loadingMore.value = false

  if (res.status === 'success' && res.data) {
    const list = res.data.students
    if (replace) {
      students.value = list
    } else {
      students.value.push(...list)
    }
    hasMore.value = list.length === LIMIT
  }
}

function handleFilterChange() {
  page.value = 1
  fetchStudents(true)
}

function clearFilters() {
  filterMembership.value = ''
  filterActive.value = ''
  filterSource.value = ''
  page.value = 1
  fetchStudents(true)
}

function prevPage() {
  if (page.value <= 1) return
  page.value--
  fetchStudents(true)
}

function nextPage() {
  page.value++
  fetchStudents(true)
}

// ── Navigation ─────────────────────────────────────────────────────────────
function viewStudent(student: Student) {
  router.push({ name: ROUTE_NAMES.STUDENT_DETAIL, params: { id: student.id } })
}

// ── Toggle active ──────────────────────────────────────────────────────────
function promptToggleActive(student: Student) {
  toggleTarget.value = student
  toggleError.value = ''
}

async function confirmToggleActive() {
  if (!toggleTarget.value) return
  toggling.value = true
  toggleError.value = ''

  const res = await updateStudentApi(toggleTarget.value.id, {
    isActive: !toggleTarget.value.isActive,
  })

  toggling.value = false

  if (res.status === 'success' && res.data) {
    const updated = res.data.student
    const idx = students.value.findIndex((s: Student) => s.id === updated.id)
    if (idx !== -1) {
      students.value[idx] = { ...students.value[idx], isActive: updated.isActive }
    }
    toggleTarget.value = null
  } else {
    toggleError.value = extractApiError(res)
  }
}

onMounted(() => fetchStudents())
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

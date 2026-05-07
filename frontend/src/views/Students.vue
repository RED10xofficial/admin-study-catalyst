<template>
  <div class="min-h-full bg-[#F7F8F9] dark:bg-gray-950 transition-colors duration-200">

    <!-- ── Page header ──────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Manage</p>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Students</h1>
      </div>
    </div>

    <!-- ── List card ────────────────────────────────────────────────────── -->
    <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800">

      <!-- Toolbar / Filters -->
      <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-3 items-end">
        <div class="flex flex-col gap-1 min-w-[160px]">
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Membership</label>
          <select v-model="filterMembership" @change="handleFilterChange"
            class="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary transition-all duration-150">
            <option value="">All Memberships</option>
            <option value="normal">Normal</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div class="flex flex-col gap-1 min-w-[140px]">
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Status</label>
          <select v-model="filterActive" @change="handleFilterChange"
            class="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary transition-all duration-150">
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div class="flex flex-col gap-1 min-w-[160px]">
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Source</label>
          <select v-model="filterSource" @change="handleFilterChange"
            class="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 dark:text-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary transition-all duration-150">
            <option value="">All Sources</option>
            <option value="direct_registration">Direct Registration</option>
            <option value="book_qr">Book QR</option>
            <option value="manual_upgrade">Manual Upgrade</option>
          </select>
        </div>
        <button v-if="filterMembership || filterActive || filterSource"
          @click="clearFilters"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150">
          <X class="w-3.5 h-3.5" /> Clear filters
        </button>
        <span v-if="!loading" class="ml-auto text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap self-center">
          {{ students.length }} result{{ students.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Student</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Phone</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Membership</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Source</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Status</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Joined</th>
              <th class="px-4 py-3 w-20" />
            </tr>
          </thead>

          <!-- Loading -->
          <TableSkeleton v-if="loading" :rows="8" :cols="7" />

          <!-- Empty -->
          <tbody v-else-if="students.length === 0">
            <tr>
              <td colspan="7" class="px-4 py-16 text-center">
                <div class="flex flex-col items-center gap-2">
                  <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Users class="w-5 h-5 text-gray-400 dark:text-gray-600" />
                  </div>
                  <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">No students found</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">Try adjusting the filters above</p>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Data -->
          <tbody v-else>
            <tr v-for="student in students" :key="student.id"
              class="border-b border-gray-50 dark:border-gray-800/60 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors duration-100 group">
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span class="text-xs font-semibold text-primary">{{ initials(student.name) }}</span>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800 dark:text-gray-100">{{ student.name }}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">{{ student.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{{ student.phone || '—' }}</td>
              <td class="px-4 py-3.5">
                <span :class="['inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium',
                  student.membershipType === 'premium'
                    ? 'bg-primary/8 dark:bg-primary/15 text-primary'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400']">
                  <Star v-if="student.membershipType === 'premium'" class="w-3 h-3" />
                  {{ student.membershipType === 'premium' ? 'Premium' : 'Normal' }}
                </span>
              </td>
              <td class="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500">{{ formatSource(student.membershipSource) }}</td>
              <td class="px-4 py-3.5">
                <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium',
                  student.isActive
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400']">
                  {{ student.isActive ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{{ formatDate(student.createdAt) }}</td>
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button @click="viewStudent(student)"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/8 dark:hover:bg-primary/15 transition-colors duration-150"
                    title="View Details">
                    <Eye class="w-3.5 h-3.5" />
                  </button>
                  <button @click="promptToggleActive(student)"
                    :class="['w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150',
                      student.isActive
                        ? 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10'
                        : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10']"
                    :title="student.isActive ? 'Deactivate' : 'Activate'">
                    <UserX v-if="student.isActive" class="w-3.5 h-3.5" />
                    <UserCheck v-else class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <TablePagination
        v-if="!loading"
        :page="page"
        :has-more="hasMore"
        :loading="loadingMore"
        @prev="prevPage"
        @next="nextPage"
      />
    </section>

    <!-- Toggle Active Confirmation Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="toggleTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div :class="['w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                toggleTarget.isActive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30']">
                <UserX v-if="toggleTarget.isActive" class="w-5 h-5 text-red-600" />
                <UserCheck v-else class="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                  {{ toggleTarget.isActive ? 'Deactivate Student' : 'Activate Student' }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ toggleTarget.name }}</p>
              </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-5">
              {{
                toggleTarget.isActive
                  ? 'This student will no longer be able to access the platform.'
                  : 'This student will regain access to the platform.'
              }}
            </p>
            <p v-if="toggleError" class="text-sm text-red-600 mb-3">{{ toggleError }}</p>
            <div class="flex gap-3">
              <button @click="toggleTarget = null; toggleError = ''"
                class="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
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

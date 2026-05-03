<template>
  <div class="min-h-full bg-[#F7F8F9] dark:bg-gray-950 transition-colors duration-200">

    <!-- ── Page header ──────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
          Manage
        </p>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Exam Types</h1>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
      >
        <Plus class="w-4 h-4" />
        New Exam Type
      </button>
    </div>

    <!-- ── List card ────────────────────────────────────────────────────── -->
    <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800">

      <!-- Toolbar -->
      <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div class="relative flex-1 max-w-xs">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            v-model="search"
            type="text"
            placeholder="Search exam types…"
            class="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary transition-all duration-150"
          />
        </div>
        <span v-if="!isLoading" class="ml-auto text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {{ examTypes.length }} result{{ examTypes.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Name</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Tags</th>
              <th class="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Questions</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Created</th>
              <th class="px-4 py-3 w-20" />
            </tr>
          </thead>

          <!-- Loading -->
          <TableSkeleton v-if="isLoading" :rows="5" :cols="5" />

          <!-- Error -->
          <tbody v-else-if="listError">
            <tr>
              <td colspan="5" class="px-4 py-14 text-center">
                <p class="text-sm text-red-500 font-medium">{{ listError }}</p>
                <button @click="fetchExamTypes" class="mt-2 text-xs text-primary font-semibold hover:underline">
                  Try again
                </button>
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="examTypes.length === 0">
            <tr>
              <td colspan="5" class="px-4 py-16 text-center">
                <div class="flex flex-col items-center gap-2">
                  <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <BookOpen class="w-5 h-5 text-gray-400 dark:text-gray-600" />
                  </div>
                  <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">No exam types found</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    {{ search ? 'Try a different search term.' : 'Create your first exam type to get started.' }}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Data -->
          <tbody v-else>
            <tr
              v-for="et in examTypes"
              :key="et.id"
              class="border-b border-gray-50 dark:border-gray-800/60 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors duration-100 group"
            >
              <td class="px-4 py-3.5">
                <span class="font-semibold text-gray-800 dark:text-gray-100">{{ et.examName }}</span>
              </td>
              <td class="px-4 py-3.5">
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="tag in parseTags(et.tags)"
                    :key="tag"
                    class="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/8 dark:bg-primary/15 text-primary"
                  >{{ tag }}</span>
                  <span v-if="parseTags(et.tags).length === 0" class="text-xs text-gray-300 dark:text-gray-600">—</span>
                </div>
              </td>
              <td class="px-4 py-3.5 text-center">
                <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300">
                  {{ et.examQuestionCount }}
                </span>
              </td>
              <td class="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {{ formatDate(et.createdAt) }}
              </td>
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    @click="openEdit(et)"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/8 dark:hover:bg-primary/15 transition-colors duration-150"
                    title="Edit"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="confirmDelete(et)"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150"
                    title="Delete"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <TablePagination
        v-if="!isLoading && !listError"
        :page="page"
        :has-more="hasMore"
        @prev="prevPage"
        @next="nextPage"
      />
    </section>

    <!-- ── Create / Edit Modal ──────────────────────────────────────────── -->
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
          v-if="showModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <Transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition-all duration-150"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 translate-y-2"
          >
            <div
              v-if="showModal"
              class="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl"
              role="dialog"
              aria-modal="true"
              :aria-label="modalMode === 'create' ? 'New Exam Type' : 'Edit Exam Type'"
            >
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 class="text-base font-bold text-gray-900 dark:text-white">
                  {{ modalMode === 'create' ? 'New Exam Type' : 'Edit Exam Type' }}
                </h2>
                <button
                  @click="closeModal"
                  class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                  aria-label="Close"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <!-- Form -->
              <form @submit.prevent="handleSubmit" novalidate class="px-6 py-5 space-y-5">

                <!-- Exam Name -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    Exam Name <span class="text-red-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    v-model="form.examName"
                    type="text"
                    placeholder="e.g. NEET UG 2025"
                    maxlength="200"
                    autocomplete="off"
                    class="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none transition-all duration-150"
                    :class="formErrors.examName
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:border-primary'"
                    :aria-invalid="!!formErrors.examName"
                  />
                  <div class="flex items-center justify-between mt-1">
                    <p v-if="formErrors.examName" class="text-xs text-red-500">{{ formErrors.examName }}</p>
                    <span v-else class="flex-1" />
                    <p class="text-[11px] text-gray-400 dark:text-gray-600 shrink-0">{{ form.examName.length }}/200</p>
                  </div>
                </div>

                <!-- Tags -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    Tags <span class="font-normal text-gray-400">(optional)</span>
                  </label>
                  <TagInput ref="tagInputRef" v-model="form.tags" />
                </div>

                <!-- Question Count -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    Questions per Exam <span class="text-red-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    v-model.number="form.examQuestionCount"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="10"
                    class="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none transition-all duration-150"
                    :class="formErrors.examQuestionCount
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:border-primary'"
                    :aria-invalid="!!formErrors.examQuestionCount"
                  />
                  <p v-if="formErrors.examQuestionCount" class="mt-1 text-xs text-red-500">
                    {{ formErrors.examQuestionCount }}
                  </p>
                </div>

                <!-- API error -->
                <p
                  v-if="submitError"
                  class="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-500/10 px-3 py-2.5 rounded-xl"
                  role="alert"
                >
                  {{ submitError }}
                </p>

                <!-- Actions -->
                <div class="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    @click="closeModal"
                    class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="isSubmitting"
                    class="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span v-if="isSubmitting" class="inline-flex items-center justify-center gap-2">
                      <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Saving…
                    </span>
                    <span v-else>{{ modalMode === 'create' ? 'Create' : 'Save Changes' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Delete Confirmation ──────────────────────────────────────────── -->
    <DeleteModal
      :show="showDeleteModal"
      :name="deleteTarget?.examName ?? ''"
      item-label="Exam Type"
      :error="deleteError"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="closeDeleteModal"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, Pencil, Trash2, X, BookOpen } from '@lucide/vue'
import {
  listExamTypes,
  createExamType,
  updateExamType,
  deleteExamTypeApi,
  parseTags,
  extractApiError,
  type ExamType,
} from '@/lib/api'
import { ROUTE_NAMES } from '@/lib/route'
import TableSkeleton from '@/components/TableSkeleton.vue'
import TablePagination from '@/components/TablePagination.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import TagInput from '@/components/TagInput.vue'

// ── Constants ─────────────────────────────────────────────────────────────
const PAGE_LIMIT = 20

// ── Router ────────────────────────────────────────────────────────────────
const router = useRouter()

// ── List state ────────────────────────────────────────────────────────────
const examTypes = ref<ExamType[]>([])
const page = ref(1)
const search = ref('')
const isLoading = ref(false)
const hasMore = ref(false)
const listError = ref('')

// ── Modal state ───────────────────────────────────────────────────────────
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editTarget = ref<ExamType | null>(null)

const form = ref({
  examName: '',
  tags: [] as string[],
  examQuestionCount: 10,
})

interface FormErrors {
  examName?: string
  examQuestionCount?: string
}
const formErrors = ref<FormErrors>({})
const submitError = ref('')
const isSubmitting = ref(false)

const tagInputRef = ref<InstanceType<typeof TagInput> | null>(null)

// ── Delete state ──────────────────────────────────────────────────────────
const showDeleteModal = ref(false)
const deleteTarget = ref<ExamType | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')

// ── Data fetching ─────────────────────────────────────────────────────────
async function fetchExamTypes() {
  isLoading.value = true
  listError.value = ''
  try {
    const res = await listExamTypes({
      search: search.value.trim() || undefined,
      page: page.value,
      limit: PAGE_LIMIT,
    })
    if (res.status === 'success' && res.data) {
      examTypes.value = res.data.examTypes
      hasMore.value = res.data.examTypes.length === PAGE_LIMIT
    } else if (res.code === 401) {
      router.push({ name: ROUTE_NAMES.LOGIN })
    } else {
      listError.value = res.message || 'Failed to load exam types.'
    }
  } catch {
    listError.value = 'Network error. Please check your connection and try again.'
  } finally {
    isLoading.value = false
  }
}

// ── Debounced search ──────────────────────────────────────────────────────
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchExamTypes()
  }, 400)
})

// ── Pagination ────────────────────────────────────────────────────────────
function prevPage() {
  if (page.value > 1) { page.value--; fetchExamTypes() }
}
function nextPage() {
  if (hasMore.value) { page.value++; fetchExamTypes() }
}

// ── Create / Edit modal ───────────────────────────────────────────────────
function openCreate() {
  modalMode.value = 'create'
  editTarget.value = null
  form.value = { examName: '', tags: [], examQuestionCount: 10 }
  formErrors.value = {}
  submitError.value = ''
  showModal.value = true
}

function openEdit(et: ExamType) {
  modalMode.value = 'edit'
  editTarget.value = et
  form.value = {
    examName: et.examName,
    tags: parseTags(et.tags),
    examQuestionCount: et.examQuestionCount,
  }
  formErrors.value = {}
  submitError.value = ''
  showModal.value = true
}

function closeModal() {
  if (isSubmitting.value) return
  showModal.value = false
}

// ── Validation ────────────────────────────────────────────────────────────
function validateForm(): boolean {
  const errors: FormErrors = {}
  const name = form.value.examName.trim()
  if (!name) {
    errors.examName = 'Exam name is required.'
  } else if (name.length > 200) {
    errors.examName = 'Exam name must be 200 characters or less.'
  }
  const count = form.value.examQuestionCount
  if (!Number.isInteger(count) || count < 1) {
    errors.examQuestionCount = 'Must be a positive whole number (minimum 1).'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

// ── Submit ────────────────────────────────────────────────────────────────
async function handleSubmit() {
  tagInputRef.value?.addTag()
  if (!validateForm()) return

  isSubmitting.value = true
  submitError.value = ''

  const payload = {
    examName: form.value.examName.trim(),
    tags: form.value.tags,
    examQuestionCount: form.value.examQuestionCount,
  }

  try {
    const res =
      modalMode.value === 'create'
        ? await createExamType(payload)
        : await updateExamType(editTarget.value!.id, payload)

    if (res.status === 'success') {
      showModal.value = false
      if (modalMode.value === 'create') page.value = 1
      await fetchExamTypes()
    } else if (res.code === 401) {
      router.push({ name: ROUTE_NAMES.LOGIN })
    } else {
      submitError.value = extractApiError(res)
    }
  } catch {
    submitError.value = 'Something went wrong. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
function confirmDelete(et: ExamType) {
  deleteTarget.value = et
  deleteError.value = ''
  showDeleteModal.value = true
}

function closeDeleteModal() {
  if (isDeleting.value) return
  showDeleteModal.value = false
}

async function handleDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    const res = await deleteExamTypeApi(deleteTarget.value.id)
    if (res.status === 'success') {
      showDeleteModal.value = false
      if (examTypes.value.length === 1 && page.value > 1) page.value--
      await fetchExamTypes()
    } else if (res.code === 401) {
      router.push({ name: ROUTE_NAMES.LOGIN })
    } else {
      deleteError.value = extractApiError(res)
    }
  } catch {
    deleteError.value = 'Something went wrong. Please try again.'
  } finally {
    isDeleting.value = false
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(fetchExamTypes)
</script>

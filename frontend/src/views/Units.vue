<template>
  <div class="min-h-full bg-[#F7F8F9] dark:bg-gray-950 transition-colors duration-200">

    <!-- ── Page header ──────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
          Manage
        </p>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Units</h1>
      </div>
      <button
        @click="openCreate"
        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
      >
        <Plus class="w-4 h-4" />
        New Unit
      </button>
    </div>

    <!-- ── List card ────────────────────────────────────────────────────── -->
    <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800">

      <!-- Toolbar: filters -->
      <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-3">
        <!-- Exam Type filter -->
        <div class="relative">
          <select
            v-model="filterExamTypeId"
            class="pl-3.5 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary appearance-none transition-all duration-150 cursor-pointer"
          >
            <option value="">All Exam Types</option>
            <option v-for="et in examTypeOptions" :key="et.id" :value="et.id">
              {{ et.examName }}
            </option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        </div>

        <!-- Access Type filter -->
        <div class="relative">
          <select
            v-model="filterAccessType"
            class="pl-3.5 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary appearance-none transition-all duration-150 cursor-pointer"
          >
            <option value="">All Access</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        </div>

        <span v-if="!isLoading" class="ml-auto text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {{ units.length }} result{{ units.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Unit Name</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Exam Type</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Tags</th>
              <th class="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Access</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Created</th>
              <th class="px-4 py-3 w-20" />
            </tr>
          </thead>

          <!-- Loading -->
          <TableSkeleton v-if="isLoading" :rows="5" :cols="6" />

          <!-- Error -->
          <tbody v-else-if="listError">
            <tr>
              <td colspan="6" class="px-4 py-14 text-center">
                <p class="text-sm text-red-500 font-medium">{{ listError }}</p>
                <button @click="fetchUnits" class="mt-2 text-xs text-primary font-semibold hover:underline">
                  Try again
                </button>
              </td>
            </tr>
          </tbody>

          <!-- Empty -->
          <tbody v-else-if="units.length === 0">
            <tr>
              <td colspan="6" class="px-4 py-16 text-center">
                <div class="flex flex-col items-center gap-2">
                  <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <FolderOpen class="w-5 h-5 text-gray-400 dark:text-gray-600" />
                  </div>
                  <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">No units found</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    {{ filterExamTypeId || filterAccessType ? 'Try adjusting the filters.' : 'Create your first unit to get started.' }}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Data -->
          <tbody v-else>
            <tr
              v-for="unit in units"
              :key="unit.id"
              class="border-b border-gray-50 dark:border-gray-800/60 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors duration-100 group"
            >
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <!-- Thumbnail -->
                  <div
                    v-if="unit.imageUrl"
                    class="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                  >
                    <img
                      v-if="getImageSrc(unit.imageUrl)"
                      :src="getImageSrc(unit.imageUrl)!"
                      :alt="unit.unitName"
                      class="w-full h-full object-cover"
                    />
                    <ImageIcon v-else class="w-4 h-4 text-gray-400 dark:text-gray-600" />
                  </div>
                  <span class="font-semibold text-gray-800 dark:text-gray-100">{{ unit.unitName }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {{ examTypeMap[unit.examTypeId] ?? unit.examTypeId }}
              </td>
              <td class="px-4 py-3.5">
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="tag in parseTags(unit.tags)"
                    :key="tag"
                    class="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/8 dark:bg-primary/15 text-primary"
                  >{{ tag }}</span>
                  <span v-if="parseTags(unit.tags).length === 0" class="text-xs text-gray-300 dark:text-gray-600">—</span>
                </div>
              </td>
              <td class="px-4 py-3.5 text-center">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  :class="unit.accessType === 'premium'
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'"
                >
                  {{ unit.accessType === 'premium' ? 'Premium' : 'Free' }}
                </span>
              </td>
              <td class="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {{ formatDate(unit.createdAt) }}
              </td>
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    @click="openEdit(unit)"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/8 dark:hover:bg-primary/15 transition-colors duration-150"
                    title="Edit"
                  >
                    <Pencil class="w-3.5 h-3.5" />
                  </button>
                  <button
                    @click="confirmDelete(unit)"
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
              class="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              :aria-label="modalMode === 'create' ? 'New Unit' : 'Edit Unit'"
            >
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h2 class="text-base font-bold text-gray-900 dark:text-white">
                  {{ modalMode === 'create' ? 'New Unit' : 'Edit Unit' }}
                </h2>
                <button
                  @click="closeModal"
                  class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                  aria-label="Close"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <!-- Form (scrollable) -->
              <form
                @submit.prevent="handleSubmit"
                novalidate
                class="px-6 py-5 space-y-5 overflow-y-auto"
              >

                <!-- Cover Image -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    Cover Image <span class="font-normal text-gray-400">(optional)</span>
                  </label>
                  <ImageUpload
                    ref="imageUploadRef"
                    :current-key="editTarget?.imageUrl ?? null"
                    @change="imageChangeResult = $event"
                  />
                </div>

                <!-- Unit Name -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    Unit Name <span class="text-red-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    v-model="form.unitName"
                    type="text"
                    placeholder="e.g. Chapter 1 – Cell Biology"
                    maxlength="200"
                    autocomplete="off"
                    class="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none transition-all duration-150"
                    :class="formErrors.unitName
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:border-primary'"
                    :aria-invalid="!!formErrors.unitName"
                  />
                  <div class="flex items-center justify-between mt-1">
                    <p v-if="formErrors.unitName" class="text-xs text-red-500">{{ formErrors.unitName }}</p>
                    <span v-else class="flex-1" />
                    <p class="text-[11px] text-gray-400 dark:text-gray-600 shrink-0">{{ form.unitName.length }}/200</p>
                  </div>
                </div>

                <!-- Exam Type -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    Exam Type <span class="text-red-400" aria-hidden="true">*</span>
                  </label>
                  <div class="relative">
                    <select
                      v-model="form.examTypeId"
                      class="w-full pl-3.5 pr-8 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 outline-none appearance-none transition-all duration-150 cursor-pointer"
                      :class="formErrors.examTypeId
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:border-primary'"
                      :aria-invalid="!!formErrors.examTypeId"
                    >
                      <option value="" disabled>Select an exam type…</option>
                      <option v-for="et in examTypeOptions" :key="et.id" :value="et.id">
                        {{ et.examName }}
                      </option>
                    </select>
                    <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  <p v-if="formErrors.examTypeId" class="mt-1 text-xs text-red-500">
                    {{ formErrors.examTypeId }}
                  </p>
                </div>

                <!-- Access Type -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    Access Type <span class="text-red-400" aria-hidden="true">*</span>
                  </label>
                  <div class="flex items-center gap-3">
                    <label
                      v-for="option in ACCESS_TYPE_OPTIONS"
                      :key="option.value"
                      class="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer transition-all duration-150"
                      :class="form.accessType === option.value
                        ? 'border-primary bg-primary/5 dark:bg-primary/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
                    >
                      <input
                        v-model="form.accessType"
                        type="radio"
                        :value="option.value"
                        class="sr-only"
                      />
                      <span
                        class="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150"
                        :class="form.accessType === option.value
                          ? 'border-primary bg-primary'
                          : 'border-gray-300 dark:border-gray-600'"
                      >
                        <span v-if="form.accessType === option.value" class="w-1.5 h-1.5 rounded-full bg-white" />
                      </span>
                      <div>
                        <p class="text-xs font-semibold" :class="form.accessType === option.value ? 'text-primary' : 'text-gray-700 dark:text-gray-300'">
                          {{ option.label }}
                        </p>
                        <p class="text-[11px] text-gray-400 dark:text-gray-500">{{ option.hint }}</p>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Tags -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    Tags <span class="font-normal text-gray-400">(optional)</span>
                  </label>
                  <TagInput ref="tagInputRef" v-model="form.tags" />
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
                <div class="flex items-center gap-3 pt-1 pb-1">
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
      :name="deleteTarget?.unitName ?? ''"
      item-label="Unit"
      :error="deleteError"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="closeDeleteModal"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Pencil, Trash2, X, FolderOpen, ChevronDown, ImageIcon } from '@lucide/vue'
import {
  listUnits,
  listExamTypes,
  createUnit,
  updateUnit,
  deleteUnitApi,
  parseTags,
  extractApiError,
  getImageSrc,
  type Unit,
  type ExamType,
} from '@/lib/api'
import { ROUTE_NAMES } from '@/lib/route'
import TableSkeleton from '@/components/TableSkeleton.vue'
import TablePagination from '@/components/TablePagination.vue'
import DeleteModal from '@/components/DeleteModal.vue'
import TagInput from '@/components/TagInput.vue'
import ImageUpload from '@/components/ImageUpload.vue'

// ── Constants ─────────────────────────────────────────────────────────────
const PAGE_LIMIT = 20

const ACCESS_TYPE_OPTIONS = [
  { value: 'free', label: 'Free', hint: 'All students' },
  { value: 'premium', label: 'Premium', hint: 'Paid members only' },
] as const

// ── Router ────────────────────────────────────────────────────────────────
const router = useRouter()

// ── List state ────────────────────────────────────────────────────────────
const units = ref<Unit[]>([])
const page = ref(1)
const filterExamTypeId = ref('')
const filterAccessType = ref('')
const isLoading = ref(false)
const hasMore = ref(false)
const listError = ref('')

// ── Exam type lookup ──────────────────────────────────────────────────────
const examTypeOptions = ref<ExamType[]>([])

const examTypeMap = computed(() => {
  const map: Record<string, string> = {}
  for (const et of examTypeOptions.value) {
    map[et.id] = et.examName
  }
  return map
})

// ── Modal state ───────────────────────────────────────────────────────────
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editTarget = ref<Unit | null>(null)

const form = ref({
  unitName: '',
  examTypeId: '',
  tags: [] as string[],
  accessType: 'free' as 'free' | 'premium',
})

interface FormErrors {
  unitName?: string
  examTypeId?: string
}
const formErrors = ref<FormErrors>({})
const submitError = ref('')
const isSubmitting = ref(false)

const tagInputRef = ref<InstanceType<typeof TagInput> | null>(null)
const imageUploadRef = ref<InstanceType<typeof ImageUpload> | null>(null)

/**
 * Tracks image changes the user makes in the modal.
 * - undefined  → user didn't touch it (keep existing on edit, no image on create)
 * - null       → user explicitly removed the image
 * - object     → user uploaded a new image (contains R2 key + mimeType)
 */
type ImageChange = { key: string; mimeType: string } | null | undefined
const imageChangeResult = ref<ImageChange>(undefined)

// ── Delete state ──────────────────────────────────────────────────────────
const showDeleteModal = ref(false)
const deleteTarget = ref<Unit | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')

// ── Data fetching ─────────────────────────────────────────────────────────
async function fetchUnits() {
  isLoading.value = true
  listError.value = ''
  try {
    const res = await listUnits({
      examTypeId: filterExamTypeId.value || undefined,
      accessType: (filterAccessType.value as 'free' | 'premium') || undefined,
      page: page.value,
      limit: PAGE_LIMIT,
    })
    if (res.status === 'success' && res.data) {
      units.value = res.data.units
      hasMore.value = res.data.units.length === PAGE_LIMIT
    } else if (res.code === 401) {
      router.push({ name: ROUTE_NAMES.LOGIN })
    } else {
      listError.value = res.message || 'Failed to load units.'
    }
  } catch {
    listError.value = 'Network error. Please check your connection and try again.'
  } finally {
    isLoading.value = false
  }
}

async function fetchExamTypeOptions() {
  try {
    const res = await listExamTypes({ limit: 100 })
    if (res.status === 'success' && res.data) {
      examTypeOptions.value = res.data.examTypes
    }
  } catch {
    // Non-critical — form will show empty dropdown
  }
}

// ── Filter watchers ───────────────────────────────────────────────────────
watch([filterExamTypeId, filterAccessType], () => {
  page.value = 1
  fetchUnits()
})

// ── Pagination ────────────────────────────────────────────────────────────
function prevPage() {
  if (page.value > 1) { page.value--; fetchUnits() }
}
function nextPage() {
  if (hasMore.value) { page.value++; fetchUnits() }
}

// ── Create / Edit modal ───────────────────────────────────────────────────
function openCreate() {
  modalMode.value = 'create'
  editTarget.value = null
  form.value = {
    unitName: '',
    examTypeId: examTypeOptions.value[0]?.id ?? '',
    tags: [],
    accessType: 'free',
  }
  formErrors.value = {}
  submitError.value = ''
  imageChangeResult.value = undefined
  imageUploadRef.value?.reset()
  showModal.value = true
}

function openEdit(unit: Unit) {
  modalMode.value = 'edit'
  editTarget.value = unit
  form.value = {
    unitName: unit.unitName,
    examTypeId: unit.examTypeId,
    tags: parseTags(unit.tags),
    accessType: unit.accessType,
  }
  formErrors.value = {}
  submitError.value = ''
  imageChangeResult.value = undefined
  imageUploadRef.value?.reset()
  showModal.value = true
}

function closeModal() {
  if (isSubmitting.value) return
  showModal.value = false
}

// ── Validation ────────────────────────────────────────────────────────────
function validateForm(): boolean {
  const errors: FormErrors = {}
  const name = form.value.unitName.trim()
  if (!name) {
    errors.unitName = 'Unit name is required.'
  } else if (name.length > 200) {
    errors.unitName = 'Unit name must be 200 characters or less.'
  }
  if (!form.value.examTypeId) {
    errors.examTypeId = 'Please select an exam type.'
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

  const payload: {
    unitName: string
    examTypeId: string
    tags: string[]
    accessType: 'free' | 'premium'
    imageKey?: string
    mimeType?: string
  } = {
    unitName: form.value.unitName.trim(),
    examTypeId: form.value.examTypeId,
    tags: form.value.tags,
    accessType: form.value.accessType,
  }

  // Only send image fields when the user actually changed the image
  if (imageChangeResult.value !== undefined) {
    payload.imageKey = imageChangeResult.value?.key ?? ''
    if (imageChangeResult.value?.mimeType) {
      payload.mimeType = imageChangeResult.value.mimeType
    }
  }

  try {
    const res =
      modalMode.value === 'create'
        ? await createUnit(payload)
        : await updateUnit(editTarget.value!.id, payload)

    if (res.status === 'success') {
      showModal.value = false
      if (modalMode.value === 'create') page.value = 1
      await fetchUnits()
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
function confirmDelete(unit: Unit) {
  deleteTarget.value = unit
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
    const res = await deleteUnitApi(deleteTarget.value.id)
    if (res.status === 'success') {
      showDeleteModal.value = false
      if (units.value.length === 1 && page.value > 1) page.value--
      await fetchUnits()
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
onMounted(() => {
  fetchExamTypeOptions()
  fetchUnits()
})
</script>

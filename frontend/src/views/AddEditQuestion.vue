<template>
  <div class="min-h-full bg-[#F7F8F9] dark:bg-gray-950 transition-colors duration-200">

    <!-- ── Back + page title ─────────────────────────────────────────────── -->
    <div class="mb-6">
      <button
        @click="goBack"
        class="flex items-center gap-2 text-sm font-semibold text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-150 mb-3"
      >
        <ArrowLeft class="w-4 h-4" />
        Back to Questions
      </button>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
            {{ isEdit ? 'Edit' : 'New' }}
          </p>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ isEdit ? 'Edit Question' : 'Add Question' }}
          </h1>
        </div>

        <!-- Unit chip -->
        <div v-if="unitLabel" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <FolderOpen class="w-3.5 h-3.5 text-primary" />
          <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ unitLabel }}</span>
        </div>
      </div>
    </div>

    <!-- ── Loading state ─────────────────────────────────────────────────── -->
    <div v-if="isPageLoading" class="space-y-4">
      <div v-for="n in 4" :key="n" class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-5">
        <div class="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse mb-3" />
        <div class="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    </div>

    <!-- ── Page load error ───────────────────────────────────────────────── -->
    <div v-else-if="pageError" class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-10 text-center">
      <p class="text-sm text-red-500 font-medium">{{ pageError }}</p>
      <button @click="goBack" class="mt-3 text-xs text-primary font-semibold hover:underline">Go Back</button>
    </div>

    <!-- ── Form ──────────────────────────────────────────────────────────── -->
    <form v-else @submit.prevent="handleSubmit" novalidate class="space-y-5">

      <!-- ① Question text -->
      <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-5">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Question</h2>
        <div>
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
            Question Text <span class="text-red-400" aria-hidden="true">*</span>
          </label>
          <textarea
            v-model="form.question"
            rows="3"
            placeholder="Enter the question here…"
            class="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none resize-none transition-all duration-150"
            :class="formErrors.question
              ? 'border-red-400 focus:border-red-400'
              : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:border-primary'"
            :aria-invalid="!!formErrors.question"
          />
          <p v-if="formErrors.question" class="mt-1 text-xs text-red-500">{{ formErrors.question }}</p>
        </div>
      </section>

      <!-- ② Options + correct answer -->
      <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-5">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Answer Options</h2>
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">Select the radio button next to the correct answer.</p>

        <div class="space-y-3">
          <div
            v-for="opt in OPTIONS"
            :key="opt.key"
            class="flex items-start gap-3"
          >
            <!-- Radio to mark correct -->
            <label class="mt-2.5 cursor-pointer">
              <input
                type="radio"
                :value="form[opt.field as keyof typeof form]"
                v-model="form.correctAnswer"
                class="sr-only"
              />
              <span
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-150"
                :class="form.correctAnswer === form[opt.field as keyof typeof form] && form[opt.field as keyof typeof form]
                  ? 'border-emerald-500 bg-emerald-500'
                  : 'border-gray-300 dark:border-gray-600'"
                @click="markCorrect(opt.field)"
              >
                <span v-if="form.correctAnswer === form[opt.field as keyof typeof form] && form[opt.field as keyof typeof form]" class="w-2 h-2 rounded-full bg-white" />
              </span>
            </label>

            <!-- Option letter badge -->
            <span class="w-7 h-7 mt-1.5 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-150"
              :class="form.correctAnswer === form[opt.field as keyof typeof form] && form[opt.field as keyof typeof form]
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'"
            >
              {{ opt.label }}
            </span>

            <!-- Option input -->
            <div class="flex-1">
              <input
                v-model="form[opt.field as keyof typeof form]"
                type="text"
                :placeholder="`Option ${opt.label}…`"
                class="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none transition-all duration-150"
                :class="formErrors[opt.errorKey as keyof FormErrors]
                  ? 'border-red-400 focus:border-red-400'
                  : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:border-primary'"
              />
              <p v-if="formErrors[opt.errorKey as keyof FormErrors]" class="mt-1 text-xs text-red-500">
                {{ formErrors[opt.errorKey as keyof FormErrors] }}
              </p>
            </div>
          </div>
        </div>

        <p v-if="formErrors.correctAnswer" class="mt-3 text-xs text-red-500 font-medium">
          {{ formErrors.correctAnswer }}
        </p>
      </section>

      <!-- ③ Description -->
      <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Description / Explanation
          </h2>
          <span class="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Optional</span>
        </div>
        <textarea
          v-model="form.description"
          rows="5"
          placeholder="Provide an explanation for the correct answer. HTML is supported and will be sanitized."
          class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary resize-none transition-all duration-150"
        />
        <p class="mt-1 text-[11px] text-gray-400 dark:text-gray-600">
          Basic HTML tags are supported (bold, italic, lists, etc.) and will be sanitized on save.
        </p>
      </section>

      <!-- ④ Audio -->
      <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Audio Reference</h2>
          <span class="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Optional</span>
        </div>
        <AudioUpload
          ref="audioUploadRef"
          :current-key="isEdit ? existingAudioKey : null"
          @change="audioChangeResult = $event"
        />
      </section>

      <!-- ⑤ Settings -->
      <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-5">
        <h2 class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Settings</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <!-- Access Type -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              Access Type <span class="text-red-400" aria-hidden="true">*</span>
            </label>
            <div class="flex items-center gap-3">
              <label
                v-for="opt in ACCESS_TYPE_OPTIONS"
                :key="opt.value"
                class="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-150"
                :class="form.accessType === opt.value
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
              >
                <input type="radio" v-model="form.accessType" :value="opt.value" class="sr-only" />
                <span
                  class="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150"
                  :class="form.accessType === opt.value ? 'border-primary bg-primary' : 'border-gray-300 dark:border-gray-600'"
                >
                  <span v-if="form.accessType === opt.value" class="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
                <div>
                  <p class="text-xs font-semibold" :class="form.accessType === opt.value ? 'text-primary' : 'text-gray-700 dark:text-gray-300'">{{ opt.label }}</p>
                  <p class="text-[11px] text-gray-400 dark:text-gray-500">{{ opt.hint }}</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Sequence Order -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Sequence Order <span class="text-red-400" aria-hidden="true">*</span>
            </label>
            <input
              v-model.number="form.sequenceOrder"
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 1"
              class="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none transition-all duration-150"
              :class="formErrors.sequenceOrder
                ? 'border-red-400 focus:border-red-400'
                : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:border-primary'"
              :aria-invalid="!!formErrors.sequenceOrder"
            />
            <p v-if="formErrors.sequenceOrder" class="mt-1 text-xs text-red-500">{{ formErrors.sequenceOrder }}</p>
            <p v-else class="mt-1 text-[11px] text-gray-400 dark:text-gray-600">
              Questions are displayed to students in ascending order.
            </p>
          </div>
        </div>
      </section>

      <!-- API error -->
      <p
        v-if="submitError"
        class="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-500/10 px-4 py-3 rounded-xl"
        role="alert"
      >
        {{ submitError }}
      </p>

      <!-- ── Submit bar ────────────────────────────────────────────────── -->
      <div class="flex items-center gap-3 pb-8">
        <button
          type="button"
          @click="goBack"
          class="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
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
          <span v-else>{{ isEdit ? 'Save Changes' : 'Create Question' }}</span>
        </button>
      </div>
    </form>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, FolderOpen } from '@lucide/vue'
import {
  getQuestion,
  createQuestion,
  updateQuestion,
  listUnits,
  extractApiError,
  type Unit,
} from '@/lib/api'
import { ROUTE_NAMES } from '@/lib/route'
import AudioUpload from '@/components/AudioUpload.vue'

// ── Constants ─────────────────────────────────────────────────────────────
const OPTIONS = [
  { key: 'A', label: 'A', field: 'option1', errorKey: 'option1' },
  { key: 'B', label: 'B', field: 'option2', errorKey: 'option2' },
  { key: 'C', label: 'C', field: 'option3', errorKey: 'option3' },
  { key: 'D', label: 'D', field: 'option4', errorKey: 'option4' },
] as const

const ACCESS_TYPE_OPTIONS = [
  { value: 'free', label: 'Free', hint: 'All students' },
  { value: 'premium', label: 'Premium', hint: 'Paid members' },
] as const

// ── Router / Route ────────────────────────────────────────────────────────
const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params['id'])
const questionId = computed(() => route.params['id'] as string | undefined)
const unitIdFromQuery = computed(() => route.query['unitId'] as string | undefined)

// ── Page state ────────────────────────────────────────────────────────────
const isPageLoading = ref(false)
const pageError = ref('')

// ── Unit info ─────────────────────────────────────────────────────────────
const unitLabel = ref('')
const unitIdForNav = ref('')

// ── Form state ────────────────────────────────────────────────────────────
const form = ref({
  question: '',
  option1: '',
  option2: '',
  option3: '',
  option4: '',
  correctAnswer: '',
  description: '',
  accessType: 'free' as 'free' | 'premium',
  sequenceOrder: 1,
})

interface FormErrors {
  question?: string
  option1?: string
  option2?: string
  option3?: string
  option4?: string
  correctAnswer?: string
  sequenceOrder?: string
}
const formErrors = ref<FormErrors>({})
const submitError = ref('')
const isSubmitting = ref(false)

// ── Audio ─────────────────────────────────────────────────────────────────
const audioUploadRef = ref<InstanceType<typeof AudioUpload> | null>(null)
const existingAudioKey = ref<string | null>(null)
type AudioChange = { key: string; mimeType: string } | null | undefined
const audioChangeResult = ref<AudioChange>(undefined)

// ── Helpers ───────────────────────────────────────────────────────────────
function markCorrect(field: string) {
  form.value.correctAnswer = form.value[field as keyof typeof form.value] as string
}

function goBack() {
  router.push({
    name: ROUTE_NAMES.QUESTION_LIST,
    ...(unitIdForNav.value ? { query: { unitId: unitIdForNav.value } } : {}),
  })
}

// ── Validation ────────────────────────────────────────────────────────────
function validateForm(): boolean {
  const errors: FormErrors = {}
  if (!form.value.question.trim()) errors.question = 'Question text is required.'
  if (!form.value.option1.trim()) errors.option1 = 'Option A is required.'
  if (!form.value.option2.trim()) errors.option2 = 'Option B is required.'
  if (!form.value.option3.trim()) errors.option3 = 'Option C is required.'
  if (!form.value.option4.trim()) errors.option4 = 'Option D is required.'
  if (!form.value.correctAnswer) {
    errors.correctAnswer = 'Please mark the correct answer by clicking the radio button next to it.'
  } else {
    const validAnswers = [form.value.option1, form.value.option2, form.value.option3, form.value.option4]
    if (!validAnswers.includes(form.value.correctAnswer)) {
      errors.correctAnswer = 'Correct answer must match one of the four options.'
    }
  }
  if (!Number.isInteger(form.value.sequenceOrder) || form.value.sequenceOrder < 0) {
    errors.sequenceOrder = 'Must be a non-negative whole number.'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

// ── Submit ────────────────────────────────────────────────────────────────
async function handleSubmit() {
  if (!validateForm()) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  isSubmitting.value = true
  submitError.value = ''

  try {
    if (isEdit.value && questionId.value) {
      const payload: Parameters<typeof updateQuestion>[1] = {
        question: form.value.question.trim(),
        option1: form.value.option1.trim(),
        option2: form.value.option2.trim(),
        option3: form.value.option3.trim(),
        option4: form.value.option4.trim(),
        correctAnswer: form.value.correctAnswer.trim(),
        description: form.value.description.trim() || undefined,
        accessType: form.value.accessType,
        sequenceOrder: form.value.sequenceOrder,
      }
      if (audioChangeResult.value !== undefined) {
        payload.audioKey = audioChangeResult.value?.key ?? ''
        if (audioChangeResult.value?.mimeType) payload.mimeType = audioChangeResult.value.mimeType
      }
      const res = await updateQuestion(questionId.value, payload)
      if (res.status === 'success') {
        goBack()
      } else if (res.code === 401) {
        router.push({ name: ROUTE_NAMES.LOGIN })
      } else {
        submitError.value = extractApiError(res)
      }
    } else {
      const unitId = unitIdFromQuery.value ?? ''
      if (!unitId) {
        submitError.value = 'Unit ID is missing. Go back and select a unit first.'
        return
      }
      const payload: Parameters<typeof createQuestion>[0] = {
        question: form.value.question.trim(),
        option1: form.value.option1.trim(),
        option2: form.value.option2.trim(),
        option3: form.value.option3.trim(),
        option4: form.value.option4.trim(),
        correctAnswer: form.value.correctAnswer.trim(),
        description: form.value.description.trim() || undefined,
        accessType: form.value.accessType,
        sequenceOrder: form.value.sequenceOrder,
        unitId,
      }
      if (audioChangeResult.value) {
        payload.audioKey = audioChangeResult.value.key
        payload.mimeType = audioChangeResult.value.mimeType
      }
      const res = await createQuestion(payload)
      if (res.status === 'success') {
        goBack()
      } else if (res.code === 401) {
        router.push({ name: ROUTE_NAMES.LOGIN })
      } else {
        submitError.value = extractApiError(res)
      }
    }
  } catch {
    submitError.value = 'Something went wrong. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

// ── Load existing question (edit mode) ────────────────────────────────────
async function loadQuestion(id: string) {
  isPageLoading.value = true
  pageError.value = ''
  try {
    const res = await getQuestion(id)
    if (res.status === 'success' && res.data) {
      const q = res.data.question
      form.value = {
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correctAnswer: q.correctAnswer,
        description: q.description ?? '',
        accessType: q.accessType,
        sequenceOrder: q.sequenceOrder,
      }
      existingAudioKey.value = q.audioUrl
      unitIdForNav.value = q.unitId
      // Resolve unit name
      const unitsRes = await listUnits({ limit: 100 })
      if (unitsRes.status === 'success' && unitsRes.data) {
        const unit = unitsRes.data.units.find((u: Unit) => u.id === q.unitId)
        unitLabel.value = unit?.unitName ?? ''
      }
    } else if (res.code === 401) {
      router.push({ name: ROUTE_NAMES.LOGIN })
    } else {
      pageError.value = res.message || 'Failed to load question.'
    }
  } catch {
    pageError.value = 'Network error. Please try again.'
  } finally {
    isPageLoading.value = false
  }
}

// ── Load unit label (create mode) ─────────────────────────────────────────
async function loadUnitLabel(unitId: string) {
  unitIdForNav.value = unitId
  try {
    const res = await listUnits({ limit: 100 })
    if (res.status === 'success' && res.data) {
      const unit = res.data.units.find((u: Unit) => u.id === unitId)
      unitLabel.value = unit?.unitName ?? ''
    }
  } catch { /* non-critical */ }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  if (isEdit.value && questionId.value) {
    await loadQuestion(questionId.value)
  } else if (unitIdFromQuery.value) {
    await loadUnitLabel(unitIdFromQuery.value)
    // Auto-set sequence order to next available
    form.value.sequenceOrder = 1
  }
})
</script>

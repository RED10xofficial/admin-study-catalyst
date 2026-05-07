<template>
  <div class="min-h-full bg-[#F7F8F9] dark:bg-gray-950 transition-colors duration-200">

    <!-- ── Page header ──────────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Manage</p>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Book Codes</h1>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <Transition name="fade">
          <button v-if="selectedCodes.size > 0"
            @click="downloadQrCodes"
            :disabled="generatingQr"
            class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60">
            <ImageDown class="w-4 h-4" />
            <span v-if="generatingQr">{{ qrProgress.current }}/{{ qrProgress.total }}…</span>
            <span v-else>Create QR Codes ({{ selectedCodes.size }})</span>
          </button>
        </Transition>
        <button @click="openGenerate"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150">
          <Plus class="w-4 h-4" /> Generate Code
        </button>
        <button @click="openBulk"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary text-primary text-sm font-semibold hover:bg-primary/5 active:scale-[0.98] transition-all duration-150">
          <Layers class="w-4 h-4" /> Bulk Generate
        </button>
        <button @click="handleExport" :disabled="exporting"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.98] transition-all duration-150 disabled:opacity-60">
          <Download class="w-4 h-4" />
          {{ exporting ? 'Exporting…' : 'Export CSV' }}
        </button>
      </div>
    </div>

    <!-- ── List card ────────────────────────────────────────────────────── -->
    <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800">

      <!-- Toolbar: status tabs + export error -->
      <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
          <button v-for="tab in statusTabs" :key="tab.value"
            @click="setStatusFilter(tab.value)"
            :class="['px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-150',
              activeStatus === tab.value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200']">
            {{ tab.label }}
          </button>
        </div>
        <div v-if="exportError" class="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs">
          <AlertCircle class="w-3.5 h-3.5 shrink-0" />
          {{ exportError }}
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th class="px-4 py-3 w-10">
                <input type="checkbox"
                  :checked="allUnusedSelected"
                  :indeterminate="selectedCodes.size > 0 && !allUnusedSelected"
                  @change="toggleAllUnused"
                  :disabled="unusedInView.length === 0"
                  class="w-4 h-4 rounded border-gray-300 text-primary accent-primary cursor-pointer disabled:opacity-40"
                  title="Select all unused codes" />
              </th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Code</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Status</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Used At</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Expires At</th>
              <th class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Created</th>
              <th class="px-4 py-3 w-24" />
            </tr>
          </thead>

          <!-- Loading -->
          <TableSkeleton v-if="loading" :rows="8" :cols="7" />

          <!-- Empty -->
          <tbody v-else-if="codes.length === 0">
            <tr>
              <td colspan="7" class="px-4 py-16 text-center">
                <div class="flex flex-col items-center gap-2">
                  <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <QrCode class="w-5 h-5 text-gray-400 dark:text-gray-600" />
                  </div>
                  <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">No book codes found</p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    {{ activeStatus ? `No ${activeStatus} codes yet.` : 'Generate your first code above.' }}
                  </p>
                </div>
              </td>
            </tr>
          </tbody>

          <!-- Data -->
          <tbody v-else>
            <tr v-for="code in codes" :key="code.id"
              :class="['border-b border-gray-50 dark:border-gray-800/60 last:border-0 transition-colors duration-100 group',
                selectedCodes.has(code.code) ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/30']">

              <!-- Checkbox -->
              <td class="px-4 py-3.5 w-10">
                <input v-if="code.status === 'unused'"
                  type="checkbox"
                  :checked="selectedCodes.has(code.code)"
                  @change="toggleCode(code.code)"
                  class="w-4 h-4 rounded border-gray-300 text-primary accent-primary cursor-pointer" />
              </td>

              <!-- Code -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-semibold text-gray-800 dark:text-gray-100 tracking-wider">{{ code.code }}</span>
                  <button @click="copyText(code.code, code.id + '-code')"
                    class="p-1 rounded-md text-gray-300 dark:text-gray-600 hover:text-primary hover:bg-primary/8 dark:hover:bg-primary/15 transition-colors duration-150"
                    :title="copied === code.id + '-code' ? 'Copied!' : 'Copy code'">
                    <CheckCheck v-if="copied === code.id + '-code'" class="w-3.5 h-3.5 text-green-500" />
                    <Copy v-else class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>

              <!-- Status badge -->
              <td class="px-4 py-3.5">
                <span :class="['inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium', statusClass(code.status)]">
                  <span class="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                  {{ code.status }}
                </span>
              </td>

              <!-- Used At -->
              <td class="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {{ code.usedAt ? formatDate(code.usedAt) : '—' }}
              </td>

              <!-- Expires At -->
              <td class="px-4 py-3.5 text-xs whitespace-nowrap">
                <span v-if="!code.expiresAt" class="text-gray-400 dark:text-gray-500">No expiry</span>
                <span v-else :class="isExpired(code.expiresAt) ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'">
                  {{ formatDate(code.expiresAt) }}
                </span>
              </td>

              <!-- Created -->
              <td class="px-4 py-3.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{{ formatDate(code.createdAt) }}</td>

              <!-- Actions -->
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button v-if="code.status === 'blocked' || code.status === 'expired'"
                    @click="promptStatusChange(code, 'unused')"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors duration-150"
                    title="Reactivate (set to Unused)">
                    <RotateCcw class="w-3.5 h-3.5" />
                  </button>
                  <button v-if="code.status !== 'blocked' && code.status !== 'used'"
                    @click="promptStatusChange(code, 'blocked')"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors duration-150"
                    title="Block code">
                    <Ban class="w-3.5 h-3.5" />
                  </button>
                  <button v-if="code.status === 'used'"
                    @click="promptStatusChange(code, 'blocked')"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors duration-150"
                    title="Block code">
                    <Ban class="w-3.5 h-3.5" />
                  </button>
                  <button v-if="!code.usedByUserId"
                    @click="promptDelete(code)"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150"
                    title="Delete code">
                    <Trash2 class="w-3.5 h-3.5" />
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

    <!-- ── Generate Single Code Modal ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showGenerate"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="showGenerate = false">
          <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <QrCode class="w-5 h-5 text-primary" />
                </div>
                <h2 class="text-base font-bold text-gray-900 dark:text-white">Generate Code</h2>
              </div>
              <button @click="showGenerate = false" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Expiry Date <span class="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
                </label>
                <input type="datetime-local" v-model="generateExpiry"
                  class="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Leave empty for no expiry.</p>
              </div>

              <p v-if="generateError" class="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">
                {{ generateError }}
              </p>

              <div v-if="generatedCode"
                class="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                <CheckCircle class="w-5 h-5 text-green-600 shrink-0" />
                <div class="min-w-0">
                  <p class="text-xs text-green-700 dark:text-green-400 font-medium">Code generated!</p>
                  <p class="font-mono font-bold text-green-900 dark:text-green-300 text-lg tracking-wider">{{ generatedCode }}</p>
                </div>
                <button @click="copyText(generatedCode, 'gen-result')"
                  class="shrink-0 p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 text-green-600 transition-colors">
                  <CheckCheck v-if="copied === 'gen-result'" class="w-4 h-4" />
                  <Copy v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div class="flex gap-3 mt-5">
              <button @click="showGenerate = false"
                class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                {{ generatedCode ? 'Close' : 'Cancel' }}
              </button>
              <button @click="handleGenerate" :disabled="generating"
                class="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {{ generating ? 'Generating…' : 'Generate' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Bulk Generate Modal ───────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showBulk"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="closeBulk">
          <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Layers class="w-5 h-5 text-primary" />
                </div>
                <h2 class="text-base font-bold text-gray-900 dark:text-white">Bulk Generate</h2>
              </div>
              <button @click="closeBulk" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Number of Codes <span class="text-red-500">*</span>
                </label>
                <input type="number" v-model.number="bulkCount"
                  min="1" max="100" placeholder="e.g. 50"
                  :class="['w-full border rounded-xl px-3 py-2.5 text-sm dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                    bulkErrors.count ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700']" />
                <p v-if="bulkErrors.count" class="text-xs text-red-600 mt-1">{{ bulkErrors.count }}</p>
                <p v-else class="text-xs text-gray-400 dark:text-gray-500 mt-1">Maximum 100 codes per request.</p>
              </div>

              <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Expiry Date <span class="font-normal text-gray-400 dark:text-gray-500">(optional)</span>
                </label>
                <input type="datetime-local" v-model="bulkExpiry"
                  class="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>

              <p v-if="bulkError" class="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{{ bulkError }}</p>

              <div v-if="bulkCreated !== null"
                class="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                <CheckCircle class="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p class="text-xs text-green-700 dark:text-green-400 font-medium">Success!</p>
                  <p class="text-sm font-bold text-green-900 dark:text-green-300">{{ bulkCreated }} code{{ bulkCreated !== 1 ? 's' : '' }} created</p>
                </div>
              </div>
            </div>

            <div class="flex gap-3 mt-5">
              <button @click="closeBulk"
                class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                {{ bulkCreated !== null ? 'Close' : 'Cancel' }}
              </button>
              <button @click="handleBulkGenerate" :disabled="bulking || bulkCreated !== null"
                class="flex-1 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                {{ bulking ? 'Generating…' : 'Generate' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Status Change Confirmation Modal ─────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="statusTarget"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="statusTarget = null">
          <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div class="flex items-center gap-3 mb-4">
              <div :class="['w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                statusTarget.newStatus === 'blocked' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30']">
                <Ban v-if="statusTarget.newStatus === 'blocked'" class="w-5 h-5 text-orange-600" />
                <RotateCcw v-else class="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 capitalize">
                  {{ statusTarget.newStatus === 'blocked' ? 'Block' : 'Reactivate' }} Code
                </h3>
                <p class="text-xs font-mono text-gray-500 dark:text-gray-400 tracking-wider">{{ statusTarget.code.code }}</p>
              </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-5">
              {{
                statusTarget.newStatus === 'blocked'
                  ? 'This code will be blocked and cannot be used to activate a premium account.'
                  : 'This code will be reactivated and become available for use.'
              }}
            </p>
            <p v-if="statusError" class="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl mb-3">{{ statusError }}</p>
            <div class="flex gap-3">
              <button @click="statusTarget = null; statusError = ''"
                class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button @click="confirmStatusChange" :disabled="statusChanging"
                :class="['flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-colors',
                  statusTarget.newStatus === 'blocked' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700']">
                {{ statusChanging ? 'Saving…' : (statusTarget.newStatus === 'blocked' ? 'Block' : 'Reactivate') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Delete Confirmation ───────────────────────────────────────────── -->
    <DeleteModal
      :show="!!deleteTarget"
      :name="deleteTarget?.code ?? ''"
      item-label="Book Code"
      :error="deleteError"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null; deleteError = ''"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, createApp, h, defineComponent, nextTick } from 'vue'
import { QrcodeCanvas } from 'qrcode.vue'
import JSZip from 'jszip'
import {
  Plus, Layers, Download, Copy, CheckCheck, Trash2, Ban, RotateCcw,
  QrCode, X, CheckCircle, AlertCircle, ImageDown,
} from '@lucide/vue'
import {
  listBookCodes,
  generateCodeApi,
  bulkGenerateCodesApi,
  updateBookCodeStatus,
  deleteBookCodeApi,
  exportBookCodesApi,
  extractApiError,
  type BookCode,
  type BookCodeListParams,
} from '@/lib/api'
import TableSkeleton from '@/components/TableSkeleton.vue'
import TablePagination from '@/components/TablePagination.vue'
import DeleteModal from '@/components/DeleteModal.vue'

const LIMIT = 50

// ── Status tabs ────────────────────────────────────────────────────────────
type StatusFilter = '' | 'unused' | 'used' | 'expired' | 'blocked'

const statusTabs: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Unused', value: 'unused' },
  { label: 'Used', value: 'used' },
  { label: 'Expired', value: 'expired' },
  { label: 'Blocked', value: 'blocked' },
]

// ── State ──────────────────────────────────────────────────────────────────
const codes = ref<BookCode[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const page = ref(1)
const hasMore = ref(false)
const activeStatus = ref<StatusFilter>('')

const copied = ref('')
let copiedTimer: ReturnType<typeof setTimeout> | null = null

// Generate single
const showGenerate = ref(false)
const generateExpiry = ref('')
const generating = ref(false)
const generateError = ref('')
const generatedCode = ref('')

// Bulk generate
const showBulk = ref(false)
const bulkCount = ref<number | null>(null)
const bulkExpiry = ref('')
const bulking = ref(false)
const bulkError = ref('')
const bulkCreated = ref<number | null>(null)

interface BulkErrors { count?: string }
const bulkErrors = ref<BulkErrors>({})

// Status change
const statusTarget = ref<{ code: BookCode; newStatus: 'blocked' | 'unused' | 'expired' } | null>(null)
const statusChanging = ref(false)
const statusError = ref('')

// Delete
const deleteTarget = ref<BookCode | null>(null)
const deleting = ref(false)
const deleteError = ref('')

// Export
const exporting = ref(false)
const exportError = ref('')

// QR code selection & generation
const selectedCodes = ref<Set<string>>(new Set())
const generatingQr = ref(false)
const qrProgress = ref({ current: 0, total: 0 })

const QR_BASE_URL: string = (import.meta.env['VITE_QR_BASE_URL'] as string | undefined) ?? ''

const unusedInView = computed(() => codes.value.filter((c: BookCode) => c.status === 'unused'))
const allUnusedSelected = computed(
  () => unusedInView.value.length > 0 && unusedInView.value.every((c: BookCode) => selectedCodes.value.has(c.code))
)

function toggleCode(code: string) {
  const set = new Set(selectedCodes.value)
  if (set.has(code)) set.delete(code)
  else set.add(code)
  selectedCodes.value = set
}

function toggleAllUnused() {
  if (allUnusedSelected.value) {
    const set = new Set(selectedCodes.value)
    unusedInView.value.forEach((c: BookCode) => set.delete(c.code))
    selectedCodes.value = set
  } else {
    const set = new Set(selectedCodes.value)
    unusedInView.value.forEach((c: BookCode) => set.add(c.code))
    selectedCodes.value = set
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
function statusClass(status: BookCode['status']): string {
  const map: Record<BookCode['status'], string> = {
    unused:  'bg-green-50 text-green-700',
    used:    'bg-blue-50 text-blue-700',
    expired: 'bg-gray-100 text-gray-500',
    blocked: 'bg-red-50 text-red-600',
  }
  return map[status] ?? 'bg-gray-100 text-gray-500'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) < new Date()
}

function toIso(localDatetime: string): string {
  return localDatetime ? new Date(localDatetime).toISOString() : ''
}

async function copyText(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = key
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => { copied.value = '' }, 2000)
  } catch {
    // clipboard not available
  }
}

// ── Data fetching ──────────────────────────────────────────────────────────
function buildParams(): BookCodeListParams {
  const p: BookCodeListParams = { page: page.value, limit: LIMIT }
  if (activeStatus.value) p.status = activeStatus.value
  return p
}

async function fetchCodes(replace = true) {
  if (replace) loading.value = true
  else loadingMore.value = true

  const res = await listBookCodes(buildParams())

  if (replace) loading.value = false
  else loadingMore.value = false

  if (res.status === 'success' && res.data) {
    const list = res.data.bookCodes
    if (replace) codes.value = list
    else codes.value.push(...list)
    hasMore.value = list.length === LIMIT
  }
}

function setStatusFilter(status: StatusFilter) {
  activeStatus.value = status
  page.value = 1
  fetchCodes(true)
}

function prevPage() {
  if (page.value <= 1) return
  page.value--
  fetchCodes(true)
}

function nextPage() {
  page.value++
  fetchCodes(true)
}

// ── Generate single ────────────────────────────────────────────────────────
function openGenerate() {
  generateExpiry.value = ''
  generateError.value = ''
  generatedCode.value = ''
  showGenerate.value = true
}

async function handleGenerate() {
  generating.value = true
  generateError.value = ''

  const expiresAt = generateExpiry.value ? toIso(generateExpiry.value) : undefined
  const res = await generateCodeApi(expiresAt)
  generating.value = false

  if (res.status === 'success' && res.data) {
    generatedCode.value = res.data.bookCode.code
    // Prepend to list if filter matches
    if (!activeStatus.value || activeStatus.value === 'unused') {
      codes.value.unshift(res.data.bookCode)
    }
  } else {
    generateError.value = extractApiError(res)
  }
}

// ── Bulk generate ──────────────────────────────────────────────────────────
function openBulk() {
  bulkCount.value = null
  bulkExpiry.value = ''
  bulkError.value = ''
  bulkErrors.value = {}
  bulkCreated.value = null
  showBulk.value = true
}

function closeBulk() {
  showBulk.value = false
  if (bulkCreated.value !== null) {
    fetchCodes(true)
  }
}

function validateBulk(): boolean {
  const errs: BulkErrors = {}
  if (!bulkCount.value || bulkCount.value < 1) {
    errs.count = 'Enter a number between 1 and 100.'
  } else if (bulkCount.value > 100) {
    errs.count = 'Maximum 100 codes per request.'
  }
  bulkErrors.value = errs
  return Object.keys(errs).length === 0
}

async function handleBulkGenerate() {
  if (!validateBulk()) return
  bulking.value = true
  bulkError.value = ''

  const expiresAt = bulkExpiry.value ? toIso(bulkExpiry.value) : undefined
  const res = await bulkGenerateCodesApi(bulkCount.value!, expiresAt)
  bulking.value = false

  if (res.status === 'success' && res.data) {
    bulkCreated.value = res.data.created
  } else {
    bulkError.value = extractApiError(res)
  }
}

// ── Status change ──────────────────────────────────────────────────────────
function promptStatusChange(code: BookCode, newStatus: 'blocked' | 'unused' | 'expired') {
  statusTarget.value = { code, newStatus }
  statusError.value = ''
}

async function confirmStatusChange() {
  if (!statusTarget.value) return
  statusChanging.value = true
  statusError.value = ''

  const { code, newStatus } = statusTarget.value
  const res = await updateBookCodeStatus(code.id, newStatus)
  statusChanging.value = false

  if (res.status === 'success' && res.data) {
    const idx = codes.value.findIndex((c: BookCode) => c.id === code.id)
    if (idx !== -1) {
      codes.value[idx] = res.data.bookCode
      // If filtering by status and the code no longer matches, remove it
      if (activeStatus.value && res.data.bookCode.status !== activeStatus.value) {
        codes.value.splice(idx, 1)
      }
    }
    statusTarget.value = null
  } else {
    statusError.value = extractApiError(res)
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────
function promptDelete(code: BookCode) {
  deleteTarget.value = code
  deleteError.value = ''
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = ''

  const res = await deleteBookCodeApi(deleteTarget.value.id)
  deleting.value = false

  if (res.status === 'success') {
    codes.value = codes.value.filter((c: BookCode) => c.id !== deleteTarget.value!.id)
    deleteTarget.value = null
  } else {
    deleteError.value = extractApiError(res)
  }
}

// ── Export ─────────────────────────────────────────────────────────────────
async function handleExport() {
  exporting.value = true
  exportError.value = ''

  const res = await exportBookCodesApi()
  exporting.value = false

  if (res.status === 'success' && res.data) {
    window.open(res.data.downloadUrl, '_blank', 'noopener')
  } else {
    exportError.value = extractApiError(res)
  }
}

// ── QR Code generation ─────────────────────────────────────────────────────
function renderQrDataUrl(value: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const container = document.createElement('div')
    container.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden'
    document.body.appendChild(container)

    let appInstance: ReturnType<typeof createApp> | null = null

    const Wrapper = defineComponent({
      setup() {
        onMounted(async () => {
          await nextTick()
          const canvas = container.querySelector('canvas') as HTMLCanvasElement | null
          if (canvas) {
            resolve(canvas.toDataURL('image/png'))
          } else {
            reject(new Error('QR canvas not found'))
          }
          if (appInstance) {
            appInstance.unmount()
            document.body.removeChild(container)
          }
        })
        return () => h(QrcodeCanvas, { value, size, level: 'M' })
      },
    })

    appInstance = createApp(Wrapper)
    appInstance.mount(container)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function generateQrImageBlob(code: string): Promise<Blob> {
  const QR_SIZE = 280
  const PADDING = 24
  const TEXT_HEIGHT = 52

  const url = `${QR_BASE_URL}?activationcode=${code}`
  const qrDataUrl = await renderQrDataUrl(url, QR_SIZE)
  const qrImg = await loadImage(qrDataUrl)

  const canvas = document.createElement('canvas')
  canvas.width = QR_SIZE + PADDING * 2
  canvas.height = QR_SIZE + TEXT_HEIGHT + PADDING * 2

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(qrImg, PADDING, PADDING, QR_SIZE, QR_SIZE)

  ctx.fillStyle = '#111111'
  ctx.font = 'bold 18px "Courier New", Courier, monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(code, canvas.width / 2, QR_SIZE + PADDING + TEXT_HEIGHT / 2)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to create blob from canvas'))
    }, 'image/png')
  })
}

async function downloadQrCodes() {
  const codesArray = Array.from(selectedCodes.value)
  if (codesArray.length === 0) return

  generatingQr.value = true
  qrProgress.value = { current: 0, total: codesArray.length }

  try {
    const zip = new JSZip()
    const folder = zip.folder('book-codes-qr')!

    for (const code of codesArray) {
      const blob = await generateQrImageBlob(code)
      folder.file(`${code}.png`, blob)
      qrProgress.value = { current: qrProgress.value.current + 1, total: codesArray.length }
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = 'book-codes-qr.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    selectedCodes.value = new Set()
  } finally {
    generatingQr.value = false
    qrProgress.value = { current: 0, total: 0 }
  }
}

onMounted(() => fetchCodes())
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

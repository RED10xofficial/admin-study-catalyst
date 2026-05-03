<template>
  <div class="min-h-full bg-[#F7F8F9] dark:bg-gray-950 transition-colors duration-200">
    <!-- ── Page header ──────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p
          class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1"
        >
          Manage
        </p>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Questions</h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="showBulkModal = true"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors duration-150"
        >
          <Upload class="w-4 h-4" />
          Bulk Upload
        </button>
        <button
          @click="addQuestion"
          :disabled="!selectedUnit"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          <Plus class="w-4 h-4" />
          Add Question
        </button>
      </div>
    </div>

    <!-- ── Unit selector ────────────────────────────────────────────────── -->
    <section
      class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-4 mb-5"
    >
      <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
        Select Unit to view questions
      </label>
      <!-- Combobox -->
      <div class="relative max-w-sm" ref="comboboxRef">
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          />
          <input
            v-model="unitSearch"
            type="text"
            placeholder="Search units…"
            class="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary transition-all duration-150"
            @focus="comboboxOpen = true"
            @keydown.escape="comboboxOpen = false"
            @keydown.arrow-down.prevent="highlightNext"
            @keydown.arrow-up.prevent="highlightPrev"
            @keydown.enter.prevent="selectHighlighted"
          />
          <button
            v-if="selectedUnit"
            type="button"
            @click="clearUnit"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-150"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Dropdown list -->
        <Transition
          enter-active-class="transition-all duration-150"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-100"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="comboboxOpen && filteredUnits.length > 0"
            class="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden max-h-64 overflow-y-auto"
          >
            <button
              v-for="(unit, idx) in filteredUnits"
              :key="unit.id"
              type="button"
              @click="selectUnit(unit)"
              @mouseenter="highlightIndex = idx"
              class="w-full text-left px-4 py-2.5 text-sm transition-colors duration-100"
              :class="
                highlightIndex === idx
                  ? 'bg-primary/8 dark:bg-primary/15 text-primary font-medium'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
              "
            >
              <span class="font-medium">{{ unit.unitName }}</span>
              <span class="text-xs text-gray-400 dark:text-gray-500 ml-2">
                {{ examTypeMap[unit.examTypeId] ?? '' }}
              </span>
            </button>
          </div>
        </Transition>
      </div>

      <!-- Selected unit chip -->
      <div v-if="selectedUnit" class="mt-3 flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/8 dark:bg-primary/15 text-xs font-semibold text-primary"
        >
          <FolderOpen class="w-3.5 h-3.5" />
          {{ selectedUnit.unitName }}
        </span>
        <span v-if="!isLoading" class="text-xs text-gray-400 dark:text-gray-500">
          {{ questions.length }} question{{ questions.length !== 1 ? 's' : '' }}
          <template v-if="hasMore">+</template>
        </span>
      </div>
    </section>

    <!-- ── Questions list ────────────────────────────────────────────────── -->
    <div v-if="selectedUnit">
      <!-- Loading skeletons -->
      <div v-if="isLoading" class="space-y-3">
        <div
          v-for="n in 4"
          :key="n"
          class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-4 animate-pulse"
        >
          <div class="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-3" />
          <div class="grid grid-cols-2 gap-2">
            <div v-for="i in 4" :key="i" class="h-9 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="listError"
        class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-8 text-center"
      >
        <p class="text-sm text-red-500 font-medium">{{ listError }}</p>
        <button
          @click="fetchQuestions"
          class="mt-2 text-xs text-primary font-semibold hover:underline"
        >
          Try again
        </button>
      </div>

      <!-- Empty -->
      <div
        v-else-if="questions.length === 0"
        class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-16 text-center"
      >
        <div class="flex flex-col items-center gap-2">
          <div
            class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
          >
            <HelpCircle class="w-5 h-5 text-gray-400 dark:text-gray-600" />
          </div>
          <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">No questions yet</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">
            Add the first question for this unit.
          </p>
          <button
            @click="addQuestion"
            class="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors duration-150"
          >
            <Plus class="w-3.5 h-3.5" />
            Add Question
          </button>
        </div>
      </div>

      <!-- Question cards -->
      <div v-else class="space-y-3">
        <div
          v-for="q in questions"
          :key="q.id"
          class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-4 hover:shadow-sm transition-shadow duration-200"
        >
          <!-- Card header row -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Sequence badge -->
              <span
                class="w-7 h-7 rounded-lg bg-primary/8 dark:bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0"
              >
                {{ q.sequenceOrder }}
              </span>

              <!-- Access badge -->
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                :class="
                  q.accessType === 'premium'
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                "
              >
                {{ q.accessType === 'premium' ? 'Premium' : 'Free' }}
              </span>

              <!-- Audio indicator -->
              <button
                v-if="q.audioUrl"
                type="button"
                @click="toggleQuestionAudio(q)"
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors duration-150"
                :title="playingQuestionId === q.id ? 'Pause audio' : 'Play audio'"
              >
                <Pause v-if="playingQuestionId === q.id" class="w-3 h-3" />
                <Headphones v-else class="w-3 h-3" />
                {{ playingQuestionId === q.id ? 'Pause' : 'Audio' }}
              </button>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                @click="editQuestion(q.id)"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/8 dark:hover:bg-primary/15 transition-colors duration-150"
                title="Edit"
              >
                <Pencil class="w-3.5 h-3.5" />
              </button>
              <button
                @click="confirmDelete(q)"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors duration-150"
                title="Delete"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Question text -->
          <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-relaxed mb-3">
            {{ q.question }}
          </p>

          <!-- Options grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="(opt, idx) in getOptions(q)"
              :key="idx"
              class="flex items-start gap-2.5 px-3 py-2 rounded-xl border transition-colors duration-100"
              :class="
                opt.text === q.correctAnswer
                  ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                  : 'border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40'
              "
            >
              <span
                class="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                :class="
                  opt.text === q.correctAnswer
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                "
              >
                {{ opt.label }}
              </span>
              <span
                class="text-xs leading-snug"
                :class="
                  opt.text === q.correctAnswer
                    ? 'text-emerald-700 dark:text-emerald-300 font-medium'
                    : 'text-gray-600 dark:text-gray-400'
                "
              >
                {{ opt.text }}
              </span>
              <span v-if="opt.text === q.correctAnswer" class="ml-auto shrink-0">
                <CheckCircle class="w-3.5 h-3.5 text-emerald-500" />
              </span>
            </div>
          </div>

          <!-- Description preview -->
          <div
            v-if="q.description"
            class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2"
            v-html="q.description"
          />
        </div>
      </div>

      <!-- Pagination -->
      <TablePagination
        v-if="!isLoading && !listError && questions.length > 0"
        class="mt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800"
        :page="page"
        :has-more="hasMore"
        @prev="prevPage"
        @next="nextPage"
      />
    </div>

    <!-- ── No unit selected hint ─────────────────────────────────────────── -->
    <div
      v-else
      class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800 p-16 text-center"
    >
      <div class="flex flex-col items-center gap-2">
        <div
          class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
        >
          <ListOrdered class="w-5 h-5 text-gray-400 dark:text-gray-600" />
        </div>
        <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">Select a unit above</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          Questions will appear here once you pick a unit.
        </p>
      </div>
    </div>

    <!-- ── Hidden audio for list playback ──────────────────────────────── -->
    <audio ref="listAudioRef" class="sr-only" @ended="playingQuestionId = null" />

    <!-- ── Delete Confirmation ──────────────────────────────────────────── -->
    <DeleteModal
      :show="showDeleteModal"
      :name="deleteTarget?.question.slice(0, 60) ?? ''"
      item-label="Question"
      :error="deleteError"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />

    <!-- ── Bulk Upload Modal ─────────────────────────────────────────────── -->
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
          v-if="showBulkModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="showBulkModal = false"
        >
          <Transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
          >
            <div
              v-if="showBulkModal"
              class="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Bulk Upload Questions"
            >
              <!-- Header -->
              <div
                class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0"
              >
                <div>
                  <h2 class="text-base font-bold text-gray-900 dark:text-white">
                    Bulk Upload Questions
                  </h2>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    Upload questions via Excel with audio &amp; image assets
                  </p>
                </div>
                <button
                  @click="showBulkModal = false"
                  class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                  aria-label="Close"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <!-- Body -->
              <div class="px-6 py-5 space-y-5 overflow-y-auto">
                <!-- Naming convention note -->
                <div
                  class="flex gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20"
                >
                  <Info class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    <p class="font-semibold mb-1">Naming convention</p>
                    <p>
                      Each row in the Excel sheet must have a unique <strong>ID</strong>. Audio and
                      image files must be named with the same ID (e.g.
                      <code class="bg-amber-100 dark:bg-amber-500/20 px-1 rounded">q001.mp3</code>,
                      <code class="bg-amber-100 dark:bg-amber-500/20 px-1 rounded">q001.jpg</code>)
                      and stored in a folder named after the unit.
                    </p>
                  </div>
                </div>

                <!-- Step 1: Excel file -->
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                      >1</span
                    >
                    <label class="text-xs font-semibold text-gray-700 dark:text-gray-200"
                      >Questions Excel Sheet</label
                    >
                  </div>
                  <div
                    @click="bulkExcelRef?.click()"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/5 cursor-pointer transition-all duration-150"
                  >
                    <FileSpreadsheet class="w-8 h-8 text-emerald-500 shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                        {{ bulkExcelFile?.name ?? 'Click to select Excel file' }}
                      </p>
                      <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        .xlsx, .xls accepted
                      </p>
                    </div>
                    <span v-if="bulkExcelFile" class="text-[11px] font-semibold text-emerald-500"
                      >Selected ✓</span
                    >
                  </div>
                  <input
                    ref="bulkExcelRef"
                    type="file"
                    accept=".xlsx,.xls"
                    class="sr-only"
                    @change="onExcelSelect"
                  />
                </div>

                <!-- Step 2: Audio files -->
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                      >2</span
                    >
                    <label class="text-xs font-semibold text-gray-700 dark:text-gray-200"
                      >Audio Files <span class="font-normal text-gray-400">(optional)</span></label
                    >
                  </div>
                  <div
                    @click="bulkAudioRef?.click()"
                    @dragover.prevent="bulkAudioDragging = true"
                    @dragleave.prevent="bulkAudioDragging = false"
                    @drop.prevent="onBulkAudioDrop"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150"
                    :class="
                      bulkAudioDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-primary hover:bg-primary/5'
                    "
                  >
                    <Music class="w-8 h-8 text-sky-500 shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {{
                          bulkAudioFiles.length > 0
                            ? `${bulkAudioFiles.length} file(s) selected`
                            : 'Click or drag audio files'
                        }}
                      </p>
                      <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        MP3, OGG, WAV • Multiple files allowed
                      </p>
                    </div>
                    <span
                      v-if="bulkAudioFiles.length > 0"
                      class="text-[11px] font-semibold text-sky-500"
                      >{{ bulkAudioFiles.length }} ✓</span
                    >
                  </div>
                  <input
                    ref="bulkAudioRef"
                    type="file"
                    accept="audio/*"
                    multiple
                    class="sr-only"
                    @change="onAudioSelect"
                  />
                </div>

                <!-- Step 3: Image files -->
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                      >3</span
                    >
                    <label class="text-xs font-semibold text-gray-700 dark:text-gray-200"
                      >Image Files <span class="font-normal text-gray-400">(optional)</span></label
                    >
                  </div>
                  <div
                    @click="bulkImageRef?.click()"
                    @dragover.prevent="bulkImageDragging = true"
                    @dragleave.prevent="bulkImageDragging = false"
                    @drop.prevent="onBulkImageDrop"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150"
                    :class="
                      bulkImageDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-primary hover:bg-primary/5'
                    "
                  >
                    <ImageIcon class="w-8 h-8 text-violet-500 shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {{
                          bulkImageFiles.length > 0
                            ? `${bulkImageFiles.length} file(s) selected`
                            : 'Click or drag image files'
                        }}
                      </p>
                      <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        JPEG, PNG, WebP • Multiple files allowed
                      </p>
                    </div>
                    <span
                      v-if="bulkImageFiles.length > 0"
                      class="text-[11px] font-semibold text-violet-500"
                      >{{ bulkImageFiles.length }} ✓</span
                    >
                  </div>
                  <input
                    ref="bulkImageRef"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    class="sr-only"
                    @change="onImageSelect"
                  />
                </div>

                <!-- Coming soon note -->
                <div
                  class="flex gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <Construction class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Bulk upload processing is coming soon. You can select files now to verify the
                    selection, but the actual upload will be enabled in a future update.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div
                class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 shrink-0"
              >
                <button
                  @click="showBulkModal = false"
                  class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  disabled
                  class="flex-1 py-2.5 rounded-xl bg-primary/40 text-white text-sm font-semibold cursor-not-allowed"
                  title="Coming soon"
                >
                  Upload (Coming Soon)
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Plus,
  Search,
  X,
  Pencil,
  Trash2,
  Upload,
  CheckCircle,
  HelpCircle,
  FolderOpen,
  Headphones,
  Pause,
  ListOrdered,
  FileSpreadsheet,
  Music,
  ImageIcon,
  Info,
  Construction,
} from '@lucide/vue';
import {
  listUnits,
  listExamTypes,
  listQuestions,
  deleteQuestionApi,
  extractApiError,
  getImageSrc,
  type Unit,
  type ExamType,
  type Question,
} from '@/lib/api';
import { ROUTE_NAMES } from '@/lib/route';
import TablePagination from '@/components/TablePagination.vue';
import DeleteModal from '@/components/DeleteModal.vue';
import { useUnitStore } from '@/stores/unit';
const unitStore = useUnitStore();
// ── Constants ─────────────────────────────────────────────────────────────
const PAGE_LIMIT = 50;

// ── Router ────────────────────────────────────────────────────────────────
const router = useRouter();

// ── Unit combobox ─────────────────────────────────────────────────────────
const allUnits = ref<Unit[]>([]);
const allExamTypes = ref<ExamType[]>([]);
const unitSearch = ref('');
const selectedUnit = ref<Unit | null>(null);
const comboboxOpen = ref(false);
const comboboxRef = ref<HTMLElement | null>(null);
const highlightIndex = ref(0);

const examTypeMap = computed(() => {
  const map: Record<string, string> = {};
  for (const et of allExamTypes.value) map[et.id] = et.examName;
  return map;
});

const filteredUnits = computed<Unit[]>(() => {
  const q = unitSearch.value.toLowerCase().trim();
  if (!q) return allUnits.value;
  return allUnits.value.filter(
    (u: Unit) =>
      u.unitName.toLowerCase().includes(q) ||
      (examTypeMap.value[u.examTypeId] ?? '').toLowerCase().includes(q),
  );
});

function selectUnit(unit: Unit) {
  selectedUnit.value = unit;
  unitStore.setSelectedUnitForQuestion(unit);
  unitSearch.value = unit.unitName;
  comboboxOpen.value = false;
  highlightIndex.value = 0;
  page.value = 1;
  fetchQuestions();
}

function clearUnit() {
  selectedUnit.value = null;
  unitSearch.value = '';
  questions.value = [];
  comboboxOpen.value = false;
}

function highlightNext() {
  highlightIndex.value = Math.min(highlightIndex.value + 1, filteredUnits.value.length - 1);
}

function highlightPrev() {
  highlightIndex.value = Math.max(highlightIndex.value - 1, 0);
}

function selectHighlighted() {
  const unit = filteredUnits.value[highlightIndex.value];
  if (unit) selectUnit(unit);
}

// Close combobox on outside click
function handleDocClick(e: MouseEvent) {
  if (comboboxRef.value && !comboboxRef.value.contains(e.target as Node)) {
    comboboxOpen.value = false;
  }
}

// ── Questions list ────────────────────────────────────────────────────────
const questions = ref<Question[]>([]);
const page = ref(1);
const isLoading = ref(false);
const hasMore = ref(false);
const listError = ref('');

async function fetchQuestions() {
  if (!selectedUnit.value) return;
  isLoading.value = true;
  listError.value = '';
  try {
    const res = await listQuestions({
      unitId: selectedUnit.value.id,
      page: page.value,
      limit: PAGE_LIMIT,
    });
    if (res.status === 'success' && res.data) {
      questions.value = res.data.questions;
      hasMore.value = res.data.questions.length === PAGE_LIMIT;
    } else if (res.code === 401) {
      router.push({ name: ROUTE_NAMES.LOGIN });
    } else {
      listError.value = res.message || 'Failed to load questions.';
    }
  } catch {
    listError.value = 'Network error. Please try again.';
  } finally {
    isLoading.value = false;
  }
}

function prevPage() {
  if (page.value > 1) {
    page.value--;
    fetchQuestions();
  }
}

function nextPage() {
  if (hasMore.value) {
    page.value++;
    fetchQuestions();
  }
}

// ── Navigation ────────────────────────────────────────────────────────────
function addQuestion() {
  if (!selectedUnit.value) return;
  router.push({ name: ROUTE_NAMES.ADD_QUESTION, query: { unitId: selectedUnit.value.id } });
}

function editQuestion(id: string) {
  router.push({ name: ROUTE_NAMES.EDIT_QUESTION, params: { id } });
}

// ── Delete ────────────────────────────────────────────────────────────────
const showDeleteModal = ref(false);
const deleteTarget = ref<Question | null>(null);
const isDeleting = ref(false);
const deleteError = ref('');

function confirmDelete(q: Question) {
  deleteTarget.value = q;
  deleteError.value = '';
  showDeleteModal.value = true;
}

async function handleDelete() {
  if (!deleteTarget.value) return;
  isDeleting.value = true;
  deleteError.value = '';
  try {
    const res = await deleteQuestionApi(deleteTarget.value.id);
    if (res.status === 'success') {
      showDeleteModal.value = false;
      if (questions.value.length === 1 && page.value > 1) page.value--;
      await fetchQuestions();
    } else if (res.code === 401) {
      router.push({ name: ROUTE_NAMES.LOGIN });
    } else {
      deleteError.value = extractApiError(res);
    }
  } catch {
    deleteError.value = 'Something went wrong. Please try again.';
  } finally {
    isDeleting.value = false;
  }
}

// ── Inline audio playback ─────────────────────────────────────────────────
const listAudioRef = ref<HTMLAudioElement | null>(null);
const playingQuestionId = ref<string | null>(null);

function toggleQuestionAudio(q: Question) {
  if (!q.audioUrl) return;
  const src = getImageSrc(q.audioUrl);
  if (!src) return;

  if (playingQuestionId.value === q.id) {
    listAudioRef.value?.pause();
    playingQuestionId.value = null;
    return;
  }

  if (listAudioRef.value) {
    listAudioRef.value.pause();
    listAudioRef.value.src = src;
    listAudioRef.value
      .play()
      .then(() => {
        playingQuestionId.value = q.id;
      })
      .catch(() => {
        playingQuestionId.value = null;
      });
  }
}

// ── Bulk upload modal ─────────────────────────────────────────────────────
const showBulkModal = ref(false);
const bulkExcelRef = ref<HTMLInputElement | null>(null);
const bulkAudioRef = ref<HTMLInputElement | null>(null);
const bulkImageRef = ref<HTMLInputElement | null>(null);
const bulkExcelFile = ref<File | null>(null);
const bulkAudioFiles = ref<File[]>([]);
const bulkImageFiles = ref<File[]>([]);
const bulkAudioDragging = ref(false);
const bulkImageDragging = ref(false);

function onExcelSelect(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) bulkExcelFile.value = f;
}

function onAudioSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files) bulkAudioFiles.value = Array.from(files);
}

function onImageSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files) bulkImageFiles.value = Array.from(files);
}

function onBulkAudioDrop(e: DragEvent) {
  bulkAudioDragging.value = false;
  const files = e.dataTransfer?.files;
  if (files) bulkAudioFiles.value = Array.from(files);
}

function onBulkImageDrop(e: DragEvent) {
  bulkImageDragging.value = false;
  const files = e.dataTransfer?.files;
  if (files) bulkImageFiles.value = Array.from(files);
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getOptions(q: Question) {
  return [
    { label: 'A', text: q.option1 },
    { label: 'B', text: q.option2 },
    { label: 'C', text: q.option3 },
    { label: 'D', text: q.option4 },
  ];
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  document.addEventListener('click', handleDocClick);
  try {
    const [unitsRes, etRes] = await Promise.all([
      listUnits({ limit: 100 }),
      listExamTypes({ limit: 100 }),
    ]);
    if (unitsRes.status === 'success' && unitsRes.data) {
      allUnits.value = unitsRes.data.units;
    }
    if (etRes.status === 'success' && etRes.data) {
      allExamTypes.value = etRes.data.examTypes;
    }
    if (unitStore.selectedUnitForQuestion) {
      selectedUnit.value = unitStore.selectedUnitForQuestion;
      unitSearch.value = selectedUnit.value?.unitName ?? '';
      fetchQuestions();
    } else {
      selectedUnit.value = null;
    }
  } catch {
    /* non-critical */
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocClick);
  listAudioRef.value?.pause();
});


// Reset highlight when dropdown options change
watch(filteredUnits, () => {
  highlightIndex.value = 0;
});
</script>

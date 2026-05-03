<template>
  <div class="min-h-full bg-[#F7F8F9] dark:bg-gray-950 transition-colors duration-200">

    <!-- ── Page header ──────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Manage</p>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Exam Questions</h1>
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
          @click="openCreate"
          class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all duration-150"
        >
          <Plus class="w-4 h-4" />
          Add Question
        </button>
      </div>
    </div>

    <!-- ── List card ────────────────────────────────────────────────────── -->
    <section class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-300/40 dark:border-gray-800">

      <!-- Toolbar -->
      <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-3">

        <!-- Unit filter -->
        <select
          v-model="filterUnitId"
          @change="resetAndFetch"
          class="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors duration-150"
        >
          <option value="">All Units</option>
          <option v-for="u in allUnits" :key="u.id" :value="u.id">{{ u.unitName }}</option>
        </select>

        <!-- Difficulty filter -->
        <select
          v-model="filterDifficulty"
          @change="resetAndFetch"
          class="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors duration-150"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <span v-if="!isLoading" class="ml-auto text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
          {{ examQuestions.length }} result{{ examQuestions.length !== 1 ? 's' : '' }}
          <template v-if="hasMore">+</template>
        </span>
      </div>

      <!-- Loading skeletons -->
      <div v-if="isLoading" class="p-4 space-y-3">
        <div
          v-for="n in 4" :key="n"
          class="rounded-2xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse"
        >
          <div class="flex gap-3 mb-3">
            <div class="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
            <div class="h-5 w-12 bg-gray-100 dark:bg-gray-800 rounded-full" />
          </div>
          <div class="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-3" />
          <div class="grid grid-cols-2 gap-2">
            <div v-for="i in 4" :key="i" class="h-9 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="listError" class="p-12 text-center">
        <p class="text-sm text-red-500 font-medium">{{ listError }}</p>
        <button @click="fetchList" class="mt-2 text-xs text-primary font-semibold hover:underline">Try again</button>
      </div>

      <!-- Empty -->
      <div v-else-if="examQuestions.length === 0" class="p-16 text-center">
        <div class="flex flex-col items-center gap-2">
          <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <GraduationCap class="w-5 h-5 text-gray-400 dark:text-gray-600" />
          </div>
          <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">No exam questions yet</p>
          <p class="text-xs text-gray-400 dark:text-gray-500">
            {{ filterUnitId || filterDifficulty ? 'No questions match the current filters.' : 'Add the first exam question to get started.' }}
          </p>
          <button
            v-if="!filterUnitId && !filterDifficulty"
            @click="openCreate"
            class="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors duration-150"
          >
            <Plus class="w-3.5 h-3.5" />
            Add Question
          </button>
        </div>
      </div>

      <!-- Question cards -->
      <div v-else class="p-4 space-y-3">
        <div
          v-for="(q, idx) in examQuestions"
          :key="q.id"
          class="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/30 p-4 hover:shadow-sm transition-shadow duration-200"
        >
          <!-- Card header -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Index -->
              <span class="w-7 h-7 rounded-lg bg-primary/8 dark:bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {{ (page - 1) * PAGE_LIMIT + idx + 1 }}
              </span>

              <!-- Difficulty badge -->
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                :class="DIFFICULTY_STYLES[q.difficulty]"
              >
                {{ q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) }}
              </span>

              <!-- Access badge (only if set) -->
              <span
                v-if="q.accessType"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              >
                {{ q.accessType === 'premium' ? 'Premium' : 'Free' }}
              </span>

              <!-- Unit chip -->
              <span class="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                {{ unitMap[q.unitId] ?? '' }}
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                @click="openEdit(q)"
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

          <!-- Options 2×2 grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="opt in getOptions(q)"
              :key="opt.label"
              class="flex items-start gap-2.5 px-3 py-2 rounded-xl border transition-colors duration-100"
              :class="opt.text === q.correctAnswer
                ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/60'"
            >
              <span
                class="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                :class="opt.text === q.correctAnswer
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'"
              >
                {{ opt.label }}
              </span>
              <span
                class="text-xs leading-snug"
                :class="opt.text === q.correctAnswer
                  ? 'text-emerald-700 dark:text-emerald-300 font-medium'
                  : 'text-gray-600 dark:text-gray-400'"
              >
                {{ opt.text }}
              </span>
              <CheckCircle v-if="opt.text === q.correctAnswer" class="w-3.5 h-3.5 text-emerald-500 ml-auto shrink-0 mt-0.5" />
            </div>
          </div>

          <!-- Analytics row -->
          <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div v-if="q.totalAttempts === 0" class="flex items-center gap-1.5">
              <BarChart2 class="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
              <span class="text-[11px] text-gray-400 dark:text-gray-500">No attempts yet</span>
            </div>
            <div v-else class="space-y-1.5">
              <!-- Stats row -->
              <div class="flex items-center gap-4 flex-wrap">
                <span class="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  <BarChart2 class="w-3 h-3" />
                  {{ q.totalAttempts }} attempt{{ q.totalAttempts !== 1 ? 's' : '' }}
                </span>
                <span class="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle class="w-3 h-3" />
                  {{ q.correctAttempts }} correct
                  <span class="font-normal text-emerald-500/70">
                    ({{ Math.round((q.correctAttempts / q.totalAttempts) * 100) }}%)
                  </span>
                </span>
                <span class="flex items-center gap-1 text-[11px] text-red-500 dark:text-red-400 font-semibold">
                  <XCircle class="w-3 h-3" />
                  {{ q.wrongAttempts }} wrong
                  <span class="font-normal text-red-400/70">
                    ({{ Math.round((q.wrongAttempts / q.totalAttempts) * 100) }}%)
                  </span>
                </span>
              </div>
              <!-- Accuracy bar -->
              <div class="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  class="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  :style="{ width: `${Math.round((q.correctAttempts / q.totalAttempts) * 100)}%` }"
                />
              </div>
            </div>
          </div>

          <!-- Short description -->
          <p
            v-if="q.shortDescription"
            class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2"
          >
            {{ q.shortDescription }}
          </p>
        </div>
      </div>

      <!-- Pagination -->
      <TablePagination
        v-if="!isLoading && !listError && examQuestions.length > 0"
        :page="page"
        :has-more="hasMore"
        @prev="prevPage"
        @next="nextPage"
      />
    </section>

    <!-- ── Delete Modal ──────────────────────────────────────────────────── -->
    <DeleteModal
      :show="showDeleteModal"
      :name="deleteTarget?.question.slice(0, 60) ?? ''"
      item-label="Exam Question"
      :error="deleteError"
      :loading="isDeleting"
      @confirm="handleDelete"
      @cancel="showDeleteModal = false"
    />

    <!-- ── Add / Edit Modal ──────────────────────────────────────────────── -->
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
          v-if="showFormModal"
          class="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          @click.self="closeFormModal"
        >
          <Transition
            enter-active-class="transition-all duration-200"
            enter-from-class="opacity-0 scale-95 translate-y-2"
            enter-to-class="opacity-100 scale-100 translate-y-0"
          >
            <div
              v-if="showFormModal"
              class="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl my-6"
              role="dialog"
              aria-modal="true"
            >
              <!-- Modal header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 class="text-base font-bold text-gray-900 dark:text-white">
                  {{ isEditMode ? 'Edit Exam Question' : 'Add Exam Question' }}
                </h2>
                <button
                  @click="closeFormModal"
                  class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <!-- Modal body -->
              <form @submit.prevent="handleSubmit" novalidate class="px-6 py-5 space-y-5">

                <!-- ① Question text -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    Question <span class="text-red-400">*</span>
                  </label>
                  <textarea
                    v-model="form.question"
                    rows="3"
                    placeholder="Enter the question text…"
                    class="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none resize-none transition-all duration-150"
                    :class="formErrors.question
                      ? 'border-red-400 focus:border-red-400'
                      : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:border-primary'"
                  />
                  <p v-if="formErrors.question" class="mt-1 text-xs text-red-500">{{ formErrors.question }}</p>
                </div>

                <!-- ② Options -->
                <div>
                  <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    Answer Options <span class="text-red-400">*</span>
                  </label>
                  <p class="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
                    Click the radio button to mark the correct answer.
                  </p>
                  <div class="space-y-2.5">
                    <div v-for="(opt, i) in OPTION_DEFS" :key="opt.field" class="flex items-center gap-3">
                      <!-- Radio -->
                      <button
                        type="button"
                        @click="form.correctOption = i"
                        class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150"
                        :class="form.correctOption === i
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-gray-300 dark:border-gray-600'"
                      >
                        <span v-if="form.correctOption === i" class="w-2 h-2 rounded-full bg-white" />
                      </button>

                      <!-- Option label badge -->
                      <span
                        class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-150"
                        :class="form.correctOption === i
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'"
                      >
                        {{ opt.label }}
                      </span>

                      <!-- Input -->
                      <div class="flex-1">
                        <input
                          v-model="form[opt.field as keyof typeof form] as string"
                          type="text"
                          :placeholder="`Option ${opt.label}…`"
                          class="w-full px-3.5 py-2 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none transition-all duration-150"
                          :class="formErrors[opt.errorKey as keyof FormErrors]
                            ? 'border-red-400 focus:border-red-400'
                            : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:border-primary'"
                        />
                        <p v-if="formErrors[opt.errorKey as keyof FormErrors]" class="mt-0.5 text-xs text-red-500">
                          {{ formErrors[opt.errorKey as keyof FormErrors] }}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p v-if="formErrors.correctAnswer" class="mt-2 text-xs text-red-500 font-medium">
                    {{ formErrors.correctAnswer }}
                  </p>
                </div>

                <!-- ③ Short description -->
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Short Description</label>
                    <span class="text-[11px] text-gray-400 dark:text-gray-500">Optional</span>
                  </div>
                  <textarea
                    v-model="form.shortDescription"
                    rows="2"
                    placeholder="Brief explanation shown after answering…"
                    class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary resize-none transition-all duration-150"
                  />
                </div>

                <!-- ④ Settings row -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

                  <!-- Unit (create only) -->
                  <div v-if="!isEditMode">
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                      Unit <span class="text-red-400">*</span>
                    </label>
                    <select
                      v-model="form.unitId"
                      class="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 outline-none transition-all duration-150"
                      :class="formErrors.unitId
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-gray-200 dark:border-gray-700 focus:bg-white dark:focus:bg-gray-900 focus:border-primary'"
                    >
                      <option value="" disabled>Select unit…</option>
                      <option v-for="u in allUnits" :key="u.id" :value="u.id">{{ u.unitName }}</option>
                    </select>
                    <p v-if="formErrors.unitId" class="mt-1 text-xs text-red-500">{{ formErrors.unitId }}</p>
                  </div>

                  <!-- Unit read-only (edit) -->
                  <div v-else>
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Unit</label>
                    <div class="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 truncate">
                      {{ unitMap[form.unitId] ?? form.unitId }}
                    </div>
                  </div>

                  <!-- Difficulty -->
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                      Difficulty <span class="text-red-400">*</span>
                    </label>
                    <select
                      v-model="form.difficulty"
                      class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary transition-all duration-150"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <!-- Access Type -->
                  <div>
                    <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Access Type</label>
                    <select
                      v-model="form.accessType"
                      class="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 outline-none focus:bg-white dark:focus:bg-gray-900 focus:border-primary transition-all duration-150"
                    >
                      <option value="">Not set</option>
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>

                <!-- API error -->
                <p
                  v-if="submitError"
                  class="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-500/10 px-3 py-2.5 rounded-xl"
                  role="alert"
                >
                  {{ submitError }}
                </p>

                <!-- Footer -->
                <div class="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    @click="closeFormModal"
                    class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    :disabled="isSubmitting"
                    class="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
                  >
                    <span v-if="isSubmitting" class="inline-flex items-center justify-center gap-2">
                      <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Saving…
                    </span>
                    <span v-else>{{ isEditMode ? 'Save Changes' : 'Create Question' }}</span>
                  </button>
                </div>
              </form>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>

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
              class="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
              role="dialog"
              aria-modal="true"
            >
              <!-- Header -->
              <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div>
                  <h2 class="text-base font-bold text-gray-900 dark:text-white">Bulk Upload Exam Questions</h2>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Upload questions via Excel template</p>
                </div>
                <button
                  @click="showBulkModal = false"
                  class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <!-- Body -->
              <div class="px-6 py-5 space-y-5 overflow-y-auto">

                <!-- Naming note -->
                <div class="flex gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <Info class="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Each row in the Excel file must include: question, option1–4, correctAnswer, difficulty (easy / medium / hard), and unitId. The <strong>correctAnswer</strong> must exactly match one of the four option values.
                  </p>
                </div>

                <!-- Step 1: Excel -->
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                    <label class="text-xs font-semibold text-gray-700 dark:text-gray-200">Questions Excel Sheet</label>
                  </div>
                  <div
                    @click="bulkExcelRef?.click()"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all duration-150"
                  >
                    <FileSpreadsheet class="w-8 h-8 text-emerald-500 shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                        {{ bulkExcelFile?.name ?? 'Click to select Excel file' }}
                      </p>
                      <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">.xlsx or .xls accepted</p>
                    </div>
                    <span v-if="bulkExcelFile" class="text-[11px] font-semibold text-emerald-500 shrink-0">Selected ✓</span>
                  </div>
                  <input ref="bulkExcelRef" type="file" accept=".xlsx,.xls" class="sr-only" @change="onExcelSelect" />
                </div>

                <!-- Step 2: Images (optional) -->
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                    <label class="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Image Files <span class="font-normal text-gray-400">(optional)</span>
                    </label>
                  </div>
                  <div
                    @click="bulkImageRef?.click()"
                    @dragover.prevent="bulkImageDragging = true"
                    @dragleave.prevent="bulkImageDragging = false"
                    @drop.prevent="onBulkImageDrop"
                    class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150"
                    :class="bulkImageDragging ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-primary hover:bg-primary/5'"
                  >
                    <ImageIcon class="w-8 h-8 text-violet-500 shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-200">
                        {{ bulkImageFiles.length > 0 ? `${bulkImageFiles.length} file(s) selected` : 'Click or drag image files' }}
                      </p>
                      <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">JPEG, PNG, WebP • Multiple files</p>
                    </div>
                    <span v-if="bulkImageFiles.length > 0" class="text-[11px] font-semibold text-violet-500 shrink-0">{{ bulkImageFiles.length }} ✓</span>
                  </div>
                  <input ref="bulkImageRef" type="file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only" @change="onImageSelect" />
                </div>

                <!-- Coming soon note -->
                <div class="flex gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <Construction class="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Bulk upload processing is coming soon. File selection is available for preview purposes.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 shrink-0">
                <button
                  @click="showBulkModal = false"
                  class="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  disabled
                  class="flex-1 py-2.5 rounded-xl bg-primary/40 text-white text-sm font-semibold cursor-not-allowed"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus, Upload, Pencil, Trash2, X, CheckCircle, XCircle, BarChart2,
  GraduationCap, Info, FileSpreadsheet, ImageIcon, Construction,
} from '@lucide/vue'
import {
  listExamQuestions, createExamQuestion, updateExamQuestion, deleteExamQuestionApi,
  listUnits, extractApiError,
  type ExamQuestion, type Unit,
} from '@/lib/api'
import { ROUTE_NAMES } from '@/lib/route'
import TablePagination from '@/components/TablePagination.vue'
import DeleteModal from '@/components/DeleteModal.vue'

// ── Constants ─────────────────────────────────────────────────────────────
const PAGE_LIMIT = 50

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  medium: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hard: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
}

const OPTION_DEFS = [
  { label: 'A', field: 'option1', errorKey: 'option1' },
  { label: 'B', field: 'option2', errorKey: 'option2' },
  { label: 'C', field: 'option3', errorKey: 'option3' },
  { label: 'D', field: 'option4', errorKey: 'option4' },
] as const

// ── Router ────────────────────────────────────────────────────────────────
const router = useRouter()

// ── Units ─────────────────────────────────────────────────────────────────
const allUnits = ref<Unit[]>([])

const unitMap = computed(() => {
  const map: Record<string, string> = {}
  for (const u of allUnits.value) map[u.id] = u.unitName
  return map
})

// ── Filters ───────────────────────────────────────────────────────────────
const filterUnitId = ref('')
const filterDifficulty = ref<'easy' | 'medium' | 'hard' | ''>('')

// ── List state ────────────────────────────────────────────────────────────
const examQuestions = ref<ExamQuestion[]>([])
const page = ref(1)
const isLoading = ref(false)
const hasMore = ref(false)
const listError = ref('')

async function fetchList() {
  isLoading.value = true
  listError.value = ''
  try {
    const res = await listExamQuestions({
      ...(filterUnitId.value ? { unitId: filterUnitId.value } : {}),
      ...(filterDifficulty.value ? { difficulty: filterDifficulty.value } : {}),
      page: page.value,
      limit: PAGE_LIMIT,
    })
    if (res.status === 'success' && res.data) {
      examQuestions.value = res.data.examQuestions
      hasMore.value = res.data.examQuestions.length === PAGE_LIMIT
    } else if (res.code === 401) {
      router.push({ name: ROUTE_NAMES.LOGIN })
    } else {
      listError.value = res.message || 'Failed to load exam questions.'
    }
  } catch {
    listError.value = 'Network error. Please try again.'
  } finally {
    isLoading.value = false
  }
}

function resetAndFetch() {
  page.value = 1
  fetchList()
}

function prevPage() { if (page.value > 1) { page.value--; fetchList() } }
function nextPage() { if (hasMore.value) { page.value++; fetchList() } }

// ── Form state ────────────────────────────────────────────────────────────
const showFormModal = ref(false)
const isEditMode = ref(false)
const editingId = ref<string | null>(null)
const isSubmitting = ref(false)
const submitError = ref('')

interface FormErrors {
  question?: string
  option1?: string
  option2?: string
  option3?: string
  option4?: string
  correctAnswer?: string
  unitId?: string
}
const formErrors = ref<FormErrors>({})

const BLANK_FORM = {
  question: '',
  option1: '',
  option2: '',
  option3: '',
  option4: '',
  /** Index 0–3 tracking which option is the correct answer. Default: 0 (A). */
  correctOption: 0,
  shortDescription: '',
  unitId: '',
  difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  accessType: '' as 'free' | 'premium' | '',
}

const form = ref({ ...BLANK_FORM })

function openCreate() {
  isEditMode.value = false
  editingId.value = null
  form.value = { ...BLANK_FORM }
  formErrors.value = {}
  submitError.value = ''
  showFormModal.value = true
}

function openEdit(q: ExamQuestion) {
  isEditMode.value = true
  editingId.value = q.id
  const opts = [q.option1, q.option2, q.option3, q.option4]
  const correctIdx = opts.indexOf(q.correctAnswer)
  form.value = {
    question: q.question,
    option1: q.option1,
    option2: q.option2,
    option3: q.option3,
    option4: q.option4,
    correctOption: correctIdx >= 0 ? correctIdx : 0,
    shortDescription: q.shortDescription ?? '',
    unitId: q.unitId,
    difficulty: q.difficulty,
    accessType: q.accessType ?? '',
  }
  formErrors.value = {}
  submitError.value = ''
  showFormModal.value = true
}

function closeFormModal() {
  if (isSubmitting.value) return
  showFormModal.value = false
}

// ── Validation ────────────────────────────────────────────────────────────
function validateForm(): boolean {
  const errors: FormErrors = {}
  if (!form.value.question.trim()) errors.question = 'Question text is required.'
  if (!form.value.option1.trim()) errors.option1 = 'Option A is required.'
  if (!form.value.option2.trim()) errors.option2 = 'Option B is required.'
  if (!form.value.option3.trim()) errors.option3 = 'Option C is required.'
  if (!form.value.option4.trim()) errors.option4 = 'Option D is required.'
  if (!isEditMode.value && !form.value.unitId) errors.unitId = 'Please select a unit.'

  // Derive correctAnswer from the selected radio index
  const options = [form.value.option1, form.value.option2, form.value.option3, form.value.option4]
  const selectedOpt = options[form.value.correctOption]
  if (!selectedOpt?.trim()) {
    errors.correctAnswer = 'The selected correct answer option must not be empty.'
  }

  formErrors.value = errors
  return Object.keys(errors).length === 0
}

// ── Submit ────────────────────────────────────────────────────────────────
async function handleSubmit() {
  if (!validateForm()) return
  isSubmitting.value = true
  submitError.value = ''

  // Derive correctAnswer at submit time (always reflects latest option text)
  const options = [form.value.option1, form.value.option2, form.value.option3, form.value.option4]
  const correctAnswer = options[form.value.correctOption] ?? ''

  try {
    if (isEditMode.value && editingId.value) {
      const payload = {
        question: form.value.question.trim(),
        option1: form.value.option1.trim(),
        option2: form.value.option2.trim(),
        option3: form.value.option3.trim(),
        option4: form.value.option4.trim(),
        correctAnswer: correctAnswer.trim(),
        shortDescription: form.value.shortDescription.trim() || undefined,
        difficulty: form.value.difficulty,
        ...(form.value.accessType ? { accessType: form.value.accessType as 'free' | 'premium' } : {}),
      }
      const res = await updateExamQuestion(editingId.value, payload)
      if (res.status === 'success') {
        showFormModal.value = false
        await fetchList()
      } else if (res.code === 401) {
        router.push({ name: ROUTE_NAMES.LOGIN })
      } else {
        submitError.value = extractApiError(res)
      }
    } else {
      const payload = {
        question: form.value.question.trim(),
        option1: form.value.option1.trim(),
        option2: form.value.option2.trim(),
        option3: form.value.option3.trim(),
        option4: form.value.option4.trim(),
        correctAnswer: correctAnswer.trim(),
        shortDescription: form.value.shortDescription.trim() || undefined,
        difficulty: form.value.difficulty,
        unitId: form.value.unitId,
        ...(form.value.accessType ? { accessType: form.value.accessType as 'free' | 'premium' } : {}),
      }
      const res = await createExamQuestion(payload)
      if (res.status === 'success') {
        showFormModal.value = false
        resetAndFetch()
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

// ── Delete ────────────────────────────────────────────────────────────────
const showDeleteModal = ref(false)
const deleteTarget = ref<ExamQuestion | null>(null)
const isDeleting = ref(false)
const deleteError = ref('')

function confirmDelete(q: ExamQuestion) {
  deleteTarget.value = q
  deleteError.value = ''
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  deleteError.value = ''
  try {
    const res = await deleteExamQuestionApi(deleteTarget.value.id)
    if (res.status === 'success') {
      showDeleteModal.value = false
      if (examQuestions.value.length === 1 && page.value > 1) page.value--
      await fetchList()
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

// ── Bulk upload modal ─────────────────────────────────────────────────────
const showBulkModal = ref(false)
const bulkExcelRef = ref<HTMLInputElement | null>(null)
const bulkImageRef = ref<HTMLInputElement | null>(null)
const bulkExcelFile = ref<File | null>(null)
const bulkImageFiles = ref<File[]>([])
const bulkImageDragging = ref(false)

function onExcelSelect(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) bulkExcelFile.value = f
}
function onImageSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) bulkImageFiles.value = Array.from(files)
}
function onBulkImageDrop(e: DragEvent) {
  bulkImageDragging.value = false
  const files = e.dataTransfer?.files
  if (files) bulkImageFiles.value = Array.from(files)
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getOptions(q: ExamQuestion) {
  return [
    { label: 'A', text: q.option1 },
    { label: 'B', text: q.option2 },
    { label: 'C', text: q.option3 },
    { label: 'D', text: q.option4 },
  ]
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const res = await listUnits({ limit: 100 })
    if (res.status === 'success' && res.data) allUnits.value = res.data.units
  } catch { /* non-critical */ }
  await fetchList()
})
</script>

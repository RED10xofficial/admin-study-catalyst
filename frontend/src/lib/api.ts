// ---------------------------------------------------------------------------
// Base API response shape
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error'
  code: number
  message: string
  data: T | null
  errors: Record<string, string[]> | string | null
  meta: Record<string, unknown> | null
  links: Record<string, string> | null
}

// ---------------------------------------------------------------------------
// Known data payloads
// ---------------------------------------------------------------------------

export interface AuthData {
  accessToken: string
}

// Convenience aliases
export type LoginResponse = ApiResponse<AuthData>

// ---------------------------------------------------------------------------
// Auth provider (registered from main.ts after Pinia is initialised)
// ---------------------------------------------------------------------------

/**
 * Pluggable auth callbacks. Wired up in main.ts so api.ts has no direct
 * dependency on Pinia or vue-router.
 */
interface ApiAuthConfig {
  /** Returns the current access token (from the Pinia auth store). */
  getToken(): string | null
  /**
   * Calls POST /auth/refresh and returns the new access token.
   * Should update the Pinia store with the new token.
   * Throws if refresh fails.
   */
  doRefresh(): Promise<string>
  /** Called when refresh fails — should clear auth state and go to login. */
  onAuthFailure(): void
}

let _authConfig: ApiAuthConfig | null = null

/**
 * One in-flight refresh promise shared by all concurrent 401 responses.
 * This guarantees that when multiple requests fail with 401 at the same time
 * only a single refresh call is made; all callers await the same promise and
 * then retry with the new token.
 */
let _refreshInFlight: Promise<string> | null = null

/** Paths that must never trigger a refresh retry (to avoid infinite loops). */
const SKIP_REFRESH_PATHS = new Set(['/auth/login', '/auth/refresh'])

/** Register the auth provider. Called once in main.ts. */
export function configureApiAuth(config: ApiAuthConfig): void {
  _authConfig = config
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

const BASE_URL = (import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? ''

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export async function apiFetch<T = unknown>(
  path: string,
  options: {
    method?: HttpMethod
    body?: unknown
    /**
     * Explicit token override. When omitted the helper reads from the Pinia
     * auth store (via the registered auth provider) so callers don't need to
     * thread the token manually.
     */
    token?: string
    headers?: Record<string, string>
  } = {},
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, token, headers: extraHeaders = {} } = options

  // Prefer explicit token → then Pinia store → then localStorage fallback.
  const effectiveToken = token ?? _authConfig?.getToken() ?? localStorage.getItem('accessToken') ?? ''

  const buildHeaders = (tok: string): Record<string, string> => ({
    'Content-Type': 'application/json',
    ...extraHeaders,
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
  })

  const serialisedBody = body !== undefined ? JSON.stringify(body) : undefined

  // With exactOptionalPropertyTypes enabled, `body` must be absent (not undefined)
  // when there is no body to send — spread conditionally to satisfy the type.
  const bodyInit = serialisedBody !== undefined ? { body: serialisedBody } : {}

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(effectiveToken),
    ...bodyInit,
    // Always include cookies so the httpOnly refresh-token cookie is sent
    // automatically on requests to the same origin.
    credentials: 'include',
  })

  const json: ApiResponse<T> = await res.json()

  // ── 401 → attempt token refresh then retry ────────────────────────────
  if (res.status === 401 && _authConfig && !SKIP_REFRESH_PATHS.has(path)) {
    try {
      // All concurrent 401s share one refresh call.
      if (!_refreshInFlight) {
        _refreshInFlight = _authConfig.doRefresh().finally(() => {
          _refreshInFlight = null
        })
      }
      const newToken = await _refreshInFlight

      // Retry the original request with the fresh token.
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: buildHeaders(newToken),
        ...bodyInit,
        credentials: 'include',
      })
      return retryRes.json() as Promise<ApiResponse<T>>
    } catch {
      // Refresh itself failed — the session is dead, send the user to login.
      _authConfig.onAuthFailure()
      return json
    }
  }

  return json
}

// ---------------------------------------------------------------------------
// Auth API calls
// ---------------------------------------------------------------------------

/** Sign out — invalidates the refresh-token cookie on the server. */
export function logoutApi() {
  return apiFetch<null>('/auth/logout', { method: 'POST' })
}

// ---------------------------------------------------------------------------
// Auth token helper
// ---------------------------------------------------------------------------

function getToken(): string {
  // Prefer Pinia store (kept in sync) then fall back to localStorage.
  return _authConfig?.getToken() ?? localStorage.getItem('accessToken') ?? ''
}

// ---------------------------------------------------------------------------
// Exam Types
// ---------------------------------------------------------------------------

export interface ExamType {
  id: string
  examName: string
  /** Raw JSON string stored in the DB (e.g. '["NEET","PG"]'). Use parseExamTypeTags() to decode. */
  tags: string | null
  examQuestionCount: number
  createdAt: string
  updatedAt: string
}

export interface ExamTypeListParams {
  search?: string
  page?: number
  limit?: number
}

export interface CreateExamTypePayload {
  examName: string
  tags?: string[]
  examQuestionCount?: number
}

export type UpdateExamTypePayload = Partial<CreateExamTypePayload>

export function listExamTypes(params: ExamTypeListParams = {}) {
  const q = new URLSearchParams()
  if (params.search) q.set('search', params.search)
  if (params.page !== undefined) q.set('page', String(params.page))
  if (params.limit !== undefined) q.set('limit', String(params.limit))
  const qs = q.toString()
  return apiFetch<{ examTypes: ExamType[] }>(`/exam-types${qs ? `?${qs}` : ''}`, {
    token: getToken(),
  })
}

export function createExamType(data: CreateExamTypePayload) {
  return apiFetch<{ examType: ExamType }>('/exam-types', {
    method: 'POST',
    body: data,
    token: getToken(),
  })
}

export function updateExamType(id: string, data: UpdateExamTypePayload) {
  return apiFetch<{ examType: ExamType }>(`/exam-types/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: data,
    token: getToken(),
  })
}

export function deleteExamTypeApi(id: string) {
  return apiFetch<null>(`/exam-types/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: getToken(),
  })
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

export interface Unit {
  id: string
  unitName: string
  imageUrl: string | null
  examTypeId: string
  tags: string | null
  accessType: 'free' | 'premium'
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface UnitListParams {
  examTypeId?: string
  accessType?: 'free' | 'premium'
  page?: number
  limit?: number
}

export interface CreateUnitPayload {
  unitName: string
  examTypeId: string
  tags?: string[]
  accessType?: 'free' | 'premium'
  /** R2 object key returned by the presign endpoint */
  imageKey?: string
  /** MIME type declared when the file was uploaded */
  mimeType?: string
}

export type UpdateUnitPayload = Partial<CreateUnitPayload>

export function listUnits(params: UnitListParams = {}) {
  const q = new URLSearchParams()
  if (params.examTypeId) q.set('examTypeId', params.examTypeId)
  if (params.accessType) q.set('accessType', params.accessType)
  if (params.page !== undefined) q.set('page', String(params.page))
  if (params.limit !== undefined) q.set('limit', String(params.limit))
  const qs = q.toString()
  return apiFetch<{ units: Unit[] }>(`/units${qs ? `?${qs}` : ''}`, {
    token: getToken(),
  })
}

export function createUnit(data: CreateUnitPayload) {
  return apiFetch<{ unit: Unit }>('/units', {
    method: 'POST',
    body: data,
    token: getToken(),
  })
}

export function updateUnit(id: string, data: UpdateUnitPayload) {
  return apiFetch<{ unit: Unit }>(`/units/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: data,
    token: getToken(),
  })
}

export function deleteUnitApi(id: string) {
  return apiFetch<null>(`/units/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: getToken(),
  })
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export interface PresignedUploadResult {
  uploadUrl: string
  key: string
}

/**
 * Get a presigned PUT URL for uploading directly to R2.
 * After uploading, pass the returned `key` as `imageKey` in create/update payloads.
 */
export function getPresignedUpload(data: {
  type: 'unit-image' | 'question-audio'
  filename: string
  mimeType: string
}) {
  return apiFetch<PresignedUploadResult>('/upload/presign', {
    method: 'POST',
    body: data,
    token: getToken(),
  })
}

/**
 * Upload a file directly to R2 using the presigned URL.
 * The Content-Type header must match the declared mimeType used to generate the URL.
 */
export async function uploadToR2(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status} ${res.statusText}`)
  }
}

/**
 * Build a public URL for an R2 object key.
 * Requires VITE_R2_PUBLIC_URL to be configured (e.g. https://pub-xxx.r2.dev).
 * Returns null when the env var is missing.
 */
export function getImageSrc(key: string | null | undefined): string | null {
  if (!key) return null
  const base = import.meta.env['VITE_R2_PUBLIC_URL'] as string | undefined
  if (!base) return null
  return `${base.replace(/\/+$/, '')}/${key}`
}

// ---------------------------------------------------------------------------
// Exam Questions
// ---------------------------------------------------------------------------

export interface ExamQuestion {
  id: string
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correctAnswer: string
  shortDescription: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  unitId: string
  accessType: 'free' | 'premium' | null
  isDeleted: boolean
  createdAt: string
  /** Aggregated from question_statistics via LEFT JOIN. Always present (0 when no attempts). */
  totalAttempts: number
  correctAttempts: number
  wrongAttempts: number
}

export interface ExamQuestionListParams {
  unitId?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  page?: number
  limit?: number
}

export interface CreateExamQuestionPayload {
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correctAnswer: string
  shortDescription?: string
  difficulty: 'easy' | 'medium' | 'hard'
  unitId: string
  accessType?: 'free' | 'premium'
}

export type UpdateExamQuestionPayload = Partial<Omit<CreateExamQuestionPayload, 'unitId'>>

export function listExamQuestions(params: ExamQuestionListParams = {}) {
  const q = new URLSearchParams()
  if (params.unitId) q.set('unitId', params.unitId)
  if (params.difficulty) q.set('difficulty', params.difficulty)
  if (params.page !== undefined) q.set('page', String(params.page))
  if (params.limit !== undefined) q.set('limit', String(params.limit))
  const qs = q.toString()
  return apiFetch<{ examQuestions: ExamQuestion[] }>(`/exam-questions${qs ? `?${qs}` : ''}`, {
    token: getToken(),
  })
}

export function createExamQuestion(data: CreateExamQuestionPayload) {
  return apiFetch<{ examQuestion: ExamQuestion }>('/exam-questions', {
    method: 'POST',
    body: data,
    token: getToken(),
  })
}

export function updateExamQuestion(id: string, data: UpdateExamQuestionPayload) {
  return apiFetch<{ examQuestion: ExamQuestion }>(`/exam-questions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: data,
    token: getToken(),
  })
}

export function deleteExamQuestionApi(id: string) {
  return apiFetch<null>(`/exam-questions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: getToken(),
  })
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export interface Question {
  id: string
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correctAnswer: string
  description: string | null
  /** R2 object key for the audio file */
  audioUrl: string | null
  unitId: string
  accessType: 'free' | 'premium'
  sequenceOrder: number
  isDeleted: boolean
  createdAt: string
}

export interface CreateQuestionPayload {
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correctAnswer: string
  description?: string
  audioKey?: string
  mimeType?: string
  unitId: string
  accessType?: 'free' | 'premium'
  sequenceOrder: number
}

export type UpdateQuestionPayload = Partial<Omit<CreateQuestionPayload, 'unitId'>>

export function listQuestions(params: { unitId: string; page?: number; limit?: number }) {
  const q = new URLSearchParams({ unitId: params.unitId })
  if (params.page !== undefined) q.set('page', String(params.page))
  if (params.limit !== undefined) q.set('limit', String(params.limit))
  return apiFetch<{ questions: Question[] }>(`/questions?${q}`, { token: getToken() })
}

export function getQuestion(id: string) {
  return apiFetch<{ question: Question }>(`/questions/${encodeURIComponent(id)}`, {
    token: getToken(),
  })
}

export function createQuestion(data: CreateQuestionPayload) {
  return apiFetch<{ question: Question }>('/questions', {
    method: 'POST',
    body: data,
    token: getToken(),
  })
}

export function updateQuestion(id: string, data: UpdateQuestionPayload) {
  return apiFetch<{ question: Question }>(`/questions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: data,
    token: getToken(),
  })
}

export function deleteQuestionApi(id: string) {
  return apiFetch<null>(`/questions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: getToken(),
  })
}

// ---------------------------------------------------------------------------
// Students (Admin)
// ---------------------------------------------------------------------------

export interface Student {
  id: string
  name: string
  email: string
  phone: string | null
  membershipType: 'normal' | 'premium'
  membershipSource: 'direct_registration' | 'book_qr' | 'manual_upgrade' | null
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export interface StudentExam {
  id: string
  unitId: string
  unitName: string
  difficulty: 'easy' | 'medium' | 'hard'
  score: number | null
  totalQuestions: number
  correctAnswers: number | null
  status: 'active' | 'submitted' | 'abandoned'
  startedAt: string
  submittedAt: string | null
}

export interface StudentProgressItem {
  questionId: string
  unitId: string
  unitName: string
  answeredAt: string
}

export interface StudentListParams {
  membershipType?: 'normal' | 'premium'
  membershipSource?: 'direct_registration' | 'book_qr' | 'manual_upgrade'
  isActive?: boolean
  page?: number
  limit?: number
}

export interface UpdateStudentPayload {
  isActive?: boolean
  membershipType?: 'normal' | 'premium'
  membershipSource?: 'manual_upgrade'
}

export function listStudents(params: StudentListParams = {}) {
  const q = new URLSearchParams()
  if (params.membershipType) q.set('membershipType', params.membershipType)
  if (params.membershipSource) q.set('membershipSource', params.membershipSource)
  if (params.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params.page !== undefined) q.set('page', String(params.page))
  if (params.limit !== undefined) q.set('limit', String(params.limit))
  const qs = q.toString()
  return apiFetch<{ students: Student[] }>(`/admin/students${qs ? `?${qs}` : ''}`, {
    token: getToken(),
  })
}

export function getStudentApi(id: string) {
  return apiFetch<{ student: Student }>(`/admin/students/${encodeURIComponent(id)}`, {
    token: getToken(),
  })
}

export function updateStudentApi(id: string, data: UpdateStudentPayload) {
  return apiFetch<{ student: Student }>(`/admin/students/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: data,
    token: getToken(),
  })
}

export function getStudentExamHistoryApi(id: string) {
  return apiFetch<{ exams: StudentExam[] }>(`/admin/students/${encodeURIComponent(id)}/exams`, {
    token: getToken(),
  })
}

export function getStudentProgressApi(id: string) {
  return apiFetch<{ progress: StudentProgressItem[] }>(
    `/admin/students/${encodeURIComponent(id)}/progress`,
    { token: getToken() },
  )
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

/** Parse a JSON tag string from the DB into a string array. */
export function parseTags(tagsJson: string | null | undefined): string[] {
  if (!tagsJson) return []
  try {
    const parsed: unknown = JSON.parse(tagsJson)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

/** Extract a human-readable error message from an API response. */
export function extractApiError(res: {
  message?: string
  errors?: ApiResponse['errors']
}): string {
  if (typeof res.errors === 'string' && res.errors) return res.errors
  if (res.errors && typeof res.errors === 'object') {
    const msgs = Object.values(res.errors).flat()
    if (msgs.length > 0) return msgs.join(' ')
  }
  return res.message || 'An unexpected error occurred.'
}

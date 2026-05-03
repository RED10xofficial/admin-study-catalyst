import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { ROUTE_NAMES } from '@/lib/route'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Auth pages — no sidebar/header layout
    {
      path: '/login',
      name: ROUTE_NAMES.LOGIN,
      component: () => import('@/views/Login.vue'),
    },

    // App pages — inside MainLayout
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '/',
          redirect: ROUTE_NAMES.DASHBOARD,
        },
        {
          path: ROUTE_NAMES.DASHBOARD,
          name: ROUTE_NAMES.DASHBOARD,
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: ROUTE_NAMES.QUESTIONS,
          name: ROUTE_NAMES.QUESTIONS,
          component: () => import('@/views/Questions.vue'),
        },
        {
          path: ROUTE_NAMES.EXAM_TYPES,
          name: ROUTE_NAMES.EXAM_TYPES,
          component: () => import('@/views/ExamTypes.vue'),
        },
        {
          path: ROUTE_NAMES.UNITS,
          name: ROUTE_NAMES.UNITS,
          component: () => import('@/views/Units.vue'),
        },
        {
          path: 'question-list',
          name: ROUTE_NAMES.QUESTION_LIST,
          component: () => import('@/views/QuestionList.vue'),
        },
        {
          path: 'questions/add',
          name: ROUTE_NAMES.ADD_QUESTION,
          component: () => import('@/views/AddEditQuestion.vue'),
        },
        {
          path: 'questions/:id/edit',
          name: ROUTE_NAMES.EDIT_QUESTION,
          component: () => import('@/views/AddEditQuestion.vue'),
        },
        {
          path: 'exam-questions',
          name: ROUTE_NAMES.EXAM_QUESTIONS,
          component: () => import('@/views/ExamQuestions.vue'),
        },
        {
          path: 'students',
          name: ROUTE_NAMES.STUDENTS,
          component: () => import('@/views/Students.vue'),
        },
        {
          path: 'students/:id',
          name: ROUTE_NAMES.STUDENT_DETAIL,
          component: () => import('@/views/StudentDetail.vue'),
        },
      ],
    },
  ],
})

// ── Navigation guard ───────────────────────────────────────────────────────
//
// Rules:
//  1. Public routes (login) are always accessible.
//  2. Any other route requires an authenticated session.
//     → Unauthenticated visitors are redirected to /login with the intended
//       path saved as ?redirect= so Login.vue can restore it after sign-in.
//  3. An already-authenticated user visiting /login is bounced to the dashboard.
//
const PUBLIC_ROUTE_NAMES = new Set<string>([ROUTE_NAMES.LOGIN])

router.beforeEach((to) => {
  const authStore = useAuthStore()

  // Already logged in → don't show the login page again.
  if (to.name === ROUTE_NAMES.LOGIN && authStore.isAuthenticated) {
    return { name: ROUTE_NAMES.DASHBOARD }
  }

  // Protected route → must be authenticated.
  if (!PUBLIC_ROUTE_NAMES.has(to.name as string) && !authStore.isAuthenticated) {
    // Only attach a redirect query when there is a meaningful target path.
    // Avoid passing query: undefined — exactOptionalPropertyTypes rejects that.
    if (to.fullPath !== '/') {
      return { name: ROUTE_NAMES.LOGIN, query: { redirect: to.fullPath } }
    }
    return { name: ROUTE_NAMES.LOGIN }
  }
})

export default router

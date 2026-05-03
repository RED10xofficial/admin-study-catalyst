<template>
  <nav class="flex flex-col h-full w-full bg-white dark:bg-gray-900 transition-colors duration-200">
    <h1 class="py-4 mb-3 font-bold text-center bg-gray-100 dark:bg-gray-900 dark:text-white">The Study Catalyst</h1>
    <div class="mb-6 px-2 px-3">
      <span class="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Menu</span>
    </div>

    <ul class="flex flex-col gap-1 px-3">
      <li v-for="item in navItems" :key="item.label">
        <router-link
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-150"
          active-class="bg-blue-100 text-primary font-medium dark:bg-primary dark:text-white"
        >
          <component :is="item.icon" class="w-4 h-4 shrink-0" />
          <span>{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { LayoutDashboard, ClipboardList, ListOrdered, HelpCircle, GraduationCap, Users } from '@lucide/vue'
import { ROUTE_NAMES } from '@/lib/route'

const navItems = [
  { label: 'Dashboard',       to: { name: ROUTE_NAMES.DASHBOARD },       icon: LayoutDashboard },
  { label: 'Exam Types',      to: { name: ROUTE_NAMES.EXAM_TYPES },      icon: ClipboardList },
  { label: 'Units',           to: { name: ROUTE_NAMES.UNITS },           icon: ListOrdered },
  { label: 'Questions',       to: { name: ROUTE_NAMES.QUESTION_LIST },   icon: HelpCircle },
  { label: 'Exam Questions',  to: { name: ROUTE_NAMES.EXAM_QUESTIONS },  icon: GraduationCap },
  { label: 'Students',        to: { name: ROUTE_NAMES.STUDENTS },        icon: Users },
]
</script>

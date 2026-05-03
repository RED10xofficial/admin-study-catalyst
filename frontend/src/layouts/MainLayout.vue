<template>
  <div class="flex min-h-screen bg-[#F7F8F9] dark:bg-gray-950 transition-colors duration-200">
    <!-- Sidebar shell: renders any nav passed into its slot -->
    <SidebarShell v-model="sidebarOpen">
      <Navbar />
    </SidebarShell>

    <!-- Main content column: shifts right when sidebar is open -->
    <div
      class="flex flex-col flex-1 min-h-screen transition-all duration-300 ease-in-out"
      :style="{ marginLeft: sidebarOpen ? '200px' : '0' }"
    >
      <Header v-model="sidebarOpen" />
      <main class="flex-1 p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SidebarShell from '@/components/SidebarShell.vue'
import Navbar from '@/components/Navbar.vue'
import Header from '@/components/Header.vue'

const sidebarOpen = ref(true)
</script>

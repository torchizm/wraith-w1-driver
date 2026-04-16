<script setup lang="ts">
import Navbar from './components/Navbar.vue'
</script>

<template>
  <div class="min-h-screen bg-bg-primary flex flex-col">
    <Navbar />
    <main class="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
      <router-view />
    </main>
  </div>
</template>

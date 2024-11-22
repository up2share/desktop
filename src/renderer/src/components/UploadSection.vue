<script setup>
// import { ref } from 'vue'

const openUploadWindow = () => {
  // Send an IPC message to open the upload window
  window.electron.ipcRenderer.send('open-upload-window')
}
</script>

<template>
  <section id="upload" class="mb-12">
    <h2 class="text-2xl font-semibold text-gray-700 mb-4">File Upload</h2>

    <!-- Upload Section -->
    <div>
      <button @click="openUploadWindow" class="bg-green-500 text-white p-2 rounded">
        Upload a File to Share
      </button>
    </div>
  </section>
</template>

<style scoped>
/* You can add more styles for the upload section here */
</style>

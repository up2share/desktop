<script setup>
import { ref, onMounted } from 'vue'

const startupEnabled = ref(true)

// Function to check startup status
const checkStartupStatus = () => {
  window.electron.ipcRenderer.send('load-startup-status')

  // Listen for the response
  window.electron.ipcRenderer.once('load-startup-status-response', (event, enabled) => {
    startupEnabled.value = enabled
  })
}

// Function to toggle startup status
const toggleStartupStatus = () => {
  // Send an IPC message to configure startup
  // window.electron.ipcRenderer.send('configure-startup', !startupEnabled.value)
  window.electron.ipcRenderer.send('configure-startup', startupEnabled.value)

  // Listen for the response
  window.electron.ipcRenderer.once('configure-startup-response', (event, response) => {
    if (!response.success) {
      // Reverse the value if the configuration failed
      startupEnabled.value = !startupEnabled.value
      alert('Failed to configure startup. Please restart the app as Administrator.')
    }
  })
}

onMounted(() => {
  checkStartupStatus()
})
</script>

<template>
  <section id="startup" class="mb-12">
    <h2 class="text-2xl font-semibold text-gray-700 mb-4">Startup</h2>
    <div class="mb-6">
      <p class="text-sm text-gray-500 mb-3">
        Enable or disable launching the app on system startup (minimized to system tray).
      </p>
      <div class="flex items-center space-x-3">
        <input
          id="toggleStartupStatus"
          v-model="startupEnabled"
          type="checkbox"
          class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          @change="toggleStartupStatus"
        />
        <label for="toggleStartupStatus" class="text-gray-700">Launch App on System Startup</label>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* You can add more styles for the upload section here */
</style>

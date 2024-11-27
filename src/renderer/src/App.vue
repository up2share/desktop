<script setup>
import { ref, onMounted } from 'vue'
import Shares from './components/Shares.vue'
import UploadSection from './components/UploadSection.vue'
import Startup from './components/Startup.vue'
import Versions from './components/Versions.vue'

// Reactive variables for form data
const apiKey = ref('')
const isApiKeyVisible = ref(false)
const contextMenuEnabled = ref(true)

// Categories for the sidebar and option sections
const categories = [
  { id: 'general', name: 'General' },
  { id: 'upload', name: 'File Upload' },
  { id: 'context-menu', name: 'Context Menu' },
  { id: 'shares', name: 'Recent Shares' },
  { id: 'startup', name: 'Startup' },
  { id: 'about', name: 'About' }
]

// Scroll to the section when a category is clicked
const scrollToCategory = (id) => {
  const section = document.getElementById(id)
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Function to quit the application
const quitApp = () => {
  window.electron.ipcRenderer.send('quit-app')
}

// Function to save API key
const saveApiKey = () => {
  window.electron.ipcRenderer.send('save-api-key', apiKey.value)

  // Listen for the response
  window.electron.ipcRenderer.once('save-api-key-response', (event, response) => {
    if (response.success) {
      alert('API Key saved successfully!')
    } else {
      alert('Failed to save API Key: ' + response.error)
    }
  })
}

// Function to load API key on initialization
const loadApiKey = () => {
  window.electron.ipcRenderer.send('load-api-key')

  // Listen for the response
  window.electron.ipcRenderer.once('load-api-key-response', (event, savedKey) => {
    if (savedKey) {
      apiKey.value = savedKey
    }
  })
}

// Function to check context menu status
const checkContextMenu = () => {
  window.electron.ipcRenderer.send('check-context-menu')

  // Listen for the response
  window.electron.ipcRenderer.once('check-context-menu-response', (event, enabled) => {
    contextMenuEnabled.value = enabled
  })
}

// Function to toggle context menu
const toggleContextMenu = () => {
  const eventName = contextMenuEnabled.value ? 'enable-context-menu' : 'remove-context-menu'

  window.electron.ipcRenderer.send(eventName)

  // Listen for the response
  window.electron.ipcRenderer.once(`${eventName}-response`, (event, response) => {
    if (!response.success) {
      // Reverse the value if the configuration failed
      contextMenuEnabled.value = !contextMenuEnabled.value
      alert(`Failed to configure context menu. Please restart the app as Administrator.`)
    }
  })
}

// Toggle the visibility of the API key
const toggleApiKeyVisibility = () => {
  isApiKeyVisible.value = !isApiKeyVisible.value
}

// Function to check if the API key is set
const isApiKeySet = () => {
  return apiKey.value !== ''
}

onMounted(() => {
  loadApiKey()
  checkContextMenu()
})
</script>

<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Left Sidebar -->
    <aside class="w-1/4 bg-white shadow-md p-4">
      <h2 class="text-xl font-bold text-blue-600 mb-4">Up2Share</h2>
      <ul class="space-y-2">
        <li v-for="category in categories" :key="category.id">
          <button
            class="w-full text-left p-2 bg-gray-100 hover:bg-blue-100 rounded-lg text-gray-700 font-medium"
            @click="scrollToCategory(category.id)"
          >
            {{ category.name }}
          </button>
        </li>
        <!-- Quit -->
        <li>
          <button
            class="w-full text-left p-2 bg-gray-100 hover:bg-red-100 rounded-lg text-red-700 font-medium"
            @click="quitApp"
          >
            Close & Quit
          </button>
        </li>
      </ul>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-y-auto p-6">
      <!-- General Settings -->
      <section id="general" class="mb-12">
        <h2 class="text-2xl font-semibold text-gray-700 mb-4">General Settings</h2>
        <div class="mb-6">
          <!-- Alert for missing API key -->
          <div
            v-if="!isApiKeySet()"
            class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4"
          >
            <strong class="font-bold">Warning:</strong> API Key is missing.
          </div>

          <label for="apiKey" class="block text-lg font-medium text-gray-700 mb-2">API Key</label>
          <p class="text-sm text-gray-500 mb-3">
            The API key is generated from your account at
            <a href="https://up2sha.re/account/api" target="_blank" class="text-blue-500 underline"
              >Up2Sha.re API</a
            >. Paste it below to authenticate.
          </p>

          <div class="flex items-center space-x-2">
            <input
              id="apiKey"
              v-model="apiKey"
              :type="isApiKeyVisible ? 'text' : 'password'"
              placeholder="Enter your API key here"
              class="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <!-- Toggle Visibility -->
            <button
              class="text-sm text-blue-500 underline hover:text-blue-700"
              @click="toggleApiKeyVisibility"
            >
              {{ isApiKeyVisible ? 'Hide' : 'Show' }}
            </button>
          </div>

          <button
            class="mt-3 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            @click="saveApiKey"
          >
            Save API Key
          </button>
        </div>
      </section>

      <!-- File Upload Section -->
      <UploadSection />

      <!-- Context Menu Settings -->
      <section id="context-menu" class="mb-12">
        <h2 class="text-2xl font-semibold text-gray-700 mb-4">Context Menu</h2>
        <div class="mb-6">
          <p class="text-sm text-gray-500 mb-3">
            Enable or disable the "Share with Up2Share" option in the right-click menu.
          </p>
          <div class="flex items-center space-x-3">
            <input
              id="contextMenuToggle"
              v-model="contextMenuEnabled"
              type="checkbox"
              class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              @change="toggleContextMenu"
            />
            <label for="contextMenuToggle" class="text-gray-700">Enable Context Menu</label>
          </div>
        </div>
      </section>

      <!-- Shares Section -->
      <Shares />

      <!-- Startup Section -->
      <Startup />

      <!-- About Section -->
      <section id="about">
        <h2 class="text-2xl font-semibold text-gray-700 mb-4">About</h2>
        <p class="text-sm text-gray-500 mb-4">
          This application is powered by Electron, allowing you to use web technologies to build
          cross-platform desktop apps.
        </p>
        <Versions />
      </section>
    </main>
  </div>
</template>

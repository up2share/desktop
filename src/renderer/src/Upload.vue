<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const selectedFile = ref(null)
const createPrivateLink = ref(true)
const enablePassword = ref(false)
const password = ref('')
const confirmPassword = ref('')
const expiry = ref('1w') // Default expiry
const uploadProgress = ref(0) // Progress state

// Listen for the data when the component is mounted
onMounted(() => {
  window.electron.ipcRenderer.on('upload-window-data', (event, data) => {
    if (!data || !data.filePath) {
      return
    }

    // Handle file path sent via the IPC event
    selectedFile.value = data.filePath;

    // Simulate selecting the file in the file input
    const fileInput = document.getElementById('file-input');
    const file = new File([data.filePath], data.filePath.split('/').pop(), {
      type: 'application/octet-stream',
    });

    // Trigger file input change manually
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    fileInput.files = dataTransfer.files
    selectedFile.value = file
  })
})

onBeforeUnmount(() => {
  window.electron.ipcRenderer.removeAllListeners('upload-window-data')
})

function onFileChange(event) {
  selectedFile.value = event.target.files[0]
}

async function handleFileUpload() {
  if (!selectedFile.value) {
    alert('Please select a file.')
    return
  }
  if (enablePassword.value && password.value !== confirmPassword.value) {
    alert('Passwords do not match.')
    return
  }

  // ---------------------
  // Prepare upload data
  const uploadData = {
    filePath: selectedFile.value.path || selectedFile.value.name,
    createPrivateLink: createPrivateLink.value,
    enablePassword: enablePassword.value,
    password: enablePassword.value ? password.value : null,
    expiry: expiry.value
  }

  // Send data to the main process and handle upload progress
  try {
    // alert('Uploading file...');
    await new Promise((resolve, reject) => {
      // Listen for upload progress
      window.electron.ipcRenderer.on('upload-progress', (event, progress) => {
        uploadProgress.value = progress // Update progress bar
      })

      // Send the upload request to the main process
      window.electron.ipcRenderer.send('start-upload', uploadData)

      // Handle upload completion or failure
      window.electron.ipcRenderer.once('upload-complete', (event, success) => {
        if (success) {
          resolve()
        } else {
          reject(new Error('Upload failed.'))
        }
      })
    })

    alert('Upload complete!')
  } catch (error) {
    alert(`Error: ${error.message}`)
  } finally {
    // Reset progress after upload
    uploadProgress.value = 0
  }
}

function cancelUpload() {
  window.electron.ipcRenderer.send('close-upload-window')
}
</script>

<template>
  <div class="flex items-center justify-center w-screen h-screen bg-gray-100">
    <div class="flex flex-col p-6 w-full max-w-md bg-white rounded-lg shadow-md space-y-4">
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Upload File</h3>
      <form @submit.prevent="handleFileUpload" class="w-full space-y-4">
        <!-- File Input -->
        <div>
          <label for="file-input" class="block text-sm font-medium text-gray-700 mb-1">Select File</label>
          <input
            id="file-input"
            type="file"
            @change="onFileChange"
            class="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Private Share Switch -->
        <div class="flex items-center space-x-2">
          <input
            type="checkbox"
            id="create-private-link"
            v-model="createPrivateLink"
            class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md"
          />
          <label for="create-private-link" class="text-sm font-medium text-gray-700">
            Create Private Share Link
          </label>
        </div>

        <!-- Password Fields -->
        <div v-if="createPrivateLink" class="space-y-2">
          <div class="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enable-password"
              v-model="enablePassword"
              class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md"
            />
            <label for="enable-password" class="text-sm font-medium text-gray-700">
              Protect with Password
            </label>
          </div>
          <div v-if="enablePassword" class="space-y-2">
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                v-model="password"
                placeholder="Enter password"
                class="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                v-model="confirmPassword"
                placeholder="Confirm password"
                class="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- Expiry Date (only visible if "Create Private Share Link" is checked) -->
        <div v-if="createPrivateLink">
          <label for="expiry" class="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
          <select
            id="expiry"
            v-model="expiry"
            class="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="never">Never</option>
            <option value="24h">24 Hours</option>
            <option value="1w">1 Week</option>
            <option value="1m">1 Month</option>
            <option value="6m">6 Months</option>
            <option value="1y">1 Year</option>
          </select>
        </div>

        <!-- Progress Bar -->
        <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-500 transition-all"
            :style="{ width: `${uploadProgress}%` }"
            id="progress-bar"
          ></div>
        </div>

        <!-- Buttons -->
        <div class="flex items-center justify-end space-x-4">
          <button
            type="button"
            @click="cancelUpload"
            class="border border-red-500 text-red-500 py-2 px-4 rounded-lg hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

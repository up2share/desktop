<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const selectedFile = ref(null)
const createPrivateLink = ref(true)
const enablePassword = ref(false)
const password = ref('')
const confirmPassword = ref('')
const expiry = ref('1w') // Default expiry
const uploadProgress = ref(0) // Progress state
const uploadComplete = ref(false) // Track upload completion
const filePublicLink = ref('') // Store the public link
const privateLink = ref('') // Store the private link
const errorMessage = ref('') // Store error message
const isUploading = ref(false) // Track uploading status

// Listen for the data when the component is mounted
onMounted(() => {
  window.electron.ipcRenderer.on('upload-window-data', (event, data) => {
    if (!data || !data.filePath) {
      return
    }

    // Handle file path sent via the IPC event
    selectedFile.value = data.filePath

    // Simulate selecting the file in the file input
    const fileInput = document.getElementById('file-input')
    const file = new File([data.filePath], data.filePath.split('/').pop(), {
      type: 'application/octet-stream'
    })

    // Trigger file input change manually
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    fileInput.files = dataTransfer.files
    selectedFile.value = file
  })

  // Listen for private link event
  window.electron.ipcRenderer.on('private-link-created', (event, data) => {
    privateLink.value = data.shareUrl // Store the generated link
  })

  // Listen for file upload data event
  window.electron.ipcRenderer.on('file-uploaded-data', (event, data) => {
    if (data && data.public_url) {
      filePublicLink.value = data.public_url // Store the public link
    }
  })
})

onBeforeUnmount(() => {
  window.electron.ipcRenderer.removeAllListeners('upload-window-data')
  window.electron.ipcRenderer.removeAllListeners('private-link-created')
  window.electron.ipcRenderer.removeAllListeners('file-uploaded-data')
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
  isUploading.value = true // Start uploading

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

    // alert('Upload complete!')
    uploadComplete.value = true // Mark upload as complete
  } catch (error) {
    // alert(`Error: ${error.message}`)
    errorMessage.value = `Error: ${error.message}` // Set error message
  } finally {
    isUploading.value = false // End uploading
    // Reset progress after upload
    uploadProgress.value = 0
  }
}

function cancelUpload() {
  window.electron.ipcRenderer.send('close-upload-window')

  // TODO: Reset all form fields, progress, and state?
}

function copyToClipboard() {
  let link = privateLink.value || filePublicLink.value

  if (link) {
    navigator.clipboard
      .writeText(link)
      .then(() => {
        alert('Link copied to clipboard!')
      })
      .catch((err) => {
        alert('Failed to copy link: ' + err)
      })
  }
}
</script>

<template>
  <div class="flex items-center justify-center w-screen h-screen bg-gray-100">
    <div class="flex flex-col p-6 w-full max-w-md bg-white rounded-lg shadow-md space-y-4">
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Upload File</h3>
      <form v-if="!uploadComplete" class="w-full space-y-4" @submit.prevent="handleFileUpload">
        <!-- File Input -->
        <div v-if="!isUploading">
          <label for="file-input" class="block text-sm font-medium text-gray-700 mb-1"
            >Select File</label
          >
          <input
            id="file-input"
            type="file"
            class="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="onFileChange"
          />
        </div>
        <div v-else>
          <p class="text-center text-gray-700">Uploading file... {{ selectedFile.name }}</p>
        </div>

        <!-- Private Share Switch -->
        <div v-if="!isUploading" class="flex items-center space-x-2">
          <input
            id="create-private-link"
            v-model="createPrivateLink"
            type="checkbox"
            class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md"
          />
          <label for="create-private-link" class="text-sm font-medium text-gray-700">
            Create Private Share Link
          </label>
        </div>

        <!-- Password Fields -->
        <div v-if="createPrivateLink && !isUploading" class="space-y-2">
          <div class="flex items-center space-x-2">
            <input
              id="enable-password"
              v-model="enablePassword"
              type="checkbox"
              class="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md"
            />
            <label for="enable-password" class="text-sm font-medium text-gray-700">
              Protect with Password
            </label>
          </div>
          <div v-if="enablePassword && !isUploading" class="space-y-2">
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1"
                >Password</label
              >
              <input
                id="password"
                v-model="password"
                type="password"
                placeholder="Enter password"
                class="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1"
                >Confirm Password</label
              >
              <input
                id="confirm-password"
                v-model="confirmPassword"
                type="password"
                placeholder="Confirm password"
                class="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <!-- Expiry Date (only visible if "Create Private Share Link" is checked) -->
        <div v-if="createPrivateLink && !isUploading">
          <label for="expiry" class="block text-sm font-medium text-gray-700 mb-1"
            >Expiry Date</label
          >
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
        <div v-if="isUploading" class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            id="progress-bar"
            class="h-full bg-blue-500 transition-all"
            :style="{ width: `${uploadProgress}%` }"
          ></div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="text-red-500 text-sm text-center">
          <p>{{ errorMessage }}</p>
        </div>

        <!-- Buttons -->
        <div class="flex items-center justify-end space-x-4">
          <button
            v-if="isUploading"
            type="button"
            class="border border-red-500 text-red-500 py-2 px-4 rounded-lg hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
            @click="cancelUpload"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            :disabled="isUploading"
          >
            {{ isUploading ? 'Uploading...' : 'Send' }}
          </button>
        </div>
      </form>

      <!-- Success Message with Share Link -->
      <div v-if="uploadComplete" class="space-y-4">
        <div class="text-center">
          <p class="text-lg font-semibold text-gray-700">Upload Complete!</p>
          <p class="text-sm text-gray-500">
            Your file has been uploaded successfully. You can share it using the link below:
          </p>
          <input
            v-if="privateLink"
            v-model="privateLink"
            type="text"
            class="w-full border border-gray-300 rounded-md p-3 text-center"
            readonly
          />
          <input
            v-else
            v-model="filePublicLink"
            type="text"
            class="w-full border border-gray-300 rounded-md p-3 text-center"
            readonly
          />
          <button
            v-if="privateLink || filePublicLink"
            class="mt-2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            @click="copyToClipboard"
          >
            Copy Link
          </button>
        </div>

        <!-- Confirmation -->
        <div class="text-center">
          <button
            class="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"
            @click="cancelUpload"
          >
            OK
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

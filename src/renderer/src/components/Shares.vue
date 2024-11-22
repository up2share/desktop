<script setup>
import { ref, onMounted } from 'vue';

const shares = ref([]);
const loading = ref(false);
const error = ref('');
const currentPage = ref(1);
const totalPages = ref(1);

// Function to fetch shares from the main process via IPC
const fetchShares = async (page = 1) => {
  loading.value = true;
  error.value = '';

  // Send the request to the main process
  window.electron.ipcRenderer.send('fetch-recent-shares', page);

  // Listen for the response using 'once' to ensure the handler is called only once
  window.electron.ipcRenderer.once('fetch-recent-shares-response', (event, result) => {
    if (result.success) {
      shares.value = result.data.data;
      totalPages.value = result.data.meta.pagination.total_pages;
      currentPage.value = page;
    } else {
      error.value = result.error || 'Failed to fetch shares.';
      shares.value = [];
    }

    loading.value = false;
  });
};

// Function to delete a share
const deleteShare = async (shareId) => {
  const confirmed = confirm("Are you sure you want to delete this share?");
  if (confirmed) {
    // Send the delete request to the main process
    window.electron.ipcRenderer.send('delete-share', shareId);

    // Listen for the delete response from the main process
    window.electron.ipcRenderer.once('delete-share-response', (event, result) => {
      console.log(result);

      if (result.success) {
        // If deletion is successful, filter out the deleted share from the shares array
        shares.value = shares.value.filter(share => share.id !== shareId);
      } else {
        alert(result.error || 'Failed to delete share.');
      }
    });
  }
};

// Fetch shares on mount
onMounted(() => {
  fetchShares();
});

// Pagination
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    fetchShares(page);
  }
};

// Function to copy the URL to the clipboard
const copyToClipboard = (url) => {
  navigator.clipboard.writeText(url).then(() => {
    // alert('URL copied to clipboard!');
    console.log('URL copied to clipboard:', url);
  }).catch((err) => {
    alert('Failed to copy URL: ' + err);
    console.error('Failed to copy URL:', err);
  });
};

// Function to format the expiration date
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString();
};

// Function to refresh the shares list
const refreshShares = () => {
  fetchShares(currentPage.value);
};
</script>

<template>
  <section id="shares" class="mb-12">
    <h2 class="text-2xl font-semibold text-gray-700 mb-4">Recent Shares</h2>

    <div class="mb-6">
      <p v-if="loading" class="text-gray-500">Loading...</p>
      <p v-if="error" class="text-red-500">{{ error }}</p>

      <!-- Total rows and page number -->
      <div v-if="!loading" class="flex justify-between items-center">
        <p class="text-sm text-gray-500">
          Showing {{ shares.length }} of {{ totalPages * 10 }} shares
        </p>
        <div class="flex items-center space-x-2">
          <button
            @click="refreshShares"
            class="text-sm text-blue-500 underline hover:text-blue-700"
          >
            Refresh
          </button>
          <p class="text-sm text-gray-500">
            Page {{ currentPage }} of {{ totalPages }}
          </p>
        </div>
      </div>

      <div v-if="!loading && totalPages > 1" class="flex justify-between mt-4">
        <button
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
          class="bg-gray-300 text-gray-700 px-3 py-1 text-sm rounded-md hover:bg-gray-400"
        >
          Previous
        </button>
        <button
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
          class="bg-gray-300 text-gray-700 px-3 py-1 text-sm rounded-md hover:bg-gray-400"
        >
          Next
        </button>
      </div>

      <div v-if="!loading && shares.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div
          v-for="share in shares"
          :key="share.id"
          class="p-4 border border-gray-300 rounded-md bg-white space-y-4"
        >

          <!-- Row 1: Open Link Button + Created At -->
          <div class="flex items-center justify-between">
            <a
              :href="share.url" target="_blank"
              class="bg-green-500 text-white px-3 py-1 text-sm rounded-md hover:bg-green-600"
            >
              Open
            </a>
            <p class="text-sm text-gray-500">{{ new Date(share.created_at).toLocaleString() }}</p>

            <!-- Delete Button (top right corner) -->
            <button
              @click="deleteShare(share.id)"
              class="text-sm text-red-500 hover:text-red-600"
              title="Delete Share"
            >✘</button>

          </div>

          <!-- Row 3: URL input + Copy Link Button -->
          <div class="flex items-center space-x-2">
            <input
              v-model="share.url"
              type="text"
              class="w-full p-2 border border-gray-300 rounded-md text-sm text-gray-700"
              readonly
            />
            <button
              @click="copyToClipboard(share.url)"
              class="bg-blue-500 text-white px-3 py-1 text-sm rounded-md hover:bg-blue-600"
            >
              Copy
            </button>
          </div>

          <!-- Row 2: File Name (if available) -->
          <div v-if="share.file" class="flex items-center justify-between">
            <strong class="text-sm text-gray-700">File:</strong>
            <span class="text-sm text-gray-600">{{ share.file.filename }}</span>
          </div>

          <!-- Row 4: Password Check (if password is set) -->
          <div v-if="share.password" class="flex items-center justify-between">
            <strong class="text-sm text-gray-700">Password:</strong>
            <span class="text-green-500 text-sm">✔</span>
            <!-- <span v-else class="text-gray-500 text-sm">✘</span> -->
          </div>

          <!-- Row 5: Expires At (if available) -->
          <div v-if="share.expires_at" class="flex items-center justify-between">
            <strong class="text-sm text-gray-700">Expiry:</strong>
            <span class="text-sm text-gray-600">{{ formatDate(share.expires_at) }}</span>
          </div>

        </div>
      </div>

    </div>

  </section>
</template>

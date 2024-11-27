<script setup>
import { reactive } from 'vue'

const versions = reactive({
  ...window.electron.process.versions,
  appVersion: window.api.appVersion
})
</script>

<template>
  <ul class="versions bg-gray-100 p-4 rounded-lg">
    <li class="electron-version text-gray-700">Electron v{{ versions.electron }}</li>
    <li class="chrome-version text-gray-700">Chromium v{{ versions.chrome }}</li>
    <li class="node-version text-gray-700">Node v{{ versions.node }}</li>
    <li class="app-version text-gray-700">App v{{ versions.appVersion }}</li>
    <li class="github-repository">
      <a
        href="https://github.com/up2share/desktop"
        target="_blank"
        class="text-blue-600 hover:underline"
      >
        GitHub Repository
      </a>
    </li>
  </ul>
</template>

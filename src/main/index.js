import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import appIcon from '../../build/icon.ico?asset'
import { createContextMenu, removeContextMenu } from './context-menu'
import {
  saveStartupStatus,
  loadStartupStatus,
  isContextMenuStatusSaved,
  saveContextMenuStatus,
  loadContextMenuStatus,
  saveApiKey,
  loadApiKey
} from './config'
import { fetchShares, deleteShare } from './shares'
import { configureStartup } from './startup'
import { createApiClient, ResumableUploadHandler, ShareHandler, FileHandler } from './api'

// Initialize the app requirements
;(async () => {
  // Register the context menu for the app
  if (!isContextMenuStatusSaved()) {
    console.log('Enforcing context menu...')

    try {
      await createContextMenu(app.getPath('exe'))
      saveContextMenuStatus(true)
      console.log('Context menu enforced successfully.')
    } catch (error) {
      console.error('Failed to enforce context menu:', error)
    }
  }
})()

let mainWindow
let uploadWindow
let tray
let allowQuit = false

// Show notification when minimized to tray
function showMinimizedTrayNotification() {
  new Notification({
    title: 'Up2Share',
    body: 'The app has been minimized to the system tray.'
  }).show()
}

function createWindow(hidden = false) {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    title: 'Up2Share',
    icon: icon
  })

  mainWindow.on('ready-to-show', () => {
    if (!hidden) {
      mainWindow.show()
    }
  })

  mainWindow.on('close', (event) => {
    if (!allowQuit) {
      // Prevent default close behavior, minimize to tray
      event.preventDefault()
      mainWindow.hide()
      showMinimizedTrayNotification() // Show notification
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Handle IPC event to quit the app
  ipcMain.on('quit-app', () => {
    allowQuit = true // Set flag to allow application to quit
    app.quit()
  })

  // Listen for the event to load recent shares
  ipcMain.on('fetch-recent-shares', async (event, page = 1) => {
    const response = await fetchShares(page)
    event.sender.send('fetch-recent-shares-response', response)
  })

  // IPC handler for deleting a share
  ipcMain.on('delete-share', async (event, shareId) => {
    const response = await deleteShare(shareId)
    event.sender.send('delete-share-response', response)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Check for arguments passed when launching the app
  const args = process.argv.slice(1)

  // Check if the app should start hidden
  const hiddenArg = args.includes('--hidden')

  // Handle file upload argument
  const fileArgIndex = args.indexOf('--upload')
  let filePath = null

  if (fileArgIndex > -1) {
    filePath = args[fileArgIndex + 1] // Get the file path
  }

  tray = new Tray(nativeImage.createFromPath(appIcon))

  const trayMenu = Menu.buildFromTemplate([
    {
      label: 'Open',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
        } else {
          createWindow()
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        allowQuit = true // Set flag to allow application to quit
        app.quit()
      }
    }
  ])
  tray.setToolTip('Up2Share')
  tray.setContextMenu(trayMenu)
  // Handle double-click on the tray icon
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
    } else {
      createWindow()
    }
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  // ipcMain.on('ping', () => console.log('pong'))

  // Open the upload window if a file path is passed
  if (filePath) {
    openUploadWindow(filePath)
  } else {
    createWindow(hiddenArg)
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

// Function to open the upload window
function openUploadWindow(filePath = null) {
  uploadWindow = new BrowserWindow({
    width: 550,
    height: 550,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    icon: icon
  })

  if (is.dev) {
    uploadWindow.loadURL('http://localhost:5173/upload.html')
  } else {
    uploadWindow.loadFile(join(__dirname, '../renderer/upload.html'))
  }

  uploadWindow.once('ready-to-show', () => {
    // Send the data to the upload window before showing it
    uploadWindow.webContents.send('upload-window-data', {
      filePath: filePath
    })

    uploadWindow.show()
  })
}

// -----------------------------------------------------------------------------
// IPC handler to enable and remove the context menu
ipcMain.on('enable-context-menu', async (event) => {
  try {
    const result = await createContextMenu(app.getPath('exe'))
    saveContextMenuStatus(true)
    event.sender.send('enable-context-menu-response', { success: result })
  } catch (error) {
    event.sender.send('enable-context-menu-response', { success: false, error })
  }
})
ipcMain.on('remove-context-menu', async (event) => {
  try {
    const result = await removeContextMenu(event)
    saveContextMenuStatus(false)
    event.sender.send('remove-context-menu-response', { success: result })
  } catch (error) {
    event.sender.send('remove-context-menu-response', { success: false, error })
  }
})
ipcMain.on('check-context-menu', (event) => {
  const status = loadContextMenuStatus()
  event.sender.send('check-context-menu-response', status)
})

// -----------------------------------------------------------------------------
// IPC listeners for saving and loading API key
ipcMain.on('save-api-key', (event, apiKey) => {
  const response = saveApiKey(apiKey)
  event.sender.send('save-api-key-response', response)
})
ipcMain.on('load-api-key', (event) => {
  const apiKey = loadApiKey()
  event.sender.send('load-api-key-response', apiKey)
})

// -----------------------------------------------------------------------------
// IPC listeners for startup configuration
ipcMain.on('configure-startup', async (event, add) => {
  // add = true to add to startup, false to remove
  try {
    await configureStartup(add, app.getPath('exe'))
    saveStartupStatus(add)
    event.sender.send('configure-startup-response', { success: true })
  } catch (error) {
    console.error('Error configuring startup:', error)
    event.sender.send('configure-startup-response', { success: false, error: error.message })
  }
})
ipcMain.on('load-startup-status', (event) => {
  const status = loadStartupStatus()
  event.sender.send('load-startup-status-response', status)
})

// -----------------------------------------------------------------------------
// Open a small upload window when triggered
ipcMain.on('open-upload-window', () => {
  openUploadWindow()
})

// Handle IPC event to close the upload window
ipcMain.on('close-upload-window', () => {
  if (uploadWindow) {
    uploadWindow.close()
  }
})

ipcMain.on('start-upload', async (event, uploadData) => {
  const { filePath, createPrivateLink, enablePassword, password, expiry } = uploadData

  // Retrieve the API key from the store
  const apiKey = loadApiKey()
  if (!apiKey) {
    console.error('API key not found. Please provide a valid API key.')
    event.sender.send('upload-complete', false)
    return
  }

  // Create the API client
  const apiClient = createApiClient(apiKey)

  // Initialize the upload handler
  const uploadHandler = new ResumableUploadHandler(apiClient)

  // Listen to upload progress and emit progress updates to renderer
  uploadHandler.on('progress', ({ progress }) => {
    console.log(`Upload progress: ${progress.toFixed(2)}%`)
    event.sender.send('upload-progress', progress.toFixed(2)) // Emit progress as percentage
  })

  try {
    // Start the file upload
    const { filename, fileId } = await uploadHandler.simulateChunkUpload(filePath)

    // Emit upload completion event
    event.sender.send('upload-complete', true)

    // Check if createPrivateLink is enabled
    if (createPrivateLink) {
      const shareHandler = new ShareHandler(apiClient)
      console.log('Creating private link for file at:', filePath)

      const expiresAt = convertExpiryToDate(expiry)
      // const expiresAt = null

      // Call the createShare method
      try {
        const shareData = await shareHandler.createShare(
          fileId,
          null,
          enablePassword ? password : null,
          expiresAt
        )
        const shareUrl = shareData.url

        console.log('Private link created:', shareData)
        event.sender.send('private-link-created', { shareUrl }) // Send share details to the renderer
      } catch (err) {
        console.error('Error creating private link:', err.message)
        event.sender.send('private-link-error', err.message) // Notify renderer of error
      }
    } else {
      console.log('Private link creation is disabled.')
      const fileHandler = new FileHandler(apiClient)

      // Get file url
      const fileData = await fileHandler.getFile(fileId)

      // Send file url to renderer
      event.sender.send('file-uploaded-data', fileData)
    }
  } catch (error) {
    console.error(`Error during file upload: ${error.message}`)

    // Emit upload failure event
    event.sender.send('upload-complete', false)
  }
})

function convertExpiryToDate(expiry) {
  const now = new Date()

  switch (expiry) {
    case 'never':
      return null // No expiry
    case '24h':
      now.setHours(now.getHours() + 24) // Add 24 hours
      break
    case '1w':
      now.setDate(now.getDate() + 7) // Add 1 week
      break
    case '1m':
      now.setMonth(now.getMonth() + 1)
      break
    case '6m':
      now.setMonth(now.getMonth() + 6)
      break
    case '1y':
      now.setFullYear(now.getFullYear() + 1)
      break
    default:
      return null // Default to no expiry if not matched
  }

  // Format date as MySQL DATETIME (YYYY-MM-DD HH:MM:SS)
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0') // Ensure two digits
  const day = String(now.getDate()).padStart(2, '0') // Ensure two digits
  const hours = String(now.getHours()).padStart(2, '0') // Ensure two digits
  const minutes = String(now.getMinutes()).padStart(2, '0') // Ensure two digits
  const seconds = String(now.getSeconds()).padStart(2, '0') // Ensure two digits

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

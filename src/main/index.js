import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import appIcon from '../../build/icon.ico?asset'
import { createContextMenu, removeContextMenu } from './context-menu'
import {
  // ensureConfigDirExists,
  isContextMenuStatusSaved,
  saveContextMenuStatus,
  loadContextMenuStatus,
  saveApiKey,
  loadApiKey
} from './config'
import { fetchShares, deleteShare } from './shares'

// (async () => {
//   const contextMenu = await import('electron-context-menu');

//   contextMenu.default({
//     prepend: (defaultActions, params, browserWindow) => [
//       {
//         label: 'Share with Up2Share',
//         click: () => {
//           browserWindow.webContents.send('open-share-window', params.file);
//         },
//       },
//     ],
//   });
// })();

// Initialize the app requirements
(async () => {
  // ensureConfigDirExists()

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
})();

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

function createWindow() {
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
    mainWindow.show()
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
  const args = process.argv.slice(1);
  const fileArgIndex = args.indexOf('--upload');

  let filePath = null;
  if (fileArgIndex > -1) {
    filePath = args[fileArgIndex + 1]; // Get the file path
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
    createWindow()
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

// IPC handler to enable and remove the context menu
ipcMain.on('enable-context-menu', async (event) => {
  try {
    const result = await createContextMenu(app.getPath('exe'))
    saveContextMenuStatus(true)
    event.sender.send('enable-context-menu-response', { success: result })
  } catch (error) {
    console.error('Failed to add macOS context menu:', error)
    event.sender.send('enable-context-menu-response', { success: false, error })
  }
})
ipcMain.on('remove-context-menu', async (event) => {
  try {
    const result = await removeContextMenu(event);
    saveContextMenuStatus(false);
    event.sender.send('remove-context-menu-response', { success: result });
  } catch (error) {
    console.error('Failed to remove macOS context menu:', error);
    event.sender.send('remove-context-menu-response', { success: false, error });
  }
})
ipcMain.on('check-context-menu', (event) => {
  const status = loadContextMenuStatus()
  event.sender.send('check-context-menu-response', status)
})

// IPC listeners for saving and loading API key
ipcMain.on('save-api-key', (event, apiKey) => {
  const response = saveApiKey(apiKey)
  event.sender.send('save-api-key-response', response)
})
ipcMain.on('load-api-key', (event) => {
  const apiKey = loadApiKey()
  event.sender.send('load-api-key-response', apiKey)
})

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

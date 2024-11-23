import { exec } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

// Utility function to promisify exec
function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        resolve(true)
      }
    })
  })
}

// Add to Windows startup
async function addAppToStartupWindows(appName, appPath) {
  const command = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /t REG_SZ /d "${appPath} --hidden" /f`

  return await execAsync(command)
}

// Remove from Windows startup
async function removeAppFromStartupWindows(appName) {
  const command = `reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "${appName}" /f`

  return await execAsync(command)
}

// Add to macOS startup
async function addAppToStartupMac(appName, appPath) {
  const plistPath = path.join(process.env.HOME, 'Library', 'LaunchAgents', `${appName}.plist`)
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${appName}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${appPath}</string>
    <string>--hidden</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
</dict>
</plist>`

  await fs.writeFile(plistPath, plistContent, 'utf8')
  // try {
  //   await fs.writeFile(plistPath, plistContent, 'utf8')
  //   console.log('Plist successfully created at:', plistPath)
  // } catch (err) {
  //   console.error('Error creating macOS plist:', err.message)
  // }
}

// Remove from macOS startup
async function removeAppFromStartupMac(appName) {
  const plistPath = path.join(process.env.HOME, 'Library', 'LaunchAgents', `${appName}.plist`)

  await fs.unlink(plistPath)
  // try {
  //   await fs.unlink(plistPath)
  //   console.log('Plist successfully removed:', plistPath)
  // } catch (err) {
  //   console.error('Error removing macOS plist:', err.message)
  // }
}

// Platform-specific usage
export async function configureStartup(add = true, exePath) {
  const appName = 'Up2Share'
  const appPath = `"${exePath}"`

  if (process.platform === 'win32') {
    if (add) {
      await addAppToStartupWindows(appName, appPath)
    } else {
      await removeAppFromStartupWindows(appName)
    }
  } else if (process.platform === 'darwin') {
    if (add) {
      await addAppToStartupMac(appName, appPath)
    } else {
      await removeAppFromStartupMac(appName)
    }
  } else {
    console.log('Startup configuration is not supported on this platform.')
  }
}

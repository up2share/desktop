import os from 'os'
import { exec } from 'child_process'

// Create context menu dynamically for both platforms
export async function createContextMenu(exePath) {
  if (os.platform() === 'win32') {
    // Windows: Register context menu via registry
    return await registerWindowsContextMenu(exePath);
  } else if (os.platform() === 'darwin') {
    // macOS: Register context menu via AppleScript
    return await registerMacContextMenu(exePath);
  }
}

export async function removeContextMenu(event) {
  if (os.platform() === 'win32') {
    // Windows: Remove context menu via registry
    return await removeWindowsContextMenu(event);
  } else if (os.platform() === 'darwin') {
    // macOS: Remove context menu via AppleScript
    return await removeMacContextMenu(event);
  }
}

async function registerWindowsContextMenu(exePath) {
  // The command to execute your app when the menu item is clicked
  const registryCommand = `"${exePath}" --upload "%1"`;  // "%1" represents the file path

  // Register the context menu for all file types (but not for folders or desktop)
  const regCommand = `reg add "HKCR\\*\\shell\\Up2Share" /v "" /t REG_SZ /d "Share with Up2Share" /f && ` +
                     `reg add "HKCR\\*\\shell\\Up2Share\\Icon" /v "" /t REG_SZ /d "${exePath}" /f && ` +
                     `reg add "HKCR\\*\\shell\\Up2Share\\command" /v "" /t REG_SZ /d "${registryCommand}" /f`;

  // Execute the reg command to add context menu entry
  return new Promise(function (resolve, reject) {
    exec(regCommand, (err, stdout, stderr) => {
      if (err) {
        console.error('Failed to add Windows context menu:', err);
        reject(err);
      } else {
        console.log('Windows context menu added successfully:', stdout);
        resolve(true);
      }
      if (stderr) {
        console.error('Error output:', stderr);
        reject(stderr);
      }
    });
  });
}

async function registerMacContextMenu(exePath) {
  const script = `
    tell application "Finder"
      make new contextual menu item with properties {name:"Share with Up2Share", command:"${exePath} --upload %1"}
    end tell
  `;

  return new Promise(function (resolve, reject) {
    exec(`osascript -e '${script}'`, (err, stdout, stderr) => {
      if (err) {
        console.error('Failed to add macOS context menu:', err);
        reject(err);
      } else {
        console.log('macOS context menu added successfully');
        resolve(true);
      }
      if (stderr) {
        console.error('Error output:', stderr);
        reject(stderr);
      }
    });
  });
}

// Function to remove context menu on Windows
async function removeWindowsContextMenu() {
  console.log('Removing Windows context menu...');
  const regCommand = 'reg delete "HKCR\\*\\shell\\Up2Share" /f';

  return new Promise(function (resolve, reject) {
    exec(regCommand, (err, stdout, stderr) => {
      if (err) {
        console.error('Failed to remove Windows context menu:', err);
        reject(err);
        // console.error('Failed to remove Windows context menu:', err);
        // event.reply('context-menu-removal-response', { success: false, error: err.message });
      } else {
        console.log('Windows context menu removed successfully:', stdout);
        resolve(true);
        // console.log('Windows context menu removed successfully.');
        // event.reply('context-menu-removal-response', { success: true });
      }
      if (stderr) {
        console.error('Error output:', stderr);
        reject(stderr);
      }
    });
  });
}

// Function to remove context menu on macOS
async function removeMacContextMenu() {
  console.log('Removing macOS context menu...');
  const script = `
    tell application "Finder"
      delete every contextual menu item whose name is "Share with Up2Share"
    end tell
  `;

  return new Promise(function (resolve, reject) {
    exec(`osascript -e '${script}'`, (err, stdout, stderr) => {
      if (err) {
        console.error('Failed to remove macOS context menu:', err);
        reject(err);
        // console.error('Failed to remove macOS context menu:', err);
        // event.reply('context-menu-removal-response', { success: false, error: err.message });
      } else {
        console.log('macOS context menu removed successfully:', stdout);
        resolve(true);
        // console.log('macOS context menu removed successfully.');
        // event.reply('context-menu-removal-response', { success: true });
      }
      if (stderr) {
        console.error('Error output:', stderr);
        reject(stderr);
      }
    });
  });
}

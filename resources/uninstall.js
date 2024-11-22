const { exec } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Path to store context menu setup flag (for consistency)
const contextMenuConfiguredFile = path.join(process.env.APPDATA || '', 'Up2Share/contextMenuConfigured.json');

// Function to handle Windows uninstallation
function uninstallWindows() {
  console.log('Uninstalling on Windows...');

  // Remove Windows context menu registry entry
  const regCommand = 'reg delete "HKCR\\Directory\\Background\\shell\\Up2Share" /f';

  exec(regCommand, (err, stdout, stderr) => {
    if (err) {
      console.error('Failed to remove Windows context menu:', err);
    } else {
      console.log('Windows context menu removed successfully.');
    }

    // Optional: Additional cleanup for files, configuration, etc.
    if (fs.existsSync(contextMenuConfiguredFile)) {
      fs.unlinkSync(contextMenuConfiguredFile);
      console.log('Removed context menu configuration file.');
    }

    // Ensure app files and any custom settings are removed
    // Example: Remove specific app data files if needed
    // fs.rmdirSync(path.join(process.env.APPDATA, 'Up2Share'), { recursive: true });
  });
}

// Function to handle macOS uninstallation
function uninstallMac() {
  console.log('Uninstalling on macOS...');

  // Remove macOS context menu via AppleScript (assuming you registered it with `osascript`)
  const script = `
    tell application "Finder"
      delete every contextual menu item whose name is "Share with Up2Share"
    end tell
  `;

  exec(`osascript -e '${script}'`, (err, stdout, stderr) => {
    if (err) {
      console.error('Failed to remove macOS context menu:', err);
    } else {
      console.log('macOS context menu removed successfully.');
    }
  });

  // Optional: Remove the app from /Applications
  const appPath = '/Applications/Up2Share.app';
  if (fs.existsSync(appPath)) {
    fs.rmdirSync(appPath, { recursive: true });
    console.log('macOS application removed from /Applications.');
  }
}

// Main uninstall function
function uninstall() {
  if (os.platform() === 'win32') {
    uninstallWindows();
  } else if (os.platform() === 'darwin') {
    uninstallMac();
  } else {
    console.log('Uninstall is not supported on this platform.');
  }
}

uninstall();

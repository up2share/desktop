import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// File to store the API key
const configPath = path.join(app.getPath('userData'), 'app_config.json');

// ixDIvGiOKBJPnD6EYENn5pKlDKBoirev

// Function to ensure the config directory exists
// export const ensureConfigDirExists = () => {
//   try {
//     if (!fs.existsSync(configDir)) {
//       fs.mkdirSync(configDir, { recursive: true });  // Creates Up2Share directory if it doesn't exist
//     }
//   } catch (error) {
//     console.error('Error ensuring config directory exists:', error);
//   }
// };

// Function to check if the context menu status is saved
export const isContextMenuStatusSaved = () => {
  // // Check if the config directory exists
  // if (!fs.existsSync(configDir)) {
  //   return false;
  // }

  // Check if the config file exists
  if (!fs.existsSync(configPath)) {
    return false;
  }

  // Check if the context menu status is saved
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return config.contextMenu !== undefined;
}

// Function to save context menu status to a file
export const saveContextMenuStatus = (status) => {
  try {
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};
    config.contextMenu = status;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  }
  catch (error) {
    console.error('Error saving context menu status:', error);
    return { success: false, error: error.message };
  }
};


// Function to load context menu status from the file
export const loadContextMenuStatus = () => {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.contextMenu || false;
    }
    return false;
  } catch (error) {
    console.error('Error loading context menu status:', error);
    return false;
  }
};

// Function to save the API key to a file
export const saveApiKey = (apiKey) => {
  // ensureConfigDirExists();  // Ensure the directory exists before saving the API key

  try {
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};
    config.apiKey = apiKey;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving API key:', error);
    return { success: false, error: error.message };
  }
};

// Function to load the API key from the file
export const loadApiKey = () => {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return config.apiKey || null;
    }
    return null;
  } catch (error) {
    console.error('Error loading API key:', error);
    return null;
  }
};

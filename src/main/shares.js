import axios from 'axios';
import { loadApiKey } from './config';

export async function fetchShares(page = 1) {
  const apiKey = loadApiKey();
  if (!apiKey) {
    return { success: false, error: 'API key not found. Please set it first.' };
  }

  try {
    const response = await axios.get(`https://api.up2sha.re/shares?page=${page}&include=file&orderBy=id&sortedBy=desc`, {
      headers: {
        'X-Api-Key': `${apiKey}`,
      },
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error fetching shares:', error.message);
    return { success: false, error: error.message };
  }
};

export async function deleteShare (shareId) {
  const apiKey = loadApiKey();
  if (!apiKey) {
    return { success: false, error: 'API key not found. Please set it first.' };
  }

  try {
    const response = await axios.delete(`https://api.up2sha.re/shares/${shareId}`, {
      headers: {
        'X-Api-Key': `${apiKey}`,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting share:', error.message);
    return { success: false, error: error.message };
  }
};

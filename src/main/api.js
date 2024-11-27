import { EventEmitter } from 'events'
import { Buffer } from 'node:buffer'
import axios from 'axios'
import fs from 'fs'

const UP2SHARE_API_BASE = 'https://api.up2sha.re'

// Helper to create API client instance
export const createApiClient = (apiKey, timeout = 120) => {
  return axios.create({
    baseURL: UP2SHARE_API_BASE,
    timeout: timeout * 1000,
    headers: {
      'X-Api-Key': `${apiKey}`
    }
  })
}

export class FileHandler {
  constructor(apiClient) {
    // super();
    this.apiClient = apiClient
  }

  // Method to get file details by fileId
  async getFile(fileId) {
    try {
      // Make the GET request to the /files/{fileId} endpoint
      const response = await this.apiClient.get(`/files/${fileId}`)

      if (response.status === 200) {
        console.log(`File details retrieved successfully for file ID: ${fileId}`)
        // this.emit('fileDetailsRetrieved', response.data); // Emit event for successful retrieval
        return response.data // Return the file details (public_url, download_url)
      } else {
        throw new Error(`Failed to retrieve file details: ${response.status}`)
      }
    } catch (err) {
      console.error(`Error retrieving file details: ${err.message}`)
      // this.emit('error', err.message); // Emit error event
      throw err // Rethrow error
    }
  }
}

// Sharing handler
export class ShareHandler extends EventEmitter {
  constructor(apiClient) {
    super()
    this.apiClient = apiClient
  }

  // Method to validate expiresAt
  static _validateExpiresAt(expiresAt) {
    const currentDate = new Date()
    const expirationDate = new Date(expiresAt)

    if (expirationDate <= currentDate) {
      throw new Error('Expiration date must be greater than the current date')
    }
  }

  // Method to create a new share
  async createShare(fileId, targetId = null, password = null, expiresAt = null) {
    // Validate expiresAt if provided
    if (expiresAt) {
      try {
        ShareHandler._validateExpiresAt(expiresAt)
      } catch (err) {
        console.error('Invalid expiration date:', err.message)
        this.emit('error', err.message) // Emit error event
        throw err // Rethrow error to stop the process
      }
    }

    const body = {
      file_id: fileId,
      target_id: targetId, // nullable
      password: password, // nullable
      expires_at: expiresAt // optional
    }

    try {
      const response = await this.apiClient.post('/shares', body)

      if (response.status === 201) {
        console.log(`Share created successfully for file ID: ${fileId}`)
        this.emit('shareCreated', response.data) // Emit share created event
        return response.data // Return share data
      } else {
        throw new Error(`Failed to create share: ${response.status}`)
      }
    } catch (err) {
      console.error(`Error creating share: ${err.message} ${err.response.data}`)
      this.emit('error', err.message) // Emit error event
      throw err
    }
  }

  // Method to retrieve an existing share by its ID
  async getShareById(shareId) {
    try {
      const response = await this.apiClient.get(`/shares/${shareId}`)
      if (response.status === 200) {
        console.log(`Share retrieved successfully for share ID: ${shareId}`)
        return response.data // Return share data
      } else {
        throw new Error(`Failed to retrieve share: ${response.status}`)
      }
    } catch (err) {
      console.error(`Error retrieving share: ${err.message}`)
      throw err
    }
  }

  // Method to delete an existing share by its ID
  async deleteShare(shareId) {
    try {
      const response = await this.apiClient.delete(`/shares/${shareId}`)
      if (response.status === 200) {
        console.log(`Share deleted successfully for share ID: ${shareId}`)
        return response.data // Return deletion confirmation
      } else {
        throw new Error(`Failed to delete share: ${response.status}`)
      }
    } catch (err) {
      console.error(`Error deleting share: ${err.message}`)
      throw err
    }
  }
}

// Resumable upload handler
export class ResumableUploadHandler extends EventEmitter {
  constructor(apiClient, maxRetries = 4) {
    super()
    this.apiClient = apiClient
    this.maxRetries = maxRetries
  }

  async _startUpload(filename, totalSize, contentType = 'application/octet-stream') {
    const headers = {
      'Content-Type': contentType,
      'X-Upload-Content-Length': totalSize.toString(),
      'X-Upload-Content-Type': contentType
    }

    try {
      const response = await this.apiClient.post('/files#resumable', { filename }, { headers })

      if (response.status === 201) {
        const locationUri = response.headers['location']
        return {
          uploadUri: locationUri,
          uploadKey: this._getKeyFromUri(locationUri)
        }
      } else {
        throw new Error(`Failed to initiate upload: ${response.status}`)
      }
    } catch (err) {
      console.error(`Error starting upload: ${err.message}`)
      throw err
    }
  }

  async _uploadChunk(uploadUri, totalSize, chunkData, chunkStart, chunkEnd, retriesLeft) {
    const headers = {
      'Content-Range': `bytes ${chunkStart}-${chunkEnd}/${totalSize}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': chunkData.length.toString()
    }

    try {
      // const response = await this.apiClient.put(uploadUri, chunkData, { headers })
      const response = await this.apiClient.put(uploadUri, chunkData, {
        headers,
        validateStatus: (status) => {
          // Accept both success (201) and in-progress (308) statuses
          return status === 201 || status === 308
        }
      })

      if (response.status === 201) {
        return response.headers // Upload completed
      } else if (response.status === 308) {
        return false // Still in progress
      } else {
        throw new Error(`Chunk upload failed: ${response.status}`)
      }
    } catch (err) {
      if (retriesLeft > 0) {
        console.warn(`Retrying chunk upload (${retriesLeft} retries left)...`)
        return await this._uploadChunk(
          uploadUri,
          totalSize,
          chunkData,
          chunkStart,
          chunkEnd,
          retriesLeft - 1
        )
      } else {
        console.error(`Error uploading chunk after retries: ${err.message}`)
        throw err
      }
    }
  }

  _getKeyFromUri(uri) {
    const url = new URL(UP2SHARE_API_BASE + uri) // Use URL API to parse the URI
    return url.searchParams.get('key') // Retrieve the 'key' parameter
  }

  // Helper method to extract file ID
  _extractFileIdFromLocation(locationHeader) {
    if (!locationHeader) {
      throw new Error('Missing Location header in response')
    }

    // Match file ID from the location URI (e.g., "/files/42")
    const match = locationHeader.match(/\/files\/(\d+)$/)
    if (match) {
      return match[1] // Extracted file ID
    } else {
      throw new Error(`Invalid Location header format: ${locationHeader}`)
    }
  }

  async simulateChunkUpload(filePath, chunkSize = 10 * 1024 * 1024) {
    let stats
    try {
      stats = fs.statSync(filePath)
    } catch (err) {
      console.error(`Failed to access file: ${filePath}. Error: ${err.message}`)
      this.emit('error', `File access error: ${err.message}`)
      throw err
    }

    const totalSize = stats.size
    const filename = filePath.split('\\').pop() // Adjust for Windows path

    console.log(`Starting upload for file: ${filename} (${totalSize} bytes)`)
    const { uploadUri, uploadKey } = await this._startUpload(filename, totalSize)

    console.log('Upload initiated:', uploadUri, uploadKey)

    let chunkStart = 0
    let fd

    try {
      fd = fs.openSync(filePath, 'r') // Open file descriptor

      let result
      while (chunkStart < totalSize) {
        const bytesToRead = Math.min(chunkSize, totalSize - chunkStart)

        // Create a new buffer for each chunk to avoid corruption
        const buffer = Buffer.alloc(bytesToRead)
        const bytesRead = fs.readSync(fd, buffer, 0, bytesToRead, chunkStart)
        console.log('bytesRead:', bytesRead)

        // Slice the buffer explicitly to ensure the correct portion is used
        const chunkData = Uint8Array.prototype.slice.call(buffer, 0, bytesRead)
        const chunkEnd = chunkStart + bytesRead - 1

        result = await this._uploadChunk(uploadUri, totalSize, chunkData, chunkStart, chunkEnd)

        // Emit progress event
        const progress = ((chunkEnd + 1) / totalSize) * 100
        this.emit('progress', { progress, chunkStart, chunkEnd })

        chunkStart = chunkEnd + 1
      }

      fs.closeSync(fd) // Close file descriptor
      fd = null

      // Upload completed, retrieve file ID from Location header
      const locationHeader = result['location']
      const fileId = this._extractFileIdFromLocation(locationHeader)

      console.log(`Upload completed for file: ${filename} (ID: ${fileId})`)
      this.emit('completed', { filename, fileId })
      return { filename, fileId }
    } catch (err) {
      console.error(`Error during upload: ${err.message}`)
      throw err
    } finally {
      if (fd) {
        fs.closeSync(fd) // Close file descriptor if not already closed
      }
    }
  }

  // async simulateChunkUpload(filePath, chunkSize = 10 * 1024 * 1024) {
  //   let stats
  //   try {
  //     stats = fs.statSync(filePath)
  //   } catch (err) {
  //     console.error(`Failed to access file: ${filePath}. Error: ${err.message}`)
  //     this.emit('error', `File access error: ${err.message}`)
  //     throw err
  //   }

  //   const totalSize = stats.size
  //   // const filename = filePath.split('/').pop()
  //   // TODO: WINDOWS ONLY!!!
  //   const filename = filePath.split('\\').pop()

  //   console.log(`Starting upload for file: ${filename} (${totalSize} bytes)`)
  //   const { uploadUri, uploadKey } = await this._startUpload(filename, totalSize)

  //   console.log('Upload initiated:', uploadUri, uploadKey)

  //   let chunkStart = 0
  //   const fileStream = fs.createReadStream(filePath, { highWaterMark: chunkSize })

  //   let result
  //   for await (const chunk of fileStream) {
  //     const chunkEnd = Math.min(chunkStart + chunk.length - 1, totalSize - 1)
  //     result = await this._uploadChunk(uploadUri, totalSize, chunk, chunkStart, chunkEnd)

  //     // Emit progress event
  //     const progress = ((chunkEnd + 1) / totalSize) * 100
  //     this.emit('progress', { progress, chunkStart, chunkEnd })

  //     chunkStart = chunkEnd + 1
  //   }

  //   // Upload completed, retrieve file ID from Location header
  //   const locationHeader = result['location']
  //   const fileId = this._extractFileIdFromLocation(locationHeader)

  //   console.log(`Upload completed for file: ${filename} (ID: ${fileId})`)
  //   this.emit('completed', { filename, fileId })
  // }
}

// IPC Event Listener
// ipcMain.on('upload-file', async (event, filePath) => {
//   const apiClient = createApiClient()
//   const uploadHandler = new ResumableUploadHandler(apiClient)

//   uploadHandler.on('progress', ({ progress }) => {
//     event.reply('upload-progress', { progress })
//   })

//   uploadHandler.on('completed', ({ filename }) => {
//     event.reply('upload-complete', `File uploaded successfully: ${filename}`)
//   })

//   try {
//     await uploadHandler.simulateChunkUpload(filePath)
//   } catch (err) {
//     console.error(`Error uploading file: ${err.message}`)
//     event.reply('upload-error', `Error uploading file: ${err.message}`)
//   }
// })

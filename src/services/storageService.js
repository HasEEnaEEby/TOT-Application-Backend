import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base directory for local storage (for development)
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '..', '..', 'uploads');

// Base URL for serving images
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

/**
 * Ensure the storage directory exists
 */
const ensureStorageDir = (filepath) => {
  const dir = path.dirname(path.join(STORAGE_DIR, filepath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Upload file to local storage (development) or cloud storage (production)
 * In production, this would use a service like AWS S3, Google Cloud Storage, etc.
 */
export const uploadToStorage = async (buffer, filepath, mimetype) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, use a cloud storage service
      // This is a placeholder for implementing cloud storage
      // return await uploadToCloudStorage(buffer, filepath, mimetype);
      
      // For now, fallback to local storage
      return await uploadToLocalStorage(buffer, filepath);
    } else {
      // In development, use local file storage
      return await uploadToLocalStorage(buffer, filepath);
    }
  } catch (error) {
    logger.error('File upload failed:', {
      error: error.message,
      filepath
    });
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Upload file to local storage (development only)
 */
const uploadToLocalStorage = async (buffer, filepath) => {
  ensureStorageDir(filepath);
  const fullPath = path.join(STORAGE_DIR, filepath);
  
  return new Promise((resolve, reject) => {
    fs.writeFile(fullPath, buffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve({ filepath, fullPath });
      }
    });
  });
};

/**
 * Get public URL for accessing the file
 */
export const getPublicUrl = (filepath) => {
  if (process.env.NODE_ENV === 'production') {
    // In production, return the cloud storage URL
    // This is a placeholder - implement based on your cloud provider
    return `${process.env.CLOUD_STORAGE_URL}/${filepath}`;
  } else {
    // In development, return the local URL
    return `${BASE_URL}/uploads/${filepath}`;
  }
};

/**
 * Delete file from storage
 */
export const deleteFromStorage = async (filepath) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, delete from cloud storage
      // This is a placeholder for implementing cloud storage deletion
      // return await deleteFromCloudStorage(filepath);
      
      // For now, fallback to local storage
      return await deleteFromLocalStorage(filepath);
    } else {
      // In development, delete from local file storage
      return await deleteFromLocalStorage(filepath);
    }
  } catch (error) {
    logger.error('File deletion failed:', {
      error: error.message,
      filepath
    });
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Delete file from local storage
 */
const deleteFromLocalStorage = async (filepath) => {
  const fullPath = path.join(STORAGE_DIR, filepath);
  
  return new Promise((resolve, reject) => {
    fs.access(fullPath, fs.constants.F_OK, (err) => {
      // If file doesn't exist, consider the operation successful
      if (err) {
        resolve(true);
        return;
      }
      
      fs.unlink(fullPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  });
};

export default {
  uploadToStorage,
  getPublicUrl,
  deleteFromStorage
};
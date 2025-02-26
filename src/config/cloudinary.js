// src/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// Constants
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Validate environment variables
const validateConfig = () => {
  const required = {
    cloud_name: 'dugkdmeqz',
    api_key: '411955314932459',
    api_secret: 'TS2HQ6kb6UztvzGfYCbXXrqKmfA'
  };

  Object.entries(required).forEach(([key, value]) => {
    if (!value) {
      throw new Error(`Missing required Cloudinary config: ${key}`);
    }
  });
};

// Initialize Cloudinary with credentials
const initCloudinary = () => {
  try {
    validateConfig();

    cloudinary.config({
      cloud_name: 'dugkdmeqz',
      api_key: '411955314932459',
      api_secret: 'TS2HQ6kb6UztvzGfYCbXXrqKmfA',
      secure: true
    });

    logger.info('Cloudinary initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Cloudinary:', error);
    throw new Error('Failed to initialize Cloudinary');
  }
};

/**
 * Validates the file before upload
 * @param {Buffer|string} file - File to validate
 * @param {string} fileType - MIME type of the file
 */
const validateFile = (file, fileType) => {
  // Check file existence
  if (!file) {
    throw new AppError('No file provided', 400);
  }

  // Check file type
  if (!fileType?.startsWith('image/')) {
    throw new AppError('Invalid file type. Only images are allowed.', 400);
  }

  const format = fileType.split('/')[1]?.toLowerCase();
  if (!ALLOWED_FORMATS.includes(format)) {
    throw new AppError(
      `Invalid file format. Allowed formats: ${ALLOWED_FORMATS.join(', ')}`,
      400
    );
  }

  // Check file size for Buffer
  if (Buffer.isBuffer(file) && file.length > MAX_FILE_SIZE) {
    throw new AppError('File size exceeds 5MB limit', 400);
  }
};

/**
 * Upload a file to Cloudinary
 * @param {string|Buffer} file - File to upload (base64 string or buffer)
 * @param {Object} options - Upload options
 */
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    // If mimetype is provided, validate the file
    if (options.resource_type === 'image' || options.fileType) {
      validateFile(file, options.fileType || 'image/jpeg');
    }

    const uploadOptions = {
      resource_type: 'auto',
      allowed_formats: ALLOWED_FORMATS,
      max_bytes: MAX_FILE_SIZE,
      quality: 'auto:good',
      fetch_format: 'auto',
      flags: 'attachment',
      ...options
    };

    // If file is a Buffer, convert to base64
    const fileToUpload = Buffer.isBuffer(file)
      ? `data:${options.fileType || 'image/jpeg'};base64,${file.toString('base64')}`
      : file;

    const result = await cloudinary.uploader.upload(fileToUpload, uploadOptions);

    logger.info('File uploaded successfully to Cloudinary', {
      publicId: result.public_id,
      url: result.secure_url,
      size: result.bytes,
      format: result.format
    });

    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    logger.error('Cloudinary upload error:', {
      error: error.message,
      stack: error.stack
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      `Failed to upload image: ${error.message || 'Unknown error'}`,
      error.http_code || 500
    );
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      throw new AppError('Public ID is required', 400);
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: 'image'
    });

    if (result.result !== 'ok') {
      throw new Error(`Deletion failed: ${result.result}`);
    }

    logger.info('File deleted successfully from Cloudinary', {
      publicId,
      result: result.result
    });

    return result;
  } catch (error) {
    logger.error('Cloudinary deletion error:', {
      error: error.message,
      publicId
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      `Failed to delete image: ${error.message || 'Unknown error'}`,
      error.http_code || 500
    );
  }
};

/**
 * Get optimized image URL
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} options - Transform options
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  try {
    if (!publicId) {
      throw new AppError('Public ID is required', 400);
    }

    const defaultOptions = {
      quality: 'auto',
      fetch_format: 'auto',
      dpr: 'auto',
      secure: true,
      flags: 'attachment'
    };

    const transformationOptions = {
      ...defaultOptions,
      ...options,
    };

    return cloudinary.url(publicId, transformationOptions);
  } catch (error) {
    logger.error('Error generating optimized URL:', {
      error: error.message,
      publicId,
      options
    });
    throw new AppError('Failed to generate image URL', 500);
  }
};

// Initialize Cloudinary on module load
initCloudinary();

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedImageUrl,
  ALLOWED_FORMATS,
  MAX_FILE_SIZE
};
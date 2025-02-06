// src/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// Configure Cloudinary with credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload a file to Cloudinary
 * @param {string} file - File path or base64 string
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload response
 */
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    logger.info('Uploading file to Cloudinary', { options });
    
    const uploadOptions = {
      resource_type: 'auto',
      ...options
    };

    const result = await cloudinary.uploader.upload(file, uploadOptions);
    
    logger.info('File uploaded successfully to Cloudinary', {
      publicId: result.public_id,
      url: result.secure_url
    });

    return {
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format
    };
  } catch (error) {
    logger.error('Cloudinary upload error:', error);
    throw new AppError('Failed to upload image', 500);
  }
};

/**
 * Delete a file from Cloudinary
 * @param {string} publicId - Cloudinary public ID of the file
 * @returns {Promise<Object>} Cloudinary deletion response
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    logger.info('Deleting file from Cloudinary', { publicId });
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    logger.info('File deleted successfully from Cloudinary', { publicId });
    
    return result;
  } catch (error) {
    logger.error('Cloudinary deletion error:', error);
    throw new AppError('Failed to delete image', 500);
  }
};

/**
 * Get an optimized URL for an image
 * @param {string} publicId - Cloudinary public ID of the image
 * @param {Object} options - Transformation options
 * @returns {string} Optimized image URL
 */
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: 'auto',
    fetch_format: 'auto',
    dpr: 'auto'
  };

  const transformationOptions = {
    ...defaultOptions,
    ...options
  };

  return cloudinary.url(publicId, transformationOptions);
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedImageUrl
};
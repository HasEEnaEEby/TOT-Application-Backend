import cloudinaryService from '../config/cloudinary.js';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';
import multer from 'multer';

export const uploadProfileImage = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No image uploaded', 400);
  }

  // Ensure user is authenticated
  if (!req.user?._id) {
    throw new AppError('Authentication required', 401);
  }

  // Delete existing image if it exists
  if (req.user.imagePublicId) {
    try {
      await cloudinaryService.deleteFromCloudinary(req.user.imagePublicId);
    } catch (error) {
      logger.warn('Failed to delete existing profile image', { 
        publicId: req.user.imagePublicId, 
        error: error.message 
      });
    }
  }

  // Upload to Cloudinary
  const uploadResult = await cloudinaryService.uploadToCloudinary(req.file.buffer, {
    folder: `user-profiles/${req.user._id}`,
    fileType: req.file.mimetype,
    transformation: [
      { width: 800, crop: "limit" },
      { quality: "auto" }
    ]
  });

  // Update user profile image
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id, 
    { 
      image: uploadResult.url,
      imagePublicId: uploadResult.publicId 
    }, 
    { new: true }
  );

  logger.info('Profile image uploaded successfully', {
    userId: req.user._id,
    imageUrl: uploadResult.url
  });

  res.status(200).json({
    status: 'success',
    data: {
      imageUrl: uploadResult.url
    }
  });
});

export const uploadCoverImage = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No image uploaded', 400);
  }

  // Ensure user is authenticated
  if (!req.user?._id) {
    throw new AppError('Authentication required', 401);
  }

  // Delete existing cover image if it exists
  if (req.user.coverImagePublicId) {
    try {
      await cloudinaryService.deleteFromCloudinary(req.user.coverImagePublicId);
    } catch (error) {
      logger.warn('Failed to delete existing cover image', { 
        publicId: req.user.coverImagePublicId, 
        error: error.message 
      });
    }
  }

  // Upload to Cloudinary
  const uploadResult = await cloudinaryService.uploadToCloudinary(req.file.buffer, {
    folder: `user-covers/${req.user._id}`,
    fileType: req.file.mimetype,
    transformation: [
      { width: 1600, crop: "limit" },
      { quality: "auto" }
    ]
  });

  // Update user cover image
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id, 
    { 
      coverImage: uploadResult.url,
      coverImagePublicId: uploadResult.publicId 
    }, 
    { new: true }
  );

  logger.info('Cover image uploaded successfully', {
    userId: req.user._id,
    imageUrl: uploadResult.url
  });

  res.status(200).json({
    status: 'success',
    data: {
      imageUrl: uploadResult.url
    }
  });
});
import { PassThrough } from 'stream';
import { deleteFromCloudinary, uploadToCloudinary } from '../config/cloudinary.js';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Process profile image upload using Cloudinary
 * @route POST /api/v1/auth/profile-image
 */
export const uploadProfileImage = catchAsync(async (req, res) => {
  if (!req.file && !req.body.image) {
    throw new AppError('No image file provided', 400);
  }

  const userId = req.user._id;
  
  logger.info('Processing profile image upload', {
    userId,
    requestId: req.id
  });

  let imageData;
  
  // Handle file upload from multipart/form-data (req.file from multer) or base64 string
  if (req.file) {
    // If using multer middleware
    imageData = await uploadToCloudinary(req.file.buffer, {
      folder: 'profile-images',
      public_id: `user_${userId}_${Date.now()}`,
      fileType: req.file.mimetype,
      resource_type: 'image'
    });
  } else if (req.body.image) {
    // If sending base64 encoded image
    imageData = await uploadToCloudinary(req.body.image, {
      folder: 'profile-images',
      public_id: `user_${userId}_${Date.now()}`,
      resource_type: 'image'
    });
  }

  // Check if user already has an image to delete the old one
  const user = await User.findById(userId);
  if (user.image && user.image.includes('cloudinary.com')) {
    try {
      // Extract public ID from Cloudinary URL
      const publicId = user.image.split('/').pop().split('.')[0];
      if (publicId) {
        await deleteFromCloudinary(`profile-images/${publicId}`);
      }
    } catch (error) {
      logger.warn('Failed to delete old profile image', {
        userId,
        error: error.message
      });
      // Continue even if deletion fails
    }
  }

  // Update user with new image URL
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { image: imageData.url },
    { new: true }
  ).select('-password');

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  logger.info('Profile image updated successfully', {
    userId,
    imageUrl: imageData.url,
    requestId: req.id
  });

  res.status(200).json({
    status: 'success',
    data: {
      imageUrl: imageData.url,
      user: updatedUser
    }
  });
});

/**
 * Upload cover image using Cloudinary
 * @route POST /api/v1/auth/cover-image
 */
export const uploadCoverImage = catchAsync(async (req, res) => {
  if (!req.file && !req.body.image) {
    throw new AppError('No image file provided', 400);
  }

  const userId = req.user._id;
  
  logger.info('Processing cover image upload', {
    userId,
    requestId: req.id
  });

  let imageData;
  
  // Handle file upload from multipart/form-data or base64 string
  if (req.file) {
    // If using multer middleware
    imageData = await uploadToCloudinary(req.file.buffer, {
      folder: 'cover-images',
      public_id: `cover_${userId}_${Date.now()}`,
      fileType: req.file.mimetype,
      resource_type: 'image',
      transformation: [
        { width: 1200, crop: 'limit' } // Optimize for cover image
      ]
    });
  } else if (req.body.image) {
    // If sending base64 encoded image
    imageData = await uploadToCloudinary(req.body.image, {
      folder: 'cover-images',
      public_id: `cover_${userId}_${Date.now()}`,
      resource_type: 'image',
      transformation: [
        { width: 1200, crop: 'limit' } // Optimize for cover image
      ]
    });
  }

  // Check if user already has a cover image to delete the old one
  const user = await User.findById(userId);
  if (user.coverImage && user.coverImage.includes('cloudinary.com')) {
    try {
      // Extract public ID from Cloudinary URL
      const publicId = user.coverImage.split('/').pop().split('.')[0];
      if (publicId) {
        await deleteFromCloudinary(`cover-images/${publicId}`);
      }
    } catch (error) {
      logger.warn('Failed to delete old cover image', {
        userId,
        error: error.message
      });
      // Continue even if deletion fails
    }
  }

  // Update user with new cover image URL
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { coverImage: imageData.url },
    { new: true }
  ).select('-password');

  if (!updatedUser) {
    throw new AppError('User not found', 404);
  }

  logger.info('Cover image updated successfully', {
    userId,
    coverImageUrl: imageData.url,
    requestId: req.id
  });

  res.status(200).json({
    status: 'success',
    data: {
      coverImageUrl: imageData.url,
      user: updatedUser
    }
  });
});

/**
 * ✅ Upload Image Function
 * @route POST /api/v1/upload/image
 */
export const uploadImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image', 400));
  }

  console.log(`📸 Uploading: ${req.file.originalname}, Type: ${req.file.mimetype}`);

  try {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'uploads', transformation: [{ width: 800, crop: 'limit' }] },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary Upload Error:', error);
          return next(new AppError('Image upload failed', 500));
        }
        
        console.log('✅ File uploaded to Cloudinary:', result.secure_url);
        
        res.status(200).json({
          status: 'success',
          message: 'Image uploaded successfully',
          imageUrl: result.secure_url
        });
      }
    );

    // ✅ Correctly pipe buffer to Cloudinary
    const bufferStream = new PassThrough();
    bufferStream.end(req.file.buffer);
    bufferStream.pipe(uploadStream);

  } catch (error) {
    console.error('❌ Upload Error:', error);
    return next(new AppError('Image upload failed', 500));
  }
});


export default {
  uploadProfileImage,
  uploadCoverImage,
  uploadImage
};
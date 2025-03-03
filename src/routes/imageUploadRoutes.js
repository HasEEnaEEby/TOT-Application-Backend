import express from 'express';
import multer from 'multer';
import appConfig from '../config/appConfig.js';
import {
  uploadCoverImage,
  uploadProfileImage
} from '../controllers/imageUploadController.js';
import {
  protect,
  restaurant
} from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: appConfig.upload.maxFileSize || (5 * 1024 * 1024) // Use config or default to 5MB
  },
  fileFilter: (req, file, cb) => {
    // Use allowed types from config
    const allowedTypes = appConfig.upload.allowedTypes || ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  }
});

// Profile image upload route
router.post('/profile-image', 
  protect, 
  restaurant,
  upload.single('image'), 
  uploadProfileImage
);

// Cover image upload route
router.post('/cover-image', 
  protect, 
  restaurant,
  upload.single('image'), 
  uploadCoverImage
);

export default router;
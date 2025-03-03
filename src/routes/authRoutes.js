import express from 'express';
import multer from 'multer';
import authController from '../controllers/authController.js';
import {
  uploadCoverImage,
  uploadProfileImage
} from '../controllers/imageUploadController.js';
import {
  optionalAuth,
  protect
} from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import logger from '../utils/logger.js';
import {
  emailValidator,
  loginValidator,
  registerValidator
} from '../validators/authValidator.js';

const router = express.Router();


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'), false);
    }
  }
});

/**
 * Public routes
 */

// Registration endpoints
router.post('/signup', 
  validateRequest(registerValidator), 
  (req, res, next) => {
    logger.info('Signup attempt', {
      email: req.body.email,
      role: req.body.role,
      requestId: req.id
    });
    next();
  },
  authController.signup
);

// Authentication endpoints
router.post('/login',
  validateRequest(loginValidator),
  (req, res, next) => {
    logger.info('Login attempt', { 
      email: req.body.email,
      requestId: req.id 
    });
    next();
  }, 
  authController.login
);

// Email verification endpoints
router.get('/verify-email/:token', 
  (req, res, next) => {
    logger.info('Email verification attempt', { 
      token: req.params.token.substring(0, 10) + '...',
      requestId: req.id
    });
    next();
  },
  authController.verifyEmail
);

router.post('/resend-verification',
  validateRequest(emailValidator),
  authController.resendVerification
);

// Token management endpoints
router.post('/refresh-token', 
  optionalAuth,  // Optional authentication to handle both scenarios
  authController.refreshToken
);

router.post('/logout', 
  protect,  // Require authentication for logout
  authController.logout
);

/**
 * Admin routes
 */
router.post('/admin/register', 
  validateRequest(registerValidator), 
  (req, res, next) => {
    logger.info('Admin registration attempt', {
      email: req.body.email,
      role: 'admin',
      requestId: req.id
    });
    next();
  },
  authController.adminRegister
);

router.post('/admin/login',
  validateRequest(loginValidator),
  (req, res, next) => {
    logger.info('Admin login attempt', {
      email: req.body.email,
      requestId: req.id
    });
    next();
  },
  authController.adminLogin
);

router.post('/biometric-login',
  validateRequest(emailValidator), // Validate email
  (req, res, next) => {
    logger.info('Biometric login attempt', { 
      email: req.body.email,
      requestId: req.id 
    });
    next();
  },
  authController.biometricLogin
);
router.post('/toggle-biometric-login', 
  protect,  // Require authentication
  (req, res, next) => {
    logger.info('Toggle biometric login attempt', { 
      userId: req.user?._id,
      requestId: req.id 
    });
    next();
  },
  authController.toggleBiometricLogin
);

/**
 * Protected routes - require authentication
 */
router.get('/profile', 
  protect,  // Required authentication
  authController.getProfile
);

router.patch('/profile',
  protect,  // Required authentication
  authController.updateProfile
);

/**
 * Profile image upload routes - for all authenticated users
 */
router.post('/profile-image', 
  protect, 
  upload.single('image'), 
  uploadProfileImage
);

router.post('/cover-image', 
  protect, 
  upload.single('image'), 
  uploadCoverImage
);

export default router;
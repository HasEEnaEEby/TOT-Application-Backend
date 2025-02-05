import express from 'express';
import authController from '../controllers/authController.js';
import {
  optionalAuth,
  protect,
  admin
} from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import logger from '../utils/logger.js';
import {
  emailValidator,
  loginValidator,
  registerValidator
} from '../validators/authValidator.js';

const router = express.Router();

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

export default router;
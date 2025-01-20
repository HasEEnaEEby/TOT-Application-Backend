// src/routes/authRoutes.js
import express from 'express';
import {
  getProfile,
  login,
  logout,
  refreshToken,
  resendVerification,
  signup,
  updateProfile,
  verifyEmail
} from '../controllers/authController.js';
import { validateRequest } from '../middleware/validateRequest.js';
import logger from '../utils/logger.js';
import {
  emailValidator,
  loginValidator,
  registerValidator
} from '../validators/authValidator.js';

const router = express.Router();

// Registration and Login
router.post('/signup', 
  validateRequest(registerValidator), 
  (req, res, next) => {
    logger.info('Signup attempt', {
      email: req.body.email,
      role: req.body.role
    });
    next();
  },
  signup
);

router.post('/login',
  validateRequest(loginValidator),
  (req, res, next) => {
    logger.info('Login attempt', { email: req.body.email });
    next();
  }, 
  login
);

// Email verification route - handle token in URL
router.get('/verify-email/:token', 
  (req, res, next) => {
    logger.info('Email verification attempt', { 
      token: req.params.token.substring(0, 10) + '...' 
    });
    next();
  },
  verifyEmail
);

// Profile management
router.post('/resend-verification',
  validateRequest(emailValidator),
  resendVerification
);

router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/profile', getProfile);
router.patch('/profile', updateProfile);

export default router;
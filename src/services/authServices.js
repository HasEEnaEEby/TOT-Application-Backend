import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import { generateAuthToken, generateRefreshToken, verifyRefreshToken } from '../utils/generateToken.js';
import logger from '../utils/logger.js';
import { getRegistrationMessage, sanitizeUser } from '../utils/userUtils.js';
import emailService from './emailservices.js';

export class AuthService {
  static async createUser(userData) {
    try {
      // Check existing email
      const existingEmail = await User.findOne({ email: userData.email });
      if (existingEmail) {
        throw new AppError('Email already exists', 400);
      }

      // Generate username if not provided
      if (!userData.username) {
        if (userData.role === 'restaurant') {
          userData.username = userData.restaurantName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .slice(0, 30);
        } else {
          userData.username = userData.email.split('@')[0].slice(0, 30);
        }
      }

      // Create user with proper initialization
      const user = await User.create({
        ...userData,
        isEmailVerified: false,
        status: userData.role === 'restaurant' ? 'pending' : undefined
      });

      logger.info('User created successfully', { 
        userId: user._id,
        role: user.role 
      });

      try {
        // Generate verification token
        const verificationToken = user.generateVerificationToken();
        await user.save({ validateBeforeSave: false });

        // Send appropriate email based on user role
        if (user.role === 'restaurant') {
          await emailService.sendRestaurantRegistrationEmail(user);
        } else {
          await emailService.sendVerificationEmail(user, verificationToken);
        }
        
        return {
          user: sanitizeUser(user),
          message: getRegistrationMessage(user.role)
        };
      } catch (emailError) {
        logger.error('Failed to send verification email', {
          error: emailError.message,
          userId: user._id
        });
        
        // Clean up verification fields
        user.verificationToken = undefined;
        user.verificationExpires = undefined;
        await user.save({ validateBeforeSave: false });
        
        throw new AppError('Failed to send verification email', 500);
      }
    } catch (error) {
      logger.error('User creation failed:', error);
      if (error.name === 'ValidationError') {
        const message = Object.values(error.errors)
          .map(err => err.message)
          .join(', ');
        throw new AppError(message, 400);
      }
      throw error;
    }
  }

  static async loginUser(email, password, role) {
    try {
      const user = await User.findOne({ email, role }).select('+password');
      
      if (!user || !(await user.comparePassword(password))) {
        throw new AppError('Invalid email or password', 401);
      }

      if (!user.isEmailVerified) {
        throw new AppError('Please verify your email before logging in', 401);
      }

      if (role === 'restaurant' && user.status !== 'approved') {
        throw new AppError(
          user.status === 'pending'
            ? 'Your restaurant account is pending approval'
            : 'Your restaurant account has been rejected',
          401
        );
      }

      const token = generateAuthToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);

      // Update last login
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      return {
        user: sanitizeUser(user),
        token,
        refreshToken
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  static async refreshToken(refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.id);

      if (!user) {
        throw new AppError('User not found', 401);
      }

      const newToken = generateAuthToken(user._id, user.role);

      return {
        token: newToken,
        user: sanitizeUser(user)
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new AppError('Invalid refresh token', 401);
    }
  }

  static async verifyEmail(token) {
    try {
      logger.info('Looking up user by verification token', {
        tokenPreview: token.substring(0, 10) + '...'
      });
  
      const user = await User.findOne({
        verificationToken: token,
        verificationExpires: { $gt: Date.now() }
      });
  
      if (!user) {
        logger.warn('Verification failed: Invalid or expired token');
        throw new AppError('Invalid or expired verification token. Please request a new one.', 400);
      }
  
      // Update user verification status
      user.isEmailVerified = true;
      user.verificationToken = undefined;
      user.verificationExpires = undefined;
      
      await user.save({ validateBeforeSave: false });
  
      logger.info('User email verified successfully', {
        userId: user._id,
        email: user.email
      });
  
      return {
        status: 'success',
        message: 'Email verified successfully',
        user: sanitizeUser(user)
      };
    } catch (error) {
      logger.error('Email verification failed:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  static async resendVerificationEmail(email) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.isEmailVerified) {
        throw new AppError('Email is already verified', 400);
      }

      const verificationToken = user.generateVerificationToken();
      await user.save({ validateBeforeSave: false });

      await emailService.sendVerificationEmail(user, verificationToken);

      return {
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      logger.error('Failed to resend verification email:', error);
      throw error;
    }
  }

  static async forgotPassword(email) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });

      await emailService.sendPasswordResetEmail(user, resetToken);

      return {
        message: 'Password reset email sent successfully'
      };
    } catch (error) {
      logger.error('Failed to process forgot password:', error);
      throw error;
    }
  }
}

export default AuthService;
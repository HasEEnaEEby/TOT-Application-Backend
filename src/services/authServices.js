import crypto from 'crypto';
import { User } from '../models/User.js';
import AppError from '../utils/AppError.js';
import {
  generateAuthToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/generateToken.js';
import logger from '../utils/logger.js';
import {
  getRegistrationMessage,
  sanitizeUser
} from '../utils/userUtils.js';
import emailService from './emailservices.js';

export class AuthService {
  // User Registration Method
  static async createUser(userData) {
    try {
      // Check for existing email
      const existingEmail = await User.findOne({ email: userData.email });
      if (existingEmail) {
        throw new AppError('Email already exists', 400);
      }

      // Generate username if not provided
      if (!userData.username) {
        userData.username = this.generateUsername(userData);
      }

      // Create user with initial status
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
        if (user.role === 'restaurant') {
          // For restaurant users, send restaurant registration email
          await emailService.sendRestaurantRegistrationEmail(user);
        } else {
          // For regular users, send verification email
          const verificationToken = user.generateVerificationToken();
          await user.save({ validateBeforeSave: false });
          await emailService.sendVerificationEmail(user, verificationToken);
        }
        
        return {
          user: sanitizeUser(user),
          message: getRegistrationMessage(user.role),
          requiresVerification: user.role !== 'admin'
        };
      } catch (emailError) {
        logger.error('Failed to send email', {
          error: emailError.message,
          userId: user._id
        });
        
        // Clean up user on email failure
        await User.findByIdAndDelete(user._id);
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

  // Username Generation Method
  static generateUsername(userData) {
    if (userData.role === 'restaurant') {
      return userData.restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 30);
    }
    return userData.email.split('@')[0].slice(0, 30);
  }

  // Admin Registration Method
  static async createAdmin(adminData) {
    try {
      // Prevent multiple admin accounts
      const existingAdmin = await User.findOne({ role: 'admin' });
      if (existingAdmin) {
        throw new AppError('Admin already exists', 400);
      }
  
      // Check email uniqueness
      const existingEmail = await User.findOne({ email: adminData.email });
      if (existingEmail) {
        throw new AppError('Email already exists', 400);
      }
  
      // Generate admin username if not provided
      if (!adminData.username) {
        adminData.username = adminData.email.split('@')[0].slice(0, 30);
      }
  
      // Create admin with verification bypassed
      const admin = await User.create({
        ...adminData,
        role: 'admin',
        isEmailVerified: true, 
        status: 'approved',
        verificationToken: undefined, 
        verificationExpires: undefined,
        verificationTokenUsed: true
      });
  
      logger.info('Admin created successfully', { 
        userId: admin._id,
        role: admin.role 
      });
  
      const token = generateAuthToken(admin._id, admin.role);
      const refreshToken = generateRefreshToken(admin._id);
  
      return {
        user: sanitizeUser(admin),
        token,
        refreshToken,
        message: 'Admin account created successfully'
      };
    } catch (error) {
      logger.error('Admin creation failed:', error);
      if (error.name === 'ValidationError') {
        const message = Object.values(error.errors)
          .map(err => err.message)
          .join(', ');
        throw new AppError(message, 400);
      }
      throw error;
    }
  }

  // User Login Method
  static async loginUser(email, password, role, adminCode = null) {
    try {
      logger.info('Attempting login', { email, role });
  
      // Find user by email and role
      const user = await User.findOne({ email, role })
        .select('+password +adminCode');
  
      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }
  
      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }
  
      // For restaurants, only check admin code and approved status
      if (role === 'restaurant') {
        if (user.status !== 'approved') {
          throw new AppError('Your restaurant account is pending approval', 403);
        }
        
        if (!user.adminCode || user.adminCode !== adminCode) {
          throw new AppError('Invalid admin code', 401);
        }
      } 
      // For other roles, check email verification
      else if (!user.isEmailVerified && role !== 'admin') {
        throw new AppError('Please verify your email before logging in', 403);
      }
  
      // Generate tokens
      const token = generateAuthToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);
  
      // Update last login
      user.lastLogin = new Date();
      await user.save();
  
      logger.info('Login successful', {
        userId: user._id,
        role: user.role,
        restaurantName: user.restaurantName
      });
  
      return {
        user: sanitizeUser(user),
        token,
        refreshToken,
        restaurantDetails: role === 'restaurant' ? {
          name: user.restaurantName,
          location: user.location,
          contactNumber: user.contactNumber,
          status: user.status
        } : undefined
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  // Login Access Validation
  static validateLoginAccess(user, role) {
    // Admin login check
    if (role === 'admin') {
      if (user.role !== 'admin') {
        throw new AppError('Access denied. Admin privileges required', 403);
      }
      return;
    }

    // Non-admin login checks
    if (!user.isEmailVerified) {
      throw new AppError('Please verify your email before logging in', 401);
    }

    // Restaurant-specific status check
    if (role === 'restaurant' && user.status !== 'approved') {
      throw new AppError(
        user.status === 'pending'
          ? 'Your restaurant account is pending approval'
          : 'Your restaurant account has been rejected',
        401
      );
    }
  }

  // Token Refresh Methods
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

  // Admin Token Refresh Method
  static async refreshAdminToken(refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const admin = await User.findOne({ 
        _id: decoded.id,
        role: 'admin'
      });

      if (!admin) {
        throw new AppError('Invalid admin refresh token', 401);
      }

      const newToken = generateAuthToken(admin._id, admin.role);

      return {
        token: newToken,
        user: sanitizeUser(admin)
      };
    } catch (error) {
      logger.error('Admin token refresh failed:', error);
      throw new AppError('Invalid admin refresh token', 401);
    }
  }

  // Email Verification Method
  static async verifyEmail(token) {
    try {
      logger.info('Processing email verification', {
        tokenPreview: token.substring(0, 10) + '...'
      });
  
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
  
      logger.debug('Looking up user with hashed token', {
        hashedTokenPreview: hashedToken.substring(0, 10) + '...'
      });
  
      const user = await User.findOne({
        verificationToken: hashedToken,
        verificationExpires: { $gt: Date.now() },
        isEmailVerified: false,
        verificationTokenUsed: false
      }).select('+verificationToken');
  
      if (!user) {
        logger.warn('Verification failed: Invalid or expired token');
        throw new AppError(
          'Invalid or expired verification token. Please request a new verification email.',
          400
        );
      }
  
      // Update user verification status
      user.isEmailVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenUsed = true;
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
  
  // Resend Verification Email Method
  static async resendVerificationEmail(email, role) {
    try {
      const user = await User.findOne({ 
        email,
        isEmailVerified: false,
        role
      });
  
      if (!user) {
        throw new AppError('User not found or already verified', 404);
      }

      user.verificationToken = undefined;
      user.verificationTokenUsed = true;
      user.verificationExpires = undefined;
  
      const verificationToken = user.generateVerificationToken();
      await user.save({ validateBeforeSave: false });
  
      await emailService.sendVerificationEmail(user, verificationToken);
  
      return {
        message: 'New verification email sent successfully',
        status: 'success'
      };
    } catch (error) {
      logger.error('Failed to resend verification email:', {
        error: error.message,
        email
      });
      throw error;
    }
  }

  // Forgot Password Method
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

  // Reset Password Method
  static async resetPassword(token, newPassword) {
    try {
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      return {
        message: 'Password reset successful'
      };
    } catch (error) {
      logger.error('Failed to reset password:', error);
      throw error;
    }
  }

  // Update Profile Method
  static async updateProfile(userId, updateData) {
    try {
      // Remove sensitive fields that shouldn't be updated directly
      const sanitizedData = { ...updateData };
      delete sanitizedData.password;
      delete sanitizedData.role;
      delete sanitizedData.isEmailVerified;
      delete sanitizedData.status;

      const user = await User.findByIdAndUpdate(
        userId,
        sanitizedData,
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new AppError('User not found', 404);
      }

      return sanitizeUser(user);
    } catch (error) {
      logger.error('Failed to update profile:', error);
      throw error;
    }
  }

  // In the existing AuthService class
static async getProfile(userId) {
  try {
    const user = await User.findById(userId)
      .select('-password -resetPasswordToken -resetPasswordExpires -verificationToken -verificationExpires');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Customize the returned profile based on user role
    const profileData = {
      _id: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      status: user.status
    };

    // Add role-specific details
    if (user.role === 'restaurant') {
      profileData.restaurantName = user.restaurantName;
      profileData.location = user.location;
      profileData.contactNumber = user.contactNumber;
    } else if (user.role === 'customer') {
      profileData.firstName = user.firstName;
      profileData.lastName = user.lastName;
      profileData.phoneNumber = user.phoneNumber;
    }

    return profileData;
  } catch (error) {
    logger.error('Error fetching user profile', {
      userId,
      error: error.message
    });
    throw new AppError('Failed to retrieve user profile', 500);
  }
}
}

export default AuthService;
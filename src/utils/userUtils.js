// src/utils/userUtils.js
import { User } from '../models/User.js';
import logger from './logger.js';
import AppError from './AppError.js';

export const sanitizeUser = (user) => {
  const sanitized = {
    id: user._id,
    email: user.email,
    username: user.username,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt
  };

  if (user.role === 'restaurant') {
    sanitized.restaurantDetails = {
      name: user.restaurantName,
      location: user.location,
      contactNumber: user.contactNumber,
      quote: user.quote,
      status: user.status
    };
  }

  return sanitized;
};

export const generateUniqueUsername = async (email) => {
  try {
    const baseUsername = email.split('@')[0];
    let username = baseUsername;
    let counter = 1;

    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  } catch (error) {
    logger.error('Username generation failed:', { error: error.message });
    throw error;
  }
};

export const validateUserCredentials = async (email, password, role) => {
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

    return user;
  } catch (error) {
    logger.error('User validation failed:', { error: error.message });
    throw error;
  }
};

export const getRegistrationMessage = (role) => {
  return role === 'restaurant'
    ? 'Registration successful. Please check your email for further instructions.'
    : 'Registration successful. Please check your email to verify your account.';
};

export const handleUserVerification = async (user) => {
  try {
    const verificationToken = user.generateVerificationToken();
    await user.save({ validateBeforeSave: false });
    return verificationToken;
  } catch (error) {
    logger.error('Verification token generation failed:', { error: error.message });
    throw error;
  }
};

export default {
  sanitizeUser,
  generateUniqueUsername,
  validateUserCredentials,
  getRegistrationMessage,
  handleUserVerification
};
// src/controllers/authController.js
import crypto from 'node:crypto';
import { ROLES } from '../constants/roles.js';
import { User } from '../models/User.js';
import { AuthService } from '../services/authServices.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Cookie configuration based on environment
 */
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  domain: process.env.COOKIE_DOMAIN || undefined
});

/**
 * User registration
 * @route POST /api/v1/auth/signup
 */
export const signup = catchAsync(async (req, res) => {
  logger.info('Processing signup request', {
    email: req.body.email,
    role: req.body.role,
    requestId: req.id
  });

  if (req.body.role === ROLES.RESTAURANT && !req.body.restaurantName) {
    throw new AppError('Restaurant name is required for restaurant registration', 400);
  }

  const result = await AuthService.createUser(req.body);

  logger.info('User registration successful', {
    userId: result.user._id,
    role: result.user.role,
    requestId: req.id
  });

  res.status(201).json({
    status: 'success',
    message: result.message,
    data: { 
      user: result.user,
      requiresVerification: true
    }
  });
});

/**
 * User login
 * @route POST /api/v1/auth/login
 */
export const login = catchAsync(async (req, res) => {
  const { email, password, role } = req.body;

  logger.info('Processing login request', { email, role, requestId: req.id });

  const result = await AuthService.loginUser(email, password, role);
  
  // Set auth tokens in HTTP-only cookies
  res.cookie('token', result.token, getCookieOptions());
  res.cookie('refreshToken', result.refreshToken, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  logger.info('Login successful', {
    userId: result.user._id,
    role: result.user.role,
    requestId: req.id
  });

  res.json({
    status: 'success',
    data: {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken
    }
  });
});

/**
 * Email verification
 * @route GET /api/v1/auth/verify-email/:token
 */
export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.params;
  
  if (!token) {
    throw new AppError('Verification token is required', 400);
  }

  logger.info('Processing email verification', {
    tokenPreview: token.substring(0, 10) + '...'
  });

  // Hash token and find user
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new AppError('Invalid or expired verification token', 400);
  }

  // Update user verification status
  user.isEmailVerified = true;
  user.verificationToken = undefined;
  user.verificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  logger.info('Email verification successful', {
    userId: user._id,
    email: user.email
  });

  res.json({
    status: 'success',
    message: 'Email verified successfully. You can now login.'
  });
});

/**
 * Resend verification email
 * @route POST /api/v1/auth/resend-verification
 */
export const resendVerification = catchAsync(async (req, res) => {
  const { email } = req.body;

  logger.info('Processing verification resend request', {
    email,
    requestId: req.id
  });

  await AuthService.resendVerificationEmail(email);

  res.json({
    status: 'success',
    message: 'Verification email sent successfully'
  });
});

/**
 * Refresh authentication token
 * @route POST /api/v1/auth/refresh-token
 */
export const refreshToken = catchAsync(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    throw new AppError('Refresh token is required', 400);
  }

  logger.info('Processing token refresh');

  const result = await AuthService.refreshToken(token);

  res.cookie('token', result.newToken, getCookieOptions());

  res.json({
    status: 'success',
    data: {
      user: result.user,
      token: result.newToken
    }
  });
});

/**
 * User logout
 * @route POST /api/v1/auth/logout
 */
export const logout = catchAsync(async (req, res) => {
  // Clear auth cookies
  res.clearCookie('token', getCookieOptions());
  res.clearCookie('refreshToken', getCookieOptions());

  if (req.user?._id) {
    await AuthService.logout(req.user._id);
    logger.info('User logged out', {
      userId: req.user._id,
      requestId: req.id
    });
  }

  res.json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

/**
 * Get user profile
 * @route GET /api/v1/auth/profile
 */
export const getProfile = catchAsync(async (req, res) => {
  const user = await AuthService.getProfile(req.user._id);

  res.json({
    status: 'success',
    data: { user }
  });
});

/**
 * Update user profile
 * @route PATCH /api/v1/auth/profile
 */
export const updateProfile = catchAsync(async (req, res) => {
  logger.info('Processing profile update', {
    userId: req.user._id,
    fields: Object.keys(req.body),
    requestId: req.id
  });

  const updatedUser = await AuthService.updateProfile(req.user._id, req.body);

  res.json({
    status: 'success',
    data: { user: updatedUser }
  });
});

export default {
  signup,
  login,
  verifyEmail,
  resendVerification,
  refreshToken,
  logout,
  getProfile,
  updateProfile
};
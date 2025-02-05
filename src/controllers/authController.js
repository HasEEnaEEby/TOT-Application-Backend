import { ROLES } from '../constants/roles.js';
import { AuthService } from '../services/authServices.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Cookie configuration based on environment
 * @returns {Object} Cookie configuration options
 */
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  domain: process.env.COOKIE_DOMAIN || undefined
});

/**
 * Admin registration controller
 * @route POST /api/v1/auth/admin/register
 */
export const adminRegister = catchAsync(async (req, res) => {
  logger.info('Processing admin registration request', {
    email: req.body.email,
    requestId: req.id
  });

  const result = await AuthService.createAdmin({
    ...req.body,
    role: 'admin' 
  });

  res.cookie('token', result.token, getCookieOptions());
  res.cookie('refreshToken', result.refreshToken, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000 
  });

  res.status(201).json({
    status: 'success',
    data: {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken
    }
  });
});

/**
 * Admin login controller
 * @route POST /api/v1/auth/admin/login
 */
export const adminLogin = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  logger.info('Processing admin login request', { 
    email, 
    requestId: req.id 
  });

  const result = await AuthService.loginUser(email, password, ROLES.ADMIN);

  // Set tokens in HTTP-only cookies
  res.cookie('token', result.token, getCookieOptions());
  res.cookie('refreshToken', result.refreshToken, {
    ...getCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  logger.info('Admin login successful', {
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
 * User registration controller
 * @route POST /api/v1/auth/signup
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
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

  // Modify response for restaurant signup
  const requiresVerification = req.body.role !== ROLES.RESTAURANT;
  
  res.status(201).json({
    status: 'success',
    message: result.message,
    data: { 
      user: result.user,
      requiresVerification,
      ...(req.body.role === ROLES.RESTAURANT && {
        message: 'Restaurant registration successful. Please wait for admin approval.'
      })
    }
  });
});

/**
 * User login controller
 * @route POST /api/v1/auth/login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const login = catchAsync(async (req, res) => {
  const { email, password, role, adminCode } = req.body;

  logger.info('Processing login request', { 
    email, 
    role, 
    hasAdminCode: !!adminCode,
    requestId: req.id 
  });

  const result = await AuthService.loginUser(email, password, role, adminCode);
  
  // Set tokens in HTTP-only cookies
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

  const responseData = {
    status: 'success',
    data: {
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      redirectPath: role === 'restaurant' ? '/restaurant/dashboard' : '/customer-dashboard',
      restaurantDetails: role === 'restaurant' ? {
        name: result.user.restaurantName,
        location: result.user.location,
        contactNumber: result.user.contactNumber,
        status: result.user.status
      } : undefined
    }
  };

  res.json(responseData);
});

/**
 * Email verification controller
 * @route GET /api/v1/auth/verify-email/:token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.params;
  
  logger.info('Email verification attempt', {
    requestId: req.id,
    token: token.substring(0, 10) + '...' 
  });

  const result = await AuthService.verifyEmail(token);

  logger.info('Email verification successful', {
    userId: result.user._id,
    requestId: req.id
  });

  return res.status(200).json({
    status: 'success',
    message: 'Email verified successfully',
    data: {
      user: result.user
    }
  });
});

/**
 * Resend verification email controller
 * @route POST /api/v1/auth/resend-verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
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
    message: 'New verification email sent successfully'
  });
});

/**
 * Token refresh controller
 * @route POST /api/v1/auth/refresh-token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const refreshToken = catchAsync(async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    throw new AppError('Refresh token is required', 400);
  }

  logger.info('Processing token refresh', { requestId: req.id });

  const result = await AuthService.refreshToken(token);

  res.cookie('token', result.token, getCookieOptions());

  res.json({
    status: 'success',
    data: {
      user: result.user,
      token: result.token
    }
  });
});

/**
 * User logout controller
 * @route POST /api/v1/auth/logout
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const logout = catchAsync(async (req, res) => {
  res.clearCookie('token', getCookieOptions());
  res.clearCookie('refreshToken', getCookieOptions());

  if (req.user?._id) {
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
 * Get user profile controller
 * @route GET /api/v1/auth/profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getProfile = catchAsync(async (req, res) => {
  if (!req.user?._id) {
    throw new AppError('Authentication required', 401);
  }

  logger.info('Fetching user profile', {
    userId: req.user._id,
    requestId: req.id
  });

  const user = await AuthService.getProfile(req.user._id);

  res.json({
    status: 'success',
    data: { user }
  });
});

/**
 * Update user profile controller
 * @route PATCH /api/v1/auth/profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateProfile = catchAsync(async (req, res) => {
  if (!req.user?._id) {
    throw new AppError('Authentication required', 401);
  }

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
  updateProfile,
  adminRegister,
  adminLogin
};
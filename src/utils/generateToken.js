import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import logger from './logger.js';

export const generateAuthToken = (userId, role) => {
  try {
    return jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
  } catch (error) {
    logger.error('Auth token generation failed:', { error: error.message });
    throw error;
  }
};

export const generateRefreshToken = (userId) => {
  try {
    return jwt.sign(
      { id: userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  } catch (error) {
    logger.error('Refresh token generation failed:', { error: error.message });
    throw error;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    logger.error('Refresh token verification failed:', { error: error.message });
    throw new Error('Invalid refresh token');
  }
};

export const verifyAuthToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.error('Auth token verification failed:', { error: error.message });
    throw new Error('Invalid auth token');
  }
};

export const generatePasswordResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  return {
    resetToken,
    hashedToken,
    expires: Date.now() + 10 * 60 * 1000 
  };
};

export default {
  generateAuthToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAuthToken,
  generatePasswordResetToken
};
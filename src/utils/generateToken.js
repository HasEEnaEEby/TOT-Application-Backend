// src/utils/generateToken.js
import jwt from 'jsonwebtoken';
import logger from './logger.js';

export const generateAuthToken = (userId, role) => {
  try {
    return jwt.sign(
      { id: userId, role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
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
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
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
    throw error;
  }
};

export const verifyAuthToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.error('Auth token verification failed:', { error: error.message });
    throw error;
  }
};

export default {
  generateAuthToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAuthToken
};
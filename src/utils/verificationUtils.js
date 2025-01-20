import crypto from 'node:crypto';
import logger from './logger.js';

export const generateVerificationToken = () => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    return {
      token,
      hashedToken,
      expires: Date.now() + 24 * 60 * 60 * 1000 
    };
  } catch (error) {
    logger.error('Verification token generation failed:', { error: error.message });
    throw error;
  }
};

export const generateVerificationCode = () => {
  try {
    return {
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
  } catch (error) {
    logger.error('Verification code generation failed:', { error: error.message });
    throw error;
  }
};

export const verifyToken = (hashedToken, storedToken, expiryDate) => {
  if (!storedToken || !expiryDate) {
    return false;
  }

  if (Date.now() > expiryDate) {
    return false;
  }

  return crypto
    .createHash('sha256')
    .update(hashedToken)
    .digest('hex') === storedToken;
};
// src/config/nodemailer.js
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const createTransporter = () => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: false, 
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      debug: process.env.NODE_ENV === 'development',
      logger: process.env.NODE_ENV === 'development'
    });

    logger.info('Email transporter created with config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER
    });

    return transporter;
  } catch (error) {
    logger.error('Failed to create email transporter:', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export default createTransporter;
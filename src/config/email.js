// src/config/email.js
import logger from '../utils/logger.js';

export const emailConfig = {
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: process.env.NODE_ENV === 'development'
  },
  from: process.env.EMAIL_FROM
};

export const validateEmailConfig = () => {
  const requiredFields = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
  
  const missingFields = requiredFields.filter(field => {
    const value = process.env[field];
    return !value || value.trim() === '';
  });

  if (missingFields.length > 0) {
    logger.error('Missing email configuration:', { missingFields });
    return false;
  }

  if (parseInt(process.env.SMTP_PORT) !== 2525 && process.env.SMTP_HOST === 'sandbox.smtp.mailtrap.io') {
    logger.error('Invalid SMTP port for Mailtrap');
    return false;
  }

  return true;
};

export default emailConfig;
// src/config/validateEnv.js
import { cleanEnv, num, port, str } from 'envalid';
import logger from '../utils/logger.js';

const validateEnv = () => {
  try {
    return cleanEnv(process.env, {
      NODE_ENV: str({ choices: ['development', 'production', 'test'] }),
      PORT: port({ default: 4000 }),
      APP_NAME: str(),
      
      // Database
      MONGODB_URI: str(),
      
      // JWT Config
      JWT_SECRET: str(),
      JWT_EXPIRES_IN: str({ default: '30d' }),
      JWT_REFRESH_SECRET: str(),
      JWT_REFRESH_EXPIRES_IN: str({ default: '7d' }),
      
      // Email Config
      SMTP_HOST: str(),
      SMTP_PORT: port(),
      SMTP_USER: str(),
      SMTP_PASS: str(),
      EMAIL_FROM: str(),
      
      // URLs
      FRONTEND_URL: str({ default: 'http://localhost:3000' }),
      BACKEND_URL: str({ default: 'http://localhost:4000' }),
      CORS_ORIGIN: str({ default: 'http://localhost:3000' }),
      
      // Logging
      LOG_LEVEL: str({ 
        choices: ['debug', 'info', 'warn', 'error'], 
        default: 'debug' 
      }),
      
      // File Upload
      MAX_FILE_SIZE: num({ default: 5242880 }),
      ALLOWED_FILE_TYPES: str({ 
        default: 'image/jpeg,image/png,image/webp' 
      }),
      
      // Rate Limiting
      RATE_LIMIT_WINDOW: num({ default: 15 }),
      RATE_LIMIT_MAX: num({ default: 100 })
    });
  } catch (error) {
    logger.error('Environment validation failed:', {
      error: error.message
    });
    console.error('\n================================');
    console.error(' Missing environment variables:');
    console.error(error.message);
    console.error('================================\n');
    process.exit(1);
  }
};

export default validateEnv;
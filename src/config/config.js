import dotenv from 'dotenv';
dotenv.config();

const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4000,
    appName: process.env.APP_NAME || 'TOT Restaurant Ordering App',
    
    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/touch_order_taste'
    },
    
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '30d',
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    
    smtp: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    
    email: {
        from: process.env.EMAIL_FROM,
        tokenExpires: parseInt(process.env.EMAIL_TOKEN_EXPIRES) || 86400000
    },
    
    frontendUrl: process.env.FRONTEND_URL,
    backendUrl: process.env.BACKEND_URL,
    corsOrigin: process.env.CORS_ORIGIN,
    
    verificationUrl: process.env.VERIFICATION_URL || '/verify-email',
    
    allowAdminRegistration: process.env.ALLOW_ADMIN_REGISTRATION === 'true',
    
    logging: {
        level: process.env.LOG_LEVEL || 'debug'
    },
    
    upload: {
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
        allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/webp']
    },
    
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100
    }
};

export default config;
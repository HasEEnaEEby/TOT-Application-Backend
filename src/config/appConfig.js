import validateEnv from './validateEnv.js';

const env = validateEnv();

const appConfig = {
  app: {
    name: env.APP_NAME,
    port: env.PORT,
    environment: env.NODE_ENV,
    frontendUrl: env.FRONTEND_URL,
    backendUrl: env.BACKEND_URL
  },

  api: {
    prefix: '/api',
    version: 'v1'
  },

  db: {
    uri: env.MONGODB_URI
  },

  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
  },

  email: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.EMAIL_FROM
  },

  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true
  },

  security: {
    cookieSecret: env.COOKIE_SECRET,
    sessionSecret: env.SESSION_SECRET,
    sessionExpire: env.SESSION_EXPIRE,
    bcryptRounds: 12
  },

  logging: {
    level: env.LOG_LEVEL
  },

  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    allowedTypes: env.ALLOWED_FILE_TYPES.split(',')
  },

  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000,
    max: env.RATE_LIMIT_MAX
  }
};

export default appConfig;
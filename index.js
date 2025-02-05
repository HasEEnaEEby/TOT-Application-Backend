// index.js
import dotenv from 'dotenv';
import EventEmitter from 'events';
import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import connectDB from './src/config/db.js';
import { validateEmailConfig } from './src/config/email.js';
import { configureProcessHandlers } from './src/config/processHandlers.js';
import { configureRoutes } from './src/config/routes.js';
import { configureServer } from './src/config/server.js';
import validateEnv from './src/config/validateEnv.js';
import errorMiddleware from './src/middleware/errorMiddleware.js';
import emailService from './src/services/emailservices.js';
import logger from './src/utils/logger.js';
import 'winston-daily-rotate-file';

// Load and validate environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '.env') });

// Validate environment variables
try {
  validateEnv();
} catch (error) {
  logger.error('❌ Environment validation failed:', { error: error.message });
  process.exit(1);
}

// Initialize Express app
const app = express();
const port = process.env.PORT || 4000;
const environment = process.env.NODE_ENV || 'development';
const apiPrefix = '/api/v1';

// Increase EventEmitter limit for potential memory leaks
EventEmitter.defaultMaxListeners = 15;

// Configure server middleware
configureServer(app, environment);

// Add request timestamp
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  req.requestId = crypto.randomUUID();
  next();
});

// Development logging
if (environment === 'development') {
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, {
      body: req.body,
      params: req.params,
      query: req.query,
      requestId: req.requestId
    });
    next();
  });
}

// Configure API routes
configureRoutes(app, apiPrefix, environment);

// Error handling middleware
app.use(errorMiddleware);

// Server startup function
const startServer = async () => {
  try {
    // Verify and configure email service
    if (validateEmailConfig()) {
      try {
        const emailConnected = await emailService.verifyConnection();
        if (emailConnected) {
          logger.info('✅ Email service configured successfully');
        } else {
          logger.warn('⚠️ Email service connection failed. Email features may not work.');
        }
      } catch (err) {
        logger.warn('⚠️ Email service verification failed:', { 
          error: err.message,
          config: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT
          }
        });
      }
    } else {
      logger.warn('⚠️ Email configuration is incomplete. Email features will not work.');
    }

    // Connect to MongoDB
    try {
      await connectDB();
      logger.info('✅ MongoDB connected successfully');
    } catch (dbError) {
      logger.error('❌ Database connection failed:', { error: dbError.message });
      throw dbError;
    }

    // Start Express server
    const server = app.listen(port, () => {
      logger.info('=================================');
      logger.info(`✨ Environment: ${environment}`);
      logger.info(`🚀 Server running on port: ${port}`);
      logger.info(`📍 API endpoint: http://localhost:${port}${apiPrefix}`);
      logger.info('=================================');
    });

    // Configure graceful shutdown
    configureProcessHandlers(server);

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      logger.error('❌ Unhandled Rejection:', { error: err.message, stack: err.stack });
      // Don't exit in development to help with debugging
      if (environment === 'production') {
        server.close(() => process.exit(1));
      }
    });

    return server;
  } catch (error) {
    logger.error('❌ Server initialization failed:', { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  }
};

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    logger.error('❌ Fatal error during server startup:', { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  });
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('❌ Uncaught Exception:', { error: err.message, stack: err.stack });
  process.exit(1);
});

export default app;
// src/config/processHandlers.js
import logger from '../utils/logger.js';
import mongoose from 'mongoose';

export const configureProcessHandlers = (server) => {
  // Keep track of shutdown status
  let isShuttingDown = false;

  const shutdownGracefully = async (signal) => {
    if (isShuttingDown) {
      logger.info('Shutdown already in progress');
      return;
    }
    
    isShuttingDown = true;
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    // Create a shutdown promise
    const shutdown = new Promise((resolve, reject) => {
      server.close(async () => {
        try {
          // Close database connection
          if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            logger.info('Database connection closed');
          }

          // Clean up any other resources
          logger.info('All connections closed');
          resolve();
        } catch (error) {
          logger.error('Error during cleanup:', error);
          reject(error);
        }
      });
    });

    // Set timeout for shutdown
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Shutdown timed out'));
      }, 10000);
    });

    try {
      await Promise.race([shutdown, timeoutPromise]);
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Forced shutdown required:', error);
      process.exit(1);
    }
  };

  // Process handlers
  process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
  process.on('SIGINT', () => shutdownGracefully('SIGINT'));
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      reason,
      promise
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack
    });
    shutdownGracefully('Uncaught Exception');
  });

  // Remove memory leak warning
  process.setMaxListeners(15);
};
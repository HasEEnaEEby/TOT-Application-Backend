// src/config/server.js
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import logger from '../utils/logger.js';

export const configureServer = (app, environment) => {
  // Security
  app.use(helmet({
    contentSecurityPolicy: environment === 'production',
    crossOriginEmbedderPolicy: environment === 'production',
    crossOriginOpenerPolicy: environment === 'production',
    crossOriginResourcePolicy: environment === 'production',
  }));

  // CORS
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  }));

  // Rate Limiting
  const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX || 100,
    message: { 
      status: 'error', 
      message: 'Too many requests from this IP, please try again later.' 
    },
    standardHeaders: true,
    legacyHeaders: false
  });

  // Apply rate limiting to all API routes
  app.use('/api', limiter);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '50mb',
    parameterLimit: 50000 
  }));
  app.use(cookieParser(process.env.JWT_SECRET));

  // Logging
  if (environment === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined', {
      stream: { write: message => logger.info(message.trim()) }
    }));
  }

  // Set security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Add request ID
  app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    next();
  });

  // Log all requests in development
  if (environment === 'development') {
    app.use((req, res, next) => {
      logger.info(`${req.method} ${req.originalUrl}`, {
        requestId: req.id,
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    });
  }
};
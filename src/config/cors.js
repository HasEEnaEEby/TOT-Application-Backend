// src/config/cors.js
import cors from 'cors';
import appConfig from './appConfig.js';

export const corsOptions = {
  origin: appConfig.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'multipart/form-data',
    'boundary'
  ],
  exposedHeaders: [
    'Content-Range', 
    'X-Content-Range',
    'Content-Disposition',
    'Content-Type'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 3600,
  allowCredentials: true
};

export const fileUploadCorsOptions = {
  ...corsOptions,
  methods: ['POST', 'PUT'],
  allowedHeaders: [
    ...corsOptions.allowedHeaders,
    'Content-Length',
    'Content-Disposition'
  ]
};

// Create middleware for different use cases
export const defaultCors = cors(corsOptions);
export const fileUploadCors = cors(fileUploadCorsOptions);

// Export all configurations
export default {
  corsOptions,
  fileUploadCorsOptions,
  defaultCors,
  fileUploadCors
};
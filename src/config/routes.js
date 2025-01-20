// src/config/routes.js
import adminRoutes from '../routes/adminRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import customerRoutes from '../routes/customerRoutes.js';
import restaurantRoutes from '../routes/restaurantsRoutes.js';
import testRoutes from '../routes/testRoutes.js';
import AppError from '../utils/AppError.js';

export const configureRoutes = (app, apiPrefix, environment) => {
  // API Routes
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/admin`, adminRoutes);
  app.use(`${apiPrefix}/restaurants`, restaurantRoutes);
  app.use(`${apiPrefix}/customers`, customerRoutes);

  // Health Check
  app.get(['/health', '/healthz'], (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    });
  });

  // Development Routes
  if (environment === 'development') {
    app.use(`${apiPrefix}/test`, testRoutes);
  }

  // 404 Handler
  app.all('*', (req, res, next) => {
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
  });
};
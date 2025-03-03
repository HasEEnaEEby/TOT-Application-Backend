import adminRoutes from '../routes/adminRoutes.js';
import analyticsRoutes from '../routes/analyticsRoutes.js';
import authRoutes from '../routes/authRoutes.js';
import imageUploadRoutes from '../routes/imageUploadRoutes.js';
import incomeRoutes from '../routes/incomeRoutes.js';
import managementRoutes from '../routes/managementroutes.js';
import notificationRoutes from '../routes/notificationRoutes.js';
import orderRoutes from '../routes/orderRoutes.js';
import restaurantRoutes from '../routes/restaurantsRoutes.js';
import tableRoutes from '../routes/tableRoutes.js';
import taskRoutes from '../routes/TaskROutes.js';
import testRoutes from '../routes/testRoutes.js';
import AppError from '../utils/AppError.js';

export const configureRoutes = (app, apiPrefix, environment) => {
  console.log('Configuring routes with prefix:', apiPrefix);

  // Middleware to normalize routes
  app.use((req, res, next) => {
    console.log('Route Normalization Middleware:', {
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      path: req.path
    });

    if (req.path.startsWith('/socket.io/')) {
      return next();
    }

    // Only normalize if it's an API route and doesn't already have the prefix
    if (req.path !== '/health' && 
        req.path !== '/healthz' && 
        !req.path.startsWith(apiPrefix)) {
      req.url = `${apiPrefix}${req.url}`;
      console.log('Normalized URL:', req.url);
    }
    next();
  });

  // Health Check Routes (outside API prefix)
  app.get(['/health', '/healthz'], (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    });
  });

  // API Routes
  const routes = [
    { path: '/auth', router: authRoutes },
    { path: '/admin', router: adminRoutes },
    { path: '/admin/income', router: incomeRoutes },
    { path: '/restaurants', router: restaurantRoutes },
    { path: '/restaurants/tables', router: tableRoutes },
    { path: '/orders', router: orderRoutes },
    // { path: '/customers', router: customerRoutes },
    { path: '/management', router: managementRoutes },
    { path: '/tasks', router: taskRoutes },
    { path: '/notifications', router: notificationRoutes },
    { path: '/upload', router: imageUploadRoutes },
    { path: '/analytics', router: analyticsRoutes },
  ];

  

  // Register all routes with proper prefix
  routes.forEach(({ path, router }) => {
    const fullPath = `${apiPrefix}${path}`;
    console.log(`Registering route: ${fullPath}`);
    app.use(fullPath, router);
  });

  // Development Routes
  if (environment === 'development') {
    console.log(`Registering test routes: ${apiPrefix}/test`);
    app.use(`${apiPrefix}/test`, testRoutes);
  }

  // Debug route registration
  console.log('Registered Routes:', app._router.stack
    .filter(r => r.route || r.handle.stack)
    .map(r => r.route ? 
      `${Object.keys(r.route.methods).join(',')} ${r.route.path}` : 
      `MIDDLEWARE: ${r.regexp}`
    ));

  // 404 Handler
  app.all('*', (req, res, next) => {
    console.error('Unhandled Route:', {
      method: req.method,
      originalUrl: req.originalUrl,
      path: req.path,
      baseUrl: req.baseUrl,
      apiPrefix
    });
    next(new AppError(`Route ${req.originalUrl} not found`, 404));
  });
};


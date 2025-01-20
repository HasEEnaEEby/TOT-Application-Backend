import logger from '../utils/logger.js';

export default (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error(`Error: ${err.message}`, {
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    body: req.body,
    stack: err.stack
  });

  const error = {
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      body: req.body 
    })
  };

  res.status(err.statusCode).json(error);
};
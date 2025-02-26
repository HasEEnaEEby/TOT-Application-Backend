import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import RestaurantManagement from '../models/RestaurantManagement.js';
import User from '../models/User.js';
import logger from './logger.js';

let io;

export const initSocketIO = (httpServer) => {
    try {
      logger.info('Initializing Socket.IO', {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        port: process.env.PORT || 4000
      });
  
      io = new Server(httpServer, {
        cors: {
          origin: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            process.env.BACKEND_URL || 'http://localhost:4000',
            '*' // Be cautious in production
          ],
          methods: ['GET', 'POST'],
          allowedHeaders: ['Authorization', 'Content-Type'],
          credentials: true
        },
        pingTimeout: 60000, // Increased ping timeout
        pingInterval: 25000, // Increased ping interval
        connectionStateRecovery: {
          maxDisconnectionDuration: 2 * 60 * 1000,
          skipMiddlewares: true
        },
        transports: ['websocket', 'polling']
      });
  
      // More verbose logging for authentication
      io.use(async (socket, next) => {
        try {
          // Extract token from multiple sources with more logging
          const token = 
            socket.handshake.auth.token || 
            socket.handshake.headers.authorization?.split(' ')[1] ||
            socket.handshake.query.token;
          
          logger.info('Socket connection attempt', { 
            socketId: socket.id,
            tokenProvided: !!token,
            authHeaders: socket.handshake.headers
          });
  
          if (!token) {
            logger.warn('Socket connection attempt without token', { 
              socketId: socket.id,
              headers: socket.handshake.headers
            });
            return next(new Error('Authentication error: No token provided'));
          }
  
          try {
            // More robust token verification
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            logger.info('Token decoded', { 
              userId: decoded.id, 
              role: decoded.role 
            });
  
            // More detailed user lookup
            let user;
            try {
              if (decoded.role === 'restaurant') {
                user = await RestaurantManagement.findById(decoded.id);
              } else {
                user = await User.findById(decoded.id);
              }
            } catch (dbError) {
              logger.error('Database lookup error', {
                error: dbError.message,
                userId: decoded.id
              });
              return next(new Error('Authentication error: Database lookup failed'));
            }
  
            if (!user) {
              logger.warn('Socket authentication failed: User not found', { 
                userId: decoded.id, 
                role: decoded.role 
              });
              return next(new Error('Authentication error: User not found'));
            }
  
            // Attach user to socket
            socket.user = {
              id: user._id,
              role: decoded.role,
              username: user.username || user.restaurantName
            };
            
            next();
          } catch (verifyError) {
            logger.error('Token verification failed', { 
              error: verifyError.message,
              socketId: socket.id,
              errorName: verifyError.name
            });
            return next(new Error('Authentication error: Invalid token'));
          }
        } catch (error) {
          logger.error('Socket authentication middleware error', { 
            error: error.message,
            socketId: socket.id 
          });
          next(new Error('Authentication error'));
        }
      });
  
      // Rest of the existing implementation remains the same
      return io;
    } catch (error) {
      logger.error('Failed to initialize Socket.IO', { 
        error: error.message,
        stack: error.stack 
      });
      throw error;
    }
  };
export const getIO = () => {
  if (!io) {
    logger.warn('Attempting to get Socket.IO before initialization', {
      stackTrace: new Error().stack
    });
    return null;
  }
  return io;
};

export const emitToUser = (userId, eventName, data) => {
  try {
    const ioInstance = getIO();
    if (!ioInstance) {
      logger.warn('Cannot emit event: Socket.IO not initialized', {
        userId,
        eventName
      });
      return;
    }

    ioInstance.to(userId.toString()).emit(eventName, data);
    
    logger.info('Emitted event to user', {
      userId,
      eventName,
      dataType: typeof data
    });
  } catch (error) {
    logger.error('Failed to emit event to user', {
      userId,
      eventName,
      error: error.message
    });
  }
};

export const broadcastEvent = (eventName, data) => {
  try {
    const ioInstance = getIO();
    if (!ioInstance) {
      logger.warn('Cannot broadcast event: Socket.IO not initialized', {
        eventName
      });
      return;
    }

    ioInstance.emit(eventName, data);
    
    logger.info('Broadcasted event', {
      eventName,
      dataType: typeof data
    });
  } catch (error) {
    logger.error('Failed to broadcast event', {
      eventName,
      error: error.message
    });
  }
};

export default { 
  initSocketIO, 
  getIO, 
  emitToUser, 
  broadcastEvent
};
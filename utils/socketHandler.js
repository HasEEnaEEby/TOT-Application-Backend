import logger from './logger.js';

const activeUsers = new Map();
const activeRooms = new Map();

const socketHandler = (socket) => {
  logger.info(`New connection: ${socket.id}`);

  // Handle joining a session
  socket.on('joinSession', (data) => {
    const { sessionId, userId, role } = data;
    
    socket.join(sessionId);
    activeUsers.set(socket.id, { userId, role, sessionId });
    
    const roomUsers = activeRooms.get(sessionId) || new Set();
    roomUsers.add(socket.id);
    activeRooms.set(sessionId, roomUsers);

    logger.info(`User ${userId} (${role}) joined session: ${sessionId}`);
    
    socket.to(sessionId).emit('userJoined', {
      userId,
      role,
      timestamp: new Date()
    });
  });

  // Handle new order
  socket.on('newOrder', (orderData) => {
    const user = activeUsers.get(socket.id);
    if (!user) return;

    logger.info(`New order in session ${user.sessionId}`);
    
    socket.to(user.sessionId).emit('orderReceived', {
      ...orderData,
      userId: user.userId,
      timestamp: new Date()
    });
  });

  // Handle order status updates
  socket.on('updateOrderStatus', (data) => {
    const { orderId, status, sessionId } = data;
    
    logger.info(`Order ${orderId} status updated to ${status}`);
    
    socket.to(sessionId).emit('orderStatusUpdated', {
      orderId,
      status,
      timestamp: new Date()
    });
  });

  // Handle table status updates
  socket.on('updateTableStatus', (data) => {
    const { tableId, status, sessionId } = data;
    
    socket.to(sessionId).emit('tableStatusUpdated', {
      tableId,
      status,
      timestamp: new Date()
    });
  });

  // Handle messages
  socket.on('sendMessage', (data) => {
    const { sessionId, message, recipient } = data;
    const user = activeUsers.get(socket.id);
    
    if (!user) return;

    socket.to(sessionId).emit('newMessage', {
      message,
      sender: user.userId,
      senderRole: user.role,
      recipient,
      timestamp: new Date()
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id);
    if (user) {
      const { sessionId, userId, role } = user;
      const roomUsers = activeRooms.get(sessionId);
      
      if (roomUsers) {
        roomUsers.delete(socket.id);
        if (roomUsers.size === 0) {
          activeRooms.delete(sessionId);
        } else {
          activeRooms.set(sessionId, roomUsers);
        }
      }
      
      socket.to(sessionId).emit('userLeft', {
        userId,
        role,
        timestamp: new Date()
      });
      
      activeUsers.delete(socket.id);
    }
    
    logger.info(`Client disconnected: ${socket.id}`);
  });
};

export default socketHandler;
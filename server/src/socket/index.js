const jwt = require('jsonwebtoken');
const Restaurant = require('../models/Restaurant');

const socketHandler = (io) => {
  // Auth middleware for sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId, userRole } = socket;
    console.log(`Socket connected: ${socket.id} (user: ${userId}, role: ${userRole})`);

    // Join personal user room for notifications
    socket.join(`user:${userId}`);

    // Restaurant owners join their restaurant room
    if (userRole === 'restaurant_owner') {
      try {
        const restaurant = await Restaurant.findOne({ ownerId: userId }).lean();
        if (restaurant) socket.join(`restaurant:${restaurant._id}`);
      } catch { /* silent */ }
    }

    // Join a specific order room (called by frontend when viewing an order)
    socket.on('join_order', (orderId) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('leave_order', (orderId) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;

const Notification = require('../models/Notification');

const createAndEmit = async (io, { userId, title, message, type, orderId }) => {
  const notification = await Notification.create({
    userId,
    title,
    message,
    type,
    orderId: orderId || undefined,
    isRead: false,
  });

  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }

  return notification;
};

module.exports = { createAndEmit };

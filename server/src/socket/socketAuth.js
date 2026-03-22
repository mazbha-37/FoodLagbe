const jwt = require('jsonwebtoken');

/**
 * Socket.IO auth middleware.
 * Reads JWT from socket.handshake.auth.token, verifies it,
 * and attaches socket.user = { userId, role } on success.
 */
const socketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    socket.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch {
    next(new Error('Authentication error'));
  }
};

module.exports = socketAuth;

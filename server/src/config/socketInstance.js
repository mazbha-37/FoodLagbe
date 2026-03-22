/**
 * Shared Socket.IO instance accessor.
 * Set once in server.js, then get anywhere (services, jobs, etc.)
 * without needing to pass io as a parameter.
 */
let _io = null;

const setIo = (ioInstance) => {
  _io = ioInstance;
};

const getIo = () => _io;

module.exports = { setIo, getIo };

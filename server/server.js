require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const initSocket = require('./src/config/socket');
const initializeSocket = require('./src/socket/socketHandler');
const { setIo } = require('./src/config/socketInstance');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Drop ALL 2dsphere indexes on users collection — they cause errors for docs without valid GeoJSON
  try {
    const mongoose = require('mongoose');
    const col = mongoose.connection.collection('users');
    const indexes = await col.indexes();
    for (const idx of indexes) {
      const keys = Object.values(idx.key || {});
      if (keys.includes('2dsphere') || keys.includes('2d')) {
        await col.dropIndex(idx.name);
        console.log(`Dropped geo index: ${idx.name}`);
      }
    }
  } catch (err) {
    console.log('Index cleanup note:', err.message);
  }

  const httpServer = http.createServer(app);
  const io = initSocket(httpServer);

  // Make io accessible via req.app.get('io') in controllers
  app.set('io', io);

  // Make io accessible globally via socketInstance.getIo()
  setIo(io);

  // Initialize all Socket.IO event handlers
  initializeSocket(io);

  // Background jobs
  const { startOrderTimeoutJob } = require('./src/jobs/orderTimeoutJob');
  startOrderTimeoutJob(io);

  httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
};

startServer();

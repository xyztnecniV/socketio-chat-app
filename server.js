require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [new winston.transports.Console()]
});

function createServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);

  // Serve static files from public
  app.use(express.static(path.join(__dirname, 'public')));

  // Basic health endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
      io.emit('chat message', msg);
    });
  });

  // Graceful shutdown
  function shutdown(signal) {
    logger.info(`Received ${signal}. Shutting down gracefully.`);
    server.close((err) => {
      if (err) {
        logger.error(`Error during shutdown: ${err.message}`);
        process.exit(1);
      }
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Expose server and io for testing
  return { app, server, io };
}

const PORT = parseInt(process.env.PORT, 10) || 3000;

if (require.main === module) {
  const { server } = createServer();
  server.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

// Export for tests
module.exports = createServer();

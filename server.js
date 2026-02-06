require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [new winston.transports.Console()]
});

function createServer(options = {}) {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // In-memory store for users and messages with optional file persistence
  const store = {
    users: new Map(), // socketId -> { id, name, avatar }
    rooms: new Map(), // roomName -> Set(socketId)
    messages: [] // { id, room, from, to, text, ts }
  };

  const PERSIST_FILE = process.env.PERSIST_FILE || path.join(__dirname, 'data.json');
  const ENABLE_PERSIST = process.env.ENABLE_PERSIST === 'true';

  if (ENABLE_PERSIST && fs.existsSync(PERSIST_FILE)) {
    try {
      const raw = fs.readFileSync(PERSIST_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.messages) store.messages = parsed.messages;
      logger.info('Loaded persisted messages');
    } catch (err) {
      logger.warn('Could not load persisted data: ' + err.message);
    }
  }

  function persist() {
    if (!ENABLE_PERSIST) return;
    try {
      fs.writeFileSync(PERSIST_FILE, JSON.stringify({ messages: store.messages }, null, 2), 'utf8');
      logger.info('Persisted messages to file');
    } catch (err) {
      logger.error('Persist error: ' + err.message);
    }
  }

  // REST endpoints for history and presence
  app.get('/api/history', (req, res) => {
    const room = req.query.room || 'global';
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 100);
    const messages = store.messages.filter((m) => m.room === room).slice(-limit);
    res.json({ room, messages });
  });

  app.get('/api/users', (req, res) => {
    const users = Array.from(store.users.values()).map((u) => ({ id: u.id, name: u.name, avatar: u.avatar }));
    res.json({ users });
  });

  // Socket.io namespaces and core logic
  const chat = io.of('/chat');

  chat.on('connection', (socket) => {
    const clientId = uuidv4();
    // default user
    store.users.set(socket.id, { id: clientId, name: `User-${clientId.slice(0, 6)}`, avatar: `https://api.dicebear.com/6.x/identicon/svg?seed=${clientId}` });

    logger.info(`Socket connected: ${socket.id}`);

    // emit initial presence and rooms
    socket.emit('connected', { id: clientId, name: store.users.get(socket.id).name });
    chat.emit('presence', Array.from(store.users.values()).map((u) => ({ id: u.id, name: u.name, avatar: u.avatar })));

    socket.on('join', ({ room }) => {
      room = room || 'global';
      socket.join(room);
      if (!store.rooms.has(room)) store.rooms.set(room, new Set());
      store.rooms.get(room).add(socket.id);
      chat.to(room).emit('system', { text: `${store.users.get(socket.id).name} joined ${room}`, ts: Date.now() });
      logger.info(`${socket.id} joined ${room}`);
    });

    socket.on('leave', ({ room }) => {
      room = room || 'global';
      socket.leave(room);
      if (store.rooms.has(room)) store.rooms.get(room).delete(socket.id);
      chat.to(room).emit('system', { text: `${store.users.get(socket.id).name} left ${room}`, ts: Date.now() });
      logger.info(`${socket.id} left ${room}`);
    });

    socket.on('typing', ({ room, typing }) => {
      room = room || 'global';
      socket.to(room).emit('typing', { id: store.users.get(socket.id).id, name: store.users.get(socket.id).name, typing });
    });

    socket.on('private message', ({ toId, text }) => {
      const from = store.users.get(socket.id);
      const toSocket = Array.from(store.users.entries()).find(([, u]) => u.id === toId);
      const msg = { id: uuidv4(), room: `pm:${from.id}:${toId}`, from: from.id, to: toId, text, ts: Date.now() };
      store.messages.push(msg);
      persist();
      if (toSocket) {
        const targetSocketId = toSocket[0];
        chat.to(targetSocketId).emit('private message', msg);
        socket.emit('private message', msg);
      } else {
        socket.emit('error', { message: 'Recipient not found' });
      }
    });

    socket.on('message', ({ room = 'global', text }) => {
      const user = store.users.get(socket.id);
      const msg = { id: uuidv4(), room, from: user.id, name: user.name, avatar: user.avatar, text, ts: Date.now() };
      store.messages.push(msg);
      persist();
      chat.to(room).emit('message', msg);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      const user = store.users.get(socket.id);
      store.users.delete(socket.id);
      store.rooms.forEach((set) => set.delete(socket.id));
      chat.emit('presence', Array.from(store.users.values()).map((u) => ({ id: u.id, name: u.name, avatar: u.avatar })));
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

  return { app, server, io, chat, store };
}

const PORT = parseInt(process.env.PORT, 10) || 3000;

if (require.main === module) {
  const { server } = createServer();
  server.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

module.exports = createServer();
module.exports.createServer = createServer;

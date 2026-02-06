const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

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

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = server;

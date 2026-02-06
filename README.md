# Harmony Chat

A polished real-time chat application built with Node.js, Express and Socket.io.

Features:
- Rooms and private messages
- Typing indicators and presence
- Message history with optional persistence
- Modern responsive UI with avatars and animations

Quick start:

1. Install dependencies

```bash
npm install
```

2. Start the server

```bash
npm start
```

3. Open http://localhost:3000

Development:

```bash
npm run dev
```

Persistence:

Set environment variables to enable persistence:

```bash
ENABLE_PERSIST=true
PERSIST_FILE=./data.json
```

API endpoints:
- GET /api/history?room=ROOM&limit=N
- GET /api/users

Testing

```bash
npm test
```

Contributing

See CONTRIBUTING.md for guidelines.
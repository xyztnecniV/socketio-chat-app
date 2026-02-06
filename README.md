# Socket.io Chat App

Real-time chat application using Node.js, Express and Socket.io.

## Run

Install dependencies:

```bash
npm install
```

Start (production):

```bash
npm start
```

Start in development (auto-reload):

```bash
npm run dev
```

Open http://localhost:3000

## Docker

Build and run with Docker:

```bash
docker build -t socketio-chat-app .
docker run -p 3000:3000 --env PORT=3000 socketio-chat-app
```

Or with docker-compose:

```bash
docker-compose up --build
```

## Test

Run `npm test` to execute basic tests.

## Lint

Run `npm run lint` to check code style (requires eslint installed).

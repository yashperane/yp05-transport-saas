import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { healthRouter } from './routes/health.js';
import './models/index.js';

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO setup (foundation for real-time tracking and orders)
export const io = new SocketIOServer(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`⚡ Real-time client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Real-time client disconnected: ${socket.id}`);
  });
});

// Mount Routes
app.use('/api/health', healthRouter);

app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to Fleet & Transport SaaS API (MERN Stack Foundation)',
    healthEndpoint: '/api/health',
  });
});

// Start Server & Database Connection
const startServer = async () => {
  await connectDatabase();

  server.listen(config.port, () => {
    console.log(`🚀 Backend server is running on http://localhost:${config.port}`);
    console.log(`🩺 Health check accessible at: http://localhost:${config.port}/api/health`);
  });
};

startServer();

export { app, server };

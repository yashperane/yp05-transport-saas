import express from 'express';
import cors from 'cors';
import http from 'http';
import cookieParser from 'cookie-parser';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { companyRouter } from './routes/company.js';
import { orderRouter } from './routes/order.js';
import { fleetRouter } from './routes/fleet.js';
import { dispatchRouter } from './routes/dispatch.js';
import { driverOrderRouter } from './routes/driverOrders.js';
import { notificationRouter } from './routes/notifications.js';
import { acceptInvitation } from './controllers/companyUserController.js';
import { verifyAccessToken } from './utils/jwt.js';
import { User } from './models/User.js';
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
app.use(cookieParser());

// ─────────────────────────────────────────────────────────────
// Socket.IO Setup — Chapter 7: Authenticated + Tenant-Scoped
//
// HOW SOCKET.IO ROOMS WORK:
//  1. Client connects and sends JWT token in handshake auth
//  2. Backend verifies the JWT and finds the user in database
//  3. If valid, the socket joins two rooms:
//     - 'tenant:{transportBusinessId}' — broadcasts to everyone in this tenant
//     - 'driver:{userId}' — private room for direct driver notifications
//  4. When a dispatch event occurs (order claimed, assigned etc.),
//     the backend emits ONLY to the relevant room(s)
//  5. Unknown sockets are rejected — no unauthenticated joins
//
// WHY THIS IS SECURE:
//  - Client CANNOT join a room by name from the client side
//  - Server controls all room assignments after JWT verification
//  - Tenant A events NEVER reach Tenant B sockets
// ─────────────────────────────────────────────────────────────
export const io = new SocketIOServer(server, {
  cors: {
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    // Client must pass token in socket handshake: socket.auth = { token: '...' }
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('SOCKET_UNAUTHORIZED: Authentication token missing.'));
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return next(new Error('SOCKET_UNAUTHORIZED: Invalid or expired token.'));
    }

    const user = await User.findById(decoded.userId).select('_id role transportBusinessId companyId status').lean();
    if (!user || user.status !== 'active') {
      return next(new Error('SOCKET_UNAUTHORIZED: User account invalid or inactive.'));
    }

    // Attach trusted identity to socket — cannot be overridden by client
    socket.userId = user._id.toString();
    socket.role = user.role;
    socket.transportBusinessId = user.transportBusinessId?.toString() || null;
    socket.companyId = user.companyId?.toString() || null;

    next();
  } catch (err) {
    next(new Error('SOCKET_AUTH_ERROR: ' + err.message));
  }
});

io.on('connection', (socket) => {
  console.log(`⚡ Authenticated socket connected: ${socket.id} [${socket.role}]`);

  // 1. Join user-specific private room for targeted notifications
  socket.join(`user:${socket.userId}`);

  // 2. Join tenant-scoped room (for owners & dispatchers)
  if (socket.transportBusinessId && ['owner', 'dispatcher'].includes(socket.role)) {
    socket.join(`tenant:${socket.transportBusinessId}`);
  }

  // 3. Join private driver room (for direct order assignment & claim notifications)
  if (socket.role === 'driver') {
    socket.join(`driver:${socket.userId}`);
    // If tenant-level driver self-claim is permitted, driver also listens to available orders on tenant
    if (socket.transportBusinessId) {
      socket.join(`driver-feed:${socket.transportBusinessId}`);
    }
  }

  // 4. Join company-specific room (for company admin & company employee)
  if (socket.companyId && ['company_admin', 'company_employee'].includes(socket.role)) {
    socket.join(`company:${socket.companyId}`);
  }

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Mount Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/companies', companyRouter);
app.use('/api/orders', orderRouter);
app.use('/api/orders', dispatchRouter);    // Chapter 7: dispatch actions on order IDs
app.use('/api/driver/orders', driverOrderRouter);  // Chapter 7: driver portal
app.use('/api/fleet', fleetRouter);
app.use('/api/notifications', notificationRouter); // Chapter 9: persistent notifications
app.post('/api/invitations/accept', acceptInvitation);

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
    console.log(`⚡ Socket.IO real-time dispatch ready`);
  });
};

startServer();

export { app, server };

import express from 'express';
import mongoose from 'mongoose';

export const healthRouter = express.Router();

healthRouter.get('/', (_req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbStatus = dbStateMap[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'ok',
    service: 'Transport & Fleet SaaS API',
    stack: 'MERN (Node.js, Express, MongoDB)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      connected: mongoose.connection.readyState === 1,
      registeredModels: mongoose.modelNames(),
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
    },
  });
});

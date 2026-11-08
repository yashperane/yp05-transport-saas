/**
 * driverOrders.js — Driver-scoped Order Routes (Chapter 7)
 *
 * Routes for the driver portal:
 *  - View assigned orders
 *  - View available orders to claim
 *  - View single order detail (only if assigned or available)
 */
import express from 'express';
import {
  getMyAssignedOrders,
  getMyAvailableOrders,
  getDriverOrderById,
} from '../controllers/driverOrderController.js';
import { requireAuth } from '../middleware/auth.js';
import { authorizeRoles, requireTenant } from '../middleware/rbac.js';

export const driverOrderRouter = express.Router();

// All routes: authenticated drivers only
driverOrderRouter.use(requireAuth, requireTenant, authorizeRoles('driver'));

// GET /api/driver/orders/assigned
driverOrderRouter.get('/assigned', getMyAssignedOrders);

// GET /api/driver/orders/available
driverOrderRouter.get('/available', getMyAvailableOrders);

// GET /api/driver/orders/:orderId
driverOrderRouter.get('/:orderId', getDriverOrderById);

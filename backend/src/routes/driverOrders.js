/**
 * driverOrders.js — Driver-scoped Order Routes (Chapters 7 & 8)
 */
import express from 'express';
import {
  getMyAssignedOrders,
  getMyAvailableOrders,
  getDriverOrderById,
  getDriverDashboardSummary,
  updateSelfAvailability,
} from '../controllers/driverOrderController.js';
import { requireAuth } from '../middleware/auth.js';
import { authorizeRoles, requireTenant } from '../middleware/rbac.js';

export const driverOrderRouter = express.Router();

// All routes: authenticated drivers only
driverOrderRouter.use(requireAuth, requireTenant, authorizeRoles('driver'));

// Chapter 8: Driver dashboard home metrics
driverOrderRouter.get('/summary', getDriverDashboardSummary);

// Chapter 8: Driver self availability toggle
driverOrderRouter.patch('/availability', updateSelfAvailability);

// GET /api/driver/orders/assigned
driverOrderRouter.get('/assigned', getMyAssignedOrders);

// GET /api/driver/orders/available
driverOrderRouter.get('/available', getMyAvailableOrders);

// GET /api/driver/orders/:orderId
driverOrderRouter.get('/:orderId', getDriverOrderById);

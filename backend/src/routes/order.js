import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  updateOrderStatus,
  getOrderHistory,
  getOrdersSummary,
  checkDuplicatesEndpoint,
} from '../controllers/orderController.js';
import { requireAuth } from '../middleware/auth.js';
import { authorizeRoles, requireTenant } from '../middleware/rbac.js';

export const orderRouter = express.Router();

// Apply authentication and tenant isolation
orderRouter.use(requireAuth, requireTenant);

// Duplicate check pre-flight endpoint
orderRouter.post('/check-duplicates', checkDuplicatesEndpoint);

// Dashboard summary metrics
orderRouter.get('/dashboard-summary', getOrdersSummary);

// Collection routes
orderRouter.get('/', getOrders);
orderRouter.post(
  '/',
  authorizeRoles('owner', 'dispatcher', 'company_admin', 'company_employee'),
  createOrder
);

// Single order routes
orderRouter.get('/:orderId', getOrderById);
orderRouter.patch('/:orderId', updateOrder);
orderRouter.patch('/:orderId/cancel', cancelOrder);
orderRouter.patch(
  '/:orderId/status',
  authorizeRoles('owner', 'dispatcher'),
  updateOrderStatus
);
orderRouter.get('/:orderId/history', getOrderHistory);

/**
 * dispatch.js — Order Dispatch Routes (Chapter 7)
 *
 * Routes for:
 *  - Owner/Dispatcher manual assignment
 *  - Making order available for self-claim
 *  - Atomic driver self-claim
 *  - Driver accept, reject, start, complete
 *  - Owner/Dispatcher reassignment
 *  - Assignment history retrieval
 *  - Eligible driver/vehicle discovery
 */
import express from 'express';
import {
  dispatchOrder,
  makeOrderAvailable,
  claimOrder,
  acceptOrder,
  rejectOrder,
  startOrder,
  completeOrder,
  reassignOrder,
  getOrderAssignments,
  getEligibleDrivers,
  getEligibleVehicles,
} from '../controllers/dispatchController.js';
import { requireAuth } from '../middleware/auth.js';
import { authorizeRoles, requireTenant } from '../middleware/rbac.js';

export const dispatchRouter = express.Router();

// All routes require authentication and tenant scoping
dispatchRouter.use(requireAuth, requireTenant);

// ── Owner/Dispatcher routes ───────────────────────────────────

// Manually assign a driver and vehicle to an order
dispatchRouter.post(
  '/:orderId/dispatch',
  authorizeRoles('owner', 'dispatcher'),
  dispatchOrder
);

// Make a pending order available for driver self-claim
dispatchRouter.post(
  '/:orderId/make-available',
  authorizeRoles('owner', 'dispatcher'),
  makeOrderAvailable
);

// Reassign an order to a different driver
dispatchRouter.post(
  '/:orderId/reassign',
  authorizeRoles('owner', 'dispatcher'),
  reassignOrder
);

// Get eligible (active + available) drivers for an order
dispatchRouter.get(
  '/:orderId/eligible-drivers',
  authorizeRoles('owner', 'dispatcher'),
  getEligibleDrivers
);

// Get eligible (active) vehicles for an order
dispatchRouter.get(
  '/:orderId/eligible-vehicles',
  authorizeRoles('owner', 'dispatcher'),
  getEligibleVehicles
);

// ── Driver routes ─────────────────────────────────────────────

// Atomic self-claim of an available order
dispatchRouter.post(
  '/:orderId/claim',
  authorizeRoles('driver'),
  claimOrder
);

// Accept a manually assigned order
dispatchRouter.post(
  '/:orderId/accept',
  authorizeRoles('driver'),
  acceptOrder
);

// Reject an assigned order with a reason
dispatchRouter.post(
  '/:orderId/reject',
  authorizeRoles('driver'),
  rejectOrder
);

// Start the job
dispatchRouter.post(
  '/:orderId/start',
  authorizeRoles('driver'),
  startOrder
);

// Complete the job
dispatchRouter.post(
  '/:orderId/complete',
  authorizeRoles('driver'),
  completeOrder
);

// ── Shared routes (owner/dispatcher/driver) ───────────────────

// Get full assignment history for an order
dispatchRouter.get(
  '/:orderId/assignments',
  authorizeRoles('owner', 'dispatcher'),
  getOrderAssignments
);

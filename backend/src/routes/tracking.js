import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant, authorizeRoles } from '../middleware/rbac.js';
import {
  getVehiclesTracking,
  getOrderTracking,
  getVehicleHistory,
} from '../controllers/trackingController.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenant);

// Fleet overview (Owner, Dispatcher)
router.get('/vehicles', authorizeRoles('owner', 'dispatcher'), getVehiclesTracking);

// Single vehicle history
router.get('/history/:vehicleId', authorizeRoles('owner', 'dispatcher'), getVehicleHistory);

// Order tracking (Owner, Dispatcher, Company users)
router.get(
  '/orders/:orderId',
  authorizeRoles('owner', 'dispatcher', 'company_admin', 'company_employee'),
  getOrderTracking
);

export { router as trackingRouter };

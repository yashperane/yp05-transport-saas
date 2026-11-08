import express from 'express';
import {
  getDrivers,
  createDriver,
  getDriverById,
  updateDriver,
  updateDriverStatus,
} from '../controllers/driverController.js';
import {
  getVehicles,
  createVehicle,
  getVehicleById,
  updateVehicle,
  updateVehicleStatus,
} from '../controllers/vehicleController.js';
import {
  assignVehicle,
  unassignVehicle,
  getAssignmentHistory,
} from '../controllers/vehicleAssignmentController.js';
import { getFleetSummary } from '../controllers/fleetSummaryController.js';
import { requireAuth } from '../middleware/auth.js';
import { authorizeRoles, requireTenant } from '../middleware/rbac.js';

export const fleetRouter = express.Router();

// Apply auth and tenant scoping
fleetRouter.use(requireAuth, requireTenant);

// Fleet Dashboard Summary (Owner, Dispatcher)
fleetRouter.get(
  '/dashboard-summary',
  authorizeRoles('owner', 'dispatcher'),
  getFleetSummary
);

// --- DRIVER ROUTES ---
fleetRouter.get(
  '/drivers',
  authorizeRoles('owner', 'dispatcher'),
  getDrivers
);
fleetRouter.post(
  '/drivers',
  authorizeRoles('owner'),
  createDriver
);
fleetRouter.get(
  '/drivers/:driverId',
  authorizeRoles('owner', 'dispatcher', 'driver'),
  getDriverById
);
fleetRouter.patch(
  '/drivers/:driverId',
  authorizeRoles('owner'),
  updateDriver
);
fleetRouter.patch(
  '/drivers/:driverId/status',
  authorizeRoles('owner', 'driver'),
  updateDriverStatus
);

// --- VEHICLE ROUTES ---
fleetRouter.get(
  '/vehicles',
  authorizeRoles('owner', 'dispatcher', 'driver'),
  getVehicles
);
fleetRouter.post(
  '/vehicles',
  authorizeRoles('owner'),
  createVehicle
);
fleetRouter.get(
  '/vehicles/:vehicleId',
  authorizeRoles('owner', 'dispatcher', 'driver'),
  getVehicleById
);
fleetRouter.patch(
  '/vehicles/:vehicleId',
  authorizeRoles('owner'),
  updateVehicle
);
fleetRouter.patch(
  '/vehicles/:vehicleId/status',
  authorizeRoles('owner'),
  updateVehicleStatus
);

// --- ASSIGNMENT ROUTES ---
fleetRouter.post(
  '/vehicle-assignments',
  authorizeRoles('owner', 'dispatcher'),
  assignVehicle
);
fleetRouter.patch(
  '/vehicle-assignments/:assignmentId/unassign',
  authorizeRoles('owner', 'dispatcher'),
  unassignVehicle
);
fleetRouter.get(
  '/vehicle-assignments',
  authorizeRoles('owner', 'dispatcher'),
  getAssignmentHistory
);

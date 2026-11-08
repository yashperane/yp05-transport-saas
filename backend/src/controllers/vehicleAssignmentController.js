import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { VehicleAssignmentHistory } from '../models/VehicleAssignmentHistory.js';

/**
 * POST /api/vehicle-assignments
 * Assign a vehicle to an eligible driver.
 * 
 * Rules:
 * 1. Driver must exist, belong to tenant, and be 'active'.
 * 2. Vehicle must exist, belong to tenant, and be 'active' (not in maintenance or inactive).
 * 3. Ends any active assignment on this vehicle.
 * 4. Ends any active assignment on this driver.
 * 5. Updates currentVehicleId on Driver and currentDriverId on Vehicle.
 * 6. Creates a new active record in VehicleAssignmentHistory.
 */
export const assignVehicle = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { driverId, vehicleId, notes } = req.body;

    if (!driverId || !vehicleId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Both driverId and vehicleId are required.' },
      });
    }

    // 1. Verify Driver
    const driver = await Driver.findOne({ _id: driverId, transportBusinessId });
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Driver not found in your account.' },
      });
    }

    if (driver.employmentStatus !== 'active') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DRIVER_NOT_ELIGIBLE',
          message: `Cannot assign vehicle to a driver with status '${driver.employmentStatus}'.`,
        },
      });
    }

    // 2. Verify Vehicle
    const vehicle = await Vehicle.findOne({ _id: vehicleId, transportBusinessId });
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vehicle not found in your fleet.' },
      });
    }

    if (vehicle.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VEHICLE_NOT_ELIGIBLE',
          message: `Cannot assign a vehicle with status '${vehicle.status}'. Must be active.`,
        },
      });
    }

    const now = new Date();

    // 3. Close any active assignment for this vehicle
    const activeVehicleAssignments = await VehicleAssignmentHistory.find({
      transportBusinessId,
      vehicleId,
      status: 'active',
    });
    for (const a of activeVehicleAssignments) {
      a.status = 'ended';
      a.unassignedAt = now;
      await a.save();
    }

    // 4. Close any active assignment for this driver
    const activeDriverAssignments = await VehicleAssignmentHistory.find({
      transportBusinessId,
      driverId,
      status: 'active',
    });
    for (const a of activeDriverAssignments) {
      a.status = 'ended';
      a.unassignedAt = now;
      await a.save();
    }

    // 5. If previous driver had this vehicle, clear their currentVehicleId
    if (vehicle.currentDriverId && vehicle.currentDriverId.toString() !== driverId.toString()) {
      await Driver.updateOne(
        { _id: vehicle.currentDriverId },
        { currentVehicleId: null }
      );
    }

    // If this driver had a previous vehicle, clear that vehicle's currentDriverId
    if (driver.currentVehicleId && driver.currentVehicleId.toString() !== vehicleId.toString()) {
      await Vehicle.updateOne(
        { _id: driver.currentVehicleId },
        { currentDriverId: null }
      );
    }

    // 6. Set new links
    driver.currentVehicleId = vehicle._id;
    await driver.save();

    vehicle.currentDriverId = driver._id;
    await vehicle.save();

    // 7. Create audit assignment record
    const assignment = await VehicleAssignmentHistory.create({
      transportBusinessId,
      driverId: driver._id,
      vehicleId: vehicle._id,
      assignedByUserId: req.user._id,
      assignedAt: now,
      status: 'active',
      notes: notes ? notes.trim() : '',
    });

    return res.status(201).json({
      success: true,
      message: `Vehicle ${vehicle.registrationNumber} successfully assigned to ${driver.fullName}.`,
      data: { assignment, driver, vehicle },
    });
  } catch (error) {
    console.error('assignVehicle error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to assign vehicle.' },
    });
  }
};

/**
 * PATCH /api/vehicle-assignments/:assignmentId/unassign
 * End an active vehicle-driver association.
 */
export const unassignVehicle = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    const assignment = await VehicleAssignmentHistory.findOne({
      _id: assignmentId,
      transportBusinessId,
      status: 'active',
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Active vehicle assignment not found.' },
      });
    }

    const now = new Date();
    assignment.status = 'ended';
    assignment.unassignedAt = now;
    await assignment.save();

    // Clear current references on Driver and Vehicle
    await Driver.updateOne(
      { _id: assignment.driverId, currentVehicleId: assignment.vehicleId },
      { currentVehicleId: null }
    );

    await Vehicle.updateOne(
      { _id: assignment.vehicleId, currentDriverId: assignment.driverId },
      { currentDriverId: null }
    );

    return res.status(200).json({
      success: true,
      message: 'Vehicle unassigned successfully.',
      data: { assignment },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to unassign vehicle.' },
    });
  }
};

/**
 * GET /api/vehicle-assignments
 * View vehicle assignment history.
 */
export const getAssignmentHistory = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { driverId, vehicleId, status } = req.query;

    const query = { transportBusinessId };
    if (driverId) query.driverId = driverId;
    if (vehicleId) query.vehicleId = vehicleId;
    if (status) query.status = status;

    const assignments = await VehicleAssignmentHistory.find(query)
      .populate('driverId', 'fullName phoneNumber licenseNumber')
      .populate('vehicleId', 'registrationNumber vehicleNumber vehicleType')
      .populate('assignedByUserId', 'name role')
      .sort({ assignedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { assignments },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve assignment history.' },
    });
  }
};

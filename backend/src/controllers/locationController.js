import { trackingService } from '../services/trackingService.js';
import { Driver } from '../models/Driver.js';
import { VehicleLocation } from '../models/VehicleLocation.js';

/**
 * POST /api/location/update
 * Driver submits real-time GPS coordinates
 */
export const updateLocation = async (req, res) => {
  try {
    const driverUserId = req.user._id;
    const transportBusinessId = req.user.transportBusinessId;
    const { latitude, longitude, accuracy, heading, speed, source } = req.body;

    const location = await trackingService.updateDriverLocation({
      driverUserId,
      transportBusinessId,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: accuracy !== undefined ? parseFloat(accuracy) : null,
      heading: heading !== undefined ? parseFloat(heading) : null,
      speed: speed !== undefined ? parseFloat(speed) : null,
      source,
    });

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully.',
      data: { location },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: { code: 'LOCATION_UPDATE_FAILED', message: err.message },
    });
  }
};

/**
 * POST /api/location/toggle-sharing
 * Driver toggles location sharing on or off
 */
export const toggleSharing = async (req, res) => {
  try {
    const driverUserId = req.user._id;
    const transportBusinessId = req.user.transportBusinessId;
    const { isSharing } = req.body;

    const driver = await Driver.findOne({ userId: driverUserId, transportBusinessId });
    if (!driver || !driver.currentVehicleId) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_ASSIGNED_VEHICLE', message: 'No vehicle assigned to driver.' },
      });
    }

    const updated = await VehicleLocation.findOneAndUpdate(
      { vehicleId: driver.currentVehicleId },
      { $set: { isSharing: Boolean(isSharing) } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      data: { isSharing: updated ? updated.isSharing : false },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
};

/**
 * GET /api/location/my-status
 * Driver inspects current tracking telemetry & sharing status
 */
export const getMyStatus = async (req, res) => {
  try {
    const driverUserId = req.user._id;
    const transportBusinessId = req.user.transportBusinessId;

    const driver = await Driver.findOne({ userId: driverUserId, transportBusinessId })
      .populate('currentVehicleId', 'registrationNumber vehicleNumber vehicleType status');

    if (!driver) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Driver not found.' },
      });
    }

    let latestLocation = null;
    if (driver.currentVehicleId) {
      latestLocation = await VehicleLocation.findOne({ vehicleId: driver.currentVehicleId._id }).lean();
    }

    return res.status(200).json({
      success: true,
      data: {
        driver: {
          fullName: driver.fullName,
          trackingConsentStatus: driver.trackingConsentStatus,
          vehicle: driver.currentVehicleId,
        },
        location: latestLocation,
        isStale: latestLocation ? trackingService.isStale(latestLocation.recordedAt) : true,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
};

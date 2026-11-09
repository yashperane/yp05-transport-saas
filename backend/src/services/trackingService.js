import { VehicleLocation } from '../models/VehicleLocation.js';
import { VehicleLocationHistory } from '../models/VehicleLocationHistory.js';
import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { Order } from '../models/Order.js';
import { TransportBusiness } from '../models/TransportBusiness.js';
import { realtimeService } from './realtimeService.js';

const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export const trackingService = {
  /**
   * Evaluate if a location timestamp is considered stale (> 5 mins)
   */
  isStale(recordedAt) {
    if (!recordedAt) return true;
    return Date.now() - new Date(recordedAt).getTime() > STALE_THRESHOLD_MS;
  },

  /**
   * Process an incoming GPS location update from an authenticated driver
   */
  async updateDriverLocation({
    driverUserId,
    transportBusinessId,
    latitude,
    longitude,
    accuracy = null,
    heading = null,
    speed = null,
    source = 'driver_mobile_browser',
  }) {
    // 1. Validate coordinates range
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      throw new Error('Invalid latitude coordinates.');
    }
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      throw new Error('Invalid longitude coordinates.');
    }

    // 2. Identify the driver and their assigned vehicle
    const driver = await Driver.findOne({
      userId: driverUserId,
      transportBusinessId,
    }).populate('currentVehicleId');

    if (!driver) {
      throw new Error('Driver profile not found.');
    }

    const vehicle = driver.currentVehicleId;
    const vehicleId = vehicle?._id || null;

    // 3. Find if driver currently has an in_progress or assigned order
    const activeOrder = await Order.findOne({
      transportBusinessId,
      assignedDriverId: driver._id,
      status: { $in: ['accepted', 'in_progress'] },
    }).select('_id companyId orderNumber pickup delivery');

    const recordedAt = new Date();

    // 4. Update the latest VehicleLocation snapshot by driverId (upsert)
    const latestLocation = await VehicleLocation.findOneAndUpdate(
      { driverId: driver._id },
      {
        $set: {
          transportBusinessId,
          vehicleId,
          driverId: driver._id,
          activeOrderId: activeOrder ? activeOrder._id : null,
          latitude,
          longitude,
          accuracy,
          heading,
          speed,
          isSharing: true,
          recordedAt,
          source,
        },
      },
      { upsert: true, new: true }
    );

    // 5. Append to historical telemetry collection for route audits
    await VehicleLocationHistory.create({
      transportBusinessId,
      vehicleId,
      driverId: driver._id,
      orderId: activeOrder ? activeOrder._id : null,
      latitude,
      longitude,
      accuracy,
      speed,
      recordedAt,
      source,
    });

    // 6. Broadcast real-time location payload
    const telemetryPayload = {
      locationId: latestLocation._id,
      driverId: driver._id,
      vehicleId: vehicleId,
      vehicleNumber: vehicle?.registrationNumber || vehicle?.vehicleNumber || 'Driver GPS',
      driverName: driver.fullName,
      latitude,
      longitude,
      heading,
      speed,
      accuracy,
      recordedAt,
      isStale: false,
      activeOrder: activeOrder
        ? {
            orderId: activeOrder._id,
            orderNumber: activeOrder.orderNumber,
          }
        : null,
    };

    // Broadcast to Fleet Owner & Dispatcher room
    realtimeService.emitToTenant(transportBusinessId, 'location:updated', telemetryPayload);

    // 7. Check company privacy settings before broadcasting to client room
    if (activeOrder && activeOrder.companyId) {
      const business = await TransportBusiness.findById(transportBusinessId).select('settings');
      const visibility = business?.settings?.companyTrackingVisibility || 'status_only';

      if (visibility === 'full_tracking') {
        realtimeService.emitToCompany(activeOrder.companyId, 'location:updated', {
          orderId: activeOrder._id,
          orderNumber: activeOrder.orderNumber,
          latitude,
          longitude,
          heading,
          recordedAt,
          isStale: false,
        });
      }
    }

    return latestLocation;
  },

  /**
   * Retrieve active fleet locations for Owner and Dispatcher
   */
  async getFleetLocations(transportBusinessId) {
    const locations = await VehicleLocation.find({ transportBusinessId, isSharing: true })
      .populate('vehicleId', 'registrationNumber vehicleNumber vehicleType status')
      .populate('driverId', 'fullName phoneNumber availabilityStatus')
      .populate('activeOrderId', 'orderNumber status pickup delivery')
      .sort({ recordedAt: -1 })
      .lean();

    return locations.map((loc) => ({
      ...loc,
      isStale: this.isStale(loc.recordedAt),
    }));
  },
};

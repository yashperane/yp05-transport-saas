import { trackingService } from '../services/trackingService.js';
import { VehicleLocation } from '../models/VehicleLocation.js';
import { VehicleLocationHistory } from '../models/VehicleLocationHistory.js';
import { Order } from '../models/Order.js';
import { TransportBusiness } from '../models/TransportBusiness.js';

/**
 * GET /api/tracking/vehicles
 * Owner & Dispatcher get all active fleet locations with stale indicator
 */
export const getVehiclesTracking = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const fleet = await trackingService.getFleetLocations(transportBusinessId);

    return res.status(200).json({
      success: true,
      data: { vehicles: fleet },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
};

/**
 * GET /api/tracking/orders/:orderId
 * Order-level live tracking for company users (if authorized by owner policy)
 */
export const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userRole = req.user.role;
    const transportBusinessId = req.user.transportBusinessId;

    const order = await Order.findOne({ _id: orderId, transportBusinessId })
      .select('companyId status assignedVehicleId assignedDriverId orderNumber pickup delivery')
      .populate('assignedVehicleId', 'registrationNumber vehicleNumber vehicleType')
      .populate('assignedDriverId', 'fullName phoneNumber')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    // Role check for Company users
    if (['company_admin', 'company_employee'].includes(userRole)) {
      if (order.companyId.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Unauthorized to track this order.' },
        });
      }

      // Check Owner's visibility policy
      const business = await TransportBusiness.findById(transportBusinessId).select('settings');
      const visibility = business?.settings?.companyTrackingVisibility || 'status_only';

      if (visibility === 'status_only') {
        return res.status(200).json({
          success: true,
          data: {
            orderNumber: order.orderNumber,
            status: order.status,
            trackingEnabled: false,
            message: 'Live GPS map tracking is disabled by policy. Status updates only.',
          },
        });
      }
    }

    // Retrieve vehicle location
    let location = null;
    if (order.assignedVehicleId) {
      location = await VehicleLocation.findOne({
        vehicleId: order.assignedVehicleId._id,
        isSharing: true,
      }).lean();
    }

    return res.status(200).json({
      success: true,
      data: {
        order: {
          orderNumber: order.orderNumber,
          status: order.status,
          pickup: order.pickup,
          delivery: order.delivery,
        },
        vehicle: order.assignedVehicleId,
        location,
        isStale: location ? trackingService.isStale(location.recordedAt) : true,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
};

/**
 * GET /api/tracking/history/:vehicleId
 * Historical breadcrumbs for trip review
 */
export const getVehicleHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);

    const history = await VehicleLocationHistory.find({
      vehicleId,
      transportBusinessId,
    })
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      data: { history },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
};

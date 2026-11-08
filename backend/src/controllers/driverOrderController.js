/**
 * driverOrderController.js - Extended for Chapter 8
 */
import { Order } from '../models/Order.js';
import { Driver } from '../models/Driver.js';
import { Vehicle } from '../models/Vehicle.js';
import { TransportBusiness } from '../models/TransportBusiness.js';
import { OrderAssignmentHistory } from '../models/OrderAssignmentHistory.js';
import { OrderHistory } from '../models/OrderHistory.js';

const getDriverForUser = async (userId, transportBusinessId) => {
  return Driver.findOne({ userId, transportBusinessId });
};

const DRIVER_SAFE_FIELDS = '-pricingDetails -duplicateReviewStatus -assignedByUserId';

/**
 * GET /api/driver/orders/summary
 * Real metrics for Driver Dashboard home
 */
export const getDriverDashboardSummary = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    const driver = await getDriverForUser(userId, transportBusinessId);
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_DRIVER', message: 'No driver profile associated with your account.' },
      });
    }

    // Check active job blocking availability
    const activeJob = await Order.findOne({
      transportBusinessId,
      assignedDriverId: driver._id,
      status: { $in: ['in_progress', 'accepted', 'assigned'] },
    }).lean();

    const [assignedCount, acceptedCount, inProgressCount, completedCount, availableCount] = await Promise.all([
      Order.countDocuments({ transportBusinessId, assignedDriverId: driver._id, status: 'assigned' }),
      Order.countDocuments({ transportBusinessId, assignedDriverId: driver._id, status: 'accepted' }),
      Order.countDocuments({ transportBusinessId, assignedDriverId: driver._id, status: 'in_progress' }),
      Order.countDocuments({ transportBusinessId, assignedDriverId: driver._id, status: 'completed' }),
      Order.countDocuments({ transportBusinessId, status: 'available', assignedDriverId: null }),
    ]);

    let assignedVehicle = null;
    if (driver.currentVehicleId) {
      assignedVehicle = await Vehicle.findById(driver.currentVehicleId)
        .select('registrationNumber vehicleNumber vehicleType status capacity capacityUnit fuelType')
        .lean();
    }

    return res.status(200).json({
      success: true,
      data: {
        driver: {
          _id: driver._id,
          fullName: driver.fullName,
          phoneNumber: driver.phoneNumber,
          employmentStatus: driver.employmentStatus,
          availabilityStatus: driver.availabilityStatus,
          licenseNumber: driver.licenseNumber,
          licenseType: driver.licenseType,
          hasActiveJob: !!activeJob,
          activeJobOrderId: activeJob?._id || null,
        },
        assignedVehicle,
        metrics: {
          assigned: assignedCount,
          accepted: acceptedCount,
          inProgress: inProgressCount,
          completed: completedCount,
          available: availableCount,
        },
      },
    });
  } catch (error) {
    console.error('getDriverDashboardSummary error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to retrieve driver metrics.' },
    });
  }
};

/**
 * PATCH /api/driver/orders/availability
 * Driver changes availability (available <-> off_duty). Blocked if active job exists.
 */
export const updateSelfAvailability = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;
    const { availabilityStatus } = req.body;

    if (!['available', 'off_duty'].includes(availabilityStatus)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Drivers can only toggle between available and off_duty.' },
      });
    }

    const driver = await getDriverForUser(userId, transportBusinessId);
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_DRIVER', message: 'No driver profile associated with your account.' },
      });
    }

    if (driver.employmentStatus !== 'active') {
      return res.status(400).json({
        success: false,
        error: { code: 'INACTIVE_DRIVER', message: 'Inactive or suspended drivers cannot change availability.' },
      });
    }

    // Check if driver has an active assigned or in_progress job
    if (availabilityStatus === 'available') {
      const activeJob = await Order.findOne({
        transportBusinessId,
        assignedDriverId: driver._id,
        status: { $in: ['in_progress', 'accepted', 'assigned'] },
      }).lean();

      if (activeJob) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ACTIVE_JOB_BLOCK',
            message: `You have an active job (${activeJob.orderNumber}) in progress. Complete it before marking yourself available.`,
          },
        });
      }
    }

    driver.availabilityStatus = availabilityStatus;
    await driver.save();

    return res.status(200).json({
      success: true,
      message: `Availability updated to ${availabilityStatus}.`,
      data: { driver },
    });
  } catch (error) {
    console.error('updateSelfAvailability error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to update availability.' },
    });
  }
};

/**
 * GET /api/driver/orders/assigned
 */
export const getMyAssignedOrders = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    const driver = await getDriverForUser(userId, transportBusinessId);
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_A_DRIVER',
          message: 'No driver profile associated with your account in this transport business.',
        },
      });
    }

    const business = await TransportBusiness.findById(transportBusinessId).select('settings').lean();
    const visibility = business?.settings?.driverOrderVisibility || 'assigned_and_available';

    if (visibility === 'available_only') {
      return res.status(403).json({
        success: false,
        error: { code: 'VISIBILITY_RESTRICTED', message: 'Your account is configured to view available orders only.' },
      });
    }

    const { status, page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query = {
      transportBusinessId,
      assignedDriverId: driver._id,
    };

    if (status) {
      query.status = status;
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .select(DRIVER_SAFE_FIELDS)
        .populate('companyId', 'companyName contactPerson phone')
        .populate('assignedVehicleId', 'registrationNumber vehicleType vehicleNumber')
        .sort({ requiredDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    console.error('getMyAssignedOrders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to retrieve your assigned orders.' },
    });
  }
};

/**
 * GET /api/driver/orders/available
 */
export const getMyAvailableOrders = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    const driver = await getDriverForUser(userId, transportBusinessId);
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_DRIVER', message: 'No driver profile associated with your account.' },
      });
    }

    const business = await TransportBusiness.findById(transportBusinessId).select('settings').lean();
    const visibility = business?.settings?.driverOrderVisibility || 'assigned_and_available';
    const dispatchMode = business?.settings?.dispatchMode || 'both';

    if (visibility === 'assigned_only') {
      return res.status(403).json({
        success: false,
        error: { code: 'VISIBILITY_RESTRICTED', message: 'You can only view your assigned orders.' },
      });
    }

    if (dispatchMode === 'manual_assignment') {
      return res.status(403).json({
        success: false,
        error: { code: 'SELF_CLAIM_DISABLED', message: 'Driver self-claim is disabled for this business.' },
      });
    }

    if (driver.employmentStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: { code: 'DRIVER_INACTIVE', message: 'Your driver account is not active.' },
      });
    }

    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));

    const [orders, total] = await Promise.all([
      Order.find({ transportBusinessId, status: 'available', assignedDriverId: null })
        .select(DRIVER_SAFE_FIELDS)
        .populate('companyId', 'companyName')
        .sort({ requiredDate: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Order.countDocuments({ transportBusinessId, status: 'available', assignedDriverId: null }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        driverAvailability: driver.availabilityStatus,
        canClaim: driver.availabilityStatus === 'available',
        orders,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    console.error('getMyAvailableOrders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to retrieve available orders.' },
    });
  }
};

/**
 * GET /api/driver/orders/:orderId
 * Detailed order info + activity timeline for driver
 */
export const getDriverOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    const driver = await getDriverForUser(userId, transportBusinessId);
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_DRIVER', message: 'No driver profile found.' },
      });
    }

    const order = await Order.findOne({ _id: orderId, transportBusinessId })
      .select(DRIVER_SAFE_FIELDS)
      .populate('companyId', 'companyName contactPerson phone')
      .populate('assignedVehicleId', 'registrationNumber vehicleType vehicleNumber capacity capacityUnit fuelType')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    const isAssignedToMe = order.assignedDriverId?.toString() === driver._id.toString();
    const isAvailable = order.status === 'available';

    if (!isAssignedToMe && !isAvailable) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have permission to view this order.' },
      });
    }

    // Fetch activity history
    const history = await OrderHistory.find({ orderId, transportBusinessId })
      .select('action description createdAt performedByUserId')
      .populate('performedByUserId', 'name role')
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { order, timeline: history },
    });
  } catch (error) {
    console.error('getDriverOrderById error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to retrieve order details.' },
    });
  }
};

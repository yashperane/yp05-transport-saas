/**
 * driverOrderController.js
 *
 * Chapter 7: Driver-scoped order views with tenant isolation and visibility settings.
 *
 * A driver must NEVER see:
 *  - Orders from another transport business (tenant isolation)
 *  - Another driver's private assigned orders
 *  - Internal pricing or owner notes
 *
 * The backend enforces visibility based on:
 *  1. The authenticated user's Driver profile (via userId lookup)
 *  2. The transport business's driverOrderVisibility setting
 */

import { Order } from '../models/Order.js';
import { Driver } from '../models/Driver.js';
import { TransportBusiness } from '../models/TransportBusiness.js';

// ─────────────────────────────────────────────────────────────
// HELPER: Retrieve the driver's profile for the authenticated user
// ─────────────────────────────────────────────────────────────
const getDriverForUser = async (userId, transportBusinessId) => {
  return Driver.findOne({ userId, transportBusinessId }).lean();
};

// Fields safe to return to driver (excludes pricing, internal notes)
const DRIVER_SAFE_FIELDS = '-pricingDetails -duplicateReviewStatus -assignedByUserId';

/**
 * GET /api/driver/orders/assigned
 * Returns orders assigned to the authenticated driver.
 * Never returns another driver's orders.
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

    // Check visibility settings
    const business = await TransportBusiness.findById(transportBusinessId)
      .select('settings')
      .lean();
    const visibility = business?.settings?.driverOrderVisibility || 'assigned_and_available';

    if (visibility === 'available_only') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'VISIBILITY_RESTRICTED',
          message: 'Your account is configured to view available orders only.',
        },
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build query — always scoped to this driver and this tenant
    const query = {
      transportBusinessId,
      assignedDriverId: driver._id, // CRITICAL: only this driver's orders
    };

    if (status) {
      query.status = status;
    } else {
      // Default: active orders only (not completed/cancelled)
      query.status = { $in: ['assigned', 'accepted', 'in_progress'] };
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .select(DRIVER_SAFE_FIELDS)
        .populate('companyId', 'companyName contactPerson')
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
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('getMyAssignedOrders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve your assigned orders.' },
    });
  }
};

/**
 * GET /api/driver/orders/available
 * Returns orders that are available for the authenticated driver to claim.
 *
 * Eligibility checks (backend-enforced, not frontend):
 *  1. Driver must be active + available
 *  2. Business must allow self-claim
 *  3. Order must be in 'available' status
 *  4. Order must belong to the same tenant
 */
export const getMyAvailableOrders = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    const driver = await getDriverForUser(userId, transportBusinessId);
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_A_DRIVER',
          message: 'No driver profile associated with your account.',
        },
      });
    }

    // Check visibility and dispatch settings
    const business = await TransportBusiness.findById(transportBusinessId)
      .select('settings')
      .lean();
    const visibility = business?.settings?.driverOrderVisibility || 'assigned_and_available';
    const dispatchMode = business?.settings?.dispatchMode || 'both';

    if (visibility === 'assigned_only') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'VISIBILITY_RESTRICTED',
          message: 'You can only view your assigned orders.',
        },
      });
    }

    if (dispatchMode === 'manual_assignment') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SELF_CLAIM_DISABLED',
          message: 'Driver self-claim is disabled for this business.',
        },
      });
    }

    // Driver eligibility — must be available to see claimable orders
    if (driver.employmentStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DRIVER_INACTIVE',
          message: 'Your driver account is not active.',
        },
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10)));

    const [orders, total] = await Promise.all([
      Order.find({
        transportBusinessId,
        status: 'available',
        assignedDriverId: null,
      })
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
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('getMyAvailableOrders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve available orders.' },
    });
  }
};

/**
 * GET /api/driver/orders/:orderId
 * Get single order detail for driver — only if assigned to this driver or available.
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
      .populate('assignedVehicleId', 'registrationNumber vehicleType vehicleNumber')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    // Access control: driver can only see orders assigned to them OR available orders
    const isAssignedToMe =
      order.assignedDriverId?.toString() === driver._id.toString();
    const isAvailable = order.status === 'available';

    if (!isAssignedToMe && !isAvailable) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this order.',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error('getDriverOrderById error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve order.' },
    });
  }
};

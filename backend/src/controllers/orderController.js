import { Order } from '../models/Order.js';
import { Company } from '../models/Company.js';
import { OrderHistory } from '../models/OrderHistory.js';
import { generateOrderNumber } from '../services/orderNumberService.js';
import { checkPossibleDuplicateOrder } from '../services/duplicateDetectionService.js';
import { recordOrderHistory } from '../services/orderHistoryService.js';

/**
 * POST /api/orders/check-duplicates
 * Pre-flight check endpoint to detect potential duplicates before final submission.
 */
export const checkDuplicatesEndpoint = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    let companyId = req.body.companyId;

    // If company user, enforce their companyId
    if (['company_admin', 'company_employee'].includes(req.user.role)) {
      companyId = req.user.companyId;
    }

    const {
      pickupAddress,
      destinationAddress,
      requiredDate,
      requiredTime,
      materialDescription,
      quantity,
      orderType,
    } = req.body;

    const result = await checkPossibleDuplicateOrder({
      transportBusinessId,
      companyId,
      pickupAddress,
      destinationAddress,
      requiredDate,
      requiredTime,
      materialDescription,
      quantity,
      orderType,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('checkDuplicatesEndpoint error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to check duplicate orders.' },
    });
  }
};

/**
 * POST /api/orders
 * Create a new transport order.
 * Accessible by: Owner, Dispatcher, Company Admin, Company Employee.
 */
export const createOrder = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userRole = req.user.role;
    const userId = req.user._id;

    let {
      companyId,
      orderType = 'goods',
      creationSource,
      customerName,
      customerPhone,
      pickupAddress,
      pickupContactPerson,
      pickupContactPhone,
      destinationAddress,
      destinationContactPerson,
      destinationContactPhone,
      requiredDate,
      requiredTime,
      materialDescription,
      quantity = 1,
      quantityUnit = 'units',
      labourCount = 0,
      requiredVehicleType = 'pickup',
      specialInstructions,
      pricingDetails,
      bypassDuplicateCheck = false, // Set to true when user confirms creating despite warning
    } = req.body;

    // 1. Enforce Company Scoping for company users
    if (['company_admin', 'company_employee'].includes(userRole)) {
      companyId = req.user.companyId;
      creationSource = 'company_portal';
    } else {
      // Owner or dispatcher
      if (!creationSource) {
        creationSource = companyId ? 'dispatcher_portal' : 'phone_call_manual';
      }
    }

    // 2. Validate Required Fields
    if (!pickupAddress || !pickupAddress.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Pickup address is required.' },
      });
    }

    if (!destinationAddress || !destinationAddress.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Destination address is required.' },
      });
    }

    if (!requiredDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Required date is required.' },
      });
    }

    // Work details validation according to orderType
    if (orderType === 'goods' && (!materialDescription || !materialDescription.trim())) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Material description is required for goods transport.' },
      });
    }

    if (orderType === 'labour' && (!labourCount || Number(labourCount) <= 0)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Labour count must be greater than 0 for labour transport.' },
      });
    }

    // Verify company belongs to this transport business if provided
    if (companyId) {
      const validCompany = await Company.findOne({ _id: companyId, transportBusinessId });
      if (!validCompany) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_COMPANY', message: 'Selected company does not exist in your account.' },
        });
      }
    }

    // 3. Duplicate Detection Check
    const dupCheck = await checkPossibleDuplicateOrder({
      transportBusinessId,
      companyId,
      pickupAddress,
      destinationAddress,
      requiredDate,
      requiredTime,
      materialDescription,
      quantity,
      orderType,
    });

    // If possible duplicate found and user hasn't confirmed bypass, return warning (HTTP 409 Conflict)
    if (dupCheck.isPossibleDuplicate && !bypassDuplicateCheck) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'POSSIBLE_DUPLICATE_ORDER',
          message: 'A similar order was found on this date. Review the matching order or confirm to proceed.',
          candidates: dupCheck.candidates,
          topMatch: dupCheck.topMatch,
        },
      });
    }

    // 4. Generate collision-safe Order Number
    const orderNumber = await generateOrderNumber(transportBusinessId);

    // 5. Build and Save Order
    const newOrder = await Order.create({
      transportBusinessId,
      companyId: companyId || null,
      createdByUserId: userId,
      createdByRole: userRole,
      creationSource,
      orderType,
      orderNumber,
      customerName: customerName ? customerName.trim() : '',
      customerPhone: customerPhone ? customerPhone.trim() : '',
      pickupLocation: {
        address: pickupAddress.trim(),
        contactPerson: pickupContactPerson ? pickupContactPerson.trim() : '',
        contactPhone: pickupContactPhone ? pickupContactPhone.trim() : '',
      },
      destinationLocation: {
        address: destinationAddress.trim(),
        contactPerson: destinationContactPerson ? destinationContactPerson.trim() : '',
        contactPhone: destinationContactPhone ? destinationContactPhone.trim() : '',
      },
      requiredDate: new Date(requiredDate),
      requiredTime: requiredTime ? requiredTime.trim() : '',
      materialDescription: materialDescription ? materialDescription.trim() : '',
      quantity: Number(quantity) || 1,
      quantityUnit: quantityUnit || 'units',
      labourCount: Number(labourCount) || 0,
      requiredVehicleType: requiredVehicleType || 'pickup',
      specialInstructions: specialInstructions ? specialInstructions.trim() : '',
      pricingDetails: ['owner', 'dispatcher'].includes(userRole) ? pricingDetails || {} : {},
      status: 'pending',
      duplicateReviewStatus: {
        isFlagged: dupCheck.isPossibleDuplicate,
        status: dupCheck.isPossibleDuplicate ? 'possible_duplicate' : 'not_reviewed',
        potentialDuplicateOrderId: dupCheck.topMatch?.candidate?._id || null,
        matchingScore: dupCheck.topMatch?.score || 0,
      },
    });

    // 6. Record Audit Trail
    await recordOrderHistory({
      transportBusinessId,
      orderId: newOrder._id,
      performedByUserId: userId,
      action: 'ORDER_CREATED',
      newValue: {
        orderNumber,
        status: 'pending',
        orderType,
        companyId,
      },
      description: `Order ${orderNumber} created by ${req.user.name} (${userRole}) via ${creationSource}.`,
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      data: { order: newOrder },
    });
  } catch (error) {
    console.error('createOrder error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create transport order.' },
    });
  }
};

/**
 * GET /api/orders
 * List orders with tenant scoping, company filtering, status filters, search, and pagination.
 */
export const getOrders = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userRole = req.user.role;
    const {
      search,
      status,
      orderType,
      companyId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const query = { transportBusinessId };

    // Tenant / Company boundary: If company user, enforce their companyId
    if (['company_admin', 'company_employee'].includes(userRole)) {
      query.companyId = req.user.companyId;
    } else if (companyId) {
      // Owner/dispatcher filtering by specific company
      query.companyId = companyId;
    }

    if (status) query.status = status;
    if (orderType) query.orderType = orderType;

    // Date range filter
    if (startDate || endDate) {
      query.requiredDate = {};
      if (startDate) query.requiredDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.requiredDate.$lte = end;
      }
    }

    // Search by orderNumber, address, customerName
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { orderNumber: { $regex: term, $options: 'i' } },
        { 'pickupLocation.address': { $regex: term, $options: 'i' } },
        { 'destinationLocation.address': { $regex: term, $options: 'i' } },
        { customerName: { $regex: term, $options: 'i' } },
        { materialDescription: { $regex: term, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Field projection: Hide private pricing from company employees
    let selectFields = '';
    if (userRole === 'company_employee') {
      selectFields = '-pricingDetails';
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .select(selectFields)
        .populate('companyId', 'companyName companyCode')
        .populate('createdByUserId', 'name role email')
        .populate('assignedDriverId', 'driverName phone')
        .populate('assignedVehicleId', 'registrationNumber vehicleType')
        .sort({ createdAt: -1 })
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
    console.error('getOrders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve orders.' },
    });
  }
};

/**
 * GET /api/orders/dashboard-summary
 * Aggregated order counts by status.
 */
export const getOrdersSummary = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userRole = req.user.role;

    const matchQuery = { transportBusinessId };
    if (['company_admin', 'company_employee'].includes(userRole)) {
      matchQuery.companyId = req.user.companyId;
    }

    const statusCounts = await Order.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const counts = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
    const totalOrders = Object.values(counts).reduce((a, b) => a + b, 0);

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          total: totalOrders,
          pending: counts['pending'] || 0,
          available: counts['available'] || 0,
          assigned: counts['assigned'] || 0,
          accepted: counts['accepted'] || 0,
          in_progress: counts['in_progress'] || 0,
          completed: counts['completed'] || 0,
          cancelled: counts['cancelled'] || 0,
          failed: counts['failed'] || 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve dashboard summary.' },
    });
  }
};

/**
 * GET /api/orders/:orderId
 * Retrieve single order details.
 */
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const userRole = req.user.role;

    const order = await Order.findOne({ _id: orderId, transportBusinessId })
      .populate('companyId', 'companyName companyCode contactPerson phone')
      .populate('createdByUserId', 'name role email')
      .populate('assignedDriverId', 'driverName phone')
      .populate('assignedVehicleId', 'registrationNumber vehicleType')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found in your account.' },
      });
    }

    // Cross-company access check
    if (['company_admin', 'company_employee'].includes(userRole)) {
      if (order.companyId?._id?.toString() !== req.user.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied: Order belongs to another company.' },
        });
      }
      // Strip pricing for standard employees
      if (userRole === 'company_employee') {
        delete order.pricingDetails;
      }
    }

    return res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve order details.' },
    });
  }
};

/**
 * PATCH /api/orders/:orderId
 * Edit permitted fields of an order (cannot edit completed or cancelled orders).
 */
export const updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const userRole = req.user.role;

    const order = await Order.findOne({ _id: orderId, transportBusinessId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    // Role check: Company user can only edit their own company's order
    if (['company_admin', 'company_employee'].includes(userRole)) {
      if (order.companyId?.toString() !== req.user.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot edit an order belonging to another company.' },
        });
      }
    }

    // Prevent modifying finalized orders
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'ORDER_FINALIZED', message: `Cannot modify an order with status '${order.status}'.` },
      });
    }

    const previousData = {
      pickupLocation: order.pickupLocation,
      destinationLocation: order.destinationLocation,
      materialDescription: order.materialDescription,
      quantity: order.quantity,
      requiredDate: order.requiredDate,
    };

    const {
      pickupAddress,
      pickupContactPerson,
      pickupContactPhone,
      destinationAddress,
      destinationContactPerson,
      destinationContactPhone,
      requiredDate,
      requiredTime,
      materialDescription,
      quantity,
      quantityUnit,
      labourCount,
      requiredVehicleType,
      specialInstructions,
      pricingDetails,
    } = req.body;

    if (pickupAddress) order.pickupLocation.address = pickupAddress.trim();
    if (pickupContactPerson !== undefined) order.pickupLocation.contactPerson = pickupContactPerson.trim();
    if (pickupContactPhone !== undefined) order.pickupLocation.contactPhone = pickupContactPhone.trim();

    if (destinationAddress) order.destinationLocation.address = destinationAddress.trim();
    if (destinationContactPerson !== undefined) order.destinationLocation.contactPerson = destinationContactPerson.trim();
    if (destinationContactPhone !== undefined) order.destinationLocation.contactPhone = destinationContactPhone.trim();

    if (requiredDate) order.requiredDate = new Date(requiredDate);
    if (requiredTime !== undefined) order.requiredTime = requiredTime.trim();
    if (materialDescription !== undefined) order.materialDescription = materialDescription.trim();
    if (quantity !== undefined) order.quantity = Number(quantity);
    if (quantityUnit !== undefined) order.quantityUnit = quantityUnit.trim();
    if (labourCount !== undefined) order.labourCount = Number(labourCount);
    if (requiredVehicleType !== undefined) order.requiredVehicleType = requiredVehicleType;
    if (specialInstructions !== undefined) order.specialInstructions = specialInstructions.trim();

    // Only owner/dispatcher can modify pricing
    if (['owner', 'dispatcher'].includes(userRole) && pricingDetails) {
      order.pricingDetails = { ...order.pricingDetails, ...pricingDetails };
    }

    await order.save();

    // Record audit log
    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: req.user._id,
      action: 'STATUS_UPDATED',
      previousValue: previousData,
      newValue: {
        pickupLocation: order.pickupLocation,
        destinationLocation: order.destinationLocation,
        materialDescription: order.materialDescription,
      },
      description: `Order ${order.orderNumber} details updated by ${req.user.name}.`,
    });

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully.',
      data: { order },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update order.' },
    });
  }
};

/**
 * PATCH /api/orders/:orderId/cancel
 * Cancel order with a mandatory cancellation reason.
 */
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const transportBusinessId = req.user.transportBusinessId;
    const userRole = req.user.role;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Cancellation reason is required.' },
      });
    }

    const order = await Order.findOne({ _id: orderId, transportBusinessId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    // Role check: Company user can only cancel their own company's order
    if (['company_admin', 'company_employee'].includes(userRole)) {
      if (order.companyId?.toString() !== req.user.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot cancel an order from another company.' },
        });
      }
    }

    if (order.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: 'A completed order cannot be cancelled.' },
      });
    }

    const previousStatus = order.status;
    order.status = 'cancelled';
    order.cancellationReason = reason.trim();
    order.cancelledAt = new Date();
    await order.save();

    // Record audit log
    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: req.user._id,
      action: 'ORDER_CANCELLED',
      previousValue: { status: previousStatus },
      newValue: { status: 'cancelled', reason: reason.trim() },
      description: `Order cancelled by ${req.user.name}. Reason: ${reason.trim()}`,
    });

    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
      data: { order },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to cancel order.' },
    });
  }
};

/**
 * PATCH /api/orders/:orderId/status
 * Update order status (Owner/Dispatcher transitions, e.g. pending -> available).
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const transportBusinessId = req.user.transportBusinessId;

    const validTransitions = {
      pending: ['available', 'assigned', 'cancelled'],
      available: ['assigned', 'cancelled', 'pending'],
      assigned: ['available', 'accepted', 'cancelled'],
      accepted: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'failed'],
      completed: [],
      cancelled: [],
      failed: ['available', 'pending'],
    };

    const order = await Order.findOne({ _id: orderId, transportBusinessId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    const allowedNext = validTransitions[order.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition order status from '${order.status}' to '${status}'.`,
        },
      });
    }

    const previousStatus = order.status;
    order.status = status;
    if (status === 'completed') {
      order.completedAt = new Date();
    }
    await order.save();

    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: req.user._id,
      action: 'STATUS_UPDATED',
      previousValue: { status: previousStatus },
      newValue: { status },
      description: `Order status changed from ${previousStatus} to ${status} by ${req.user.name}.`,
    });

    return res.status(200).json({
      success: true,
      message: `Order status updated to '${status}'.`,
      data: { order },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update order status.' },
    });
  }
};

/**
 * GET /api/orders/:orderId/history
 * Retrieve audit history events for an order.
 */
export const getOrderHistory = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const userRole = req.user.role;

    // Verify order belongs to tenant and company (if company user)
    const order = await Order.findOne({ _id: orderId, transportBusinessId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    if (['company_admin', 'company_employee'].includes(userRole)) {
      if (order.companyId?.toString() !== req.user.companyId?.toString()) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied to history of another company.' },
        });
      }
    }

    const history = await OrderHistory.find({ orderId, transportBusinessId })
      .populate('performedByUserId', 'name role email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { history },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve order history.' },
    });
  }
};

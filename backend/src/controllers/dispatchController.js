/**
 * dispatchController.js
 *
 * Chapter 7: Order Dispatch & Driver Assignment System
 *
 * This controller handles:
 *  1. Owner/Dispatcher manually assigning a driver to an order
 *  2. Making an order available for driver self-claim
 *  3. ATOMIC driver self-claim (race-condition safe)
 *  4. Driver accepting / rejecting an assigned order
 *  5. Driver starting a job
 *  6. Driver completing a job
 *  7. Owner/Dispatcher reassigning an order
 *  8. Fetching assignment history for an order
 *
 * KEY PRINCIPLE: The database (MongoDB) is the single source of truth.
 * All business rules are validated on the BACKEND before any update.
 * Socket.IO events are emitted AFTER a successful database write.
 */

import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { Driver } from '../models/Driver.js';
import { Vehicle } from '../models/Vehicle.js';
import { TransportBusiness } from '../models/TransportBusiness.js';
import { OrderAssignmentHistory } from '../models/OrderAssignmentHistory.js';
import { recordOrderHistory } from '../services/orderHistoryService.js';
import { io } from '../server.js';

// ─────────────────────────────────────────────────────────────
// HELPER: Validate driver eligibility for dispatch
// ─────────────────────────────────────────────────────────────
/**
 * Validates that a driver is eligible for assignment.
 * Returns { valid: true } or { valid: false, message: '...' }
 */
const validateDriverEligibility = async (driverId, transportBusinessId) => {
  const driver = await Driver.findOne({ _id: driverId, transportBusinessId }).lean();

  if (!driver) {
    return { valid: false, message: 'Driver not found in this transport business.' };
  }
  if (driver.employmentStatus !== 'active') {
    return {
      valid: false,
      message: `Driver employment status is '${driver.employmentStatus}'. Only active drivers can be assigned.`,
    };
  }
  if (driver.availabilityStatus !== 'available') {
    return {
      valid: false,
      message: `Driver availability is '${driver.availabilityStatus}'. Only available drivers can be assigned.`,
    };
  }
  return { valid: true, driver };
};

// ─────────────────────────────────────────────────────────────
// HELPER: Validate vehicle eligibility for dispatch
// ─────────────────────────────────────────────────────────────
/**
 * Validates that a vehicle is eligible for dispatch.
 * Returns { valid: true } or { valid: false, message: '...' }
 */
const validateVehicleEligibility = async (vehicleId, transportBusinessId) => {
  const vehicle = await Vehicle.findOne({ _id: vehicleId, transportBusinessId }).lean();

  if (!vehicle) {
    return { valid: false, message: 'Vehicle not found in this transport business.' };
  }
  if (vehicle.status !== 'active') {
    return {
      valid: false,
      message: `Vehicle status is '${vehicle.status}'. Only active vehicles can be assigned.`,
    };
  }
  return { valid: true, vehicle };
};

// ─────────────────────────────────────────────────────────────
// HELPER: Emit a Socket.IO event scoped to tenant room
// ─────────────────────────────────────────────────────────────
/**
 * Emits a real-time event to all users in the tenant's room.
 * The room name is 'tenant:{transportBusinessId}' — users join this room
 * on socket connect after JWT verification.
 *
 * Database is ALWAYS updated first. Socket.IO is a notification mechanism only.
 * If a socket event is missed, the frontend fetches fresh data via REST API.
 */
const emitToTenant = (transportBusinessId, event, payload) => {
  try {
    io.to(`tenant:${transportBusinessId.toString()}`).emit(event, payload);
  } catch (err) {
    // Socket.IO failures must NEVER break the HTTP response
    console.warn(`Socket.IO emit failed for event '${event}':`, err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// HELPER: Emit to a specific driver's private room
// ─────────────────────────────────────────────────────────────
const emitToDriver = (driverUserId, event, payload) => {
  try {
    io.to(`driver:${driverUserId.toString()}`).emit(event, payload);
  } catch (err) {
    console.warn(`Socket.IO driver emit failed:`, err.message);
  }
};

// ═════════════════════════════════════════════════════════════
// 1. MANUAL DISPATCH — Owner/Dispatcher assigns driver & vehicle
// POST /api/orders/:orderId/dispatch
// ═════════════════════════════════════════════════════════════
/**
 * HOW IT WORKS:
 *  1. Verify order belongs to tenant and is in a dispatchable state
 *  2. Validate driver eligibility (active, available, same tenant)
 *  3. Validate vehicle eligibility (active, same tenant)
 *  4. Check business dispatch settings
 *  5. Update order atomically (set driver, vehicle, status=assigned)
 *  6. Update driver availability to 'busy'
 *  7. Create OrderAssignmentHistory record
 *  8. Record OrderHistory audit entry
 *  9. Emit socket event to notify driver and owner dashboard
 */
export const dispatchOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId, vehicleId, notes } = req.body;
    const transportBusinessId = req.user.transportBusinessId;
    const dispatcherUserId = req.user._id;
    const dispatcherRole = req.user.role;

    // ── Validation ──────────────────────────────────────────
    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Driver ID is required for manual dispatch.' },
      });
    }

    // ── 1. Verify Order ──────────────────────────────────────
    const order = await Order.findOne({ _id: orderId, transportBusinessId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found in your account.' },
      });
    }

    // Orders can only be dispatched from pending or available status
    if (!['pending', 'available'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER_STATUS',
          message: `Cannot dispatch an order with status '${order.status}'. Order must be pending or available.`,
        },
      });
    }

    // ── 2. Business Dispatch Settings ───────────────────────
    const business = await TransportBusiness.findById(transportBusinessId).lean();
    const dispatchMode = business?.settings?.dispatchMode || 'both';

    if (dispatchMode === 'driver_self_claim') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DISPATCH_MODE_RESTRICTED',
          message: 'This business is configured for driver self-claim only. Manual assignment is disabled.',
        },
      });
    }

    // ── 3. Validate Driver ───────────────────────────────────
    const driverCheck = await validateDriverEligibility(driverId, transportBusinessId);
    if (!driverCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'DRIVER_INELIGIBLE', message: driverCheck.message },
      });
    }

    // ── 4. Validate Vehicle (optional in some workflows) ────
    let vehicleObj = null;
    if (vehicleId) {
      const vehicleCheck = await validateVehicleEligibility(vehicleId, transportBusinessId);
      if (!vehicleCheck.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'VEHICLE_INELIGIBLE', message: vehicleCheck.message },
        });
      }
      vehicleObj = vehicleCheck.vehicle;
    }

    const previousStatus = order.status;
    const assignmentSource =
      dispatcherRole === 'owner' ? 'owner_manual' : 'dispatcher_manual';

    // ── 5. Update Order ──────────────────────────────────────
    order.status = 'assigned';
    order.assignedDriverId = driverId;
    order.assignedVehicleId = vehicleId || null;
    order.assignedByUserId = dispatcherUserId;
    order.assignmentMode = 'admin_assignment';
    order.assignedAt = new Date();
    await order.save();

    // ── 6. Mark Driver as Busy ───────────────────────────────
    await Driver.findByIdAndUpdate(driverId, { availabilityStatus: 'busy' });

    // ── 7. Create Assignment History Record ──────────────────
    await OrderAssignmentHistory.create({
      transportBusinessId,
      orderId: order._id,
      driverId,
      vehicleId: vehicleId || null,
      assignedByUserId: dispatcherUserId,
      assignmentSource,
      status: 'active',
      assignedAt: order.assignedAt,
    });

    // ── 8. Audit Log ─────────────────────────────────────────
    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: dispatcherUserId,
      action: 'ADMIN_ASSIGNED',
      previousValue: { status: previousStatus, assignedDriverId: null },
      newValue: {
        status: 'assigned',
        assignedDriverId: driverId,
        assignedVehicleId: vehicleId || null,
        assignmentSource,
      },
      description: `Order ${order.orderNumber} manually assigned to driver by ${req.user.name} (${dispatcherRole}).${notes ? ' Notes: ' + notes : ''}`,
    });

    // ── 9. Real-time Notification ────────────────────────────
    const populatedOrder = await Order.findById(order._id)
      .populate('assignedDriverId', 'fullName phoneNumber')
      .populate('assignedVehicleId', 'registrationNumber vehicleType')
      .lean();

    emitToTenant(transportBusinessId, 'order:assigned', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'assigned',
      assignedDriver: populatedOrder.assignedDriverId,
      assignedVehicle: populatedOrder.assignedVehicleId,
      assignedByRole: dispatcherRole,
    });

    // Also notify driver's private room
    if (driverCheck.driver?.userId) {
      emitToDriver(driverCheck.driver.userId, 'order:assigned', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: 'You have been assigned a new order.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} successfully assigned to driver.`,
      data: { order: populatedOrder },
    });
  } catch (error) {
    console.error('dispatchOrder error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to dispatch order.' },
    });
  }
};

// ═════════════════════════════════════════════════════════════
// 2. MAKE ORDER AVAILABLE FOR SELF-CLAIM
// POST /api/orders/:orderId/make-available
// ═════════════════════════════════════════════════════════════
/**
 * Owner/Dispatcher publishes an order so eligible drivers can claim it.
 * Validates dispatch settings allow self-claim mode.
 */
export const makeOrderAvailable = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    const order = await Order.findOne({ _id: orderId, transportBusinessId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    if (!['pending'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER_STATUS',
          message: `Only 'pending' orders can be made available. Current status: '${order.status}'.`,
        },
      });
    }

    // Check business dispatch settings
    const business = await TransportBusiness.findById(transportBusinessId).lean();
    const dispatchMode = business?.settings?.dispatchMode || 'both';

    if (dispatchMode === 'manual_assignment') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DISPATCH_MODE_RESTRICTED',
          message: 'This business is configured for manual assignment only. Driver self-claim is disabled.',
        },
      });
    }

    const previousStatus = order.status;
    order.status = 'available';
    await order.save();

    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: req.user._id,
      action: 'STATUS_UPDATED',
      previousValue: { status: previousStatus },
      newValue: { status: 'available' },
      description: `Order ${order.orderNumber} published for driver self-claim by ${req.user.name}.`,
    });

    // Notify all connected drivers in this tenant
    emitToTenant(transportBusinessId, 'order:available', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'available',
      requiredVehicleType: order.requiredVehicleType,
      pickupLocation: order.pickupLocation,
      destinationLocation: order.destinationLocation,
      requiredDate: order.requiredDate,
    });

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} is now available for driver self-claim.`,
      data: { order },
    });
  } catch (error) {
    console.error('makeOrderAvailable error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to make order available.' },
    });
  }
};

// ═════════════════════════════════════════════════════════════
// 3. ATOMIC DRIVER SELF-CLAIM
// POST /api/orders/:orderId/claim
// ═════════════════════════════════════════════════════════════
/**
 * HOW ATOMIC CLAIMING WORKS:
 *
 * Problem: Two drivers press "Accept" simultaneously.
 * Naive approach (READ → CHECK → WRITE) has a race condition:
 *   - Driver A reads: order is available ✓
 *   - Driver B reads: order is available ✓  (simultaneously!)
 *   - Driver A writes: order now assigned to A
 *   - Driver B writes: order now overwritten to B  ← WRONG!
 *
 * Safe approach: MongoDB's findOneAndUpdate with a CONDITIONAL FILTER
 * The database update atomically checks the condition AND writes in one operation.
 * MongoDB's document-level write lock guarantees only ONE update can win.
 *
 * The filter includes: { status: 'available', assignedDriverId: null }
 * This means: "Only update if the order is STILL available and has NO driver assigned."
 *
 * If the update returns null → the order was already claimed by someone else.
 * HTTP 409 Conflict is returned. Zero partial writes. No bad history records.
 */
export const claimOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    // Step 1: Find the Driver profile for this authenticated user
    const driver = await Driver.findOne({ userId, transportBusinessId });
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NOT_A_DRIVER',
          message: 'No driver profile found for your account in this transport business.',
        },
      });
    }

    // Step 2: Validate driver eligibility (active + available)
    const driverCheck = await validateDriverEligibility(driver._id, transportBusinessId);
    if (!driverCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'DRIVER_INELIGIBLE', message: driverCheck.message },
      });
    }

    // Step 3: Check business allows self-claim
    const business = await TransportBusiness.findById(transportBusinessId).lean();
    const dispatchMode = business?.settings?.dispatchMode || 'both';

    if (dispatchMode === 'manual_assignment') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SELF_CLAIM_DISABLED',
          message: 'Driver self-claim is disabled for this business. Orders are assigned by the owner.',
        },
      });
    }

    const claimedAt = new Date();

    // ─────────────────────────────────────────────────────────
    // Step 4: ATOMIC CONDITIONAL UPDATE
    // This single database operation:
    //  1. Finds an order matching ALL conditions simultaneously
    //  2. If found, updates it atomically in the same operation
    //  3. Returns the updated document if successful, or null if not found
    //
    // MongoDB document-level write locking guarantees:
    //  - If Driver A and Driver B send simultaneous requests,
    //    only ONE of them will find and update the document.
    //  - The other will find null (order no longer matches conditions).
    //
    // Limitation: This protects the Order document atomically.
    // The subsequent driver status update (setting driver to 'busy') is
    // a separate operation and not part of the same atomic transaction.
    // For production systems requiring full ACID transactions,
    // MongoDB multi-document transactions (session.withTransaction) would be used.
    // For our use case, the Order claim is the critical resource —
    // driver status is a secondary consistency update.
    // ─────────────────────────────────────────────────────────
    const claimedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        transportBusinessId,          // tenant isolation
        status: 'available',           // must still be available
        assignedDriverId: null,        // must not already have a driver
      },
      {
        $set: {
          status: 'assigned',          // immediate status transition on claim
          assignedDriverId: driver._id,
          assignedByUserId: null,      // null = self-claim (not assigned by admin)
          assignmentMode: 'driver_self_assignment',
          assignedAt: claimedAt,
        },
      },
      {
        new: true,                     // return the updated document
        runValidators: true,
      }
    );

    // ── 409 Conflict: Another driver already claimed this order ──
    if (!claimedOrder) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ORDER_ALREADY_CLAIMED',
          message: 'This order has already been accepted by another driver. Please check for other available orders.',
        },
      });
    }

    // ── SUCCESS: Driver won the claim ────────────────────────

    // Update driver availability (non-atomic secondary update)
    await Driver.findByIdAndUpdate(driver._id, { availabilityStatus: 'busy' });

    // Create assignment history record
    await OrderAssignmentHistory.create({
      transportBusinessId,
      orderId: claimedOrder._id,
      driverId: driver._id,
      vehicleId: driver.currentVehicleId || null,
      assignedByUserId: null, // self-claim
      assignmentSource: 'driver_self_claim',
      status: 'active',
      assignedAt: claimedAt,
    });

    // Record audit log
    await recordOrderHistory({
      transportBusinessId,
      orderId: claimedOrder._id,
      performedByUserId: userId,
      action: 'DRIVER_CLAIMED',
      previousValue: { status: 'available', assignedDriverId: null },
      newValue: {
        status: 'assigned',
        assignedDriverId: driver._id,
        assignmentSource: 'driver_self_claim',
        claimedAt,
      },
      description: `Order ${claimedOrder.orderNumber} claimed by driver ${driver.fullName} via self-claim.`,
    });

    // Real-time: notify owner dashboard
    emitToTenant(transportBusinessId, 'order:claimed', {
      orderId: claimedOrder._id,
      orderNumber: claimedOrder.orderNumber,
      status: 'assigned',
      claimedByDriverId: driver._id,
      claimedByDriverName: driver.fullName,
      claimedAt,
    });

    return res.status(200).json({
      success: true,
      message: `You have successfully claimed order ${claimedOrder.orderNumber}.`,
      data: { order: claimedOrder },
    });
  } catch (error) {
    console.error('claimOrder error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to claim order.' },
    });
  }
};

// ═════════════════════════════════════════════════════════════
// 4. DRIVER ACCEPTS ASSIGNED ORDER
// POST /api/orders/:orderId/accept
// ═════════════════════════════════════════════════════════════
export const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    const driver = await Driver.findOne({ userId, transportBusinessId });
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_DRIVER', message: 'No driver profile found for your account.' },
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      transportBusinessId,
      assignedDriverId: driver._id, // must be assigned to THIS driver
      status: 'assigned',
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No assigned order found for your account with that ID.' },
      });
    }

    const acceptedAt = new Date();
    order.status = 'accepted';
    order.acceptedAt = acceptedAt;
    await order.save();

    // Update assignment history
    await OrderAssignmentHistory.findOneAndUpdate(
      { orderId: order._id, driverId: driver._id, status: 'active' },
      { status: 'accepted', acceptedAt }
    );

    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: userId,
      action: 'DRIVER_ACCEPTED',
      previousValue: { status: 'assigned' },
      newValue: { status: 'accepted', acceptedAt },
      description: `Order ${order.orderNumber} accepted by driver ${driver.fullName}.`,
    });

    emitToTenant(transportBusinessId, 'order:accepted', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      driverName: driver.fullName,
      acceptedAt,
    });

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} accepted.`,
      data: { order },
    });
  } catch (error) {
    console.error('acceptOrder error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to accept order.' },
    });
  }
};

// ═════════════════════════════════════════════════════════════
// 5. DRIVER REJECTS ASSIGNED ORDER
// POST /api/orders/:orderId/reject
// ═════════════════════════════════════════════════════════════
export const rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Rejection reason is required.' },
      });
    }

    const driver = await Driver.findOne({ userId, transportBusinessId });
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_DRIVER', message: 'No driver profile found for your account.' },
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      transportBusinessId,
      assignedDriverId: driver._id,
      status: { $in: ['assigned', 'accepted'] },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No assigned order found to reject.' },
      });
    }

    const previousStatus = order.status;
    const releasedAt = new Date();

    // Return order to pending so owner can reassign
    order.status = 'pending';
    order.assignedDriverId = null;
    order.assignedVehicleId = null;
    order.assignedByUserId = null;
    order.assignmentMode = 'unassigned';
    order.assignedAt = null;
    order.acceptedAt = null;
    await order.save();

    // Free up driver availability
    await Driver.findByIdAndUpdate(driver._id, { availabilityStatus: 'available' });

    // Close assignment history
    await OrderAssignmentHistory.findOneAndUpdate(
      { orderId: order._id, driverId: driver._id, status: { $in: ['active', 'accepted'] } },
      {
        status: 'rejected',
        releasedAt,
        reassignmentReason: reason.trim(),
      }
    );

    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: userId,
      action: 'DRIVER_REJECTED',
      previousValue: { status: previousStatus, assignedDriverId: driver._id },
      newValue: { status: 'pending', assignedDriverId: null, reason: reason.trim() },
      description: `Order ${order.orderNumber} rejected by driver ${driver.fullName}. Reason: ${reason.trim()}`,
    });

    emitToTenant(transportBusinessId, 'order:rejected', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: 'pending',
      rejectedByDriverName: driver.fullName,
      reason: reason.trim(),
    });

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} rejected and returned to pending queue.`,
      data: { order },
    });
  } catch (error) {
    console.error('rejectOrder error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reject order.' },
    });
  }
};

// ═════════════════════════════════════════════════════════════
// 6. DRIVER STARTS JOB
// POST /api/orders/:orderId/start
// ═════════════════════════════════════════════════════════════
export const startOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    const driver = await Driver.findOne({ userId, transportBusinessId });
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_DRIVER', message: 'No driver profile found for your account.' },
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      transportBusinessId,
      assignedDriverId: driver._id,
      status: { $in: ['assigned', 'accepted'] },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No assigned or accepted order found to start.',
        },
      });
    }

    const startedAt = new Date();
    order.status = 'in_progress';
    order.startedAt = startedAt;
    await order.save();

    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: userId,
      action: 'TRIP_STARTED',
      previousValue: { status: order.status === 'in_progress' ? 'accepted' : 'assigned' },
      newValue: { status: 'in_progress', startedAt },
      description: `Trip started for order ${order.orderNumber} by driver ${driver.fullName}.`,
    });

    emitToTenant(transportBusinessId, 'order:started', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      driverName: driver.fullName,
      startedAt,
    });

    return res.status(200).json({
      success: true,
      message: `Trip started for order ${order.orderNumber}.`,
      data: { order },
    });
  } catch (error) {
    console.error('startOrder error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to start order.' },
    });
  }
};

// ═════════════════════════════════════════════════════════════
// 7. DRIVER COMPLETES JOB
// POST /api/orders/:orderId/complete
// ═════════════════════════════════════════════════════════════
export const completeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    const driver = await Driver.findOne({ userId, transportBusinessId });
    if (!driver) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_A_DRIVER', message: 'No driver profile found for your account.' },
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      transportBusinessId,
      assignedDriverId: driver._id,
      status: 'in_progress',
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'No in-progress order found to complete.',
        },
      });
    }

    const completedAt = new Date();
    order.status = 'completed';
    order.completedAt = completedAt;
    await order.save();

    // Free driver back to available
    await Driver.findByIdAndUpdate(driver._id, { availabilityStatus: 'available' });

    // Close assignment history
    await OrderAssignmentHistory.findOneAndUpdate(
      { orderId: order._id, driverId: driver._id, status: { $in: ['active', 'accepted'] } },
      { status: 'completed', releasedAt: completedAt }
    );

    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: userId,
      action: 'TRIP_COMPLETED',
      previousValue: { status: 'in_progress' },
      newValue: { status: 'completed', completedAt },
      description: `Order ${order.orderNumber} completed by driver ${driver.fullName}.`,
    });

    emitToTenant(transportBusinessId, 'order:completed', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      driverName: driver.fullName,
      completedAt,
    });

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} completed successfully.`,
      data: { order },
    });
  } catch (error) {
    console.error('completeOrder error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to complete order.' },
    });
  }
};

// ═════════════════════════════════════════════════════════════
// 8. OWNER/DISPATCHER REASSIGNS ORDER
// POST /api/orders/:orderId/reassign
// ═════════════════════════════════════════════════════════════
/**
 * Reassignment rules:
 *  1. Order must be in 'assigned' or 'accepted' state (not completed or cancelled)
 *  2. New driver must be eligible
 *  3. Previous assignment history is PRESERVED as 'reassigned' — not deleted
 *  4. Reassignment reason is required
 *  5. Previous driver is freed back to 'available'
 */
export const reassignOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { driverId, vehicleId, reason } = req.body;
    const transportBusinessId = req.user.transportBusinessId;
    const dispatcherUserId = req.user._id;
    const dispatcherRole = req.user.role;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'New driver ID is required for reassignment.' },
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Reassignment reason is required.' },
      });
    }

    const order = await Order.findOne({ _id: orderId, transportBusinessId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    if (!['assigned', 'accepted'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ORDER_STATUS',
          message: `Cannot reassign an order with status '${order.status}'. Only assigned or accepted orders can be reassigned.`,
        },
      });
    }

    // Validate new driver
    const driverCheck = await validateDriverEligibility(driverId, transportBusinessId);
    if (!driverCheck.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'DRIVER_INELIGIBLE', message: driverCheck.message },
      });
    }

    // Validate new vehicle (optional)
    if (vehicleId) {
      const vehicleCheck = await validateVehicleEligibility(vehicleId, transportBusinessId);
      if (!vehicleCheck.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'VEHICLE_INELIGIBLE', message: vehicleCheck.message },
        });
      }
    }

    const previousDriverId = order.assignedDriverId;
    const releasedAt = new Date();

    // 1. Close previous assignment history (preserve it as 'reassigned')
    if (previousDriverId) {
      await OrderAssignmentHistory.findOneAndUpdate(
        { orderId: order._id, driverId: previousDriverId, status: { $in: ['active', 'accepted'] } },
        {
          status: 'reassigned',
          releasedAt,
          reassignmentReason: reason.trim(),
        }
      );

      // Free previous driver
      await Driver.findByIdAndUpdate(previousDriverId, { availabilityStatus: 'available' });
    }

    const assignmentSource = dispatcherRole === 'owner' ? 'owner_manual' : 'dispatcher_manual';

    // 2. Update the order with new driver
    order.status = 'assigned';
    order.assignedDriverId = driverId;
    order.assignedVehicleId = vehicleId || order.assignedVehicleId;
    order.assignedByUserId = dispatcherUserId;
    order.assignmentMode = 'admin_assignment';
    order.assignedAt = new Date();
    order.acceptedAt = null;
    await order.save();

    // 3. Mark new driver as busy
    await Driver.findByIdAndUpdate(driverId, { availabilityStatus: 'busy' });

    // 4. Create new assignment history entry for the new driver
    await OrderAssignmentHistory.create({
      transportBusinessId,
      orderId: order._id,
      driverId,
      vehicleId: vehicleId || order.assignedVehicleId || null,
      assignedByUserId: dispatcherUserId,
      assignmentSource,
      status: 'active',
      assignedAt: order.assignedAt,
      reassignmentReason: `Reassigned from previous driver. Reason: ${reason.trim()}`,
    });

    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: dispatcherUserId,
      action: 'ADMIN_ASSIGNED',
      previousValue: { assignedDriverId: previousDriverId },
      newValue: {
        assignedDriverId: driverId,
        status: 'assigned',
        reassignmentReason: reason.trim(),
      },
      description: `Order ${order.orderNumber} reassigned by ${req.user.name} (${dispatcherRole}). Reason: ${reason.trim()}`,
    });

    emitToTenant(transportBusinessId, 'order:reassigned', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      newDriverId: driverId,
      previousDriverId,
      reason: reason.trim(),
    });

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} reassigned successfully.`,
      data: { order },
    });
  } catch (error) {
    console.error('reassignOrder error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to reassign order.' },
    });
  }
};

// ═════════════════════════════════════════════════════════════
// 9. GET ORDER ASSIGNMENT HISTORY
// GET /api/orders/:orderId/assignments
// ═════════════════════════════════════════════════════════════
export const getOrderAssignments = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    // Verify order belongs to tenant
    const order = await Order.findOne({ _id: orderId, transportBusinessId }).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    const assignments = await OrderAssignmentHistory.find({ orderId, transportBusinessId })
      .populate('driverId', 'fullName phoneNumber')
      .populate('vehicleId', 'registrationNumber vehicleType')
      .populate('assignedByUserId', 'name role')
      .sort({ assignedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { assignments },
    });
  } catch (error) {
    console.error('getOrderAssignments error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch assignment history.' },
    });
  }
};

// ═════════════════════════════════════════════════════════════
// 10. GET ELIGIBLE DRIVERS FOR DISPATCH
// GET /api/orders/:orderId/eligible-drivers
// ═════════════════════════════════════════════════════════════
export const getEligibleDrivers = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    const order = await Order.findOne({ _id: orderId, transportBusinessId }).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    // Fetch active, available drivers in this tenant
    const eligibleDrivers = await Driver.find({
      transportBusinessId,
      employmentStatus: 'active',
      availabilityStatus: 'available',
    })
      .populate('currentVehicleId', 'registrationNumber vehicleType status')
      .lean();

    return res.status(200).json({
      success: true,
      data: { drivers: eligibleDrivers },
    });
  } catch (error) {
    console.error('getEligibleDrivers error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch eligible drivers.' },
    });
  }
};

// ═════════════════════════════════════════════════════════════
// 11. GET ELIGIBLE VEHICLES FOR DISPATCH
// GET /api/orders/:orderId/eligible-vehicles
// ═════════════════════════════════════════════════════════════
export const getEligibleVehicles = async (req, res) => {
  try {
    const { orderId } = req.params;
    const transportBusinessId = req.user.transportBusinessId;

    const order = await Order.findOne({ _id: orderId, transportBusinessId }).lean();
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    const filter = {
      transportBusinessId,
      status: 'active',
    };

    // Filter by required vehicle type (if not 'any')
    if (order.requiredVehicleType && order.requiredVehicleType !== 'any') {
      filter.vehicleType = order.requiredVehicleType;
    }

    const eligibleVehicles = await Vehicle.find(filter)
      .populate('currentDriverId', 'fullName availabilityStatus')
      .lean();

    return res.status(200).json({
      success: true,
      data: { vehicles: eligibleVehicles },
    });
  } catch (error) {
    console.error('getEligibleVehicles error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch eligible vehicles.' },
    });
  }
};

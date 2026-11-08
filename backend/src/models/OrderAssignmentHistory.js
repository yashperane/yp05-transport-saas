import mongoose from 'mongoose';

/**
 * OrderAssignmentHistory Model
 *
 * Records EVERY assignment event for an order — initial assignment,
 * driver acceptance, rejection, reassignment, and release.
 * This is separate from VehicleAssignmentHistory (which tracks vehicle-driver pairings).
 * This model tracks order-level dispatch lifecycle.
 *
 * Fields:
 *  - transportBusinessId   : Tenant scoping (required for isolation)
 *  - orderId               : Which order this event belongs to
 *  - driverId              : Driver involved in this event
 *  - vehicleId             : Vehicle assigned at the time (nullable for self-claim w/o vehicle)
 *  - assignedByUserId      : Who performed this action (owner/dispatcher/driver for self-claim)
 *  - assignmentSource      : How was this assignment made?
 *  - status                : Current lifecycle state of this assignment record
 *  - reassignmentReason    : Required when status = 'reassigned' or 'rejected'
 *  - assignedAt            : When this assignment was created
 *  - acceptedAt            : When driver accepted (if separate acceptance step)
 *  - releasedAt            : When this assignment ended (rejection, reassignment, cancellation)
 */
const orderAssignmentHistorySchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: [true, 'Transport business reference is required'],
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      index: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver reference is required'],
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    assignedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null when driver self-claims
    },
    assignmentSource: {
      type: String,
      enum: ['owner_manual', 'dispatcher_manual', 'driver_self_claim'],
      required: [true, 'Assignment source is required'],
    },
    status: {
      type: String,
      enum: ['active', 'accepted', 'rejected', 'reassigned', 'released', 'completed'],
      default: 'active',
      index: true,
    },
    reassignmentReason: {
      type: String,
      trim: true,
      default: '',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for efficient tenant-scoped queries
orderAssignmentHistorySchema.index({ transportBusinessId: 1, orderId: 1, status: 1 });
orderAssignmentHistorySchema.index({ transportBusinessId: 1, driverId: 1, status: 1 });
orderAssignmentHistorySchema.index({ orderId: 1, assignedAt: -1 });

export const OrderAssignmentHistory = mongoose.model(
  'OrderAssignmentHistory',
  orderAssignmentHistorySchema
);

import mongoose from 'mongoose';

/**
 * VehicleAssignmentHistory Model
 * Maintains an immutable audit trail of which driver operated which vehicle,
 * when they were assigned, and when they were unassigned.
 */
const vehicleAssignmentHistorySchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: [true, 'Transport business reference is required'],
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
      required: [true, 'Vehicle reference is required'],
      index: true,
    },
    assignedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned by user reference is required'],
    },
    assignedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    unassignedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'ended'],
      default: 'active',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

vehicleAssignmentHistorySchema.index({ transportBusinessId: 1, vehicleId: 1, status: 1 });
vehicleAssignmentHistorySchema.index({ transportBusinessId: 1, driverId: 1, status: 1 });

export const VehicleAssignmentHistory = mongoose.model(
  'VehicleAssignmentHistory',
  vehicleAssignmentHistorySchema
);

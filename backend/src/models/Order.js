import mongoose from 'mongoose';

const locationPointSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },
    placeId: {
      type: String,
      default: null,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: [true, 'Transport business reference is required'],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user reference is required'],
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      uppercase: true,
      trim: true,
    },
    pickupLocation: {
      type: locationPointSchema,
      required: true,
    },
    destinationLocation: {
      type: locationPointSchema,
      required: true,
    },
    requiredDate: {
      type: Date,
      required: [true, 'Required date is required'],
      index: true,
    },
    requiredTime: {
      type: String,
      trim: true,
    },
    materialDescription: {
      type: String,
      required: [true, 'Material description is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [0, 'Quantity cannot be negative'],
    },
    labourCount: {
      type: Number,
      default: 0,
      min: [0, 'Labour count cannot be negative'],
    },
    requiredVehicleType: {
      type: String,
      enum: ['pickup', 'tempo', 'truck', 'trailer', 'any'],
      default: 'pickup',
    },
    specialInstructions: {
      type: String,
      trim: true,
    },
    pricingDetails: {
      pricingType: {
        type: String,
        enum: ['fixed_per_trip', 'per_kilometre', 'monthly_contract', 'custom', 'manual'],
        default: 'manual',
      },
      estimatedPrice: {
        type: Number,
        default: 0,
        min: 0,
      },
      finalPrice: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
      index: true,
    },
    assignedVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    assignmentMode: {
      type: String,
      enum: ['admin_assignment', 'driver_self_assignment', 'unassigned'],
      default: 'unassigned',
    },
    status: {
      type: String,
      enum: [
        'pending',
        'available',
        'assigned',
        'accepted',
        'in_progress',
        'completed',
        'cancelled',
        'failed',
      ],
      default: 'pending',
      index: true,
    },
    duplicateReviewStatus: {
      isFlagged: {
        type: Boolean,
        default: false,
      },
      potentialDuplicateOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
      },
      reviewedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for fast, secure tenant-scoped querying
orderSchema.index({ transportBusinessId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ transportBusinessId: 1, status: 1 });
orderSchema.index({ transportBusinessId: 1, requiredDate: 1 });
orderSchema.index({ transportBusinessId: 1, companyId: 1 });
orderSchema.index({ transportBusinessId: 1, assignedDriverId: 1, status: 1 });

export const Order = mongoose.model('Order', orderSchema);

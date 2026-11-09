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
      default: '',
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
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
      index: true,
    },
    createdByRole: {
      type: String,
      required: true,
      enum: ['owner', 'dispatcher', 'company_admin', 'company_employee', 'super_admin'],
    },
    creationSource: {
      type: String,
      enum: ['company_portal', 'phone_call_manual', 'walk_in', 'dispatcher_portal'],
      default: 'company_portal',
    },
    orderType: {
      type: String,
      enum: ['goods', 'labour', 'mixed', 'private_customer'],
      default: 'goods',
      index: true,
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      uppercase: true,
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
      default: '',
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
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
      default: '',
    },
    materialDescription: {
      type: String,
      trim: true,
      default: '',
    },
    quantity: {
      type: Number,
      default: 1,
      min: [0, 'Quantity cannot be negative'],
    },
    quantityUnit: {
      type: String,
      trim: true,
      default: 'units',
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
      default: '',
    },
    pricingDetails: {
      pricingAgreementId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PricingAgreement',
        default: null,
      },
      pricingType: {
        type: String,
        enum: ['fixed_per_trip', 'per_kilometre', 'monthly_contract', 'custom', 'manual', 'pending'],
        default: 'pending',
      },
      agreedRate: {
        type: Number,
        default: 0,
        min: 0,
      },
      billableDistance: {
        type: Number,
        default: 0,
        min: 0,
      },
      distanceSource: {
        type: String,
        enum: ['manual_entry', 'system_calculated', 'not_applicable'],
        default: 'not_applicable',
      },
      calculationBreakdown: {
        type: String,
        trim: true,
        default: '',
      },
      subtotal: {
        type: Number,
        default: 0,
        min: 0,
      },
      adjustment: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
        min: 0,
      },
      finalAmount: {
        type: Number,
        default: 0,
        min: 0,
      },
      currency: {
        type: String,
        default: 'INR',
      },
      pricingStatus: {
        type: String,
        enum: ['pending_review', 'calculated', 'manually_confirmed', 'invoiced'],
        default: 'pending_review',
      },
      calculatedAt: {
        type: Date,
        default: null,
      },
      calculatedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      pricingNotes: {
        type: String,
        trim: true,
        default: '',
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
    assignedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for self-claim
    },
    assignmentMode: {
      type: String,
      enum: ['admin_assignment', 'driver_self_assignment', 'unassigned'],
      default: 'unassigned',
    },
    assignedAt: {
      type: Date,
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
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
    cancellationReason: {
      type: String,
      trim: true,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    duplicateReviewStatus: {
      isFlagged: {
        type: Boolean,
        default: false,
      },
      status: {
        type: String,
        enum: ['not_reviewed', 'possible_duplicate', 'reviewed_not_duplicate', 'confirmed_duplicate'],
        default: 'not_reviewed',
      },
      potentialDuplicateOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null,
      },
      matchingScore: {
        type: Number,
        default: 0,
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
      notes: {
        type: String,
        trim: true,
        default: '',
      },
    },
    // Chapter 11: Billing & Invoicing Integration
    invoicingStatus: {
      type: String,
      enum: ['unbilled', 'invoiced', 'exempt'],
      default: 'unbilled',
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
      index: true,
    },
    invoicedAt: {
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
orderSchema.index({ transportBusinessId: 1, companyId: 1, createdAt: -1 });
orderSchema.index({ transportBusinessId: 1, orderType: 1 });
orderSchema.index({ transportBusinessId: 1, 'pickupLocation.address': 1 });
orderSchema.index({ transportBusinessId: 1, 'destinationLocation.address': 1 });
// Chapter 7: Dispatch-specific indexes
orderSchema.index({ transportBusinessId: 1, assignedDriverId: 1 });
orderSchema.index({ transportBusinessId: 1, assignedVehicleId: 1 });
orderSchema.index({ transportBusinessId: 1, status: 1, requiredDate: 1 });
// Chapter 11: Invoicing index
orderSchema.index({ transportBusinessId: 1, status: 1, invoicingStatus: 1 });

export const Order = mongoose.model('Order', orderSchema);

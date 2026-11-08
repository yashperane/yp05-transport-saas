import mongoose from 'mongoose';

const orderHistorySchema = new mongoose.Schema(
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
    performedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performing user reference is required'],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: [
        'ORDER_CREATED',
        'STATUS_UPDATED',
        'ADMIN_ASSIGNED',
        'DRIVER_CLAIMED',
        'DRIVER_ACCEPTED',
        'DRIVER_REJECTED',
        'TRIP_STARTED',
        'TRIP_COMPLETED',
        'ORDER_CANCELLED',
        'DUPLICATE_FLAGGED',
        'DUPLICATE_OVERRIDDEN',
      ],
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    description: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    versionKey: false,
  }
);

orderHistorySchema.index({ orderId: 1, createdAt: -1 });

export const OrderHistory = mongoose.model('OrderHistory', orderHistorySchema);

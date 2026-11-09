import mongoose from 'mongoose';

/**
 * Notification Schema
 * Scoped by transportBusinessId and recipient userId.
 * Supports persistent notifications across sessions and offline states.
 */
const notificationSchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: true,
      index: true,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'order_created',
        'order_assigned',
        'order_available',
        'order_claimed',
        'order_accepted',
        'order_rejected',
        'order_started',
        'order_completed',
        'order_cancelled',
        'order_reassigned',
        'driver_availability',
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for fast querying of a user's recent notifications
notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ transportBusinessId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);

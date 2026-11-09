import mongoose from 'mongoose';

/**
 * Notification Delivery Log Schema
 * Tracks delivery attempts across in-app, email, sms, and whatsapp channels.
 */
const notificationDeliveryLogSchema = new mongoose.Schema(
  {
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
      index: true,
    },
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
    channel: {
      type: String,
      enum: ['in_app', 'email', 'sms', 'whatsapp'],
      required: true,
    },
    provider: {
      type: String,
      default: 'internal',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'sent', 'delivered', 'failed'],
      default: 'sent',
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 1,
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
    failureReason: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationDeliveryLogSchema.index({ recipientUserId: 1, channel: 1, status: 1 });

export const NotificationDeliveryLog = mongoose.model('NotificationDeliveryLog', notificationDeliveryLogSchema);

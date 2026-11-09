import mongoose from 'mongoose';

/**
 * Enhanced Notification Schema for Chapter 12
 * Supports multi-category (orders, dispatch, driver, billing, invoice, payment, company, system),
 * delivery channels, and navigation linking.
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
    category: {
      type: String,
      enum: ['order', 'dispatch', 'driver', 'billing', 'company', 'system'],
      default: 'system',
      index: true,
    },
    type: {
      type: String,
      enum: [
        // Order events
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
        'order_duplicate_warning',
        // Driver events
        'driver_availability',
        'driver_assigned',
        // Billing events
        'invoice_created',
        'invoice_issued',
        'invoice_cancelled',
        'payment_recorded',
        'payment_completed',
        'invoice_overdue',
        // Company events
        'company_invited',
        'company_invite_accepted',
        // System
        'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 600,
    },
    relatedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    relatedInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
      index: true,
    },
    actionUrl: {
      type: String,
      default: '',
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
    deliveryChannels: {
      type: [String],
      enum: ['in_app', 'email', 'sms', 'whatsapp'],
      default: ['in_app'],
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

// Compound indexes
notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ transportBusinessId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ recipientUserId: 1, category: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);

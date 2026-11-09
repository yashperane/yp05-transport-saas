import mongoose from 'mongoose';

/**
 * Notification Preference Schema
 * Manages per-user preferences for notification channels and categories.
 */
const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: true,
      index: true,
    },
    // Channel Toggles
    inAppEnabled: {
      type: Boolean,
      default: true,
    },
    emailEnabled: {
      type: Boolean,
      default: true,
    },
    smsEnabled: {
      type: Boolean,
      default: false,
    },
    whatsappEnabled: {
      type: Boolean,
      default: false,
    },
    // Category Toggles
    categories: {
      orders: {
        type: Boolean,
        default: true,
      },
      dispatch: {
        type: Boolean,
        default: true,
      },
      driver: {
        type: Boolean,
        default: true,
      },
      billing: {
        type: Boolean,
        default: true,
      },
      company: {
        type: Boolean,
        default: true,
      },
      system: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

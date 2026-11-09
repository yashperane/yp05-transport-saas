import { Notification } from '../models/Notification.js';
import { NotificationPreference } from '../models/NotificationPreference.js';
import { NotificationDeliveryLog } from '../models/NotificationDeliveryLog.js';
import { User } from '../models/User.js';
import { notificationTemplateService } from './notificationTemplateService.js';
import { emailService } from './emailService.js';
import { realtimeService } from './realtimeService.js';

/**
 * Unified Centralized Notification Service for Chapter 12
 * Handles:
 *  - Preference checking
 *  - Template rendering
 *  - MongoDB storage (Source of Truth)
 *  - Real-time Socket.IO dispatch
 *  - Channel delivery (In-app, Email)
 *  - Delivery tracking & audit logs
 */
export const notificationService = {
  /**
   * Check if a recipient allows this category/channel
   */
  async checkPreference(userId, transportBusinessId, category, channel = 'in_app') {
    try {
      let pref = await NotificationPreference.findOne({ userId });
      if (!pref) {
        // Auto-create default preferences
        pref = await NotificationPreference.create({
          userId,
          transportBusinessId,
        });
      }

      // Check channel toggle
      if (channel === 'in_app' && !pref.inAppEnabled) return false;
      if (channel === 'email' && !pref.emailEnabled) return false;

      // Check category toggle
      if (pref.categories && pref.categories[category] === false) {
        return false;
      }

      return true;
    } catch (err) {
      // Default to allowed on lookup error
      return true;
    }
  },

  /**
   * Dispatch a notification to a specific user
   */
  async notifyUser({
    transportBusinessId,
    recipientUserId,
    companyId = null,
    type,
    payload = {},
    channels = ['in_app'],
    relatedOrderId = null,
    relatedInvoiceId = null,
  }) {
    try {
      const template = notificationTemplateService.getTemplate(type, payload);
      const category = template.category;

      // 1. In-App Notification Delivery
      let notification = null;
      const allowInApp = await this.checkPreference(recipientUserId, transportBusinessId, category, 'in_app');
      
      if (allowInApp && channels.includes('in_app')) {
        notification = await Notification.create({
          transportBusinessId,
          recipientUserId,
          companyId,
          category,
          type,
          title: template.title,
          message: template.message,
          relatedOrderId: relatedOrderId || payload.orderId || null,
          relatedInvoiceId: relatedInvoiceId || payload.invoiceId || null,
          actionUrl: template.actionUrl,
          deliveryChannels: channels,
          metadata: payload,
        });

        // Log delivery attempt
        await NotificationDeliveryLog.create({
          notificationId: notification._id,
          transportBusinessId,
          recipientUserId,
          channel: 'in_app',
          status: 'delivered',
        });

        // Live Socket.IO emission
        realtimeService.emitToUser(recipientUserId, 'notification:new', {
          notification: {
            _id: notification._id,
            category: notification.category,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            relatedOrderId: notification.relatedOrderId,
            relatedInvoiceId: notification.relatedInvoiceId,
            actionUrl: notification.actionUrl,
            isRead: false,
            createdAt: notification.createdAt,
          },
        });
      }

      // 2. Email Delivery (Non-blocking)
      const allowEmail = await this.checkPreference(recipientUserId, transportBusinessId, category, 'email');
      if (allowEmail && channels.includes('email')) {
        User.findById(recipientUserId).select('email name').lean().then(async (user) => {
          if (user?.email) {
            const html = emailService.buildTemplate({
              title: template.title,
              message: template.message,
              actionUrl: template.actionUrl,
            });

            const emailRes = await emailService.sendEmail({
              to: user.email,
              subject: template.title,
              htmlContent: html,
              textContent: template.message,
            });

            if (notification) {
              await NotificationDeliveryLog.create({
                notificationId: notification._id,
                transportBusinessId,
                recipientUserId,
                channel: 'email',
                status: emailRes.status,
                provider: emailRes.provider,
                failureReason: emailRes.error || null,
              });
            }
          }
        }).catch((err) => console.warn('[NotificationService] Email delivery error:', err.message));
      }

      return notification;
    } catch (err) {
      console.warn('[NotificationService] Error creating notification:', err.message);
      return null;
    }
  },

  /**
   * Broadcast an event notification to all relevant business staff (Owner + Dispatchers)
   */
  async notifyStaff({
    transportBusinessId,
    type,
    payload = {},
    channels = ['in_app'],
    relatedOrderId = null,
    relatedInvoiceId = null,
  }) {
    try {
      const staffMembers = await User.find({
        transportBusinessId,
        role: { $in: ['owner', 'dispatcher'] },
        status: 'active',
      }).select('_id').lean();

      for (const staff of staffMembers) {
        await this.notifyUser({
          transportBusinessId,
          recipientUserId: staff._id,
          type,
          payload,
          channels,
          relatedOrderId,
          relatedInvoiceId,
        });
      }
    } catch (err) {
      console.warn('[NotificationService] Failed to notify staff:', err.message);
    }
  },
};

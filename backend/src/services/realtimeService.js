import { io } from '../server.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';

/**
 * Centralized Real-Time Event & Notification Service
 * Ensures:
 *  1. Database state is always updated before emission.
 *  2. Minimal, sanitized payloads (no passwords, tokens, private pricing, or sensitive logs).
 *  3. Tenant, company, and driver room scoping.
 *  4. Optional creation of persistent notifications for key events.
 */

export const realtimeService = {
  /**
   * Broadcast an event to all staff in a transport business (owners, dispatchers).
   */
  emitToTenant(transportBusinessId, event, payload) {
    if (!transportBusinessId || !io) return;
    try {
      io.to(`tenant:${transportBusinessId.toString()}`).emit(event, payload);
    } catch (err) {
      console.warn(`[RealtimeService] Tenant emit error for ${event}:`, err.message);
    }
  },

  /**
   * Broadcast an event to members of a specific client company.
   */
  emitToCompany(companyId, event, payload) {
    if (!companyId || !io) return;
    try {
      io.to(`company:${companyId.toString()}`).emit(event, payload);
    } catch (err) {
      console.warn(`[RealtimeService] Company emit error for ${event}:`, err.message);
    }
  },

  /**
   * Send an event directly to a driver's private socket room.
   */
  emitToDriver(driverUserId, event, payload) {
    if (!driverUserId || !io) return;
    try {
      io.to(`driver:${driverUserId.toString()}`).emit(event, payload);
    } catch (err) {
      console.warn(`[RealtimeService] Driver emit error for ${event}:`, err.message);
    }
  },

  /**
   * Send an event directly to a user's private socket room.
   */
  emitToUser(userId, event, payload) {
    if (!userId || !io) return;
    try {
      io.to(`user:${userId.toString()}`).emit(event, payload);
    } catch (err) {
      console.warn(`[RealtimeService] User emit error for ${event}:`, err.message);
    }
  },

  /**
   * Create a persistent in-app notification in MongoDB and emit via Socket.IO
   */
  async createNotification({
    transportBusinessId,
    recipientUserId,
    companyId = null,
    type,
    title,
    message,
    relatedOrderId = null,
    metadata = {},
  }) {
    try {
      const notification = await Notification.create({
        transportBusinessId,
        recipientUserId,
        companyId,
        type,
        title,
        message,
        relatedOrderId,
        metadata,
      });

      // Emit live notification payload to specific user's room
      this.emitToUser(recipientUserId, 'notification:received', {
        notification: {
          _id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          relatedOrderId: notification.relatedOrderId,
          isRead: false,
          createdAt: notification.createdAt,
        },
      });

      return notification;
    } catch (err) {
      console.warn('[RealtimeService] Failed to create persistent notification:', err.message);
      return null;
    }
  },

  /**
   * Notify management staff (Owner & Dispatchers) of a business
   */
  async notifyBusinessStaff({
    transportBusinessId,
    type,
    title,
    message,
    relatedOrderId = null,
    metadata = {},
  }) {
    try {
      const staffUsers = await User.find({
        transportBusinessId,
        role: { $in: ['owner', 'dispatcher'] },
        status: 'active',
      }).select('_id').lean();

      for (const staff of staffUsers) {
        await this.createNotification({
          transportBusinessId,
          recipientUserId: staff._id,
          type,
          title,
          message,
          relatedOrderId,
          metadata,
        });
      }
    } catch (err) {
      console.warn('[RealtimeService] Failed to notify business staff:', err.message);
    }
  },
};

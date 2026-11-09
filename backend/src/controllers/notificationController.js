import { Notification } from '../models/Notification.js';
import { NotificationPreference } from '../models/NotificationPreference.js';

/**
 * GET /api/notifications
 * Get user's notifications with category filters, unread filter, and pagination
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const transportBusinessId = req.user.transportBusinessId;
    const { category, unreadOnly, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      recipientUserId: userId,
      transportBusinessId,
    };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (unreadOnly === 'true' || unreadOnly === true) {
      query.isRead = false;
    }

    const [notifications, totalUnread, totalCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('relatedOrderId', 'orderNumber status')
        .populate('relatedInvoiceId', 'invoiceNumber totalAmount status')
        .lean(),
      Notification.countDocuments({ recipientUserId: userId, transportBusinessId, isRead: false }),
      Notification.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount: totalUnread,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum) || 1,
          totalCount,
        },
      },
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve notifications.' },
    });
  }
};

/**
 * GET /api/notifications/unread-count
 * Fast endpoint for live header bell badge
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const transportBusinessId = req.user.transportBusinessId;

    const count = await Notification.countDocuments({
      recipientUserId: userId,
      transportBusinessId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch unread count.' },
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientUserId: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      data: { notification },
    });
  } catch (error) {
    console.error('markNotificationAsRead error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update notification.' },
    });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const transportBusinessId = req.user.transportBusinessId;

    await Notification.updateMany(
      { recipientUserId: userId, transportBusinessId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    console.error('markAllNotificationsAsRead error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to mark all as read.' },
    });
  }
};

/**
 * DELETE /api/notifications/:id
 * Dismiss/delete a notification for the recipient
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipientUserId: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found.' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification removed.',
    });
  } catch (error) {
    console.error('deleteNotification error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete notification.' },
    });
  }
};

/**
 * GET /api/notifications/preferences
 * Fetch user's notification preferences
 */
export const getPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const transportBusinessId = req.user.transportBusinessId;

    let pref = await NotificationPreference.findOne({ userId });
    if (!pref) {
      pref = await NotificationPreference.create({ userId, transportBusinessId });
    }

    return res.status(200).json({
      success: true,
      data: { preferences: pref },
    });
  } catch (error) {
    console.error('getPreferences error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch preferences.' },
    });
  }
};

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
export const updatePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const transportBusinessId = req.user.transportBusinessId;
    const { inAppEnabled, emailEnabled, smsEnabled, whatsappEnabled, categories } = req.body;

    const pref = await NotificationPreference.findOneAndUpdate(
      { userId },
      {
        $set: {
          transportBusinessId,
          ...(inAppEnabled !== undefined && { inAppEnabled }),
          ...(emailEnabled !== undefined && { emailEnabled }),
          ...(smsEnabled !== undefined && { smsEnabled }),
          ...(whatsappEnabled !== undefined && { whatsappEnabled }),
          ...(categories && { categories }),
        },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated.',
      data: { preferences: pref },
    });
  } catch (error) {
    console.error('updatePreferences error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update preferences.' },
    });
  }
};

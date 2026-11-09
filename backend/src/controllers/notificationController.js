import { Notification } from '../models/Notification.js';

/**
 * GET /api/notifications
 * Get user's notifications with pagination and unread counts.
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const transportBusinessId = req.user.transportBusinessId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const skip = (page - 1) * limit;

    const query = {
      recipientUserId: userId,
      transportBusinessId,
    };

    const [notifications, totalUnread, totalCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ ...query, isRead: false }),
      Notification.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount: totalUnread,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit) || 1,
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
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read.
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
 * Mark all notifications for current user as read.
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipientUserId: userId, isRead: false },
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

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteNotification);

// User notification preferences
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

export { router as notificationRouter };

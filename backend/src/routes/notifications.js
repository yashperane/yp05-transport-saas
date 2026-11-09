import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationAsRead);
router.patch('/read-all', markAllNotificationsAsRead);

export { router as notificationRouter };

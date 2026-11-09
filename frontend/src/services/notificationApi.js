const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const notificationApi = {
  /**
   * Fetch paginated notifications with unread counts
   */
  async getNotifications(token, page = 1, limit = 20) {
    const res = await fetch(`${API_URL}/api/notifications?page=${page}&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch notifications');
    return data.data;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(token, notificationId) {
    const res = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to mark notification as read');
    return data.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllRead(token) {
    const res = await fetch(`${API_URL}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to mark all notifications as read');
    return data;
  },
};

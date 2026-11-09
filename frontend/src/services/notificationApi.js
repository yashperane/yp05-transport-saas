const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const notificationApi = {
  /**
   * Get user's notifications with pagination, unread filter, and category filter
   */
  async getNotifications(token, { category = 'all', unreadOnly = false, page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (unreadOnly) params.append('unreadOnly', 'true');
    params.append('page', page);
    params.append('limit', limit);

    const res = await fetch(`${API_URL}/api/notifications?${params.toString()}`, {
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch notifications');
    return data.data;
  },

  /**
   * Quick unread count for the navigation bell badge
   */
  async getUnreadCount(token) {
    const res = await fetch(`${API_URL}/api/notifications/unread-count`, {
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch unread count');
    return data.data.unreadCount;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(token, notificationId) {
    const res = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update notification');
    return data.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(token) {
    const res = await fetch(`${API_URL}/api/notifications/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to mark all as read');
    return data;
  },

  /**
   * Delete a notification
   */
  async deleteNotification(token, notificationId) {
    const res = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to delete notification');
    return data;
  },

  /**
   * Get user notification preferences
   */
  async getPreferences(token) {
    const res = await fetch(`${API_URL}/api/notifications/preferences`, {
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch preferences');
    return data.data.preferences;
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(token, preferences) {
    const res = await fetch(`${API_URL}/api/notifications/preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(preferences),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update preferences');
    return data.data.preferences;
  },
};

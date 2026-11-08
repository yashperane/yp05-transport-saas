const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const authApi = {
  /**
   * Log in with email or phone + password
   */
  async login(identifier, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Login failed');
    }
    return data;
  },

  /**
   * Get current authenticated user profile
   */
  async getProfile(token) {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers,
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to fetch session');
    }
    return data.data.user;
  },

  /**
   * Log out session
   */
  async logout() {
    const res = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.json();
  },

  /**
   * Test RBAC endpoint
   */
  async testRbac(endpoint, token) {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
      headers,
      credentials: 'include',
    });
    return {
      status: res.status,
      body: await res.json(),
    };
  },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const trackingApi = {
  /**
   * Driver submits real-time GPS telemetry coordinate
   */
  async updateLocation(token, { latitude, longitude, accuracy, heading, speed, address, source = 'driver_mobile_browser' }) {
    const res = await fetch(`${API_URL}/api/location/update`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ latitude, longitude, accuracy, heading, speed, address, source }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update GPS location');
    return data.data;
  },

  /**
   * Driver toggles location sharing on or off
   */
  async toggleSharing(token, isSharing) {
    const res = await fetch(`${API_URL}/api/location/toggle-sharing`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ isSharing }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to toggle sharing');
    return data.data;
  },

  /**
   * Driver gets current tracking status
   */
  async getMyStatus(token) {
    const res = await fetch(`${API_URL}/api/location/my-status`, {
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch status');
    return data.data;
  },

  /**
   * Owner & Dispatcher retrieve all active fleet vehicle locations
   */
  async getFleetVehicles(token) {
    const res = await fetch(`${API_URL}/api/tracking/vehicles`, {
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch fleet tracking');
    return data.data.vehicles;
  },

  /**
   * Track specific order with privacy permissions
   */
  async getOrderTracking(token, orderId) {
    const res = await fetch(`${API_URL}/api/tracking/orders/${orderId}`, {
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch order tracking');
    return data.data;
  },

  /**
   * Retrieve vehicle historical breadcrumb route
   */
  async getVehicleHistory(token, vehicleId, limit = 100) {
    const res = await fetch(`${API_URL}/api/tracking/history/${vehicleId}?limit=${limit}`, {
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch tracking history');
    return data.data.history;
  },
};

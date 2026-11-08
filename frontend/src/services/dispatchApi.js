/**
 * dispatchApi.js — Chapters 7 & 8 Frontend API Service
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const authFetch = async (method, path, token, body) => {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, opts);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || 'Request failed');
    err.code = data.error?.code;
    err.status = res.status;
    throw err;
  }
  return data;
};

export const dispatchApi = {
  // ── Owner / Dispatcher ──────────────────────────────────────
  async dispatchOrder(token, orderId, { driverId, vehicleId, notes }) {
    const res = await authFetch('POST', `/api/orders/${orderId}/dispatch`, token, {
      driverId,
      vehicleId,
      notes,
    });
    return res.data.order;
  },

  async makeOrderAvailable(token, orderId) {
    const res = await authFetch('POST', `/api/orders/${orderId}/make-available`, token);
    return res.data.order;
  },

  async reassignOrder(token, orderId, { driverId, vehicleId, reason }) {
    const res = await authFetch('POST', `/api/orders/${orderId}/reassign`, token, {
      driverId,
      vehicleId,
      reason,
    });
    return res.data.order;
  },

  async getEligibleDrivers(token, orderId) {
    const res = await authFetch('GET', `/api/orders/${orderId}/eligible-drivers`, token);
    return res.data.drivers;
  },

  async getEligibleVehicles(token, orderId) {
    const res = await authFetch('GET', `/api/orders/${orderId}/eligible-vehicles`, token);
    return res.data.vehicles;
  },

  async getOrderAssignments(token, orderId) {
    const res = await authFetch('GET', `/api/orders/${orderId}/assignments`, token);
    return res.data.assignments;
  },

  // ── Driver Portal (Chapter 8 additions) ──────────────────────
  async getDriverSummary(token) {
    const res = await authFetch('GET', `/api/driver/orders/summary`, token);
    return res.data;
  },

  async updateDriverAvailability(token, availabilityStatus) {
    const res = await authFetch('PATCH', `/api/driver/orders/availability`, token, { availabilityStatus });
    return res.data;
  },

  async getMyAssignedOrders(token, params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.append(k, v));
    const res = await authFetch('GET', `/api/driver/orders/assigned?${q.toString()}`, token);
    return res.data;
  },

  async getMyAvailableOrders(token, params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.append(k, v));
    const res = await authFetch('GET', `/api/driver/orders/available?${q.toString()}`, token);
    return res.data;
  },

  async getDriverOrderById(token, orderId) {
    const res = await authFetch('GET', `/api/driver/orders/${orderId}`, token);
    return res.data;
  },

  async claimOrder(token, orderId) {
    const res = await authFetch('POST', `/api/orders/${orderId}/claim`, token);
    return res.data.order;
  },

  async acceptOrder(token, orderId) {
    const res = await authFetch('POST', `/api/orders/${orderId}/accept`, token);
    return res.data.order;
  },

  async rejectOrder(token, orderId, reason) {
    const res = await authFetch('POST', `/api/orders/${orderId}/reject`, token, { reason });
    return res.data.order;
  },

  async startOrder(token, orderId) {
    const res = await authFetch('POST', `/api/orders/${orderId}/start`, token);
    return res.data.order;
  },

  async completeOrder(token, orderId) {
    const res = await authFetch('POST', `/api/orders/${orderId}/complete`, token);
    return res.data.order;
  },
};

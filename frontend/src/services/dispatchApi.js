/**
 * dispatchApi.js — Chapter 7 Frontend API Service
 *
 * All dispatch, driver portal, and real-time setup methods.
 * Uses authenticated fetch requests with Bearer tokens.
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

  /** Manually assign a driver (and optionally a vehicle) to an order */
  async dispatchOrder(token, orderId, { driverId, vehicleId, notes }) {
    const res = await authFetch('POST', `/api/orders/${orderId}/dispatch`, token, {
      driverId,
      vehicleId,
      notes,
    });
    return res.data.order;
  },

  /** Make a pending order available for driver self-claim */
  async makeOrderAvailable(token, orderId) {
    const res = await authFetch('POST', `/api/orders/${orderId}/make-available`, token);
    return res.data.order;
  },

  /** Reassign order to a different driver with reason */
  async reassignOrder(token, orderId, { driverId, vehicleId, reason }) {
    const res = await authFetch('POST', `/api/orders/${orderId}/reassign`, token, {
      driverId,
      vehicleId,
      reason,
    });
    return res.data.order;
  },

  /** Get eligible (active + available) drivers for an order */
  async getEligibleDrivers(token, orderId) {
    const res = await authFetch('GET', `/api/orders/${orderId}/eligible-drivers`, token);
    return res.data.drivers;
  },

  /** Get eligible (active) vehicles for an order */
  async getEligibleVehicles(token, orderId) {
    const res = await authFetch('GET', `/api/orders/${orderId}/eligible-vehicles`, token);
    return res.data.vehicles;
  },

  /** Get assignment history for an order */
  async getOrderAssignments(token, orderId) {
    const res = await authFetch('GET', `/api/orders/${orderId}/assignments`, token);
    return res.data.assignments;
  },

  // ── Driver Portal ───────────────────────────────────────────

  /** Get orders assigned to the authenticated driver */
  async getMyAssignedOrders(token, params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.append(k, v));
    const res = await authFetch('GET', `/api/driver/orders/assigned?${q.toString()}`, token);
    return res.data;
  },

  /** Get available orders the authenticated driver can claim */
  async getMyAvailableOrders(token, params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.append(k, v));
    const res = await authFetch('GET', `/api/driver/orders/available?${q.toString()}`, token);
    return res.data;
  },

  /** Get single order detail as driver */
  async getDriverOrderById(token, orderId) {
    const res = await authFetch('GET', `/api/driver/orders/${orderId}`, token);
    return res.data.order;
  },

  /** Atomic self-claim of an available order */
  async claimOrder(token, orderId) {
    const res = await authFetch('POST', `/api/orders/${orderId}/claim`, token);
    return res.data.order;
  },

  /** Accept a manually assigned order */
  async acceptOrder(token, orderId) {
    const res = await authFetch('POST', `/api/orders/${orderId}/accept`, token);
    return res.data.order;
  },

  /** Reject an assigned order with a reason */
  async rejectOrder(token, orderId, reason) {
    const res = await authFetch('POST', `/api/orders/${orderId}/reject`, token, { reason });
    return res.data.order;
  },

  /** Start the job (in_progress) */
  async startOrder(token, orderId) {
    const res = await authFetch('POST', `/api/orders/${orderId}/start`, token);
    return res.data.order;
  },

  /** Complete the job */
  async completeOrder(token, orderId) {
    const res = await authFetch('POST', `/api/orders/${orderId}/complete`, token);
    return res.data.order;
  },
};

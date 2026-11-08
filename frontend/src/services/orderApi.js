const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const orderApi = {
  /**
   * List orders with search, filters, and pagination
   */
  async getOrders(token, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, v);
    });

    const res = await fetch(`${API_URL}/api/orders?${query.toString()}`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch orders');
    return data.data;
  },

  /**
   * Get single order details
   */
  async getOrderById(token, orderId) {
    const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch order details');
    return data.data.order;
  },

  /**
   * Pre-flight check for duplicate orders
   */
  async checkDuplicates(token, orderPayload) {
    const res = await fetch(`${API_URL}/api/orders/check-duplicates`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(orderPayload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to check duplicates');
    return data.data;
  },

  /**
   * Create new transport order
   */
  async createOrder(token, orderPayload) {
    const res = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(orderPayload),
    });
    const data = await res.json();
    if (!res.ok) {
      // Pass duplicate warning details if 409 Conflict
      const err = new Error(data.error?.message || 'Failed to create order');
      err.code = data.error?.code;
      err.candidates = data.error?.candidates;
      err.topMatch = data.error?.topMatch;
      throw err;
    }
    return data.data.order;
  },

  /**
   * Update existing order
   */
  async updateOrder(token, orderId, updatePayload) {
    const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(updatePayload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update order');
    return data.data.order;
  },

  /**
   * Cancel order with reason
   */
  async cancelOrder(token, orderId, reason) {
    const res = await fetch(`${API_URL}/api/orders/${orderId}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to cancel order');
    return data.data.order;
  },

  /**
   * Update order status (e.g. pending -> available)
   */
  async updateOrderStatus(token, orderId, status) {
    const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update order status');
    return data.data.order;
  },

  /**
   * Get audit history for an order
   */
  async getOrderHistory(token, orderId) {
    const res = await fetch(`${API_URL}/api/orders/${orderId}/history`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch order history');
    return data.data.history;
  },

  /**
   * Get dashboard order metrics
   */
  async getDashboardSummary(token) {
    const res = await fetch(`${API_URL}/api/orders/dashboard-summary`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch dashboard summary');
    return data.data.metrics;
  },
};

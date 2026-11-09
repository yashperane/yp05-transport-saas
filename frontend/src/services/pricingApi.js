const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const pricingApi = {
  /**
   * Get all pricing agreements for tenant
   */
  async getAgreements(token, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/api/pricing/agreements?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch pricing agreements');
    return data.data;
  },

  /**
   * Create a new pricing agreement
   */
  async createAgreement(token, payload) {
    const res = await fetch(`${API_URL}/api/pricing/agreements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to create pricing agreement');
    return data.data;
  },

  /**
   * Change status of an agreement (active, inactive, expired)
   */
  async updateAgreementStatus(token, agreementId, status) {
    const res = await fetch(`${API_URL}/api/pricing/agreements/${agreementId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update agreement status');
    return data.data;
  },

  /**
   * Update or confirm order pricing
   */
  async updateOrderPricing(token, orderId, payload) {
    const res = await fetch(`${API_URL}/api/pricing/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update order pricing');
    return data.data;
  },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const billingApi = {
  /**
   * Get all invoices with optional filters
   */
  async getInvoices(token, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/api/invoices?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch invoices');
    return data.data;
  },

  /**
   * Get unbilled orders for a company
   */
  async getUnbilledOrders(token, companyId) {
    const res = await fetch(`${API_URL}/api/invoices/unbilled-orders?companyId=${companyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch unbilled orders');
    return data.data;
  },

  /**
   * Get a single invoice by ID with payment history
   */
  async getInvoiceById(token, invoiceId) {
    const res = await fetch(`${API_URL}/api/invoices/${invoiceId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch invoice');
    return data.data;
  },

  /**
   * Create a new invoice
   */
  async createInvoice(token, payload) {
    const res = await fetch(`${API_URL}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to create invoice');
    return data.data;
  },

  /**
   * Issue a draft invoice
   */
  async issueInvoice(token, invoiceId) {
    const res = await fetch(`${API_URL}/api/invoices/${invoiceId}/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to issue invoice');
    return data.data;
  },

  /**
   * Cancel an invoice
   */
  async cancelInvoice(token, invoiceId, reason) {
    const res = await fetch(`${API_URL}/api/invoices/${invoiceId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to cancel invoice');
    return data.data;
  },

  /**
   * Record a payment against an invoice
   */
  async recordPayment(token, payload) {
    const res = await fetch(`${API_URL}/api/invoices/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to record payment');
    return data.data;
  },
};

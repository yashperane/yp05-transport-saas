const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const reportApi = {
  /**
   * Get dashboard financial summary
   */
  async getDashboardFinancials(token) {
    const res = await fetch(`${API_URL}/api/reports/dashboard-financials`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch dashboard financials');
    return data.data;
  },

  /**
   * Get company billing report
   */
  async getCompanyBillingReport(token) {
    const res = await fetch(`${API_URL}/api/reports/company-billing`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch company billing report');
    return data.data;
  },

  /**
   * Get payment ledger with optional filters
   */
  async getPaymentLedger(token, params = {}) {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/api/reports/payments?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch payment ledger');
    return data.data;
  },
};

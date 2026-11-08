const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const companyApi = {
  /**
   * List companies with pagination, search, status filter
   */
  async getCompanies(token, { search = '', status = '', page = 1, limit = 10 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    params.append('page', page);
    params.append('limit', limit);

    const res = await fetch(`${API_URL}/api/companies?${params.toString()}`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch companies');
    return data.data;
  },

  /**
   * Get single company details
   */
  async getCompanyById(token, companyId) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch company');
    return data.data.company;
  },

  /**
   * Create new company
   */
  async createCompany(token, companyData) {
    const res = await fetch(`${API_URL}/api/companies`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(companyData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to create company');
    return data.data.company;
  },

  /**
   * Update company details
   */
  async updateCompany(token, companyId, updateData) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(updateData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update company');
    return data.data.company;
  },

  /**
   * Toggle company status (active/inactive)
   */
  async updateCompanyStatus(token, companyId, status) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update company status');
    return data.data.company;
  },

  /**
   * Get company workspace summary (metrics, orders, user count)
   */
  async getCompanySummary(token, companyId) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/summary`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch company summary');
    return data.data;
  },

  /**
   * List users in a specific company
   */
  async getCompanyUsers(token, companyId) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/users`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch users');
    return data.data.users;
  },

  /**
   * Invite user to company
   */
  async inviteUser(token, companyId, userData) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/users/invite`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to invite user');
    return data.data;
  },

  /**
   * Toggle company user status
   */
  async updateUserStatus(token, companyId, userId, status) {
    const res = await fetch(`${API_URL}/api/companies/${companyId}/users/${userId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update user status');
    return data.data.user;
  },

  /**
   * Public: Accept invitation token and set password
   */
  async acceptInvitation(invitationData) {
    const res = await fetch(`${API_URL}/api/invitations/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invitationData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to activate account');
    return data;
  },
};

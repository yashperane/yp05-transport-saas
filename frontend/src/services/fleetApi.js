const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getAuthHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const fleetApi = {
  /**
   * Fleet dashboard summary metrics
   */
  async getFleetSummary(token) {
    const res = await fetch(`${API_URL}/api/fleet/dashboard-summary`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch fleet summary');
    return data.data.summary;
  },

  // --- DRIVER APIS ---
  async getDrivers(token, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, v);
    });

    const res = await fetch(`${API_URL}/api/fleet/drivers?${query.toString()}`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch drivers');
    return data.data.drivers;
  },

  async getDriverById(token, driverId) {
    const res = await fetch(`${API_URL}/api/fleet/drivers/${driverId}`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch driver details');
    return data.data.driver;
  },

  async createDriver(token, driverData) {
    const res = await fetch(`${API_URL}/api/fleet/drivers`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(driverData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to create driver');
    return data.data.driver;
  },

  async updateDriver(token, driverId, updateData) {
    const res = await fetch(`${API_URL}/api/fleet/drivers/${driverId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(updateData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update driver');
    return data.data.driver;
  },

  async updateDriverStatus(token, driverId, statusData) {
    const res = await fetch(`${API_URL}/api/fleet/drivers/${driverId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(statusData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update driver status');
    return data.data.driver;
  },

  // --- VEHICLE APIS ---
  async getVehicles(token, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, v);
    });

    const res = await fetch(`${API_URL}/api/fleet/vehicles?${query.toString()}`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch vehicles');
    return data.data.vehicles;
  },

  async getVehicleById(token, vehicleId) {
    const res = await fetch(`${API_URL}/api/fleet/vehicles/${vehicleId}`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch vehicle details');
    return data.data.vehicle;
  },

  async createVehicle(token, vehicleData) {
    const res = await fetch(`${API_URL}/api/fleet/vehicles`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(vehicleData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to add vehicle');
    return data.data.vehicle;
  },

  async updateVehicle(token, vehicleId, updateData) {
    const res = await fetch(`${API_URL}/api/fleet/vehicles/${vehicleId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(updateData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update vehicle');
    return data.data.vehicle;
  },

  async updateVehicleStatus(token, vehicleId, status) {
    const res = await fetch(`${API_URL}/api/fleet/vehicles/${vehicleId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update vehicle status');
    return data.data.vehicle;
  },

  // --- VEHICLE ASSIGNMENT APIS ---
  async assignVehicle(token, assignmentData) {
    const res = await fetch(`${API_URL}/api/fleet/vehicle-assignments`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      credentials: 'include',
      body: JSON.stringify(assignmentData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to assign vehicle');
    return data.data;
  },

  async unassignVehicle(token, assignmentId) {
    const res = await fetch(`${API_URL}/api/fleet/vehicle-assignments/${assignmentId}/unassign`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to unassign vehicle');
    return data.data;
  },

  async getAssignmentHistory(token, params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') query.append(k, v);
    });

    const res = await fetch(`${API_URL}/api/fleet/vehicle-assignments?${query.toString()}`, {
      headers: getAuthHeaders(token),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch assignment history');
    return data.data.assignments;
  },
};

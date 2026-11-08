import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fleetApi } from '../services/fleetApi.js';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Wrench,
  Fuel,
  Weight,
  Calendar,
  User,
  ShieldCheck,
  Edit2
} from 'lucide-react';

export default function VehicleManager({ onVehicleUpdated }) {
  const { token, user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Form View: 'list' | 'add' | 'edit'
  const [view, setView] = useState('list');
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  const [formData, setFormData] = useState({
    registrationNumber: '',
    vehicleNumber: '',
    vehicleType: 'tempo',
    manufacturer: '',
    model: '',
    capacity: 1000,
    capacityUnit: 'kg',
    fuelType: 'diesel',
    registrationExpiryDate: '',
    insuranceExpiryDate: '',
    notes: '',
  });

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter, typeFilter]);

  const fetchVehicles = async () => {
    setLoading(true);
    setActionError('');
    try {
      const data = await fleetApi.getVehicles(token, {
        search,
        status: statusFilter,
        vehicleType: typeFilter,
      });
      setVehicles(data || []);
    } catch (err) {
      setActionError(err.message || 'Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchVehicles();
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    try {
      if (view === 'add') {
        const created = await fleetApi.createVehicle(token, formData);
        setActionSuccess(`Vehicle ${created.registrationNumber} added to fleet!`);
      } else {
        await fleetApi.updateVehicle(token, selectedVehicleId, formData);
        setActionSuccess('Vehicle updated successfully.');
      }
      setView('list');
      resetForm();
      fetchVehicles();
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleStatusChange = async (vehicleId, newStatus) => {
    try {
      await fleetApi.updateVehicleStatus(token, vehicleId, newStatus);
      setActionSuccess(`Vehicle status changed to '${newStatus}'.`);
      fetchVehicles();
      if (onVehicleUpdated) onVehicleUpdated();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const openEdit = (v) => {
    setSelectedVehicleId(v._id);
    setFormData({
      registrationNumber: v.registrationNumber || '',
      vehicleNumber: v.vehicleNumber || '',
      vehicleType: v.vehicleType || 'tempo',
      manufacturer: v.manufacturer || '',
      model: v.model || '',
      capacity: v.capacity || 1000,
      capacityUnit: v.capacityUnit || 'kg',
      fuelType: v.fuelType || 'diesel',
      registrationExpiryDate: v.registrationExpiryDate ? v.registrationExpiryDate.split('T')[0] : '',
      insuranceExpiryDate: v.insuranceExpiryDate ? v.insuranceExpiryDate.split('T')[0] : '',
      notes: v.notes || '',
    });
    setView('edit');
  };

  const resetForm = () => {
    setFormData({
      registrationNumber: '',
      vehicleNumber: '',
      vehicleType: 'tempo',
      manufacturer: '',
      model: '',
      capacity: 1000,
      capacityUnit: 'kg',
      fuelType: 'diesel',
      registrationExpiryDate: '',
      insuranceExpiryDate: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-5">
      {/* Notifications */}
      {actionError && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* VIEW: ADD / EDIT VEHICLE */}
      {(view === 'add' || view === 'edit') && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-sky-400" />
              {view === 'add' ? 'Add New Vehicle to Fleet' : 'Edit Vehicle Details'}
            </h3>
            <button
              onClick={() => {
                resetForm();
                setView('list');
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSaveVehicle} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">Registration Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH-12-PQ-9090"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Vehicle Identifier / Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Tempo-1 (Sherkar Self)"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Vehicle Type *</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="tempo">Tempo / Pickup</option>
                  <option value="pickup">Standard Pickup (1-Ton)</option>
                  <option value="mini_truck">Mini Truck</option>
                  <option value="truck">Heavy Truck</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Fuel Type</label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="diesel">Diesel</option>
                  <option value="cng">CNG</option>
                  <option value="petrol">Petrol</option>
                  <option value="electric">Electric</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Manufacturer</label>
                <input
                  type="text"
                  placeholder="e.g. Tata Motors / Mahindra"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Model</label>
                <input
                  type="text"
                  placeholder="e.g. Yodha 1700 / Bolero Maxi"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Payload Capacity (kg)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Insurance Expiry</label>
                <input
                  type="date"
                  value={formData.insuranceExpiryDate}
                  onChange={(e) => setFormData({ ...formData, insuranceExpiryDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Notes / Service History</label>
                <textarea
                  rows="2"
                  placeholder="Any operational conditions or tyre replacement notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow"
              >
                {view === 'add' ? 'Save Vehicle' : 'Update Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: VEHICLES LIST */}
      {view === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-sky-400" />
                Fleet Vehicles ({vehicles.length})
              </h3>
              <p className="text-xs text-slate-400">
                Operating fleet registry, maintenance tracking, and assigned drivers.
              </p>
            </div>

            {isOwner && (
              <button
                onClick={() => {
                  resetForm();
                  setView('add');
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Vehicle</span>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl flex flex-col sm:flex-row gap-2.5 text-xs">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by registration number, identifier, or model..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Search
              </button>
            </form>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Fleet</option>
              <option value="in_maintenance">In Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="">All Vehicle Types</option>
              <option value="tempo">Tempo</option>
              <option value="pickup">Pickup</option>
              <option value="mini_truck">Mini Truck</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading fleet vehicles...</div>
            ) : vehicles.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Truck className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No vehicles found</div>
                <p className="text-xs text-slate-500">Register pickup and tempo vehicles to manage assignments.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/80 bg-slate-900/60 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Registration & Nickname</th>
                      <th className="py-3 px-4 font-semibold">Type & Make</th>
                      <th className="py-3 px-4 font-semibold">Capacity</th>
                      <th className="py-3 px-4 font-semibold">Current Driver</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      {isOwner && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {vehicles.map((v) => (
                      <tr key={v._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-white text-xs">{v.registrationNumber}</div>
                          <div className="text-[11px] text-sky-400">{v.vehicleNumber || 'No nickname'}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200 capitalize">{v.vehicleType}</div>
                          <div className="text-[11px] text-slate-500">
                            {v.manufacturer} {v.model}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-200 font-semibold">{v.capacity} {v.capacityUnit}</div>
                          <div className="text-[10px] text-slate-500 uppercase">{v.fuelType}</div>
                        </td>

                        <td className="py-3 px-4">
                          {v.currentDriverId ? (
                            <div>
                              <span className="font-semibold text-emerald-400 block">{v.currentDriverId.fullName}</span>
                              <span className="text-[10px] text-slate-500">{v.currentDriverId.phoneNumber}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              v.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : v.status === 'in_maintenance'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {v.status === 'in_maintenance' ? 'Maintenance' : v.status}
                          </span>
                        </td>

                        {isOwner && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEdit(v)}
                                title="Edit Vehicle"
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {v.status === 'active' ? (
                                <button
                                  onClick={() => handleStatusChange(v._id, 'in_maintenance')}
                                  title="Send to Maintenance"
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(v._id, 'active')}
                                  title="Mark Active"
                                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

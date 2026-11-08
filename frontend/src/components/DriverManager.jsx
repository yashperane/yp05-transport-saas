import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fleetApi } from '../services/fleetApi.js';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Phone,
  Truck,
  IdCard,
  Edit2,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function DriverManager({ onDriverUpdated }) {
  const { token, user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // View: 'list' | 'add' | 'edit' | 'assign'
  const [view, setView] = useState('list');
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // Assignment Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [targetDriver, setTargetDriver] = useState(null);
  const [selectedVehicleForAssign, setSelectedVehicleForAssign] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    alternatePhoneNumber: '',
    address: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    licenseNumber: '',
    licenseType: 'LMV',
    licenseExpiryDate: '',
    notes: '',
  });

  useEffect(() => {
    fetchDrivers();
    if (isOwner) {
      loadVehicles();
    }
  }, [employmentFilter, availabilityFilter]);

  const loadVehicles = async () => {
    try {
      const data = await fleetApi.getVehicles(token, { status: 'active' });
      setVehicles(data || []);
    } catch (err) {
      console.warn('Failed to load vehicles for assignment:', err.message);
    }
  };

  const fetchDrivers = async () => {
    setLoading(true);
    setActionError('');
    try {
      const data = await fleetApi.getDrivers(token, {
        search,
        employmentStatus: employmentFilter,
        availabilityStatus: availabilityFilter,
      });
      setDrivers(data || []);
    } catch (err) {
      setActionError(err.message || 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchDrivers();
  };

  const handleSaveDriver = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    try {
      if (view === 'add') {
        const created = await fleetApi.createDriver(token, formData);
        setActionSuccess(`Driver ${created.fullName} added successfully.`);
      } else {
        await fleetApi.updateDriver(token, selectedDriverId, formData);
        setActionSuccess('Driver details updated.');
      }
      setView('list');
      resetForm();
      fetchDrivers();
      if (onDriverUpdated) onDriverUpdated();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleAvailabilityToggle = async (driverId, nextAvailability) => {
    try {
      await fleetApi.updateDriverStatus(token, driverId, { availabilityStatus: nextAvailability });
      setActionSuccess(`Driver availability updated to '${nextAvailability}'.`);
      fetchDrivers();
      if (onDriverUpdated) onDriverUpdated();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleEmploymentToggle = async (driverId, nextEmployment) => {
    try {
      await fleetApi.updateDriverStatus(token, driverId, { employmentStatus: nextEmployment });
      setActionSuccess(`Driver employment status changed to '${nextEmployment}'.`);
      fetchDrivers();
      if (onDriverUpdated) onDriverUpdated();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const openAssignModal = (driver) => {
    setTargetDriver(driver);
    setSelectedVehicleForAssign(driver.currentVehicleId?._id || '');
    setAssignModalOpen(true);
  };

  const handleConfirmAssignment = async (e) => {
    e.preventDefault();
    if (!selectedVehicleForAssign) {
      setActionError('Please select a vehicle to assign.');
      return;
    }
    setActionError('');
    setActionSuccess('');
    try {
      await fleetApi.assignVehicle(token, {
        driverId: targetDriver._id,
        vehicleId: selectedVehicleForAssign,
        notes: `Assigned via dashboard`,
      });
      setAssignModalOpen(false);
      setActionSuccess(`Vehicle successfully assigned to ${targetDriver.fullName}!`);
      fetchDrivers();
      loadVehicles();
      if (onDriverUpdated) onDriverUpdated();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const openEdit = (d) => {
    setSelectedDriverId(d._id);
    setFormData({
      fullName: d.fullName || '',
      email: d.userId?.email || '',
      phoneNumber: d.phoneNumber || '',
      alternatePhoneNumber: d.alternatePhoneNumber || '',
      address: d.address || '',
      emergencyContactName: d.emergencyContactName || '',
      emergencyContactNumber: d.emergencyContactNumber || '',
      licenseNumber: d.licenseNumber || '',
      licenseType: d.licenseType || 'LMV',
      licenseExpiryDate: d.licenseExpiryDate ? d.licenseExpiryDate.split('T')[0] : '',
      notes: d.notes || '',
    });
    setView('edit');
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      alternatePhoneNumber: '',
      address: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      licenseNumber: '',
      licenseType: 'LMV',
      licenseExpiryDate: '',
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

      {/* VIEW: ADD / EDIT DRIVER */}
      {(view === 'add' || view === 'edit') && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              {view === 'add' ? 'Register New Driver' : 'Edit Driver Profile'}
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

          <form onSubmit={handleSaveDriver} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Shinde"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9822001122"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {view === 'add' && (
                <div>
                  <label className="block text-slate-300 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="driver@transport.local"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 mb-1">Alternate Phone</label>
                <input
                  type="text"
                  placeholder="Family or second number"
                  value={formData.alternatePhoneNumber}
                  onChange={(e) => setFormData({ ...formData, alternatePhoneNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Driving License Number</label>
                <input
                  type="text"
                  placeholder="e.g. MH-12-2018-004455"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">License Type</label>
                <select
                  value={formData.licenseType}
                  onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="LMV">LMV (Light Motor Vehicle)</option>
                  <option value="Commercial">Commercial (Transport)</option>
                  <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">License Expiry Date</label>
                <input
                  type="date"
                  value={formData.licenseExpiryDate}
                  onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Emergency Contact Person</label>
                <input
                  type="text"
                  placeholder="Relation / Name"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Driver Address</label>
                <input
                  type="text"
                  placeholder="Residential address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Operational Notes</label>
                <textarea
                  rows="2"
                  placeholder="Experience on Pune-Mumbai expressway, night driving, etc."
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
                {view === 'add' ? 'Save Driver' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: DRIVERS LIST */}
      {view === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                Fleet Drivers ({drivers.length})
              </h3>
              <p className="text-xs text-slate-400">
                Driver rosters, license validity, and vehicle allocation.
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
                <span>Add Driver</span>
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
                  placeholder="Search by driver name, phone, or license #..."
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
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="">All Employment</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="">All Availability</option>
              <option value="available">Available</option>
              <option value="busy">Busy (On Trip)</option>
              <option value="off_duty">Off Duty</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading drivers...</div>
            ) : drivers.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No drivers registered</div>
                <p className="text-xs text-slate-500">Add drivers to assign fleet vehicles and dispatches.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/80 bg-slate-900/60 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Driver Name</th>
                      <th className="py-3 px-4 font-semibold">Phone & License</th>
                      <th className="py-3 px-4 font-semibold">Assigned Vehicle</th>
                      <th className="py-3 px-4 font-semibold">Availability</th>
                      <th className="py-3 px-4 font-semibold">Employment</th>
                      {isOwner && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {drivers.map((d) => (
                      <tr key={d._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{d.fullName}</div>
                          <div className="text-[10px] text-slate-500">{d.userId?.email || 'No email login'}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-slate-200">{d.phoneNumber}</div>
                          <div className="font-mono text-[10px] text-sky-400">
                            {d.licenseNumber ? `${d.licenseNumber} (${d.licenseType})` : 'No license recorded'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {d.currentVehicleId ? (
                            <div>
                              <span className="font-mono font-bold text-white block">
                                {d.currentVehicleId.registrationNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 capitalize">
                                {d.currentVehicleId.vehicleNumber || d.currentVehicleId.vehicleType}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">No vehicle</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              d.availabilityStatus === 'available'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : d.availabilityStatus === 'busy'
                                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                            }`}
                          >
                            {d.availabilityStatus?.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              d.employmentStatus === 'active'
                                ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {d.employmentStatus}
                          </span>
                        </td>

                        {isOwner && (
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Assign Vehicle Button */}
                              <button
                                onClick={() => openAssignModal(d)}
                                title="Assign Vehicle"
                                className="px-2 py-1 bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-400 rounded text-[10px] font-semibold"
                              >
                                {d.currentVehicleId ? 'Change Vehicle' : 'Assign'}
                              </button>

                              <button
                                onClick={() => openEdit(d)}
                                title="Edit Driver"
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle active / inactive */}
                              {d.employmentStatus === 'active' ? (
                                <button
                                  onClick={() => handleEmploymentToggle(d._id, 'inactive')}
                                  title="Deactivate Driver"
                                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleEmploymentToggle(d._id, 'active')}
                                  title="Activate Driver"
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

      {/* MODAL: ASSIGN VEHICLE TO DRIVER */}
      {assignModalOpen && targetDriver && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmAssignment}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                Assign Vehicle to Driver
              </h3>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-500 block text-[10px]">Selected Driver</span>
              <div className="font-semibold text-white">{targetDriver.fullName}</div>
              <div className="text-[11px] text-slate-400">{targetDriver.phoneNumber}</div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Choose Active Vehicle from Fleet *
              </label>
              <select
                required
                value={selectedVehicleForAssign}
                onChange={(e) => setSelectedVehicleForAssign(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="">-- Select Active Vehicle --</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.registrationNumber} ({v.vehicleNumber || v.vehicleType})
                    {v.currentDriverId ? ` — currently assigned to ${v.currentDriverId.fullName}` : ' — Unassigned'}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-amber-400/90 leading-relaxed bg-amber-950/20 p-2.5 rounded-lg border border-amber-900/30">
              Note: Assigning will automatically close any prior vehicle assignment for this driver and update the vehicle's primary driver link.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="px-3 py-1.5 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow"
              >
                Confirm Assignment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

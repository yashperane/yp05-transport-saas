import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { orderApi } from '../services/orderApi.js';
import { dispatchApi } from '../services/dispatchApi.js';
import {
  Truck,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  ChevronRight,
  Users,
  ArrowRightLeft,
  Eye,
  Play,
  Loader2,
} from 'lucide-react';

// ─── Status badge ───────────────────────────────────────────
const statusConfig = {
  pending:     { label: 'Pending',     color: 'bg-slate-500/20 text-slate-300 border-slate-600/50' },
  available:   { label: 'Available',   color: 'bg-blue-500/20 text-blue-300 border-blue-600/50' },
  assigned:    { label: 'Assigned',    color: 'bg-amber-500/20 text-amber-300 border-amber-600/50' },
  accepted:    { label: 'Accepted',    color: 'bg-teal-500/20 text-teal-300 border-teal-600/50' },
  in_progress: { label: 'In Progress', color: 'bg-sky-500/20 text-sky-300 border-sky-600/50' },
  completed:   { label: 'Completed',   color: 'bg-emerald-500/20 text-emerald-300 border-emerald-600/50' },
  cancelled:   { label: 'Cancelled',   color: 'bg-red-500/20 text-red-300 border-red-600/50' },
  failed:      { label: 'Failed',      color: 'bg-rose-500/20 text-rose-300 border-rose-600/50' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { label: status, color: 'bg-slate-700 text-slate-400' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

// ─── Dispatch Modal ─────────────────────────────────────────
const DispatchModal = ({ order, onClose, onSuccess, token }) => {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [error, setError] = useState('');
  const isReassign = ['assigned', 'accepted'].includes(order.status);

  useEffect(() => {
    const fetchEligible = async () => {
      try {
        const [driverList, vehicleList] = await Promise.all([
          dispatchApi.getEligibleDrivers(token, order._id),
          dispatchApi.getEligibleVehicles(token, order._id),
        ]);
        setDrivers(driverList);
        setVehicles(vehicleList);
      } catch (e) {
        setError(e.message);
      } finally {
        setFetchingData(false);
      }
    };
    fetchEligible();
  }, [order._id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriver) { setError('Please select a driver.'); return; }
    if (isReassign && !reason.trim()) { setError('Reassignment reason is required.'); return; }
    setLoading(true);
    setError('');
    try {
      if (isReassign) {
        await dispatchApi.reassignOrder(token, order._id, {
          driverId: selectedDriver,
          vehicleId: selectedVehicle || undefined,
          reason,
        });
      } else {
        await dispatchApi.dispatchOrder(token, order._id, {
          driverId: selectedDriver,
          vehicleId: selectedVehicle || undefined,
        });
      }
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-5">
        <div>
          <h3 className="text-sm font-bold text-white">
            {isReassign ? '🔄 Reassign Order' : '🚀 Dispatch Order'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Order {order.orderNumber} · {order.pickupLocation?.address} → {order.destinationLocation?.address}
          </p>
        </div>

        {error && (
          <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/40 px-3 py-2 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        {fetchingData ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading eligible drivers and vehicles...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Select Driver ({drivers.length} eligible)
              </label>
              {drivers.length === 0 ? (
                <p className="text-xs text-amber-400 bg-amber-950/30 px-3 py-2 rounded-lg border border-amber-800/40">
                  No eligible drivers available. Drivers must be active and available.
                </p>
              ) : (
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">— Select a driver —</option>
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.fullName} · {d.phoneNumber} · {d.availabilityStatus}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Select Vehicle (optional) ({vehicles.length} eligible)
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">— No specific vehicle —</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.registrationNumber} · {v.vehicleType} · {v.vehicleNumber || ''}
                    {v.currentDriverId ? ` [Assigned to: ${v.currentDriverId.fullName}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {isReassign && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Reassignment Reason *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Driver requested change, vehicle breakdown..."
                  className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || drivers.length === 0}
                className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {isReassign ? 'Reassign' : 'Assign Driver'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Assignment History Modal ────────────────────────────────
const AssignmentHistoryModal = ({ order, onClose, token }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dispatchApi.getOrderAssignments(token, order._id)
      .then(setAssignments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [order._id, token]);

  const sourceLabel = {
    owner_manual: 'Owner Assigned',
    dispatcher_manual: 'Dispatcher Assigned',
    driver_self_claim: 'Driver Self-Claim',
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Assignment History</h3>
            <p className="text-xs text-slate-400">Order {order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading history...
          </div>
        ) : assignments.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No assignment records found.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {assignments.map((a, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    {a.driverId?.fullName || 'Unknown Driver'}
                  </span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border font-semibold ${
                    a.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-600/40' :
                    a.status === 'completed' ? 'bg-blue-500/20 text-blue-300 border-blue-600/40' :
                    a.status === 'rejected' ? 'bg-red-500/20 text-red-300 border-red-600/40' :
                    'bg-slate-500/20 text-slate-300 border-slate-600/40'
                  }`}>
                    {a.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Source: {sourceLabel[a.assignmentSource] || a.assignmentSource}
                </div>
                {a.vehicleId && (
                  <div className="text-[11px] text-slate-400">
                    Vehicle: {a.vehicleId.registrationNumber} ({a.vehicleId.vehicleType})
                  </div>
                )}
                <div className="text-[11px] text-slate-500">
                  {new Date(a.assignedAt).toLocaleString()}
                  {a.releasedAt && ` → Released: ${new Date(a.releasedAt).toLocaleString()}`}
                </div>
                {a.reassignmentReason && (
                  <div className="text-[11px] text-amber-400 italic">
                    Reason: {a.reassignmentReason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Dispatch Center ────────────────────────────────────
export default function DispatchCenter() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [dispatchingOrder, setDispatchingOrder] = useState(null);
  const [historyOrder, setHistoryOrder] = useState(null);
  const [makingAvailable, setMakingAvailable] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderApi.getOrders(token, {
        status: statusFilter || undefined,
        search: search || undefined,
        limit: 50,
      });
      setOrders(data.orders || []);
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleMakeAvailable = async (orderId) => {
    setMakingAvailable(orderId);
    try {
      await dispatchApi.makeOrderAvailable(token, orderId);
      showToast('success', 'Order published for driver self-claim.');
      fetchOrders();
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setMakingAvailable('');
    }
  };

  const dispatchableStatuses = ['pending', 'available'];
  const reassignableStatuses = ['assigned', 'accepted'];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold shadow-xl ${
          toast.type === 'success'
            ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
            : 'bg-red-950 border-red-700 text-red-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-400" />
            Dispatch Center
          </h2>
          <p className="text-xs text-slate-400">Manage order dispatch, driver assignment and self-claim</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            placeholder="Search orders..."
            className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg pl-8 pr-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Statuses</option>
          {Object.entries(statusConfig).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="px-4 py-3 text-left font-semibold">Order #</th>
                  <th className="px-4 py-3 text-left font-semibold">Route</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Driver</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-800/60 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sky-400 font-semibold">{order.orderNumber}</span>
                      <div className="text-slate-500 mt-0.5">{order.orderType}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <div className="text-slate-200 truncate">{order.pickupLocation?.address}</div>
                      <div className="text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        <ChevronRight className="w-3 h-3 shrink-0" />
                        {order.destinationLocation?.address}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      {order.assignedDriverId ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {order.assignedDriverId.fullName || 'Assigned'}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(order.requiredDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Dispatch (manual assign) */}
                        {dispatchableStatuses.includes(order.status) && (
                          <button
                            onClick={() => setDispatchingOrder(order)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-700/40 hover:bg-sky-600/40 transition text-[11px] font-semibold"
                          >
                            <Users className="w-3 h-3" /> Assign
                          </button>
                        )}

                        {/* Make available */}
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleMakeAvailable(order._id)}
                            disabled={makingAvailable === order._id}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-700/40 hover:bg-blue-600/40 transition text-[11px] font-semibold disabled:opacity-50"
                          >
                            {makingAvailable === order._id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Play className="w-3 h-3" />}
                            Publish
                          </button>
                        )}

                        {/* Reassign */}
                        {reassignableStatuses.includes(order.status) && (
                          <button
                            onClick={() => setDispatchingOrder(order)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-700/40 hover:bg-amber-600/40 transition text-[11px] font-semibold"
                          >
                            <ArrowRightLeft className="w-3 h-3" /> Reassign
                          </button>
                        )}

                        {/* Assignment History */}
                        {order.assignedDriverId && (
                          <button
                            onClick={() => setHistoryOrder(order)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600 transition text-[11px]"
                          >
                            <Eye className="w-3 h-3" /> History
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispatch / Reassign Modal */}
      {dispatchingOrder && (
        <DispatchModal
          order={dispatchingOrder}
          token={token}
          onClose={() => setDispatchingOrder(null)}
          onSuccess={() => {
            setDispatchingOrder(null);
            showToast('success', 'Order dispatched successfully!');
            fetchOrders();
          }}
        />
      )}

      {/* Assignment History Modal */}
      {historyOrder && (
        <AssignmentHistoryModal
          order={historyOrder}
          token={token}
          onClose={() => setHistoryOrder(null)}
        />
      )}
    </div>
  );
}

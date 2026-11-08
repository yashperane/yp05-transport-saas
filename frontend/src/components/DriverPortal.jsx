import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { dispatchApi } from '../services/dispatchApi.js';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  Flag,
  AlertCircle,
  RefreshCw,
  Loader2,
  MapPin,
  Calendar,
  Package,
  Truck,
  User,
} from 'lucide-react';

// ─── Status config ───────────────────────────────────────────
const statusConfig = {
  assigned:    { label: 'Assigned to You', color: 'bg-amber-500/20 text-amber-300 border-amber-600/50' },
  accepted:    { label: 'Accepted',        color: 'bg-teal-500/20 text-teal-300 border-teal-600/50' },
  in_progress: { label: 'In Progress',     color: 'bg-sky-500/20 text-sky-300 border-sky-600/50' },
  completed:   { label: 'Completed',       color: 'bg-emerald-500/20 text-emerald-300 border-emerald-600/50' },
  available:   { label: 'Available',       color: 'bg-blue-500/20 text-blue-300 border-blue-600/50' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || { label: status, color: 'bg-slate-700 text-slate-400' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

// ─── Reject Modal ────────────────────────────────────────────
const RejectModal = ({ order, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) { setError('Please provide a reason for rejection.'); return; }
    setLoading(true);
    try {
      await onConfirm(reason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-sm font-bold text-white">Reject Order</h3>
        <p className="text-xs text-slate-400">Order {order.orderNumber} · Please provide a reason.</p>
        {error && (
          <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/40 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Vehicle not suitable, unavailable due to emergency..."
            className="w-full bg-slate-800 border border-slate-600 text-slate-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirm Reject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Order Card ──────────────────────────────────────────────
const OrderCard = ({ order, onAction, actionLoading, onReject, isAvailable }) => {
  const canAccept = order.status === 'assigned';
  const canStart = ['assigned', 'accepted'].includes(order.status);
  const canComplete = order.status === 'in_progress';
  const canReject = ['assigned', 'accepted'].includes(order.status);
  const canClaim = isAvailable && order.status === 'available';

  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-sky-400 font-bold text-sm">{order.orderNumber}</span>
          <div className="text-[11px] text-slate-400 mt-0.5 capitalize">
            {order.orderType} transport · {order.requiredVehicleType}
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Route */}
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] text-slate-500">Pickup</div>
            <div className="text-xs text-slate-200">{order.pickupLocation?.address}</div>
            {order.pickupLocation?.contactPerson && (
              <div className="text-[11px] text-slate-400">{order.pickupLocation.contactPerson} · {order.pickupLocation.contactPhone}</div>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] text-slate-500">Destination</div>
            <div className="text-xs text-slate-200">{order.destinationLocation?.address}</div>
            {order.destinationLocation?.contactPerson && (
              <div className="text-[11px] text-slate-400">{order.destinationLocation.contactPerson} · {order.destinationLocation.contactPhone}</div>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Calendar className="w-3 h-3" />
          {new Date(order.requiredDate).toLocaleDateString()}
          {order.requiredTime && ` at ${order.requiredTime}`}
        </div>
        {order.materialDescription && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Package className="w-3 h-3" />
            {order.materialDescription.substring(0, 30)}{order.materialDescription.length > 30 ? '...' : ''}
          </div>
        )}
        {order.companyId?.companyName && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <User className="w-3 h-3" />
            {order.companyId.companyName}
          </div>
        )}
        {order.assignedVehicleId && (
          <div className="flex items-center gap-1.5 text-slate-400">
            <Truck className="w-3 h-3" />
            {order.assignedVehicleId.registrationNumber}
          </div>
        )}
      </div>

      {order.specialInstructions && (
        <div className="bg-amber-950/30 border border-amber-800/40 text-amber-300 text-[11px] px-3 py-2 rounded-lg">
          📋 {order.specialInstructions}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-700">
        {canClaim && (
          <button
            onClick={() => onAction('claim', order._id)}
            disabled={actionLoading === order._id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            {actionLoading === order._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Accept Order
          </button>
        )}
        {canAccept && (
          <button
            onClick={() => onAction('accept', order._id)}
            disabled={actionLoading === order._id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            {actionLoading === order._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Accept
          </button>
        )}
        {canStart && (
          <button
            onClick={() => onAction('start', order._id)}
            disabled={actionLoading === order._id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            {actionLoading === order._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Start Job
          </button>
        )}
        {canComplete && (
          <button
            onClick={() => onAction('complete', order._id)}
            disabled={actionLoading === order._id}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            {actionLoading === order._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
            Mark Complete
          </button>
        )}
        {canReject && (
          <button
            onClick={() => onReject(order)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/40 text-red-400 border border-red-800/40 hover:bg-red-900/70 text-xs font-semibold transition"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main Driver Portal ──────────────────────────────────────
export default function DriverPortal() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('assigned');
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast] = useState(null);
  const [rejectingOrder, setRejectingOrder] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [assigned, available] = await Promise.all([
        dispatchApi.getMyAssignedOrders(token),
        dispatchApi.getMyAvailableOrders(token).catch(() => ({ orders: [], canClaim: false })),
      ]);
      setAssignedOrders(assigned.orders || []);
      setAvailableOrders(available.orders || []);
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleAction = async (action, orderId) => {
    setActionLoading(orderId);
    try {
      switch (action) {
        case 'claim':    await dispatchApi.claimOrder(token, orderId);    break;
        case 'accept':   await dispatchApi.acceptOrder(token, orderId);   break;
        case 'start':    await dispatchApi.startOrder(token, orderId);    break;
        case 'complete': await dispatchApi.completeOrder(token, orderId); break;
      }
      showToast('success', `Order ${action}ed successfully.`);
      fetchOrders();
    } catch (e) {
      if (e.status === 409) {
        showToast('error', '⚡ This order was just claimed by another driver!');
      } else {
        showToast('error', e.message);
      }
    } finally {
      setActionLoading('');
    }
  };

  const handleRejectConfirm = async (reason) => {
    if (!rejectingOrder) return;
    try {
      await dispatchApi.rejectOrder(token, rejectingOrder._id, reason);
      showToast('success', 'Order rejected and returned to pending.');
      setRejectingOrder(null);
      fetchOrders();
    } catch (e) {
      showToast('error', e.message);
    }
  };

  const displayOrders = activeTab === 'assigned' ? assignedOrders : availableOrders;

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
            <ClipboardList className="w-5 h-5 text-emerald-400" />
            My Orders
          </h2>
          <p className="text-xs text-slate-400">View and manage your assigned and available orders</p>
        </div>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'assigned' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          My Orders
          {assignedOrders.length > 0 && (
            <span className="bg-white/20 text-white px-1.5 rounded-full">{assignedOrders.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
            activeTab === 'available' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Available to Claim
          {availableOrders.length > 0 && (
            <span className="bg-white/20 text-white px-1.5 rounded-full">{availableOrders.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading orders...
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">
            {activeTab === 'assigned' ? 'No active orders assigned to you.' : 'No orders available to claim right now.'}
          </p>
          <p className="text-xs mt-1 text-slate-600">
            {activeTab === 'assigned'
              ? 'Your owner or dispatcher will assign orders to you, or switch to Available tab to claim one.'
              : 'Check back later or ask your dispatcher to publish available orders.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onAction={handleAction}
              actionLoading={actionLoading}
              onReject={setRejectingOrder}
              isAvailable={activeTab === 'available'}
            />
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingOrder && (
        <RejectModal
          order={rejectingOrder}
          onClose={() => setRejectingOrder(null)}
          onConfirm={handleRejectConfirm}
        />
      )}
    </div>
  );
}

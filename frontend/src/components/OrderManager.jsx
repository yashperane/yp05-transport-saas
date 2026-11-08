import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { orderApi } from '../services/orderApi.js';
import { companyApi } from '../services/companyApi.js';
import OrderStatusBadge from './OrderStatusBadge.jsx';
import OrderForm from './OrderForm.jsx';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Eye,
  XCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  Truck,
  Building2,
  FileText,
  User,
  History
} from 'lucide-react';

export default function OrderManager() {
  const { user, token } = useAuth();
  const isOwnerOrDispatcher = ['owner', 'dispatcher'].includes(user?.role);
  const isCompanyUser = ['company_admin', 'company_employee'].includes(user?.role);

  // Views: 'list' | 'create' | 'details'
  const [view, setView] = useState('list');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);

  // List & Filter State
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [companies, setCompanies] = useState([]);

  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [targetCancelOrderId, setTargetCancelOrderId] = useState(null);

  useEffect(() => {
    fetchOrders(1);
    fetchSummary();
    if (isOwnerOrDispatcher) {
      loadCompaniesDropdown();
    }
  }, [statusFilter, orderTypeFilter, companyFilter]);

  const loadCompaniesDropdown = async () => {
    try {
      const data = await companyApi.getCompanies(token, { limit: 100 });
      setCompanies(data.companies || []);
    } catch (err) {
      console.warn('Companies dropdown failed:', err.message);
    }
  };

  const fetchSummary = async () => {
    try {
      const metrics = await orderApi.getDashboardSummary(token);
      setSummary(metrics);
    } catch (err) {
      console.warn('Failed to load summary:', err.message);
    }
  };

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    setActionError('');
    try {
      const data = await orderApi.getOrders(token, {
        search,
        status: statusFilter,
        orderType: orderTypeFilter,
        companyId: companyFilter,
        page,
        limit: 10,
      });
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (err) {
      setActionError(err.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders(1);
  };

  const openDetails = async (order) => {
    setSelectedOrderId(order._id);
    setSelectedOrder(order);
    setView('details');
    try {
      const [full, history] = await Promise.all([
        orderApi.getOrderById(token, order._id),
        orderApi.getOrderHistory(token, order._id),
      ]);
      setSelectedOrder(full);
      setOrderHistory(history);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await orderApi.updateOrderStatus(token, orderId, newStatus);
      setActionSuccess(`Order status updated to '${newStatus}'.`);
      fetchOrders(pagination.page);
      fetchSummary();
      if (view === 'details' && selectedOrderId === orderId) {
        openDetails({ _id: orderId });
      }
    } catch (err) {
      setActionError(err.message);
    }
  };

  const initiateCancel = (orderId) => {
    setTargetCancelOrderId(orderId);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const confirmCancel = async (e) => {
    e.preventDefault();
    try {
      await orderApi.cancelOrder(token, targetCancelOrderId, cancelReason);
      setCancelModalOpen(false);
      setActionSuccess('Order cancelled successfully.');
      fetchOrders(pagination.page);
      fetchSummary();
      if (view === 'details' && selectedOrderId === targetCancelOrderId) {
        openDetails({ _id: targetCancelOrderId });
      }
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div className="space-y-6">
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

      {/* VIEW: CREATE ORDER */}
      {view === 'create' && (
        <OrderForm
          onOrderCreated={(newOrder) => {
            setView('list');
            fetchOrders(1);
            fetchSummary();
          }}
          onCancel={() => setView('list')}
        />
      )}

      {/* VIEW: ORDER DETAILS */}
      {view === 'details' && selectedOrder && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Orders List</span>
            </button>

            <div className="flex items-center gap-2">
              {/* Transition to Available if pending */}
              {isOwnerOrDispatcher && selectedOrder.status === 'pending' && (
                <button
                  onClick={() => handleStatusChange(selectedOrder._id, 'available')}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
                >
                  Make Order Available
                </button>
              )}

              {/* Cancel Action */}
              {!['completed', 'cancelled'].includes(selectedOrder.status) && (
                <button
                  onClick={() => initiateCancel(selectedOrder._id)}
                  className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 rounded-lg text-xs font-semibold"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Main Info */}
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-white font-mono">
                      {selectedOrder.orderNumber}
                    </h3>
                    <OrderStatusBadge status={selectedOrder.status} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Booked on {new Date(selectedOrder.createdAt).toLocaleString()} via{' '}
                    <span className="text-slate-300 font-medium">{selectedOrder.creationSource}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block uppercase">Order Type</span>
                  <span className="text-xs font-bold text-sky-400 uppercase">
                    {selectedOrder.orderType?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Customer / Company */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">Customer / Account</span>
                  <span className="font-semibold text-white">
                    {selectedOrder.companyId?.companyName || selectedOrder.customerName || 'Private Individual'}
                  </span>
                </div>
                {selectedOrder.createdByUserId && (
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px]">Submitted By</span>
                    <span className="text-slate-300">
                      {selectedOrder.createdByUserId.name} ({selectedOrder.createdByRole})
                    </span>
                  </div>
                )}
              </div>

              {/* Locations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3.5 h-3.5" /> Pickup
                  </span>
                  <div className="text-slate-200">{selectedOrder.pickupLocation?.address}</div>
                  {selectedOrder.pickupLocation?.contactPerson && (
                    <div className="text-slate-400 text-[11px]">
                      Contact: {selectedOrder.pickupLocation.contactPerson} (
                      {selectedOrder.pickupLocation.contactPhone})
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1">
                  <span className="text-sky-400 font-semibold flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3.5 h-3.5" /> Destination
                  </span>
                  <div className="text-slate-200">{selectedOrder.destinationLocation?.address}</div>
                  {selectedOrder.destinationLocation?.contactPerson && (
                    <div className="text-slate-400 text-[11px]">
                      Contact: {selectedOrder.destinationLocation.contactPerson} (
                      {selectedOrder.destinationLocation.contactPhone})
                    </div>
                  )}
                </div>
              </div>

              {/* Work Cargo Details */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                <span className="text-amber-400 font-semibold block text-[11px]">Cargo & Schedule</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Required Date</span>
                    <span className="text-slate-200">
                      {new Date(selectedOrder.requiredDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Required Time</span>
                    <span className="text-slate-200">{selectedOrder.requiredTime || 'Flexible'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Quantity</span>
                    <span className="text-slate-200">
                      {selectedOrder.quantity} {selectedOrder.quantityUnit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Labour Count</span>
                    <span className="text-slate-200">{selectedOrder.labourCount} Workers</span>
                  </div>
                </div>

                {selectedOrder.materialDescription && (
                  <div className="pt-2 border-t border-slate-900 text-slate-300">
                    <span className="text-slate-500 text-[10px] block">Materials:</span>
                    {selectedOrder.materialDescription}
                  </div>
                )}
                {selectedOrder.specialInstructions && (
                  <div className="pt-1 text-slate-400 text-[11px]">
                    <span className="text-slate-500 text-[10px] block">Instructions:</span>
                    {selectedOrder.specialInstructions}
                  </div>
                )}
              </div>

              {/* Commercials if available */}
              {selectedOrder.pricingDetails && isOwnerOrDispatcher && (
                <div className="p-3 bg-teal-950/30 border border-teal-800/40 rounded-xl text-xs space-y-1">
                  <span className="text-teal-400 font-semibold text-[11px]">Commercial Agreement</span>
                  <div className="flex justify-between items-center text-slate-200">
                    <span>Agreed Amount: ₹{selectedOrder.pricingDetails.agreedAmount || 0}</span>
                    <span className="text-slate-400 text-[11px]">{selectedOrder.pricingDetails.pricingNotes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Audit History Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-sky-400" />
                Audit Trail & History
              </h4>

              {orderHistory.length === 0 ? (
                <p className="text-xs text-slate-500">No events recorded yet.</p>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-800">
                  {orderHistory.map((h) => (
                    <div key={h._id} className="relative pl-7 text-xs space-y-0.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-sky-500 absolute left-2 top-1.5 -translate-x-1/2"></div>
                      <div className="font-semibold text-slate-200">{h.action?.replace('_', ' ')}</div>
                      <p className="text-[11px] text-slate-400 leading-tight">{h.description}</p>
                      <div className="text-[10px] text-slate-500">
                        {new Date(h.createdAt).toLocaleString()} • {h.performedByUserId?.name || 'System'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ORDER LIST & DASHBOARD */}
      {view === 'list' && (
        <div className="space-y-5">
          {/* Top Bar with Metrics Summary */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-slate-500 block">Total</span>
                <span className="text-lg font-bold text-white">{summary.total}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-amber-400 block">Pending</span>
                <span className="text-lg font-bold text-amber-400">{summary.pending}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-sky-400 block">Available</span>
                <span className="text-lg font-bold text-sky-400">{summary.available}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-indigo-400 block">Assigned</span>
                <span className="text-lg font-bold text-indigo-400">{summary.assigned}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-purple-400 block">In Progress</span>
                <span className="text-lg font-bold text-purple-400">{summary.in_progress}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-emerald-400 block">Completed</span>
                <span className="text-lg font-bold text-emerald-400">{summary.completed}</span>
              </div>
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-rose-400 block">Cancelled</span>
                <span className="text-lg font-bold text-rose-400">{summary.cancelled}</span>
              </div>
            </div>
          )}

          {/* Action Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-sky-400" />
                Transport Orders Management
              </h2>
              <p className="text-xs text-slate-400">
                Centralized dispatch intake, duplicate detection, and order lifecycle tracking.
              </p>
            </div>

            <button
              onClick={() => setView('create')}
              className="flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Order</span>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl flex flex-col md:flex-row gap-2.5 text-xs">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by order #, address, cargo, or customer..."
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

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="available">Available</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300"
              >
                <option value="">All Order Types</option>
                <option value="goods">Goods</option>
                <option value="labour">Labour</option>
                <option value="mixed">Mixed</option>
                <option value="private_customer">Private Customer</option>
              </select>

              {isOwnerOrDispatcher && companies.length > 0 && (
                <select
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300"
                >
                  <option value="">All Companies</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <ClipboardList className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No transport orders found</div>
                <p className="text-xs text-slate-500">Create an order or adjust your search filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/80 bg-slate-900/60 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Order # & Type</th>
                      <th className="py-3 px-4 font-semibold">Customer / Company</th>
                      <th className="py-3 px-4 font-semibold">Pickup & Destination</th>
                      <th className="py-3 px-4 font-semibold">Schedule Date</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {orders.map((o) => (
                      <tr key={o._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-white flex items-center gap-1.5">
                            {o.orderNumber}
                            {o.duplicateReviewStatus?.isFlagged && (
                              <span
                                className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 rounded"
                                title="Flagged as potential duplicate"
                              >
                                Dup?
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">{o.orderType} Transport</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">
                            {o.companyId?.companyName || o.customerName || 'Private Customer'}
                          </div>
                          <div className="text-[10px] text-slate-500">By {o.createdByUserId?.name}</div>
                        </td>

                        <td className="py-3 px-4 max-w-xs truncate">
                          <div className="truncate text-slate-300">From: {o.pickupLocation?.address}</div>
                          <div className="truncate text-slate-400 text-[11px]">To: {o.destinationLocation?.address}</div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div>{new Date(o.requiredDate).toLocaleDateString()}</div>
                          <div className="text-[11px] text-slate-500">{o.requiredTime || 'Flexible'}</div>
                        </td>

                        <td className="py-3 px-4">
                          <OrderStatusBadge status={o.status} />
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDetails(o)}
                              title="View Details"
                              className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {isOwnerOrDispatcher && o.status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(o._id, 'available')}
                                title="Make Available"
                                className="px-2 py-1 bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-400 rounded text-[10px] font-semibold"
                              >
                                Release
                              </button>
                            )}

                            {!['completed', 'cancelled'].includes(o.status) && (
                              <button
                                onClick={() => initiateCancel(o._id)}
                                title="Cancel Order"
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                              >
                                <XCircle className="w-3.5 h-3.5" />
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

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  Showing {orders.length} of {pagination.total} orders
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchOrders(pagination.page - 1)}
                    className="p-1.5 rounded border border-slate-700 bg-slate-900 disabled:opacity-40 hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchOrders(pagination.page + 1)}
                    className="p-1.5 rounded border border-slate-700 bg-slate-900 disabled:opacity-40 hover:bg-slate-800"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancellation Reason Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={confirmCancel}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                Confirm Order Cancellation
              </h3>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Please state why this order is being cancelled. This reason will be recorded in the immutable audit log.
            </p>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Cancellation Reason *</label>
              <textarea
                required
                rows="3"
                placeholder="e.g. Client postponed dispatch, incorrect vehicle requested, duplicate job"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-3 py-1.5 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold shadow"
              >
                Confirm Cancellation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

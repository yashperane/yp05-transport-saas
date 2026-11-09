import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { dispatchApi } from '../services/dispatchApi.js';
import { trackingApi } from '../services/trackingApi.js';
import DriverOrderDetailModal from './DriverOrderDetailModal.jsx';
import {
  Card,
  Button,
  Badge,
  EmptyState,
  LoadingSkeleton,
  Toast,
} from './ui/DesignSystem.jsx';
import {
  Truck,
  CheckCircle2,
  Play,
  Check,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Power,
  ChevronRight,
  Eye,
  ShieldCheck,
  AlertCircle,
  Navigation,
  Radio
} from 'lucide-react';

export default function DriverPortal() {
  const { token, user } = useAuth();
  const { useSocketEvent } = useSocket();
  
  // Dashboard state
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'available' | 'completed'
  const [orders, setOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [togglingAvailability, setTogglingAvailability] = useState(false);

  // GPS Telemetry State (Chapter 13/14)
  const [isGpsSharing, setIsGpsSharing] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const watchIdRef = useRef(null);
  
  // Modals & toasts
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [rejectingOrder, setRejectingOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [toast, setToast] = useState({ type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: 'success', message: '' }), 4000);
  };

  // Fetch driver overview summary & orders
  const loadDashboardData = useCallback(async () => {
    try {
      const [sumRes, assignedRes, availRes] = await Promise.all([
        dispatchApi.getDriverSummary(token).catch(() => null),
        dispatchApi.getMyAssignedOrders(token, { limit: 50 }).catch(() => ({ orders: [] })),
        dispatchApi.getMyAvailableOrders(token, { limit: 50 }).catch(() => ({ orders: [] })),
      ]);

      setSummary(sumRes);
      setOrders(assignedRes?.orders || []);
      setAvailableOrders(availRes?.orders || []);
    } catch (err) {
      showToast('error', err.message || 'Failed to load driver dashboard.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Reverse geocoding helper (100% Free OpenStreetMap Nominatim)
  const fetchAddress = async (lat, lon) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      return data.display_name || '';
    } catch {
      return '';
    }
  };

  // GPS Browser Geolocation Watcher
  const startGpsSharing = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      showToast('error', 'Browser does not support GPS.');
      return;
    }

    setGpsError(null);
    setIsGpsSharing(true);

    let lastGeocodeTime = 0;
    let cachedAddress = '';

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        setCurrentCoords({ latitude, longitude, address: cachedAddress });

        // Throttle reverse geocoding to once every 30 seconds to respect free usage
        if (Date.now() - lastGeocodeTime > 30000) {
          lastGeocodeTime = Date.now();
          fetchAddress(latitude, longitude).then((addr) => {
            if (addr) {
              cachedAddress = addr;
              setCurrentCoords((prev) => ({ ...prev, address: addr }));
            }
          });
        }

        try {
          await trackingApi.updateLocation(token, {
            latitude,
            longitude,
            accuracy: accuracy || null,
            heading: heading || null,
            speed: (typeof speed === 'number' && !isNaN(speed)) ? speed : null,
            address: cachedAddress,
            source: 'driver_mobile_browser',
          });
        } catch (err) {
          console.warn('[DriverGPS] Update error:', err.message);
        }
      },
      (err) => {
        setGpsError(err.message);
        setIsGpsSharing(false);
        showToast('error', `GPS Error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const stopGpsSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsGpsSharing(false);
    trackingApi.toggleSharing(token, false).catch(() => null);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Real-time socket events for driver (Chapter 9)
  useSocketEvent('order:assigned', (payload) => {
    showToast('info', `New order #${payload.orderNumber} assigned to you!`);
    loadDashboardData();
  });

  useSocketEvent('order:available', (payload) => {
    loadDashboardData();
  });

  useSocketEvent('order:cancelled', (payload) => {
    showToast('error', `Order #${payload.orderNumber} has been cancelled.`);
    loadDashboardData();
  });

  useSocketEvent('order:reassigned', (payload) => {
    loadDashboardData();
  });

  // Handle Availability Toggle (Available <-> Off Duty)
  const handleToggleAvailability = async () => {
    if (!summary?.driver) return;
    const current = summary.driver.availabilityStatus;
    const next = current === 'available' ? 'off_duty' : 'available';

    setTogglingAvailability(true);
    try {
      await dispatchApi.updateDriverAvailability(token, next);
      showToast('success', `Status updated to ${next === 'available' ? 'Available' : 'Off Duty'}.`);
      loadDashboardData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setTogglingAvailability(false);
    }
  };

  // Complete Order Workflow Actions
  const handleOrderAction = async (action, orderId) => {
    setActionLoading(orderId);
    try {
      if (action === 'claim') {
        await dispatchApi.claimOrder(token, orderId);
        showToast('success', 'Order claimed successfully!');
      } else if (action === 'accept') {
        await dispatchApi.acceptOrder(token, orderId);
        showToast('success', 'Assignment accepted.');
      } else if (action === 'start') {
        await dispatchApi.startOrder(token, orderId);
        showToast('success', 'Trip started. Status: In Progress.');
      } else if (action === 'complete') {
        await dispatchApi.completeOrder(token, orderId);
        showToast('success', 'Trip completed successfully!');
      }
      setSelectedOrderId(null);
      loadDashboardData();
    } catch (err) {
      if (err.status === 409) {
        showToast('error', 'This order has just been claimed by another driver.');
      } else {
        showToast('error', err.message || 'Action failed.');
      }
    } finally {
      setActionLoading('');
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectingOrder || !rejectReason.trim()) return;

    setActionLoading(rejectingOrder._id);
    try {
      await dispatchApi.rejectOrder(token, rejectingOrder._id, rejectReason.trim());
      showToast('success', 'Order rejected and returned to dispatch.');
      setRejectingOrder(null);
      setRejectReason('');
      loadDashboardData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setActionLoading('');
    }
  };

  // Group assigned orders by status
  const activeOrders = orders.filter((o) => ['assigned', 'accepted', 'in_progress'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'completed');

  const driverProfile = summary?.driver;
  const vehicle = summary?.assignedVehicle;
  const isAvailable = driverProfile?.availabilityStatus === 'available';
  const isBusy = driverProfile?.availabilityStatus === 'busy';

  return (
    <div className="space-y-6">
      <Toast type={toast.type} message={toast.message} onClose={() => setToast({ message: '' })} />

      {/* Driver Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-semibold text-slate-100">{driverProfile?.fullName || user.name}</h2>
              <Badge variant={driverProfile?.employmentStatus === 'active' ? 'success' : 'default'}>
                {driverProfile?.employmentStatus || 'Active'}
              </Badge>
              <Badge variant={isAvailable ? 'success' : isBusy ? 'primary' : 'default'}>
                {isBusy ? 'On Active Trip' : isAvailable ? 'Available' : 'Off Duty'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              License: <span className="font-mono text-slate-300">{driverProfile?.licenseNumber || 'Verified'}</span>
              {vehicle ? (
                <> · Assigned Vehicle: <span className="text-slate-200 font-medium">{vehicle.registrationNumber} ({vehicle.vehicleType})</span></>
              ) : (
                ' · No fixed vehicle assigned'
              )}
            </p>
          </div>

          {/* Quick Availability Switch & GPS Switch */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant={isGpsSharing ? 'emerald' : 'outline'}
              size="sm"
              icon={Radio}
              onClick={isGpsSharing ? stopGpsSharing : startGpsSharing}
            >
              {isGpsSharing ? 'Broadcasting GPS' : 'Start GPS Sharing'}
            </Button>

            <Button
              variant={isAvailable ? 'secondary' : 'primary'}
              size="sm"
              loading={togglingAvailability}
              disabled={isBusy}
              icon={Power}
              onClick={handleToggleAvailability}
            >
              {isBusy ? 'Busy (Active Job)' : isAvailable ? 'Go Off Duty' : 'Set Available'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadDashboardData}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Real Metrics Banner */}
        {isGpsSharing && currentCoords && (
          <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-600/40 rounded-lg space-y-1 text-xs text-emerald-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-semibold">Live GPS Active: {currentCoords.latitude.toFixed(4)}, {currentCoords.longitude.toFixed(4)}</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400">Broadcasting to Fleet</span>
            </div>
            {currentCoords.address && (
              <p className="text-[11px] text-zinc-300 flex items-center gap-1 truncate pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {currentCoords.address}
              </p>
            )}
          </div>
        )}

        {summary?.metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
            <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
              <span className="text-[10px] uppercase font-medium text-slate-500 block">Pending Acceptance</span>
              <span className="text-lg font-bold text-amber-400">{summary.metrics.assigned}</span>
            </div>
            <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
              <span className="text-[10px] uppercase font-medium text-slate-500 block">Accepted / In Progress</span>
              <span className="text-lg font-bold text-sky-400">{summary.metrics.accepted + summary.metrics.inProgress}</span>
            </div>
            <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
              <span className="text-[10px] uppercase font-medium text-slate-500 block">Available to Claim</span>
              <span className="text-lg font-bold text-teal-400">{summary.metrics.available}</span>
            </div>
            <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
              <span className="text-[10px] uppercase font-medium text-slate-500 block">Completed Trips</span>
              <span className="text-lg font-bold text-emerald-400">{summary.metrics.completed}</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-3.5 py-1.5 rounded-md font-medium transition ${
            activeTab === 'active' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          My Active Jobs ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`px-3.5 py-1.5 rounded-md font-medium transition ${
            activeTab === 'available' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Available to Claim ({availableOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-3.5 py-1.5 rounded-md font-medium transition ${
            activeTab === 'completed' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Trip History ({completedOrders.length})
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : activeTab === 'active' ? (
        activeOrders.length === 0 ? (
          <EmptyState
            title="No Active Jobs"
            description="You currently have no pending or ongoing deliveries. Check 'Available to Claim' or wait for dispatch."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map((order) => (
              <Card key={order._id} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-sky-400">{order.orderNumber}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{order.orderType} · {order.quantity || 1} {order.quantityUnit || 'units'}</p>
                  </div>
                  <Badge variant={order.status === 'in_progress' ? 'primary' : order.status === 'accepted' ? 'success' : 'warning'}>
                    {order.status === 'in_progress' ? 'In Progress' : order.status === 'accepted' ? 'Accepted' : 'Pending Acceptance'}
                  </Badge>
                </div>

                {/* Route */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-medium">Pickup</span>
                      <p className="text-slate-200">{order.pickupLocation?.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-medium">Destination</span>
                      <p className="text-slate-200">{order.destinationLocation?.address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {new Date(order.requiredDate).toLocaleDateString()} {order.requiredTime}
                  </span>
                  {order.assignedVehicleId && (
                    <span className="flex items-center gap-1.5 font-medium text-slate-300">
                      <Truck className="w-3 h-3 text-slate-500" />
                      {order.assignedVehicleId.registrationNumber}
                    </span>
                  )}
                </div>

                {/* Driver Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Eye}
                    onClick={() => setSelectedOrderId(order._id)}
                  >
                    View Details
                  </Button>

                  {order.status === 'assigned' && (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={actionLoading === order._id}
                        onClick={() => handleOrderAction('accept', order._id)}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setRejectingOrder(order)}
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {order.status === 'accepted' && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Play}
                      loading={actionLoading === order._id}
                      onClick={() => handleOrderAction('start', order._id)}
                    >
                      Start Job
                    </Button>
                  )}

                  {order.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Check}
                      loading={actionLoading === order._id}
                      onClick={() => handleOrderAction('complete', order._id)}
                    >
                      Complete Job
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )
      ) : activeTab === 'available' ? (
        availableOrders.length === 0 ? (
          <EmptyState
            title="No Orders Available for Self-Claim"
            description="There are no broadcasted orders at the moment. When orders are made available, they will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOrders.map((order) => (
              <Card key={order._id} className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-slate-200">{order.orderNumber}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{order.orderType} · Requires {order.requiredVehicleType}</p>
                  </div>
                  <Badge variant="success">Available</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-medium">Pickup</span>
                      <p className="text-slate-200">{order.pickupLocation?.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-medium">Destination</span>
                      <p className="text-slate-200">{order.destinationLocation?.address}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {new Date(order.requiredDate).toLocaleDateString()} {order.requiredTime}
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={actionLoading === order._id}
                    onClick={() => handleOrderAction('claim', order._id)}
                  >
                    Claim Order
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Completed tab */
        completedOrders.length === 0 ? (
          <EmptyState
            title="No Completed Trips Yet"
            description="Your finished deliveries will be listed here for historical record."
          />
        ) : (
          <div className="space-y-3">
            {completedOrders.map((order) => (
              <div
                key={order._id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-slate-200">{order.orderNumber}</span>
                    <Badge variant="success">Completed</Badge>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">
                    {order.pickupLocation?.address} → {order.destinationLocation?.address}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">
                    {new Date(order.completedAt || order.updatedAt).toLocaleDateString()}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setSelectedOrderId(order._id)}>
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Order Details Modal */}
      {selectedOrderId && (
        <DriverOrderDetailModal
          orderId={selectedOrderId}
          token={token}
          onClose={() => setSelectedOrderId(null)}
          onAction={handleOrderAction}
          actionLoading={actionLoading}
        />
      )}

      {/* Reject Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Reject Assigned Order</h3>
            <p className="text-xs text-slate-400">
              Provide a reason for rejecting order <span className="font-mono text-slate-300">{rejectingOrder.orderNumber}</span>.
            </p>
            <form onSubmit={handleConfirmReject} className="space-y-3">
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Vehicle breakdown, medical emergency..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setRejectingOrder(null)}>Cancel</Button>
                <Button variant="danger" size="sm" type="submit" loading={actionLoading === rejectingOrder._id}>Confirm Reject</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

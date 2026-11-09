import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { trackingApi } from '../services/trackingApi.js';
import {
  Card,
  Button,
  Badge,
  EmptyState,
  TableSkeleton,
  Toast,
} from './ui/DesignSystem.jsx';
import {
  MapPin,
  Navigation,
  Truck,
  Clock,
  Radio,
  Search,
  Filter,
  AlertTriangle,
  RotateCw,
  Phone,
  Compass,
} from 'lucide-react';

export default function FleetTrackingMap() {
  const { token, user } = useAuth();
  const { socket } = useSocket();

  const isOwnerOrDispatcher = ['owner', 'dispatcher'].includes(user?.role);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toast, setToast] = useState({ type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: 'success', message: '' }), 4000);
  };

  const loadFleet = async () => {
    try {
      setLoading(true);
      const data = await trackingApi.getFleetVehicles(token);
      setVehicles(data || []);
      if (data && data.length > 0 && !selectedVehicle) {
        setSelectedVehicle(data[0]);
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, [token]);

  // Real-time location updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handleLocationUpdate = (telemetry) => {
      setVehicles((prev) => {
        const matchIndex = prev.findIndex(
          (v) =>
            (telemetry.vehicleId && (v.vehicleId?._id === telemetry.vehicleId || v.vehicleId === telemetry.vehicleId)) ||
            (telemetry.driverId && (v.driverId?._id === telemetry.driverId || v.driverId === telemetry.driverId))
        );

        if (matchIndex >= 0) {
          const updated = [...prev];
          updated[matchIndex] = {
            ...updated[matchIndex],
            latitude: telemetry.latitude,
            longitude: telemetry.longitude,
            speed: telemetry.speed,
            heading: telemetry.heading,
            accuracy: telemetry.accuracy,
            recordedAt: telemetry.recordedAt,
            isStale: false,
          };
          return updated;
        }

        // If not already in list, append live broadcasting vehicle
        return [
          {
            _id: telemetry.locationId || Math.random().toString(),
            vehicleId: telemetry.vehicleId ? { registrationNumber: telemetry.vehicleNumber, _id: telemetry.vehicleId } : { registrationNumber: telemetry.vehicleNumber || 'Driver GPS' },
            driverId: { fullName: telemetry.driverName, _id: telemetry.driverId },
            latitude: telemetry.latitude,
            longitude: telemetry.longitude,
            speed: telemetry.speed,
            heading: telemetry.heading,
            accuracy: telemetry.accuracy,
            recordedAt: telemetry.recordedAt,
            isStale: false,
          },
          ...prev,
        ];
      });
    };

    socket.on('location:updated', handleLocationUpdate);
    return () => socket.off('location:updated', handleLocationUpdate);
  }, [socket]);

  const filteredVehicles = vehicles.filter((v) => {
    const reg = v.vehicleId?.registrationNumber || '';
    const driver = v.driverId?.fullName || '';
    const matchesSearch = reg.toLowerCase().includes(search.toLowerCase()) || driver.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === 'active') return matchesSearch && !v.isStale;
    if (statusFilter === 'stale') return matchesSearch && v.isStale;
    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: 'success', message: '' })} />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
            Live Fleet GPS Tracking
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">Real-time driver location telemetry and route monitoring</p>
        </div>
        <Button size="sm" variant="secondary" icon={RotateCw} onClick={loadFleet}>
          Refresh Telemetry
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            className="w-full bg-[#040608] border border-zinc-800 text-zinc-100 text-xs rounded-lg pl-9 pr-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-500/20"
            placeholder="Search vehicle number or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#040608] border border-zinc-800 text-zinc-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">All Vehicles</option>
          <option value="active">Live Active GPS</option>
          <option value="stale">Stale Telemetry (&gt;5m)</option>
        </select>
      </div>

      {/* Map & Fleet Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* Left Side: Vehicle Fleet Cards */}
        <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
          {loading ? (
            <TableSkeleton rows={4} cols={2} />
          ) : filteredVehicles.length === 0 ? (
            <EmptyState
              title="No active vehicles broadcasting"
              description="Drivers will appear here once GPS sharing is initiated from their mobile portal."
              icon={Truck}
            />
          ) : (
            filteredVehicles.map((v) => {
              const isSelected = selectedVehicle?._id === v._id;
              return (
                <div
                  key={v._id}
                  onClick={() => setSelectedVehicle(v)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                      : 'bg-[#0C1017] border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-zinc-100">
                        {v.vehicleId?.registrationNumber || 'Vehicle'}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                        <Truck className="w-3 h-3 text-zinc-500" />
                        {v.driverId?.fullName || 'Assigned Driver'}
                      </p>
                    </div>
                    <Badge variant={v.isStale ? 'warning' : 'success'}>
                      {v.isStale ? 'Stale' : 'Live'}
                    </Badge>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 flex items-center gap-1 font-mono">
                      <Compass className="w-3 h-3" />
                      {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                    </span>
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(v.recordedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Map Canvas Container */}
        <div className="lg:col-span-2 bg-[#0C1017] border border-zinc-800 rounded-xl overflow-hidden flex flex-col relative min-h-[400px]">
          {/* Top Map HUD Overlay */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="bg-[#05070B]/90 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-lg pointer-events-auto flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs font-medium text-zinc-200">
                {selectedVehicle ? selectedVehicle.vehicleId?.registrationNumber : 'Select Vehicle'}
              </span>
            </div>
            {selectedVehicle?.isStale && (
              <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg pointer-events-auto text-amber-400 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Stale (&gt;5m old)
              </div>
            )}
          </div>

          {/* Interactive Radar Visualizer / Map Canvas */}
          <div className="flex-1 bg-[#05070B] flex items-center justify-center relative overflow-hidden">
            {/* Grid line background */}
            <div className="absolute inset-0 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

            {selectedVehicle ? (
              <div className="text-center space-y-4 z-10 p-6">
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto animate-pulse">
                    <Navigation className="w-8 h-8 text-emerald-400" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-700 text-zinc-300">
                    {selectedVehicle.speed ? `${selectedVehicle.speed} km/h` : '0 km/h'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-zinc-100">
                    {selectedVehicle.vehicleId?.registrationNumber}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Driver: <span className="text-emerald-400 font-medium">{selectedVehicle.driverId?.fullName}</span>
                  </p>
                  <p className="text-[11px] font-mono text-zinc-500">
                    Lat: {selectedVehicle.latitude} • Lng: {selectedVehicle.longitude}
                  </p>
                  {selectedVehicle.activeOrderId && (
                    <div className="mt-2 inline-block bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-md text-xs text-zinc-300">
                      Active Order: <span className="font-semibold text-zinc-100">{selectedVehicle.activeOrderId.orderNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-zinc-500 text-xs">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                Select a vehicle from the left pane to view telemetry
              </div>
            )}
          </div>

          {/* Map Footer status */}
          <div className="p-3 border-t border-zinc-800/80 bg-[#07090E] flex items-center justify-between text-xs text-zinc-400">
            <span>Google Maps Platform Telemetry Engine</span>
            <span className="text-[11px] font-mono text-emerald-400">GPS Status: Synchronized</span>
          </div>
        </div>
      </div>
    </div>
  );
}

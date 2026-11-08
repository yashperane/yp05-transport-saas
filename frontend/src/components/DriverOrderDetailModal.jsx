import React, { useState, useEffect } from 'react';
import { dispatchApi } from '../services/dispatchApi.js';
import { Card, Button, Badge, LoadingSkeleton } from './ui/DesignSystem.jsx';
import {
  MapPin,
  Calendar,
  Package,
  Truck,
  User,
  Phone,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  FileText
} from 'lucide-react';

export default function DriverOrderDetailModal({ orderId, token, onClose, onAction, actionLoading }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await dispatchApi.getDriverOrderById(token, orderId);
        if (isMounted) setData(res);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load order details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (orderId) fetchDetails();
    return () => { isMounted = false; };
  }, [orderId, token]);

  if (!orderId) return null;

  const order = data?.order;
  const timeline = data?.timeline || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-slate-100">{order?.orderNumber || 'Order Details'}</span>
                {order && <Badge variant={order.status === 'completed' ? 'success' : order.status === 'in_progress' ? 'primary' : 'warning'}>{order.status}</Badge>}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Assigned Order Workflow & Execution</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-sm font-mono px-2 py-1">✕</button>
        </div>

        {/* Modal Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5 text-xs text-slate-300">
          {loading ? (
            <LoadingSkeleton count={4} />
          ) : error ? (
            <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-lg text-red-300 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : order ? (
            <>
              {/* Route Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Pickup Address
                  </span>
                  <p className="text-slate-200 font-medium">{order.pickupLocation?.address}</p>
                  {order.pickupLocation?.contactPerson && (
                    <p className="text-slate-400 text-[11px] flex items-center gap-1.5 pt-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {order.pickupLocation.contactPerson} · {order.pickupLocation.contactPhone}
                    </p>
                  )}
                </div>

                <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-3">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-400 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Destination Address
                  </span>
                  <p className="text-slate-200 font-medium">{order.destinationLocation?.address}</p>
                  {order.destinationLocation?.contactPerson && (
                    <p className="text-slate-400 text-[11px] flex items-center gap-1.5 pt-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {order.destinationLocation.contactPerson} · {order.destinationLocation.contactPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* Order Specifics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950/30 border border-slate-800/60 rounded-lg space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-medium block">Scheduled Date</span>
                  <span className="font-medium text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {new Date(order.requiredDate).toLocaleDateString()} {order.requiredTime || ''}
                  </span>
                </div>

                <div className="p-3 bg-slate-950/30 border border-slate-800/60 rounded-lg space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-medium block">Transport Type</span>
                  <span className="font-medium text-slate-200 capitalize flex items-center gap-1.5">
                    <Package className="w-3 h-3 text-slate-400" />
                    {order.orderType} ({order.quantity || 1} {order.quantityUnit || 'units'})
                  </span>
                </div>

                <div className="p-3 bg-slate-950/30 border border-slate-800/60 rounded-lg space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-medium block">Vehicle Requirement</span>
                  <span className="font-medium text-slate-200 capitalize flex items-center gap-1.5">
                    <Truck className="w-3 h-3 text-slate-400" />
                    {order.requiredVehicleType || 'Any'}
                  </span>
                </div>
              </div>

              {/* Assigned Vehicle if available */}
              {order.assignedVehicleId && (
                <div className="p-3.5 bg-slate-950/30 border border-slate-800/60 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-medium block">Operating Vehicle</span>
                    <span className="font-semibold text-slate-200 text-xs">
                      {order.assignedVehicleId.registrationNumber} ({order.assignedVehicleId.vehicleType})
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Capacity: {order.assignedVehicleId.capacity} {order.assignedVehicleId.capacityUnit}
                  </span>
                </div>
              )}

              {/* Goods info & instructions */}
              {order.materialDescription && (
                <div className="p-3 bg-slate-950/30 border border-slate-800/60 rounded-lg space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-medium block">Material / Cargo Details</span>
                  <p className="text-slate-300">{order.materialDescription}</p>
                </div>
              )}

              {order.specialInstructions && (
                <div className="p-3 bg-amber-950/20 border border-amber-900/30 rounded-lg space-y-1 text-amber-300">
                  <span className="text-[10px] text-amber-400 uppercase font-medium block flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Special Instructions
                  </span>
                  <p className="text-[11px]">{order.specialInstructions}</p>
                </div>
              )}

              {/* Activity Timeline */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-3">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  Order Activity Timeline
                </span>
                {timeline.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic">No timeline entries recorded yet.</p>
                ) : (
                  <div className="space-y-3 relative pl-4 border-l border-slate-800">
                    {timeline.map((item, idx) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-900 group-hover:bg-sky-500 transition-colors" />
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-200 text-[11px]">{item.action}</span>
                          <span className="text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Actions */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          
          {order && (
            <div className="flex items-center gap-2">
              {order.status === 'assigned' && (
                <Button
                  size="sm"
                  variant="primary"
                  loading={actionLoading === order._id}
                  onClick={() => onAction('accept', order._id)}
                >
                  Accept Order
                </Button>
              )}
              {['assigned', 'accepted'].includes(order.status) && (
                <Button
                  size="sm"
                  variant="primary"
                  loading={actionLoading === order._id}
                  onClick={() => onAction('start', order._id)}
                >
                  Start Job
                </Button>
              )}
              {order.status === 'in_progress' && (
                <Button
                  size="sm"
                  variant="primary"
                  loading={actionLoading === order._id}
                  onClick={() => onAction('complete', order._id)}
                >
                  Complete Job
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

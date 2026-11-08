import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { fleetApi } from '../services/fleetApi.js';
import VehicleManager from './VehicleManager.jsx';
import DriverManager from './DriverManager.jsx';
import {
  Truck,
  Users,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Clock,
  History,
  ShieldCheck,
  Calendar
} from 'lucide-react';

export default function FleetHub() {
  const { user, token } = useAuth();
  const [subTab, setSubTab] = useState('vehicles'); // 'vehicles' | 'drivers' | 'assignments'
  const [summary, setSummary] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const data = await fleetApi.getFleetSummary(token);
      setSummary(data);
    } catch (err) {
      console.warn('Fleet summary failed:', err.message);
    }
  };

  const fetchAssignments = async () => {
    setLoadingHistory(true);
    try {
      const data = await fleetApi.getAssignmentHistory(token);
      setAssignments(data || []);
    } catch (err) {
      console.warn('Assignments fetch failed:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (subTab === 'assignments') {
      fetchAssignments();
    }
  }, [subTab]);

  return (
    <div className="space-y-6">
      {/* Fleet Summary KPI Banner */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-slate-900/90 to-slate-800/80 border border-slate-700/60 rounded-2xl shadow-lg shadow-black/20 text-center space-y-1">
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-sky-500/10 rounded-full blur-xl pointer-events-none"></div>
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Total Fleet</span>
            <span className="text-2xl font-extrabold text-white tracking-tight">{summary.vehicles?.total}</span>
            <span className="text-[11px] text-slate-400 block font-medium">Vehicles registered</span>
          </div>

          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-emerald-950/40 to-slate-900/90 border border-emerald-500/30 rounded-2xl shadow-lg shadow-emerald-950/20 text-center space-y-1">
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-emerald-500/15 rounded-full blur-xl pointer-events-none"></div>
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">Active Fleet</span>
            <span className="text-2xl font-extrabold text-emerald-300 tracking-tight">{summary.vehicles?.active}</span>
            <span className="text-[11px] text-emerald-400/80 block font-medium">Ready for dispatch</span>
          </div>

          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-amber-950/40 to-slate-900/90 border border-amber-500/30 rounded-2xl shadow-lg shadow-amber-950/20 text-center space-y-1">
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-amber-500/15 rounded-full blur-xl pointer-events-none"></div>
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Maintenance</span>
            <span className="text-2xl font-extrabold text-amber-300 tracking-tight">{summary.vehicles?.inMaintenance}</span>
            <span className="text-[11px] text-amber-400/80 block font-medium">Under repair</span>
          </div>

          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-blue-950/40 to-slate-900/90 border border-blue-500/30 rounded-2xl shadow-lg shadow-blue-950/20 text-center space-y-1">
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-blue-500/15 rounded-full blur-xl pointer-events-none"></div>
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block">Total Drivers</span>
            <span className="text-2xl font-extrabold text-blue-300 tracking-tight">{summary.drivers?.total}</span>
            <span className="text-[11px] text-blue-400/80 block font-medium">Roster count</span>
          </div>

          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-teal-950/40 to-slate-900/90 border border-teal-500/30 rounded-2xl shadow-lg shadow-teal-950/20 text-center space-y-1">
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-teal-500/15 rounded-full blur-xl pointer-events-none"></div>
            <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider block">Available</span>
            <span className="text-2xl font-extrabold text-teal-300 tracking-tight">{summary.drivers?.available}</span>
            <span className="text-[11px] text-teal-400/80 block font-medium">Free for orders</span>
          </div>

          <div className="relative overflow-hidden p-4 bg-gradient-to-br from-indigo-950/40 to-slate-900/90 border border-indigo-500/30 rounded-2xl shadow-lg shadow-indigo-950/20 text-center space-y-1">
            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-indigo-500/15 rounded-full blur-xl pointer-events-none"></div>
            <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider block">Busy Drivers</span>
            <span className="text-2xl font-extrabold text-indigo-300 tracking-tight">{summary.drivers?.busy}</span>
            <span className="text-[11px] text-indigo-400/80 block font-medium">On active route</span>
          </div>
        </div>
      )}

      {/* Sub Navigation */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 text-xs">
        <button
          onClick={() => setSubTab('vehicles')}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all duration-200 ${
            subTab === 'vehicles' 
              ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/30 scale-[1.02]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Vehicles & Fleets</span>
        </button>

        <button
          onClick={() => setSubTab('drivers')}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all duration-200 ${
            subTab === 'drivers' 
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Drivers Roster</span>
        </button>

        <button
          onClick={() => setSubTab('assignments')}
          className={`flex items-center gap-2 px-5 py-2.5 font-bold rounded-xl transition-all duration-200 ${
            subTab === 'assignments' 
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Vehicle Allocation History</span>
        </button>
      </div>

      {/* Tab 1: Vehicles */}
      {subTab === 'vehicles' && (
        <VehicleManager onVehicleUpdated={fetchSummary} />
      )}

      {/* Tab 2: Drivers */}
      {subTab === 'drivers' && (
        <DriverManager onDriverUpdated={fetchSummary} />
      )}

      {/* Tab 3: Assignments Audit History */}
      {subTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-sky-400" />
                Vehicle Assignment Audit Trail
              </h3>
              <p className="text-xs text-slate-400">
                Log of vehicle-driver assignments, reallocations, and unassignments.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {loadingHistory ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading history...</div>
            ) : assignments.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No assignment history recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/80 bg-slate-900/60 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Vehicle</th>
                      <th className="py-3 px-4 font-semibold">Driver</th>
                      <th className="py-3 px-4 font-semibold">Assigned Date</th>
                      <th className="py-3 px-4 font-semibold">Ended Date</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Assigned By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {assignments.map((a) => (
                      <tr key={a._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-white block">
                            {a.vehicleId?.registrationNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {a.vehicleId?.vehicleNumber || a.vehicleId?.vehicleType}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-200 block">{a.driverId?.fullName}</span>
                          <span className="text-[10px] text-slate-500">{a.driverId?.phoneNumber}</span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {new Date(a.assignedAt).toLocaleString()}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {a.unassignedAt ? (
                            new Date(a.unassignedAt).toLocaleString()
                          ) : (
                            <span className="text-emerald-400 text-[11px] font-semibold">Active Now</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              a.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-400">
                          {a.assignedByUserId?.name || 'Administrator'}
                        </td>
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

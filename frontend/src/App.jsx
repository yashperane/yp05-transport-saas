import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Users, 
  ClipboardList, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Server, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function App() {
  const [apiHealth, setApiHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch('http://localhost:5000/api/health');
      if (!res.ok) throw new Error('API returned non-200');
      const data = await res.json();
      setApiHealth(data);
    } catch (err) {
      setApiHealth({ status: 'offline', error: err.message });
    } finally {
      setLoadingHealth(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-600 p-2 rounded-xl text-white shadow-lg shadow-sky-600/30">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              Sherkar Transport SaaS
              <span className="text-xs bg-sky-500/20 text-sky-400 font-medium px-2 py-0.5 rounded-full border border-sky-500/30">
                Pilot v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">Fleet & Multi-tenant Logistics Platform (MERN Stack)</p>
          </div>
        </div>

        {/* System Health Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={checkHealth}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-850 transition"
          >
            <Activity className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin text-sky-400' : 'text-slate-400'}`} />
            <span>Check API</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-xs">
            {apiHealth?.status === 'ok' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-400 font-medium">Backend Online</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-amber-400 font-medium">Backend Offline (Port 5000)</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Welcome Hero / Status */}
        <div className="bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-900/40 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold">
              Chapter 1 — Project Foundation Active
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              Digitizing Sherkar Transport Operations
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Operating 4 pickup/tempo vehicles (1 driven by Sherkar, 3 by drivers). 
              Eliminating phone coordination, duplicate orders, and manual trip tracking with isolated multi-tenant architecture.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'overview', label: 'Overview & Roles' },
            { id: 'pilot', label: 'Pilot Fleet (Sherkar)' },
            { id: 'architecture', label: 'System Architecture' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview & Roles */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Transport Business Owner</h3>
              <p className="text-xs text-slate-400">
                Full dashboard control: Add vehicles, manage drivers, track trips, set pricing, and configure company visibility.
              </p>
              <div className="text-xs text-sky-400 font-medium">Role: OWNER / ADMIN</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Driver Interface</h3>
              <p className="text-xs text-slate-400">
                Mobile-first UX: Claim available orders (atomic backend lock), accept/reject assignments, update trip progress (Start / Complete).
              </p>
              <div className="text-xs text-emerald-400 font-medium">Role: DRIVER</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Company Workspace</h3>
              <p className="text-xs text-slate-400">
                Clients, contractors & supervisors create transport orders with automatic duplicate detection & live status monitoring.
              </p>
              <div className="text-xs text-amber-400 font-medium">Role: COMPANY ADMIN / EMP</div>
            </div>
          </div>
        )}

        {/* Tab 2: Pilot Fleet */}
        {activeTab === 'pilot' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Initial Pilot Fleet Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { id: 'V1', type: 'Pickup / Tempo', driver: 'Sherkar (Owner)', status: 'Available' },
                { id: 'V2', type: 'Pickup / Tempo', driver: 'Driver 1', status: 'Available' },
                { id: 'V3', type: 'Pickup / Tempo', driver: 'Driver 2', status: 'Available' },
                { id: 'V4', type: 'Pickup / Tempo', driver: 'Driver 3', status: 'Available' },
              ].map((v) => (
                <div key={v.id} className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold bg-slate-900 px-2 py-1 rounded text-sky-400">{v.id}</span>
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {v.status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white">{v.type}</div>
                  <div className="text-xs text-slate-400">Assigned: <span className="text-slate-200">{v.driver}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: System Architecture */}
        {activeTab === 'architecture' && (
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-sky-400" />
              MERN Stack Architecture Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
              <div className="p-3 bg-slate-900/80 rounded-lg space-y-1">
                <div className="font-semibold text-sky-400">Backend API (Express & Node.js)</div>
                <p>Pure JavaScript (ES Modules), Socket.IO for real-time dispatch, and RESTful route structure.</p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-lg space-y-1">
                <div className="font-semibold text-sky-400">Database (MongoDB & Mongoose)</div>
                <p>Multi-tenant schemas, atomic status updates for driver claiming, audit log sub-documents.</p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-lg space-y-1">
                <div className="font-semibold text-sky-400">Frontend (React & Vite)</div>
                <p>Fast JavaScript JSX setup, Tailwind CSS for clean responsive UI, mobile-friendly for drivers.</p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-lg space-y-1">
                <div className="font-semibold text-sky-400">Real-time & Security</div>
                <p>Socket.IO channel isolation per tenant, bcrypt password hashing, robust JWT verification.</p>
              </div>
            </div>
          </div>
        )}

        {/* Live API Inspection Card */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Backend Health Check (/api/health)
            </h4>
            <span className="text-xs text-slate-400 font-mono">http://localhost:5000</span>
          </div>

          <pre className="p-4 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800">
            {JSON.stringify(apiHealth, null, 2)}
          </pre>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Transport & Fleet Management SaaS • Chapter 1 Foundation Ready
      </footer>
    </div>
  );
}

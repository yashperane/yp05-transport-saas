import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../services/authApi.js';
import CompaniesManager from '../components/CompaniesManager.jsx';
import CompanyWorkspace from '../components/CompanyWorkspace.jsx';
import OrderManager from '../components/OrderManager.jsx';
import FleetHub from '../components/FleetHub.jsx';
import { 
  Truck, 
  Users, 
  ShieldCheck, 
  LogOut, 
  Activity, 
  ShieldAlert, 
  Building2, 
  CheckCircle2, 
  XCircle,
  Clock,
  Sparkles,
  LayoutDashboard,
  ClipboardList
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, token, logout } = useAuth();
  
  // Decide default tab based on role
  const isOwnerOrDispatcher = ['owner', 'dispatcher'].includes(user?.role);
  const isCompanyUser = ['company_admin', 'company_employee'].includes(user?.role);
  
  const [activeTab, setActiveTab] = useState('orders'); // Default to Orders
  const [rbacTestResult, setRbacTestResult] = useState(null);
  const [testingEndpoint, setTestingEndpoint] = useState('');

  const testEndpoint = async (endpointName) => {
    setTestingEndpoint(endpointName);
    setRbacTestResult(null);
    try {
      const res = await authApi.testRbac(endpointName, token);
      setRbacTestResult(res);
    } catch (err) {
      setRbacTestResult({ status: 500, body: { success: false, error: { message: err.message } } });
    } finally {
      setTestingEndpoint('');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'owner': return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
      case 'dispatcher': return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
      case 'driver': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'company_admin': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'company_employee': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-600 p-2 rounded-xl text-white shadow-lg shadow-sky-600/30">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Transport SaaS Project
              <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadgeColor(user.role)}`}>
                {user.role?.toUpperCase()}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {user.businessName ? `Tenant: ${user.businessName}` : 'Platform Management'}
              {user.companyName && ` • Workspace: ${user.companyName}`}
            </p>
          </div>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white">{user.name}</div>
            <div className="text-[11px] text-slate-400">{user.email}</div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-900/50 bg-red-950/40 text-red-300 hover:bg-red-900/60 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
          {/* Orders Management Tab (Central to all authorized roles) */}
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'orders' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Orders Management</span>
          </button>

          {/* Company Workspace Tab (for Company Admin and Employee) */}
          {isCompanyUser && (
            <button
              onClick={() => setActiveTab('company-workspace')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === 'company-workspace' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Company Workspace</span>
            </button>
          )}

          {/* Fleet & Vehicles Management (Owner and Dispatcher) */}
          {isOwnerOrDispatcher && (
            <button
              onClick={() => setActiveTab('fleet')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === 'fleet' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Fleet & Drivers</span>
            </button>
          )}

          {/* Owner/Dispatcher Companies Directory */}
          {isOwnerOrDispatcher && (
            <button
              onClick={() => setActiveTab('companies')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === 'companies' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Companies Directory</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'profile' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>My Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('rbac-test')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'rbac-test' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>RBAC Verification Matrix</span>
          </button>
        </div>

        {/* Tab Content: Orders Management */}
        {activeTab === 'orders' && (
          <OrderManager />
        )}

        {/* Tab Content: Fleet & Drivers Management */}
        {activeTab === 'fleet' && isOwnerOrDispatcher && (
          <FleetHub />
        )}

        {/* Tab Content: Company Workspace */}
        {activeTab === 'company-workspace' && isCompanyUser && (
          <CompanyWorkspace />
        )}

        {/* Tab Content: Companies Directory (Owner/Dispatcher) */}
        {activeTab === 'companies' && isOwnerOrDispatcher && (
          <CompaniesManager />
        )}

        {/* Tab 1: Profile Details */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                Verified Server-Side Identity
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-xl space-y-1">
                  <span className="text-slate-500">Full Name</span>
                  <div className="font-semibold text-slate-200">{user.name}</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl space-y-1">
                  <span className="text-slate-500">Email Address</span>
                  <div className="font-semibold text-slate-200">{user.email}</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl space-y-1">
                  <span className="text-slate-500">User Role</span>
                  <div className="font-semibold text-sky-400">{user.role}</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl space-y-1">
                  <span className="text-slate-500">Account Status</span>
                  <div className="font-semibold text-emerald-400">{user.status}</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl space-y-1">
                  <span className="text-slate-500">Transport Business Tenant ID</span>
                  <div className="font-mono text-slate-300 truncate">{user.transportBusinessId || 'N/A (Platform Admin)'}</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl space-y-1">
                  <span className="text-slate-500">Company Workspace ID</span>
                  <div className="font-mono text-slate-300 truncate">{user.companyId || 'N/A (Transport Staff)'}</div>
                </div>
              </div>
            </div>

            {/* Quick Overview Card */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-400" />
                Role Permissions Scope
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {user.role === 'owner' && 'Full administrative rights over vehicles, drivers, customer pricing, and company visibility settings.'}
                {user.role === 'dispatcher' && 'Operational dispatch permissions: assign vehicles, assign drivers, and monitor ongoing orders.'}
                {user.role === 'driver' && 'Driver portal permissions: claim available orders atomically, accept assignments, update trip status.'}
                {user.role === 'company_admin' && 'Company workspace administrator: create transport orders, view order tracking, manage company team.'}
                {user.role === 'company_employee' && 'Company order creator: create booking requests and view company order history.'}
              </p>
              <div className="text-[11px] text-sky-400 font-mono bg-sky-950/40 p-2.5 rounded-lg border border-sky-800/40">
                🔒 Backend Isolation: Tenant boundaries enforced on Express API middleware.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: RBAC Security Verification Matrix */}
        {activeTab === 'rbac-test' && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  Live RBAC Authorization Test Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Click the endpoints below to test backend role-based access control. If your current role (<span className="text-sky-400 font-semibold">{user.role}</span>) is not permitted, the backend Express middleware will return a 403 Forbidden error.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => testEndpoint('test-owner')}
                  disabled={testingEndpoint !== ''}
                  className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition space-y-1"
                >
                  <div className="text-xs font-bold text-sky-400">GET /test-owner</div>
                  <div className="text-[11px] text-slate-400">Allowed: [owner]</div>
                </button>

                <button
                  onClick={() => testEndpoint('test-dispatcher')}
                  disabled={testingEndpoint !== ''}
                  className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition space-y-1"
                >
                  <div className="text-xs font-bold text-teal-400">GET /test-dispatcher</div>
                  <div className="text-[11px] text-slate-400">Allowed: [owner, dispatcher]</div>
                </button>

                <button
                  onClick={() => testEndpoint('test-driver')}
                  disabled={testingEndpoint !== ''}
                  className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition space-y-1"
                >
                  <div className="text-xs font-bold text-emerald-400">GET /test-driver</div>
                  <div className="text-[11px] text-slate-400">Allowed: [driver]</div>
                </button>

                <button
                  onClick={() => testEndpoint('test-company')}
                  disabled={testingEndpoint !== ''}
                  className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition space-y-1"
                >
                  <div className="text-xs font-bold text-amber-400">GET /test-company</div>
                  <div className="text-[11px] text-slate-400">Allowed: [company_admin, employee]</div>
                </button>
              </div>

              {/* Result Preview */}
              {rbacTestResult && (
                <div className={`p-4 rounded-xl border ${
                  rbacTestResult.status === 200 
                    ? 'bg-emerald-950/40 border-emerald-800/60' 
                    : 'bg-red-950/40 border-red-800/60'
                } space-y-2`}>
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {rbacTestResult.status === 200 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">HTTP 200 OK — Authorized Access</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-400" />
                        <span className="text-red-400">HTTP {rbacTestResult.status} — Access Blocked (RBAC Working)</span>
                      </>
                    )}
                  </div>
                  <pre className="p-3 bg-slate-950 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800">
                    {JSON.stringify(rbacTestResult.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-3.5 text-center text-xs text-slate-500">
        Transport SaaS Project • Chapter 3 Authentication & RBAC Active
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../services/authApi.js';
import CompaniesManager from '../components/CompaniesManager.jsx';
import CompanyWorkspace from '../components/CompanyWorkspace.jsx';
import OrderManager from '../components/OrderManager.jsx';
import FleetHub from '../components/FleetHub.jsx';
import DispatchCenter from '../components/DispatchCenter.jsx';
import DriverPortal from '../components/DriverPortal.jsx';
import { 
  Truck, 
  Users, 
  ShieldCheck, 
  LogOut, 
  Activity, 
  Building2, 
  CheckCircle2, 
  XCircle,
  LayoutDashboard,
  ClipboardList,
  Radio,
  Menu,
  ChevronDown,
  Sparkles
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, token, logout } = useAuth();
  
  const isOwnerOrDispatcher = ['owner', 'dispatcher'].includes(user?.role);
  const isCompanyUser = ['company_admin', 'company_employee'].includes(user?.role);
  const isDriver = user?.role === 'driver';
  
  // Default tab based on role
  const [activeTab, setActiveTab] = useState(
    isDriver ? 'driver-portal' : isOwnerOrDispatcher ? 'dispatch' : 'orders'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const roleBadgeStyles = {
    super_admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    owner: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    dispatcher: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    driver: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    company_admin: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    company_employee: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };

  const navItems = [
    { id: 'driver-portal', label: 'Driver Portal', icon: Radio, show: isDriver },
    { id: 'dispatch', label: 'Dispatch Center', icon: Radio, show: isOwnerOrDispatcher },
    { id: 'orders', label: 'Orders', icon: ClipboardList, show: !isDriver },
    { id: 'fleet', label: 'Fleet & Drivers', icon: Truck, show: isOwnerOrDispatcher },
    { id: 'company-workspace', label: 'Workspace', icon: LayoutDashboard, show: isCompanyUser },
    { id: 'companies', label: 'Companies', icon: Building2, show: isOwnerOrDispatcher },
    { id: 'profile', label: 'Profile', icon: ShieldCheck, show: true },
    { id: 'rbac-test', label: 'RBAC Matrix', icon: Activity, show: true },
  ].filter((item) => item.show);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white">
      {/* Top Application Shell Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Product Brand Identity (Neutral) */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-600/30">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-tight text-slate-100">Transport SaaS Project</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${roleBadgeStyles[user.role] || 'bg-slate-800 text-slate-400'}`}>
                  {user.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                {user.businessName || 'Sherkar Transport'} {user.companyName ? `• ${user.companyName}` : ''}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User profile & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-medium text-slate-200 block">{user.name}</span>
              <span className="text-[11px] text-slate-400 block font-mono">{user.email}</span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-950/20 hover:border-red-900/40 transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden pt-3 pb-2 border-t border-slate-800/80 mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition ${
                    isActive ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Dynamic Workspace Body */}
        {activeTab === 'driver-portal' && isDriver && (
          <DriverPortal />
        )}

        {activeTab === 'dispatch' && isOwnerOrDispatcher && (
          <DispatchCenter />
        )}

        {activeTab === 'orders' && (
          <OrderManager />
        )}

        {activeTab === 'fleet' && isOwnerOrDispatcher && (
          <FleetHub />
        )}

        {activeTab === 'company-workspace' && isCompanyUser && (
          <CompanyWorkspace />
        )}

        {activeTab === 'companies' && isOwnerOrDispatcher && (
          <CompaniesManager />
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                Verified Server Identity
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Full Name</span>
                  <p className="font-medium text-slate-200">{user.name}</p>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Email</span>
                  <p className="font-mono text-slate-200">{user.email}</p>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Assigned Role</span>
                  <p className="font-medium text-sky-400 capitalize">{user.role}</p>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800/60 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Tenant ID</span>
                  <p className="font-mono text-slate-300 truncate">{user.transportBusinessId || 'Platform Scope'}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-400" />
                Authorization Scope
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Role-based access control enforces tenant isolation and workspace boundaries on every endpoint.
              </p>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono">
                Status: Verified Active
              </div>
            </div>
          </div>
        )}

        {/* RBAC Matrix Tab */}
        {activeTab === 'rbac-test' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                Role-Based Access Control Verification
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Test Express middleware security. Non-permitted endpoints will return HTTP 403 Forbidden.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { name: 'test-owner', label: 'GET /test-owner', roles: 'owner' },
                { name: 'test-dispatcher', label: 'GET /test-dispatcher', roles: 'owner, dispatcher' },
                { name: 'test-driver', label: 'GET /test-driver', roles: 'driver' },
                { name: 'test-company', label: 'GET /test-company', roles: 'company_admin, employee' },
              ].map((t) => (
                <button
                  key={t.name}
                  onClick={() => testEndpoint(t.name)}
                  disabled={testingEndpoint !== ''}
                  className="p-3 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-left transition text-xs space-y-1"
                >
                  <span className="font-semibold text-sky-400 block">{t.label}</span>
                  <span className="text-[11px] text-slate-400 block">Allowed: {t.roles}</span>
                </button>
              ))}
            </div>

            {rbacTestResult && (
              <div className={`p-4 rounded-lg border text-xs font-mono ${
                rbacTestResult.status === 200 ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' : 'bg-red-950/30 border-red-800/40 text-red-300'
              }`}>
                <div className="font-semibold mb-2">Response: HTTP {rbacTestResult.status}</div>
                <pre className="text-[11px] overflow-x-auto">{JSON.stringify(rbacTestResult.body, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Production Footer */}
      <footer className="border-t border-slate-800/80 py-3 text-center text-[11px] text-slate-500 bg-slate-950">
        Transport SaaS Project • Production Architecture v1.0
      </footer>
    </div>
  );
}

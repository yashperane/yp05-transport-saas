import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { companyApi } from '../services/companyApi.js';
import {
  Building2,
  Users,
  ClipboardList,
  Clock,
  CheckCircle2,
  Truck,
  Plus,
  AlertCircle,
  UserPlus,
  Activity
} from 'lucide-react';

export default function CompanyWorkspace() {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'users' | 'profile'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Team Invite State
  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'company_employee',
  });
  const [lastInviteToken, setLastInviteToken] = useState('');

  const isCompanyAdmin = user?.role === 'company_admin';

  useEffect(() => {
    if (user?.companyId) {
      loadWorkspace();
    }
  }, [user]);

  const loadWorkspace = async () => {
    setLoading(true);
    setError('');
    try {
      const summaryData = await companyApi.getCompanySummary(token, user.companyId);
      setSummary(summaryData);

      if (isCompanyAdmin) {
        const teamUsers = await companyApi.getCompanyUsers(token, user.companyId);
        setUsers(teamUsers);
      }
    } catch (err) {
      setError(err.message || 'Failed to load company workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLastInviteToken('');
    try {
      const res = await companyApi.inviteUser(token, user.companyId, inviteData);
      setSuccess('Invitation created successfully!');
      if (res.invitationToken) {
        setLastInviteToken(res.invitationToken);
      }
      setInviteData({ name: '', email: '', phone: '', role: 'company_employee' });
      const teamUsers = await companyApi.getCompanyUsers(token, user.companyId);
      setUsers(teamUsers);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await companyApi.updateUserStatus(token, user.companyId, userId, nextStatus);
      const teamUsers = await companyApi.getCompanyUsers(token, user.companyId);
      setUsers(teamUsers);
      setSuccess(`User status changed to ${nextStatus}.`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!user.companyId) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <div className="text-sm font-semibold text-white">No Company Workspace Linked</div>
        <p className="text-xs text-slate-400 mt-1">
          Your account is not assigned to a customer company. Contact your transport administrator.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading workspace...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Workspace Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950/40 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-white">
              {summary?.company?.name || user.companyName}
            </h2>
            <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full font-mono">
              {summary?.company?.code || 'WORKSPACE'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dedicated Customer Transport Workspace • Managed by Sherkar Transport Services
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'dashboard' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Dashboard
          </button>
          {isCompanyAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'users' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Company Team ({users.length})
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300">
          {success}
        </div>
      )}

      {/* TAB: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-slate-400">Total Orders</span>
              <div className="text-xl font-bold text-white">{summary?.metrics?.totalOrders || 0}</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-amber-400">Pending</span>
              <div className="text-xl font-bold text-amber-400">{summary?.metrics?.pending || 0}</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-sky-400">Assigned</span>
              <div className="text-xl font-bold text-sky-400">{summary?.metrics?.assigned || 0}</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-purple-400">In Progress</span>
              <div className="text-xl font-bold text-purple-400">{summary?.metrics?.inProgress || 0}</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-emerald-400">Completed</span>
              <div className="text-xl font-bold text-emerald-400">{summary?.metrics?.completed || 0}</div>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-teal-400">Company Team</span>
              <div className="text-xl font-bold text-teal-400">{summary?.metrics?.totalUsers || 1}</div>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                Fleet Transportation Status
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Orders created by your company will be received by Sherkar Transport for allocation to vehicles.
                Detailed order booking and tracking lifecycle will be activated in Chapter 5.
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                <span className="text-slate-500 block text-[10px]">Primary Contact Person</span>
                <span className="font-semibold">{summary?.company?.contactPerson || 'Assigned Supervisor'}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                Order Tracking Permissions
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                As configured by the transport operator, your company workspace has live status visibility for all active dispatches.
              </p>
              <div className="text-[11px] text-sky-400 font-mono bg-sky-950/40 p-2.5 rounded-lg border border-sky-800/40">
                🔒 Data Scope: Limited strictly to orders placed under {summary?.company?.name}.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: USERS (COMPANY ADMIN ONLY) */}
      {activeTab === 'users' && isCompanyAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Invite Employee Form */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-sky-400" />
              Add Company Employee
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Company Admins can invite team members to create and inspect orders.
            </p>

            <form onSubmit={handleInviteUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Employee Name"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="employee@company.com"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="Phone number"
                  value={inviteData.phone}
                  onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow"
              >
                Send Invite
              </button>
            </form>

            {lastInviteToken && (
              <div className="p-3 bg-sky-950/60 border border-sky-800 rounded-xl space-y-1">
                <div className="text-[11px] font-bold text-sky-400">Dev Invitation Token:</div>
                <div className="font-mono text-[10px] text-slate-300 break-all select-all bg-slate-950 p-2 rounded">
                  {lastInviteToken}
                </div>
              </div>
            )}
          </div>

          {/* Company Users List */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              Company Team Roster ({users.length})
            </h3>

            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u._id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      {u.name}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          u.role === 'company_admin'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                        }`}
                      >
                        {u.role === 'company_admin' ? 'Admin' : 'Employee'}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[11px]">
                      {u.email} • {u.phone}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : u.status === 'invited'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {u.status}
                    </span>

                    {u._id !== user.id && (
                      <button
                        onClick={() => handleToggleUserStatus(u._id, u.status)}
                        className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-900 border border-slate-800"
                      >
                        {u.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

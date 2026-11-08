import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { companyApi } from '../services/companyApi.js';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Users,
  Eye,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserPlus,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

export default function CompaniesManager() {
  const { token, user } = useAuth();
  const isOwner = user?.role === 'owner';

  // Views: 'list' | 'create' | 'edit' | 'details' | 'users'
  const [view, setView] = useState('list');
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);

  // List State
  const [companies, setCompanies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Form State (Create / Edit)
  const [formData, setFormData] = useState({
    companyName: '',
    companyCode: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    billingAddress: '',
    notes: '',
  });

  // Users Management State for selected company
  const [companyUsers, setCompanyUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'company_employee',
  });
  const [lastInviteLink, setLastInviteLink] = useState('');

  useEffect(() => {
    fetchCompanies(1);
  }, [statusFilter]);

  const fetchCompanies = async (page = 1) => {
    setLoading(true);
    setActionError('');
    try {
      const data = await companyApi.getCompanies(token, {
        search,
        status: statusFilter,
        page,
        limit: 10,
      });
      setCompanies(data.companies);
      setPagination(data.pagination);
    } catch (err) {
      setActionError(err.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCompanies(1);
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    try {
      const created = await companyApi.createCompany(token, formData);
      setActionSuccess(`Company "${created.companyName}" registered successfully!`);
      resetForm();
      setView('list');
      fetchCompanies(1);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleEditCompany = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    try {
      await companyApi.updateCompany(token, selectedCompanyId, formData);
      setActionSuccess('Company details updated successfully.');
      setView('list');
      fetchCompanies(pagination.page);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleToggleStatus = async (companyId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await companyApi.updateCompanyStatus(token, companyId, nextStatus);
      setActionSuccess(`Company status changed to ${nextStatus}.`);
      fetchCompanies(pagination.page);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const openEdit = (comp) => {
    setSelectedCompanyId(comp._id);
    setFormData({
      companyName: comp.companyName || '',
      companyCode: comp.companyCode || '',
      contactPerson: comp.contactPerson || '',
      phone: comp.phone || '',
      email: comp.email || '',
      address: comp.address || '',
      billingAddress: comp.billingAddress || '',
      notes: comp.notes || '',
    });
    setView('edit');
  };

  const openDetails = async (comp) => {
    setSelectedCompanyId(comp._id);
    setSelectedCompany(comp);
    setView('details');
    try {
      const full = await companyApi.getCompanyById(token, comp._id);
      setSelectedCompany(full);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const openUsers = async (comp) => {
    setSelectedCompanyId(comp._id);
    setSelectedCompany(comp);
    setView('users');
    fetchCompanyUsers(comp._id);
  };

  const fetchCompanyUsers = async (cid) => {
    setLoadingUsers(true);
    try {
      const users = await companyApi.getCompanyUsers(token, cid);
      setCompanyUsers(users);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setLastInviteLink('');
    try {
      const res = await companyApi.inviteUser(token, selectedCompanyId, inviteData);
      setActionSuccess(`User invited! Invitation token generated.`);
      if (res.invitationToken) {
        setLastInviteLink(res.invitationToken);
      }
      setInviteData({ name: '', email: '', phone: '', role: 'company_employee' });
      fetchCompanyUsers(selectedCompanyId);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await companyApi.updateUserStatus(token, selectedCompanyId, userId, newStatus);
      fetchCompanyUsers(selectedCompanyId);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      companyCode: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      billingAddress: '',
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {actionError && (
        <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* VIEW: LIST OF COMPANIES */}
      {view === 'list' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                Customer Companies Directory
              </h2>
              <p className="text-xs text-slate-400">
                Manage companies, client workspaces, and customer permissions.
              </p>
            </div>

            {isOwner && (
              <button
                onClick={() => {
                  resetForm();
                  setView('create');
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Company</span>
              </button>
            )}
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by company name, contact, phone, or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading companies...</div>
            ) : companies.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No companies found</div>
                <p className="text-xs text-slate-500">Add your first client company to begin managing orders and workspaces.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/80 bg-slate-900/60 text-slate-400">
                      <th className="py-3 px-4 font-semibold">Company Name & Code</th>
                      <th className="py-3 px-4 font-semibold">Contact Person</th>
                      <th className="py-3 px-4 font-semibold">Phone & Email</th>
                      <th className="py-3 px-4 font-semibold text-center">Users</th>
                      <th className="py-3 px-4 font-semibold text-center">Orders</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {companies.map((comp) => (
                      <tr key={comp._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{comp.companyName}</div>
                          <div className="font-mono text-[10px] text-sky-400">{comp.companyCode || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4">{comp.contactPerson}</td>
                        <td className="py-3 px-4">
                          <div>{comp.phone}</div>
                          <div className="text-[11px] text-slate-500">{comp.email || '-'}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-sky-300">
                          {comp.userCount ?? 0}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-200">
                          {comp.orderCount ?? 0}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              comp.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {comp.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDetails(comp)}
                              title="View Details"
                              className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openUsers(comp)}
                              title="Manage Users"
                              className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition"
                            >
                              <Users className="w-3.5 h-3.5" />
                            </button>

                            {isOwner && (
                              <>
                                <button
                                  onClick={() => openEdit(comp)}
                                  title="Edit Company"
                                  className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleToggleStatus(comp._id, comp.status)}
                                  title={comp.status === 'active' ? 'Deactivate' : 'Activate'}
                                  className={`p-1.5 rounded-lg transition ${
                                    comp.status === 'active'
                                      ? 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
                                      : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                                  }`}
                                >
                                  {comp.status === 'active' ? (
                                    <XCircle className="w-3.5 h-3.5" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </>
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
                  Showing {companies.length} of {pagination.total} companies
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchCompanies(pagination.page - 1)}
                    className="p-1.5 rounded border border-slate-700 bg-slate-900 disabled:opacity-40 hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchCompanies(pagination.page + 1)}
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

      {/* VIEW: CREATE COMPANY FORM */}
      {view === 'create' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              Register New Client Company
            </h3>
            <button
              onClick={() => setView('list')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateCompany} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Projects Ltd"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Company Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TATA-SITE-A"
                  value={formData.companyCode}
                  onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Contact Person *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Patil"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="e.g. logistics@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">Operational Address</label>
                <input
                  type="text"
                  placeholder="Site office or factory address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="Registered GST/billing address"
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Specific loading requirements, security gates, or agreement details"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow"
              >
                Register Company
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: EDIT COMPANY FORM */}
      {view === 'edit' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-400" />
              Edit Company Details
            </h3>
            <button
              onClick={() => setView('list')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleEditCompany} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Company Code</label>
                <input
                  type="text"
                  value={formData.companyCode}
                  onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Contact Person</label>
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Phone</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">Operational Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={formData.billingAddress}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-300 mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                ></textarea>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold shadow"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW: COMPANY DETAILS */}
      {view === 'details' && selectedCompany && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Directory</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => openUsers(selectedCompany)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-white"
              >
                <Users className="w-3.5 h-3.5 text-teal-400" />
                <span>Manage Users ({selectedCompany.userCount || 0})</span>
              </button>

              {isOwner && (
                <button
                  onClick={() => openEdit(selectedCompany)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-white"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedCompany.companyName}</h3>
                  <div className="font-mono text-xs text-sky-400">Code: {selectedCompany.companyCode}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    selectedCompany.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {selectedCompany.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                  <span className="text-slate-500">Contact Person</span>
                  <div className="font-semibold text-slate-200">{selectedCompany.contactPerson}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                  <span className="text-slate-500">Phone Number</span>
                  <div className="font-semibold text-slate-200">{selectedCompany.phone}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                  <span className="text-slate-500">Email</span>
                  <div className="font-semibold text-slate-200">{selectedCompany.email || 'N/A'}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl space-y-1">
                  <span className="text-slate-500">Operational Address</span>
                  <div className="font-semibold text-slate-200">{selectedCompany.address || 'N/A'}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl col-span-2 space-y-1">
                  <span className="text-slate-500">Billing Address</span>
                  <div className="text-slate-300">{selectedCompany.billingAddress || 'N/A'}</div>
                </div>
                {selectedCompany.notes && (
                  <div className="p-3 bg-slate-950 rounded-xl col-span-2 space-y-1">
                    <span className="text-slate-500">Operational Notes</span>
                    <div className="text-slate-300">{selectedCompany.notes}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Workspace Statistics
                </h4>
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                  <span className="text-xs text-slate-400">Total Users</span>
                  <span className="text-base font-bold text-sky-400">{selectedCompany.userCount || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl">
                  <span className="text-xs text-slate-400">Total Transport Orders</span>
                  <span className="text-base font-bold text-emerald-400">{selectedCompany.orderCount || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: COMPANY USERS MANAGEMENT */}
      {view === 'users' && selectedCompany && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Directory</span>
            </button>
            <div className="text-xs font-semibold text-slate-300">
              Workspace: <span className="text-white">{selectedCompany.companyName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Invite User Form */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-400" />
                Invite Company Team Member
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Add employees or administrators. A secure 48-hour invitation token will be generated.
              </p>

              <form onSubmit={handleInviteUser} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Shinde"
                    value={inviteData.name}
                    onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="anand@company.com"
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
                    placeholder="9822114455"
                    value={inviteData.phone}
                    onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Role *</label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="company_employee">Company Employee (Create & view orders)</option>
                    <option value="company_admin">Company Admin (Manage company users)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow"
                >
                  Send Invitation
                </button>
              </form>

              {lastInviteLink && (
                <div className="p-3 bg-sky-950/60 border border-sky-800 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-sky-400">Dev Invitation Token Generated:</div>
                  <div className="font-mono text-[10px] text-slate-300 break-all select-all bg-slate-950 p-2 rounded">
                    {lastInviteLink}
                  </div>
                </div>
              )}
            </div>

            {/* Existing Users List */}
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-400" />
                Team Members ({companyUsers.length})
              </h3>

              {loadingUsers ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading team members...</div>
              ) : companyUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No users invited to this workspace yet.</div>
              ) : (
                <div className="space-y-2">
                  {companyUsers.map((u) => (
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
                            {u.role}
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

                        {isOwner && (
                          <button
                            onClick={() => handleToggleUserStatus(u._id, u.status)}
                            className="text-slate-400 hover:text-white p-1 rounded"
                            title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {u.status === 'active' ? (
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

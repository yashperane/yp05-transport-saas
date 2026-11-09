import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { pricingApi } from '../services/pricingApi.js';
import { companyApi } from '../services/companyApi.js';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  EmptyState,
  TableSkeleton,
  Toast,
} from './ui/DesignSystem.jsx';
import {
  BadgePercent,
  Plus,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  DollarSign,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function PricingManager() {
  const { token, user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [agreements, setAgreements] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: 'success', message: '' });

  // Form State
  const [formData, setFormData] = useState({
    companyId: '',
    agreementName: '',
    pricingType: 'fixed_per_trip',
    fixedTripRate: '',
    perKilometreRate: '',
    monthlyAmount: '',
    includedTrips: '',
    includedKilometres: '',
    additionalTripRate: '',
    additionalKmRate: '',
    customRules: '',
    notes: '',
  });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: 'success', message: '' }), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [agRes, compRes] = await Promise.all([
        pricingApi.getAgreements(token, { status: statusFilter, pricingType: typeFilter, search }),
        companyApi.getCompanies(token, { limit: 100 }),
      ]);
      setAgreements(agRes.agreements || []);
      setCompanies(compRes.companies || []);
    } catch (err) {
      showToast('error', err.message || 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, search]);

  const handleCreateAgreement = async (e) => {
    e.preventDefault();
    if (!formData.companyId || !formData.agreementName) {
      showToast('error', 'Please fill in the required fields.');
      return;
    }

    try {
      setSubmitting(true);
      await pricingApi.createAgreement(token, formData);
      showToast('success', 'Pricing agreement created successfully.');
      setIsModalOpen(false);
      setFormData({
        companyId: '',
        agreementName: '',
        pricingType: 'fixed_per_trip',
        fixedTripRate: '',
        perKilometreRate: '',
        monthlyAmount: '',
        includedTrips: '',
        includedKilometres: '',
        additionalTripRate: '',
        additionalKmRate: '',
        customRules: '',
        notes: '',
      });
      loadData();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (agreementId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await pricingApi.updateAgreementStatus(token, agreementId, nextStatus);
      showToast('success', `Agreement marked as ${nextStatus}.`);
      loadData();
    } catch (err) {
      showToast('error', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: 'success', message: '' })} />

      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <BadgePercent className="w-5 h-5 text-sky-400" />
            Pricing & Contract Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage company-specific rate agreements, per-trip rates, and contract tiers.
          </p>
        </div>

        {isOwner && (
          <Button icon={Plus} onClick={() => setIsModalOpen(true)} size="md">
            New Agreement
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          placeholder="Search by agreement name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Pricing Models</option>
          <option value="fixed_per_trip">Fixed Per Trip</option>
          <option value="per_kilometre">Per Kilometre</option>
          <option value="monthly_contract">Monthly Contract</option>
          <option value="custom">Custom Negotiated</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </Select>
      </div>

      {/* Agreements Table / Card Grid */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : agreements.length === 0 ? (
        <EmptyState
          title="No pricing agreements found"
          description="Create customized rate contracts for your commercial partners."
          action={
            isOwner ? (
              <Button size="sm" icon={Plus} onClick={() => setIsModalOpen(true)}>
                Add First Agreement
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agreements.map((ag) => (
            <Card key={ag._id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{ag.agreementName}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>{ag.companyId?.name || 'Unknown Company'}</span>
                  </div>
                </div>
                <Badge variant={ag.status === 'active' ? 'success' : 'default'}>
                  {ag.status}
                </Badge>
              </div>

              {/* Rate Detail Section */}
              <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80 space-y-1">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  {ag.pricingType.replace(/_/g, ' ')}
                </div>
                <div className="text-base font-bold text-slate-100">
                  {ag.pricingType === 'fixed_per_trip' && `₹${ag.fixedTripRate} / trip`}
                  {ag.pricingType === 'per_kilometre' && `₹${ag.perKilometreRate} / KM`}
                  {ag.pricingType === 'monthly_contract' && `₹${ag.monthlyAmount} / month`}
                  {ag.pricingType === 'custom' && 'Custom Negotiated'}
                </div>
                {ag.pricingType === 'monthly_contract' && (
                  <p className="text-[11px] text-slate-400">
                    Includes {ag.includedTrips || 0} trips & {ag.includedKilometres || 0} KM
                  </p>
                )}
              </div>

              {/* Footer with dates & toggle */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>Effective: {new Date(ag.effectiveFrom).toLocaleDateString()}</span>
                </div>

                {isOwner && (
                  <button
                    onClick={() => handleStatusToggle(ag._id, ag.status)}
                    className="text-xs font-medium text-sky-400 hover:text-sky-300"
                  >
                    {ag.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Agreement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Pricing Agreement"
      >
        <form onSubmit={handleCreateAgreement} className="space-y-4 text-xs">
          <Select
            label="Target Client Company *"
            value={formData.companyId}
            onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
            required
          >
            <option value="">Select a company...</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Input
            label="Agreement Name *"
            placeholder="e.g. FY26 Standard Logistics Contract"
            value={formData.agreementName}
            onChange={(e) => setFormData({ ...formData, agreementName: e.target.value })}
            required
          />

          <Select
            label="Pricing Model *"
            value={formData.pricingType}
            onChange={(e) => setFormData({ ...formData, pricingType: e.target.value })}
          >
            <option value="fixed_per_trip">Fixed Per Trip</option>
            <option value="per_kilometre">Per Kilometre (Distance-based)</option>
            <option value="monthly_contract">Monthly Retainer Contract</option>
            <option value="custom">Custom Negotiated</option>
          </Select>

          {/* Conditional Rate Fields */}
          {formData.pricingType === 'fixed_per_trip' && (
            <Input
              label="Fixed Trip Rate (₹) *"
              type="number"
              placeholder="e.g. 1500"
              value={formData.fixedTripRate}
              onChange={(e) => setFormData({ ...formData, fixedTripRate: e.target.value })}
              required
            />
          )}

          {formData.pricingType === 'per_kilometre' && (
            <Input
              label="Rate per Kilometre (₹/KM) *"
              type="number"
              placeholder="e.g. 22"
              value={formData.perKilometreRate}
              onChange={(e) => setFormData({ ...formData, perKilometreRate: e.target.value })}
              required
            />
          )}

          {formData.pricingType === 'monthly_contract' && (
            <div className="space-y-3">
              <Input
                label="Monthly Amount (₹) *"
                type="number"
                placeholder="e.g. 50000"
                value={formData.monthlyAmount}
                onChange={(e) => setFormData({ ...formData, monthlyAmount: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Included Trips"
                  type="number"
                  placeholder="e.g. 40"
                  value={formData.includedTrips}
                  onChange={(e) => setFormData({ ...formData, includedTrips: e.target.value })}
                />
                <Input
                  label="Included Kilometres"
                  type="number"
                  placeholder="e.g. 800"
                  value={formData.includedKilometres}
                  onChange={(e) => setFormData({ ...formData, includedKilometres: e.target.value })}
                />
              </div>
            </div>
          )}

          {formData.pricingType === 'custom' && (
            <Input
              label="Custom Negotiated Terms *"
              placeholder="Describe calculation terms..."
              value={formData.customRules}
              onChange={(e) => setFormData({ ...formData, customRules: e.target.value })}
              required
            />
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Agreement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

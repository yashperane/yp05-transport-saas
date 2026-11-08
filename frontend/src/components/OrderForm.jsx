import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { companyApi } from '../services/companyApi.js';
import { orderApi } from '../services/orderApi.js';
import {
  ClipboardList,
  MapPin,
  Calendar,
  Clock,
  Package,
  Users,
  Truck,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import DuplicateWarningModal from './DuplicateWarningModal.jsx';

export default function OrderForm({ onOrderCreated, onCancel, preselectedCompanyId = null }) {
  const { user, token } = useAuth();
  const isCompanyUser = ['company_admin', 'company_employee'].includes(user?.role);
  const isOwnerOrDispatcher = ['owner', 'dispatcher'].includes(user?.role);

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Duplicate Warning Modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateTopMatch, setDuplicateTopMatch] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    companyId: preselectedCompanyId || (isCompanyUser ? user.companyId : ''),
    orderType: 'goods', // 'goods' | 'labour' | 'mixed' | 'private_customer'
    creationSource: isCompanyUser ? 'company_portal' : 'phone_call_manual',
    customerName: '',
    customerPhone: '',
    pickupAddress: '',
    pickupContactPerson: '',
    pickupContactPhone: '',
    destinationAddress: '',
    destinationContactPerson: '',
    destinationContactPhone: '',
    requiredDate: new Date().toISOString().split('T')[0],
    requiredTime: '09:00 AM',
    materialDescription: '',
    quantity: 1,
    quantityUnit: 'bags',
    labourCount: 0,
    requiredVehicleType: 'pickup',
    specialInstructions: '',
    pricingDetails: {
      pricingType: 'manual',
      agreedAmount: 0,
      pricingNotes: '',
    },
  });

  useEffect(() => {
    if (isOwnerOrDispatcher) {
      loadCompanies();
    }
  }, [isOwnerOrDispatcher]);

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const data = await companyApi.getCompanies(token, { limit: 100 });
      setCompanies(data.companies || []);
    } catch (err) {
      console.warn('Failed to fetch companies for dropdown:', err.message);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const handleSubmit = async (e, bypass = false) => {
    if (e) e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        bypassDuplicateCheck: bypass,
      };

      const newOrder = await orderApi.createOrder(token, payload);
      setFormSuccess(`Order ${newOrder.orderNumber} created successfully!`);
      setShowDuplicateModal(false);

      if (onOrderCreated) {
        setTimeout(() => onOrderCreated(newOrder), 1200);
      }
    } catch (err) {
      if (err.code === 'POSSIBLE_DUPLICATE_ORDER') {
        setDuplicateTopMatch(err.topMatch);
        setShowDuplicateModal(true);
      } else {
        setFormError(err.message || 'Failed to create order');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-sky-400" />
            Book Transport Order
          </h3>
          <p className="text-xs text-slate-400">
            {isCompanyUser
              ? `Creating booking for workspace: ${user.companyName || 'My Company'}`
              : 'Direct booking & phone coordination intake'}
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>

      {formError && (
        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 text-xs">
        {/* Section A: Customer Details */}
        <div className="space-y-3">
          <span className="font-semibold text-sky-400 uppercase tracking-wider text-[11px] block">
            A. Customer & Order Type
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Order Type */}
            <div>
              <label className="block text-slate-300 mb-1">Order Type *</label>
              <select
                value={formData.orderType}
                onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="goods">Goods Transport (Materials, equipment)</option>
                <option value="labour">Labour Transport (Worker transit)</option>
                <option value="mixed">Mixed Transport (Labour + Goods)</option>
                <option value="private_customer">Private Customer Order</option>
              </select>
            </div>

            {/* Company Selection (Owner/Dispatcher only) */}
            {isOwnerOrDispatcher && (
              <div>
                <label className="block text-slate-300 mb-1">Company / Client</label>
                <select
                  value={formData.companyId}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">-- Private Individual (No Company) --</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.companyName} ({c.companyCode || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Creation Source */}
            {isOwnerOrDispatcher && (
              <div>
                <label className="block text-slate-300 mb-1">Intake Source</label>
                <select
                  value={formData.creationSource}
                  onChange={(e) => setFormData({ ...formData, creationSource: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="phone_call_manual">Phone Call Manual Order</option>
                  <option value="dispatcher_portal">Direct Dispatcher Order</option>
                  <option value="walk_in">Walk-in Customer</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Section B & C: Locations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pickup Location */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              Pickup Details
            </span>

            <div>
              <label className="block text-slate-300 mb-1">Pickup Address *</label>
              <textarea
                required
                rows="2"
                placeholder="Shop number, yard, landmark, or gate"
                value={formData.pickupAddress}
                onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="On-site contact"
                  value={formData.pickupContactPerson}
                  onChange={(e) => setFormData({ ...formData, pickupContactPerson: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="Phone number"
                  value={formData.pickupContactPhone}
                  onChange={(e) => setFormData({ ...formData, pickupContactPhone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
          </div>

          {/* Destination Location */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <span className="font-semibold text-sky-400 flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5" />
              Destination Details
            </span>

            <div>
              <label className="block text-slate-300 mb-1">Destination Address *</label>
              <textarea
                required
                rows="2"
                placeholder="Unloading site, factory depot, or project location"
                value={formData.destinationAddress}
                onChange={(e) => setFormData({ ...formData, destinationAddress: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none"
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Receiver Name</label>
                <input
                  type="text"
                  placeholder="Site incharge"
                  value={formData.destinationContactPerson}
                  onChange={(e) => setFormData({ ...formData, destinationContactPerson: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Receiver Phone</label>
                <input
                  type="text"
                  placeholder="Phone number"
                  value={formData.destinationContactPhone}
                  onChange={(e) => setFormData({ ...formData, destinationContactPhone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section D: Work Requirements (Dynamic based on orderType) */}
        <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl space-y-3">
          <span className="font-semibold text-amber-400 flex items-center gap-1.5 text-xs">
            <Package className="w-3.5 h-3.5" />
            Work & Cargo Requirements
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Show Material Description if goods, mixed, or private */}
            {['goods', 'mixed', 'private_customer'].includes(formData.orderType) && (
              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Material / Goods Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 bags cement, scaffolding pipes, electrical wire rolls"
                  value={formData.materialDescription}
                  onChange={(e) => setFormData({ ...formData, materialDescription: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            )}

            {/* Labour Count if labour or mixed */}
            {['labour', 'mixed'].includes(formData.orderType) && (
              <div>
                <label className="block text-slate-300 mb-1">Labour / Worker Count *</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 4"
                  value={formData.labourCount}
                  onChange={(e) => setFormData({ ...formData, labourCount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            )}

            {/* Quantity and Unit */}
            {['goods', 'mixed', 'private_customer'].includes(formData.orderType) && (
              <div>
                <label className="block text-slate-300 mb-1">Quantity & Unit</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                  />
                  <select
                    value={formData.quantityUnit}
                    onChange={(e) => setFormData({ ...formData, quantityUnit: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white"
                  >
                    <option value="bags">bags</option>
                    <option value="tons">tons</option>
                    <option value="kg">kg</option>
                    <option value="boxes">boxes</option>
                    <option value="trips">trips</option>
                    <option value="units">units</option>
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-300 mb-1">Vehicle Preference</label>
              <select
                value={formData.requiredVehicleType}
                onChange={(e) => setFormData({ ...formData, requiredVehicleType: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="pickup">Pickup (Standard 1-Ton)</option>
                <option value="tempo">Tempo (Sherkar 4-Vehicle Fleet)</option>
                <option value="truck">Truck (Heavy)</option>
                <option value="any">Any Available Vehicle</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section E: Schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 mb-1">Required Date *</label>
            <input
              type="date"
              required
              value={formData.requiredDate}
              onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Required Time *</label>
            <input
              type="text"
              required
              placeholder="e.g. 08:30 AM"
              value={formData.requiredTime}
              onChange={(e) => setFormData({ ...formData, requiredTime: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        {/* Section F: Pricing (Owner/Dispatcher only) */}
        {isOwnerOrDispatcher && (
          <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
            <span className="font-semibold text-teal-400 flex items-center gap-1.5 text-xs">
              <IndianRupee className="w-3.5 h-3.5" />
              Agreed Pricing & Commercials (Admin only)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Agreed Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1500"
                  value={formData.pricingDetails.agreedAmount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricingDetails: { ...formData.pricingDetails, agreedAmount: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Pricing Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Fixed trip rate agreed over phone"
                  value={formData.pricingDetails.pricingNotes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricingDetails: { ...formData.pricingDetails, pricingNotes: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Special Instructions */}
        <div>
          <label className="block text-slate-300 mb-1">Special Instructions</label>
          <textarea
            rows="2"
            placeholder="Gate entry pass requirements, helmet/safety shoes needed, or specific loading ramp directions"
            value={formData.specialInstructions}
            onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
          ></textarea>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow disabled:opacity-50 transition flex items-center gap-2"
          >
            {submitting ? 'Validating & Booking...' : 'Submit Order'}
          </button>
        </div>
      </form>

      {/* Duplicate Warning Dialog */}
      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        topMatch={duplicateTopMatch}
        onCancel={() => setShowDuplicateModal(false)}
        onProceedAnyway={() => handleSubmit(null, true)}
      />
    </div>
  );
}

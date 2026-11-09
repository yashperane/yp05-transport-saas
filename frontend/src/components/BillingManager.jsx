import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { billingApi } from '../services/billingApi.js';
import { reportApi } from '../services/reportApi.js';
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
  Receipt,
  Plus,
  Building2,
  Calendar,
  Search,
  Eye,
  Send,
  XCircle,
  CreditCard,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Wallet,
} from 'lucide-react';

const fmt = (n) => `₹${new Intl.NumberFormat('en-IN').format(n || 0)}`;

const STATUS_BADGE = {
  draft: 'default',
  issued: 'primary',
  partially_paid: 'warning',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'default',
};

const STATUS_LABEL = {
  draft: 'Draft',
  issued: 'Issued',
  partially_paid: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

export default function BillingManager() {
  const { user, token } = useAuth();
  const isOwner = user?.role === 'owner';
  const isDispatcher = user?.role === 'dispatcher';
  const isOwnerOrDispatcher = isOwner || isDispatcher;
  const isCompanyUser = ['company_admin', 'company_employee'].includes(user?.role);

  // Sub-tab navigation
  const [activeTab, setActiveTab] = useState('overview');
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3, show: isOwnerOrDispatcher },
    { id: 'invoices', label: 'Invoices', icon: Receipt, show: true },
    { id: 'payments', label: 'Payments', icon: Wallet, show: isOwnerOrDispatcher },
    { id: 'outstanding', label: 'Outstanding', icon: AlertTriangle, show: isOwnerOrDispatcher },
  ].filter((t) => t.show);

  // Data states
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [companies, setCompanies] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [companyReport, setCompanyReport] = useState([]);
  const [paymentLedger, setPaymentLedger] = useState([]);

  // Filter states
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentStartDate, setPaymentStartDate] = useState('');
  const [paymentEndDate, setPaymentEndDate] = useState('');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Detail view
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create invoice form
  const [createStep, setCreateStep] = useState(1);
  const [createCompanyId, setCreateCompanyId] = useState('');
  const [unbilledOrders, setUnbilledOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [createFormData, setCreateFormData] = useState({
    additionalCharges: '',
    discount: '',
    taxPercentage: '',
    notes: '',
    dueDate: '',
    issueImmediately: false,
  });
  const [unbilledLoading, setUnbilledLoading] = useState(false);

  // Payment form
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    transactionReference: '',
    notes: '',
  });
  const [paymentInvoiceInfo, setPaymentInvoiceInfo] = useState(null);

  // Cancel form
  const [cancelInvoiceId, setCancelInvoiceId] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // Action states
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ type: 'success', message: '' });

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: 'success', message: '' }), 4000);
  };

  // ──────────────── Data Loading ────────────────

  const loadInvoices = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (filterCompanyId) params.companyId = filterCompanyId;
      if (filterStatus) params.status = filterStatus;
      if (searchQuery) params.search = searchQuery;
      const res = await billingApi.getInvoices(token, params);
      setInvoices(res.invoices || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, filterCompanyId, filterStatus, searchQuery]);

  const loadCompanies = useCallback(async () => {
    if (!isOwnerOrDispatcher) return;
    try {
      const res = await companyApi.getCompanies(token, { limit: 200 });
      setCompanies(res.companies || []);
    } catch (err) {
      console.error('Failed to load companies:', err);
    }
  }, [token, isOwnerOrDispatcher]);

  const loadFinancials = useCallback(async () => {
    if (!isOwnerOrDispatcher) return;
    try {
      const data = await reportApi.getDashboardFinancials(token);
      setFinancials(data);
    } catch (err) {
      console.error('Failed to load financials:', err);
    }
  }, [token, isOwnerOrDispatcher]);

  const loadCompanyReport = useCallback(async () => {
    if (!isOwnerOrDispatcher) return;
    try {
      const data = await reportApi.getCompanyBillingReport(token);
      setCompanyReport(data.report || []);
    } catch (err) {
      console.error('Failed to load company report:', err);
    }
  }, [token, isOwnerOrDispatcher]);

  const loadPaymentLedger = useCallback(async () => {
    if (!isOwnerOrDispatcher) return;
    try {
      const params = {};
      if (paymentStartDate) params.startDate = paymentStartDate;
      if (paymentEndDate) params.endDate = paymentEndDate;
      if (filterCompanyId) params.companyId = filterCompanyId;
      const data = await reportApi.getPaymentLedger(token, params);
      setPaymentLedger(data.payments || []);
    } catch (err) {
      console.error('Failed to load payment ledger:', err);
    }
  }, [token, isOwnerOrDispatcher, paymentStartDate, paymentEndDate, filterCompanyId]);

  // Initial load
  useEffect(() => {
    loadInvoices();
    loadCompanies();
    loadFinancials();
  }, []);

  // Reload invoices when filters change
  useEffect(() => {
    loadInvoices(1);
  }, [filterCompanyId, filterStatus, searchQuery]);

  // Load tab-specific data
  useEffect(() => {
    if (activeTab === 'outstanding') loadCompanyReport();
    if (activeTab === 'payments') loadPaymentLedger();
  }, [activeTab]);

  // ──────────────── Create Invoice ────────────────

  const handleOpenCreateModal = () => {
    setCreateStep(1);
    setCreateCompanyId('');
    setUnbilledOrders([]);
    setSelectedOrderIds([]);
    setCreateFormData({ additionalCharges: '', discount: '', taxPercentage: '', notes: '', dueDate: '', issueImmediately: false });
    setCreateModalOpen(true);
  };

  const handleSelectCompanyForInvoice = async (companyId) => {
    setCreateCompanyId(companyId);
    if (!companyId) return;
    try {
      setUnbilledLoading(true);
      const data = await billingApi.getUnbilledOrders(token, companyId);
      setUnbilledOrders(data.orders || []);
      setSelectedOrderIds([]);
      setCreateStep(2);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setUnbilledLoading(false);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleCreateInvoice = async () => {
    if (!selectedOrderIds.length) {
      showToast('error', 'Please select at least one order.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        companyId: createCompanyId,
        orderIds: selectedOrderIds,
        additionalCharges: parseFloat(createFormData.additionalCharges) || 0,
        discount: parseFloat(createFormData.discount) || 0,
        taxPercentage: parseFloat(createFormData.taxPercentage) || 0,
        notes: createFormData.notes || '',
        issueImmediately: createFormData.issueImmediately,
      };
      if (createFormData.dueDate) payload.dueDate = createFormData.dueDate;
      await billingApi.createInvoice(token, payload);
      showToast('success', 'Invoice created successfully.');
      setCreateModalOpen(false);
      loadInvoices();
      loadFinancials();
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────── Invoice Detail ────────────────

  const handleViewInvoice = async (invoiceId) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const data = await billingApi.getInvoiceById(token, invoiceId);
      setSelectedInvoice(data.invoice);
      setSelectedPayments(data.payments || []);
    } catch (err) {
      showToast('error', err.message);
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ──────────────── Issue Invoice ────────────────

  const handleIssueInvoice = async (invoiceId) => {
    try {
      setSubmitting(true);
      await billingApi.issueInvoice(token, invoiceId);
      showToast('success', 'Invoice issued successfully.');
      loadInvoices();
      loadFinancials();
      if (detailModalOpen) handleViewInvoice(invoiceId);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────── Cancel Invoice ────────────────

  const openCancelModal = (invoiceId) => {
    setCancelInvoiceId(invoiceId);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  const handleCancelInvoice = async () => {
    if (!cancelReason.trim()) {
      showToast('error', 'Please provide a reason for cancellation.');
      return;
    }
    try {
      setSubmitting(true);
      await billingApi.cancelInvoice(token, cancelInvoiceId, cancelReason);
      showToast('success', 'Invoice cancelled.');
      setCancelModalOpen(false);
      loadInvoices();
      loadFinancials();
      if (detailModalOpen) setDetailModalOpen(false);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────── Record Payment ────────────────

  const openPaymentModal = (invoice = null) => {
    setPaymentForm({
      invoiceId: invoice?._id || '',
      amount: '',
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().split('T')[0],
      transactionReference: '',
      notes: '',
    });
    setPaymentInvoiceInfo(invoice);
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentForm.amount);
    if (!paymentForm.invoiceId || !amount || amount <= 0) {
      showToast('error', 'Please enter a valid amount and select an invoice.');
      return;
    }
    try {
      setSubmitting(true);
      await billingApi.recordPayment(token, {
        invoiceId: paymentForm.invoiceId,
        amount,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate || undefined,
        transactionReference: paymentForm.transactionReference || undefined,
        notes: paymentForm.notes || undefined,
      });
      showToast('success', 'Payment recorded successfully.');
      setPaymentModalOpen(false);
      loadInvoices();
      loadFinancials();
      if (activeTab === 'payments') loadPaymentLedger();
      if (detailModalOpen && selectedInvoice) handleViewInvoice(selectedInvoice._id);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────── Sub-Tab Navigation ────────────────

  const SubTabNav = () => (
    <div className="flex items-center gap-1 border-b border-slate-800/80 pb-0 mb-5 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              isActive
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  // ══════════════════════════════════════════════════════
  //  TAB: OVERVIEW (Financial KPIs)
  // ══════════════════════════════════════════════════════

  const OverviewTab = () => {
    if (!financials) return <TableSkeleton rows={3} cols={4} />;

    const kpis = [
      { label: 'Total Invoiced', value: fmt(financials.totalInvoiced), icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
      { label: 'Collected', value: fmt(financials.totalCollected), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
      { label: 'Outstanding', value: fmt(financials.totalOutstanding), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
      { label: 'Overdue', value: fmt(financials.totalOverdue), icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    ];

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">{kpi.label}</span>
                </div>
                <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            );
          })}
        </div>

        {/* Status Summary */}
        {financials.counts && (
          <Card header="Invoice Status Summary">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: 'Total', count: financials.counts.totalInvoices, variant: 'default' },
                { label: 'Draft', count: financials.counts.draft, variant: 'default' },
                { label: 'Issued', count: financials.counts.issued, variant: 'primary' },
                { label: 'Partial', count: financials.counts.partiallyPaid, variant: 'warning' },
                { label: 'Paid', count: financials.counts.paid, variant: 'success' },
                { label: 'Overdue', count: financials.counts.overdue, variant: 'danger' },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 bg-[#090D14] rounded-lg border border-slate-800/60">
                  <p className="text-lg font-bold text-slate-100">{s.count}</p>
                  <Badge variant={s.variant}>{s.label}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Invoices */}
        <Card
          header="Recent Invoices"
          action={
            isOwnerOrDispatcher && (
              <Button size="sm" icon={Plus} onClick={handleOpenCreateModal}>
                New Invoice
              </Button>
            )
          }
        >
          {invoices.length === 0 ? (
            <EmptyState title="No invoices yet" description="Create your first invoice to get started." icon={Receipt} />
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 5).map((inv) => (
                <div
                  key={inv._id}
                  className="flex items-center justify-between p-3 bg-[#090D14] rounded-lg border border-slate-800/50 hover:border-slate-700/60 transition cursor-pointer"
                  onClick={() => handleViewInvoice(inv._id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                      <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-100 truncate">{inv.invoiceNumber}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {inv.companyId?.companyName || 'N/A'} • {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-semibold text-slate-200">{fmt(inv.totalAmount)}</span>
                    <Badge variant={STATUS_BADGE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════
  //  TAB: INVOICES (Full list with filters)
  // ══════════════════════════════════════════════════════

  const InvoicesTab = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-100">All Invoices</h3>
        {isOwnerOrDispatcher && (
          <Button size="sm" icon={Plus} onClick={handleOpenCreateModal}>
            Create Invoice
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            className="w-full bg-[#090D14] border border-slate-800 text-slate-100 text-xs rounded-lg pl-9 pr-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20"
            placeholder="Search invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isOwnerOrDispatcher && (
          <Select
            value={filterCompanyId}
            onChange={(e) => setFilterCompanyId(e.target.value)}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>{c.companyName || c.companyCode}</option>
            ))}
          </Select>
        )}
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {/* Invoice List */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="Adjust filters or create a new invoice."
          icon={Receipt}
          action={
            isOwnerOrDispatcher && (
              <Button size="sm" icon={Plus} onClick={handleOpenCreateModal}>
                Create Invoice
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-[#0F1623] border border-slate-800/80 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800/60 bg-[#090D14]/60">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Invoice #</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Company</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Date</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Amount</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Balance</th>
                  <th className="text-center px-4 py-3 text-slate-400 font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-800/20 transition">
                    <td className="px-4 py-3 font-medium text-slate-200">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-300">{inv.companyId?.companyName || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-200">{fmt(inv.totalAmount)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${inv.balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {fmt(inv.balanceDue)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={STATUS_BADGE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" icon={Eye} onClick={() => handleViewInvoice(inv._id)} />
                        {isOwnerOrDispatcher && inv.status === 'draft' && (
                          <Button size="sm" variant="ghost" icon={Send} onClick={() => handleIssueInvoice(inv._id)} />
                        )}
                        {isOwnerOrDispatcher && ['issued', 'partially_paid'].includes(inv.status) && (
                          <Button size="sm" variant="ghost" icon={CreditCard} onClick={() => openPaymentModal(inv)} />
                        )}
                        {isOwner && ['draft', 'issued'].includes(inv.status) && (
                          <Button size="sm" variant="ghost" icon={XCircle} onClick={() => openCancelModal(inv._id)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {invoices.map((inv) => (
              <div
                key={inv._id}
                className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-100">{inv.invoiceNumber}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{inv.companyId?.companyName || '—'}</p>
                  </div>
                  <Badge variant={STATUS_BADGE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</span>
                  <span className="font-bold text-slate-100">{fmt(inv.totalAmount)}</span>
                </div>
                {inv.balanceDue > 0 && (
                  <p className="text-[11px] text-amber-400">Balance: {fmt(inv.balanceDue)}</p>
                )}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/50">
                  <Button size="sm" variant="outline" icon={Eye} onClick={() => handleViewInvoice(inv._id)}>
                    View
                  </Button>
                  {isOwnerOrDispatcher && inv.status === 'draft' && (
                    <Button size="sm" variant="outline" icon={Send} onClick={() => handleIssueInvoice(inv._id)}>
                      Issue
                    </Button>
                  )}
                  {isOwnerOrDispatcher && ['issued', 'partially_paid'].includes(inv.status) && (
                    <Button size="sm" variant="primary" icon={CreditCard} onClick={() => openPaymentModal(inv)}>
                      Pay
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                Page {pagination.page} of {pagination.totalPages} • {pagination.total} total
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  icon={ChevronLeft}
                  disabled={pagination.page <= 1}
                  onClick={() => loadInvoices(pagination.page - 1)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  icon={ChevronRight}
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadInvoices(pagination.page + 1)}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════
  //  TAB: PAYMENTS (Ledger)
  // ══════════════════════════════════════════════════════

  const PaymentsTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-100">Payment Ledger</h3>
        <Button size="sm" variant="secondary" onClick={loadPaymentLedger}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Input
          type="date"
          label="Start Date"
          value={paymentStartDate}
          onChange={(e) => { setPaymentStartDate(e.target.value); }}
        />
        <Input
          type="date"
          label="End Date"
          value={paymentEndDate}
          onChange={(e) => { setPaymentEndDate(e.target.value); }}
        />
        <div className="flex items-end">
          <Button size="md" variant="secondary" onClick={loadPaymentLedger} className="w-full">
            Apply Filters
          </Button>
        </div>
      </div>

      {paymentLedger.length === 0 ? (
        <EmptyState title="No payments recorded" description="Payment records will appear here." icon={Wallet} />
      ) : (
        <div className="bg-[#0F1623] border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-800/60 bg-[#090D14]/60">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Invoice</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Company</th>
                  <th className="text-right px-4 py-3 text-slate-400 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Method</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">Received By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {paymentLedger.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/20 transition">
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-medium text-indigo-400">
                      {p.invoiceId?.invoiceNumber || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {p.companyId?.companyName || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                      {fmt(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-300 capitalize">
                      {p.paymentMethod?.replace('_', ' ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {p.receivedByUserId?.name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════
  //  TAB: OUTSTANDING (Company-wise)
  // ══════════════════════════════════════════════════════

  const OutstandingTab = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-100">Outstanding Dues by Company</h3>

      {companyReport.length === 0 ? (
        <EmptyState title="No billing data" description="Company billing reports will appear after invoicing." icon={Building2} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {companyReport.map((c) => (
            <div
              key={c.companyId}
              className="bg-[#0F1623] border border-slate-800/80 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-100">{c.companyName}</p>
                  <p className="text-[11px] text-slate-400">{c.companyCode}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-[#090D14] rounded-lg border border-slate-800/50">
                  <p className="text-[11px] text-slate-400">Invoiced</p>
                  <p className="text-xs font-bold text-slate-200">{fmt(c.totalInvoiced)}</p>
                </div>
                <div className="p-2 bg-[#090D14] rounded-lg border border-slate-800/50">
                  <p className="text-[11px] text-slate-400">Paid</p>
                  <p className="text-xs font-bold text-emerald-400">{fmt(c.totalPaid)}</p>
                </div>
                <div className="p-2 bg-[#090D14] rounded-lg border border-slate-800/50">
                  <p className="text-[11px] text-slate-400">Outstanding</p>
                  <p className={`text-xs font-bold ${c.outstandingBalance > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {fmt(c.outstandingBalance)}
                  </p>
                </div>
                <div className="p-2 bg-[#090D14] rounded-lg border border-slate-800/50">
                  <p className="text-[11px] text-slate-400">Unbilled Orders</p>
                  <p className={`text-xs font-bold ${c.unbilledOrdersCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {c.unbilledOrdersCount}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════
  //  MODALS
  // ══════════════════════════════════════════════════════

  const subtotal = unbilledOrders
    .filter((o) => selectedOrderIds.includes(o._id))
    .reduce((sum, o) => sum + (o.pricingDetails?.finalAmount || 0), 0);

  const additionalChargesNum = parseFloat(createFormData.additionalCharges) || 0;
  const discountNum = parseFloat(createFormData.discount) || 0;
  const taxPctNum = parseFloat(createFormData.taxPercentage) || 0;
  const preTotal = Math.max(0, subtotal + additionalChargesNum - discountNum);
  const taxAmount = preTotal * (taxPctNum / 100);
  const grandTotal = preTotal + taxAmount;

  return (
    <div className="space-y-1">
      <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: 'success', message: '' })} />

      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-indigo-400" />
            Billing & Invoices
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Manage invoices, payments and outstanding dues</p>
        </div>
      </div>

      <SubTabNav />

      {/* Tab Content */}
      {activeTab === 'overview' && isOwnerOrDispatcher && <OverviewTab />}
      {activeTab === 'invoices' && <InvoicesTab />}
      {activeTab === 'payments' && isOwnerOrDispatcher && <PaymentsTab />}
      {activeTab === 'outstanding' && isOwnerOrDispatcher && <OutstandingTab />}

      {/* ═══ Create Invoice Modal ═══ */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={`Create Invoice — Step ${createStep} of 3`}
        maxWidth="max-w-2xl"
        footer={
          createStep === 3 && (
            <>
              <Button variant="secondary" onClick={() => setCreateStep(2)}>Back</Button>
              <Button loading={submitting} onClick={handleCreateInvoice}>
                {createFormData.issueImmediately ? 'Create & Issue' : 'Create Draft'}
              </Button>
            </>
          )
        }
      >
        {/* Step 1: Select Company */}
        {createStep === 1 && (
          <div className="space-y-3">
            <Select
              label="Select Company"
              value={createCompanyId}
              onChange={(e) => handleSelectCompanyForInvoice(e.target.value)}
            >
              <option value="">— Choose a company —</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>{c.companyName}</option>
              ))}
            </Select>
            {unbilledLoading && <TableSkeleton rows={3} cols={3} />}
          </div>
        )}

        {/* Step 2: Select Orders */}
        {createStep === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-300">
                Unbilled orders for <span className="font-semibold text-slate-100">{companies.find((c) => c._id === createCompanyId)?.companyName}</span>
              </p>
              <Button size="sm" variant="outline" onClick={() => setCreateStep(1)}>Change</Button>
            </div>

            {unbilledOrders.length === 0 ? (
              <EmptyState title="No unbilled orders" description="All orders for this company are already invoiced." icon={CheckCircle2} />
            ) : (
              <>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {unbilledOrders.map((order) => {
                    const isSelected = selectedOrderIds.includes(order._id);
                    return (
                      <label
                        key={order._id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-500/5 border-indigo-500/30'
                            : 'bg-[#090D14] border-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOrderSelection(order._id)}
                          className="w-3.5 h-3.5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">
                            {order.orderNumber || order._id.slice(-8)} • {order.pickup?.city || 'N/A'} → {order.delivery?.city || 'N/A'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {order.completedAt ? new Date(order.completedAt).toLocaleDateString('en-IN') : 'Completed'}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-200 shrink-0">
                          {fmt(order.pricingDetails?.finalAmount)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {selectedOrderIds.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                    <span className="text-xs text-slate-300">{selectedOrderIds.length} order(s) selected</span>
                    <span className="text-xs font-bold text-indigo-400">Subtotal: {fmt(subtotal)}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={selectedOrderIds.length === 0}
                    onClick={() => setCreateStep(3)}
                  >
                    Next: Review & Charges
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3: Review & Finalize */}
        {createStep === 3 && (
          <div className="space-y-4">
            <div className="p-3 bg-[#090D14] rounded-lg border border-slate-800/60 space-y-2">
              <p className="text-[11px] text-slate-400 font-medium uppercase">Line Items Summary</p>
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{selectedOrderIds.length} order(s)</span>
                <span className="font-semibold text-slate-200">Subtotal: {fmt(subtotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Additional Charges (₹)"
                type="number"
                placeholder="0"
                value={createFormData.additionalCharges}
                onChange={(e) => setCreateFormData({ ...createFormData, additionalCharges: e.target.value })}
              />
              <Input
                label="Discount (₹)"
                type="number"
                placeholder="0"
                value={createFormData.discount}
                onChange={(e) => setCreateFormData({ ...createFormData, discount: e.target.value })}
              />
              <Input
                label="Tax (%)"
                type="number"
                placeholder="0"
                value={createFormData.taxPercentage}
                onChange={(e) => setCreateFormData({ ...createFormData, taxPercentage: e.target.value })}
              />
            </div>

            {/* Totals */}
            <div className="p-3 bg-[#090D14] rounded-lg border border-slate-800/60 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {additionalChargesNum > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>+ Additional Charges</span><span>{fmt(additionalChargesNum)}</span>
                </div>
              )}
              {discountNum > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>− Discount</span><span>{fmt(discountNum)}</span>
                </div>
              )}
              {taxPctNum > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Tax ({taxPctNum}%)</span><span>{fmt(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-100 font-bold pt-1 border-t border-slate-800">
                <span>Grand Total</span><span>{fmt(grandTotal)}</span>
              </div>
            </div>

            <Input
              label="Due Date"
              type="date"
              value={createFormData.dueDate}
              onChange={(e) => setCreateFormData({ ...createFormData, dueDate: e.target.value })}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Notes</label>
              <textarea
                className="w-full bg-[#090D14] border border-slate-800 text-slate-100 text-xs rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 min-h-[60px]"
                placeholder="Optional notes..."
                value={createFormData.notes}
                onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createFormData.issueImmediately}
                onChange={(e) => setCreateFormData({ ...createFormData, issueImmediately: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
              />
              <span className="text-xs text-slate-300">Issue immediately (skip draft)</span>
            </label>
          </div>
        )}
      </Modal>

      {/* ═══ Invoice Detail Modal ═══ */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={selectedInvoice?.invoiceNumber || 'Invoice Details'}
        maxWidth="max-w-2xl"
        footer={
          selectedInvoice && (
            <>
              {isOwnerOrDispatcher && selectedInvoice.status === 'draft' && (
                <Button size="sm" icon={Send} loading={submitting} onClick={() => handleIssueInvoice(selectedInvoice._id)}>
                  Issue
                </Button>
              )}
              {isOwnerOrDispatcher && ['issued', 'partially_paid'].includes(selectedInvoice.status) && (
                <Button size="sm" icon={CreditCard} onClick={() => openPaymentModal(selectedInvoice)}>
                  Record Payment
                </Button>
              )}
              {isOwner && ['draft', 'issued'].includes(selectedInvoice.status) && (
                <Button size="sm" variant="danger" icon={XCircle} onClick={() => openCancelModal(selectedInvoice._id)}>
                  Cancel
                </Button>
              )}
            </>
          )
        }
      >
        {detailLoading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : selectedInvoice ? (
          <div className="space-y-4">
            {/* Header Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#090D14] rounded-lg border border-slate-800/60">
                <p className="text-[11px] text-slate-400">Company</p>
                <p className="text-xs font-medium text-slate-200">{selectedInvoice.companyId?.companyName || '—'}</p>
              </div>
              <div className="p-3 bg-[#090D14] rounded-lg border border-slate-800/60">
                <p className="text-[11px] text-slate-400">Status</p>
                <Badge variant={STATUS_BADGE[selectedInvoice.status]}>{STATUS_LABEL[selectedInvoice.status]}</Badge>
              </div>
              <div className="p-3 bg-[#090D14] rounded-lg border border-slate-800/60">
                <p className="text-[11px] text-slate-400">Created</p>
                <p className="text-xs text-slate-200">{new Date(selectedInvoice.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <div className="p-3 bg-[#090D14] rounded-lg border border-slate-800/60">
                <p className="text-[11px] text-slate-400">Due Date</p>
                <p className="text-xs text-slate-200">
                  {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN') : '—'}
                </p>
              </div>
            </div>

            {/* Line Items */}
            {selectedInvoice.lineItems?.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase mb-2">Line Items</p>
                <div className="space-y-1.5">
                  {selectedInvoice.lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between p-2.5 bg-[#090D14] rounded-lg border border-slate-800/50 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-200 truncate">{item.description || `Order ${item.orderId?.toString().slice(-8)}`}</p>
                        {item.pricingType && <p className="text-[11px] text-slate-500 capitalize">{item.pricingType.replace('_', ' ')}</p>}
                      </div>
                      <span className="font-semibold text-slate-200 shrink-0 ml-3">{fmt(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="p-3 bg-[#090D14] rounded-lg border border-slate-800/60 space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span><span>{fmt(selectedInvoice.subtotal)}</span>
              </div>
              {selectedInvoice.additionalCharges > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Additional Charges</span><span>{fmt(selectedInvoice.additionalCharges)}</span>
                </div>
              )}
              {selectedInvoice.discount > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Discount</span><span>−{fmt(selectedInvoice.discount)}</span>
                </div>
              )}
              {selectedInvoice.taxAmount > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Tax ({selectedInvoice.taxPercentage}%)</span><span>{fmt(selectedInvoice.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-100 font-bold pt-1 border-t border-slate-800">
                <span>Total</span><span>{fmt(selectedInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Paid</span><span>{fmt(selectedInvoice.amountPaid)}</span>
              </div>
              <div className={`flex justify-between font-bold ${selectedInvoice.balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                <span>Balance Due</span><span>{fmt(selectedInvoice.balanceDue)}</span>
              </div>
            </div>

            {/* Payment History */}
            {selectedPayments.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase mb-2">Payment History</p>
                <div className="space-y-1.5">
                  {selectedPayments.map((p) => (
                    <div key={p._id} className="flex items-center justify-between p-2.5 bg-[#090D14] rounded-lg border border-slate-800/50 text-xs">
                      <div>
                        <p className="text-slate-200">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</p>
                        <p className="text-[11px] text-slate-400 capitalize">{p.paymentMethod?.replace('_', ' ')}</p>
                      </div>
                      <span className="font-semibold text-emerald-400">{fmt(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedInvoice.notes && (
              <div className="p-3 bg-[#090D14] rounded-lg border border-slate-800/60">
                <p className="text-[11px] text-slate-400 font-medium mb-1">Notes</p>
                <p className="text-xs text-slate-300">{selectedInvoice.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* ═══ Record Payment Modal ═══ */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Record Payment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button loading={submitting} onClick={handleRecordPayment} icon={CreditCard}>
              Record Payment
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {paymentInvoiceInfo ? (
            <div className="p-3 bg-[#090D14] rounded-lg border border-slate-800/60 space-y-1">
              <p className="text-xs font-medium text-slate-200">{paymentInvoiceInfo.invoiceNumber}</p>
              <p className="text-[11px] text-slate-400">{paymentInvoiceInfo.companyId?.companyName || '—'}</p>
              <div className="flex justify-between text-xs pt-1">
                <span className="text-slate-400">Total: {fmt(paymentInvoiceInfo.totalAmount)}</span>
                <span className="text-amber-400 font-semibold">Due: {fmt(paymentInvoiceInfo.balanceDue)}</span>
              </div>
            </div>
          ) : (
            <Select
              label="Select Invoice"
              value={paymentForm.invoiceId}
              onChange={(e) => setPaymentForm({ ...paymentForm, invoiceId: e.target.value })}
            >
              <option value="">— Choose an invoice —</option>
              {invoices.filter((i) => ['issued', 'partially_paid'].includes(i.status)).map((i) => (
                <option key={i._id} value={i._id}>
                  {i.invoiceNumber} — Due: {fmt(i.balanceDue)}
                </option>
              ))}
            </Select>
          )}

          <Input
            label="Payment Amount (₹)"
            type="number"
            placeholder="Enter amount"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            helper={paymentInvoiceInfo ? `Max: ${fmt(paymentInvoiceInfo.balanceDue)}` : ''}
          />

          <Select
            label="Payment Method"
            value={paymentForm.paymentMethod}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>

          <Input
            label="Payment Date"
            type="date"
            value={paymentForm.paymentDate}
            onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
          />

          <Input
            label="Transaction Reference"
            placeholder="UPI ID, cheque no, etc."
            value={paymentForm.transactionReference}
            onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Notes</label>
            <textarea
              className="w-full bg-[#090D14] border border-slate-800 text-slate-100 text-xs rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 min-h-[60px]"
              placeholder="Optional notes..."
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
            />
          </div>
        </div>
      </Modal>

      {/* ═══ Cancel Invoice Modal ═══ */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Invoice"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>Go Back</Button>
            <Button variant="danger" loading={submitting} onClick={handleCancelInvoice} icon={XCircle}>
              Confirm Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg">
            <p className="text-xs text-rose-300">
              Cancelling an invoice will release all linked orders back to "unbilled" status. This action cannot be undone.
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Reason for Cancellation *</label>
            <textarea
              className="w-full bg-[#090D14] border border-slate-800 text-slate-100 text-xs rounded-lg px-3 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 min-h-[80px]"
              placeholder="Why is this invoice being cancelled?"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

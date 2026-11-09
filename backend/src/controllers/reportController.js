import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { Company } from '../models/Company.js';
import { roundMoney } from '../services/pricingService.js';

/**
 * GET /api/reports/dashboard-financials
 * Executive KPI summary of revenue, collected cash, outstanding, and overdue amounts
 */
export const getDashboardFinancials = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;

    const [invoices, payments, completedOrdersCount] = await Promise.all([
      Invoice.find({ transportBusinessId, status: { $ne: 'cancelled' } }).select('status totalAmount amountPaid balanceDue dueDate').lean(),
      Payment.find({ transportBusinessId, status: 'recorded' }).select('amount paymentDate').lean(),
      Order.countDocuments({ transportBusinessId, status: 'completed' }),
    ]);

    const now = new Date();
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;

    let issuedCount = 0;
    let paidCount = 0;
    let partiallyPaidCount = 0;
    let overdueCount = 0;
    let draftCount = 0;

    for (const inv of invoices) {
      if (inv.status === 'draft') {
        draftCount++;
        continue;
      }

      totalInvoiced += inv.totalAmount || 0;
      totalCollected += inv.amountPaid || 0;
      totalOutstanding += inv.balanceDue || 0;

      if (inv.status === 'paid') paidCount++;
      else if (inv.status === 'partially_paid') partiallyPaidCount++;
      else issuedCount++;

      // Check if overdue
      if (inv.balanceDue > 0 && new Date(inv.dueDate) < now) {
        totalOverdue += inv.balanceDue;
        overdueCount++;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        totalInvoiced: roundMoney(totalInvoiced),
        totalCollected: roundMoney(totalCollected),
        totalOutstanding: roundMoney(totalOutstanding),
        totalOverdue: roundMoney(totalOverdue),
        completedOrdersCount,
        counts: {
          draft: draftCount,
          issued: issuedCount,
          partiallyPaid: partiallyPaidCount,
          paid: paidCount,
          overdue: overdueCount,
          totalInvoices: invoices.length,
        },
      },
    });
  } catch (error) {
    console.error('getDashboardFinancials error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve financial summary.' },
    });
  }
};

/**
 * GET /api/reports/company-billing
 * Company-wise breakdown of invoiced, paid, and outstanding balances
 */
export const getCompanyBillingReport = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;

    const [companies, invoices, orders] = await Promise.all([
      Company.find({ transportBusinessId }).select('_id companyName companyCode phone email').lean(),
      Invoice.find({ transportBusinessId, status: { $ne: 'cancelled' } }).select('companyId status totalAmount amountPaid balanceDue').lean(),
      Order.find({ transportBusinessId, status: 'completed' }).select('companyId invoicingStatus pricingDetails').lean(),
    ]);

    const report = companies.map((c) => {
      const companyInvoices = invoices.filter((i) => i.companyId?.toString() === c._id.toString());
      const companyOrders = orders.filter((o) => o.companyId?.toString() === c._id.toString());

      const invoiced = companyInvoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
      const paid = companyInvoices.reduce((acc, i) => acc + (i.amountPaid || 0), 0);
      const outstanding = companyInvoices.reduce((acc, i) => acc + (i.balanceDue || 0), 0);

      const unbilledOrdersCount = companyOrders.filter((o) => o.invoicingStatus === 'unbilled').length;

      return {
        companyId: c._id,
        companyName: c.companyName,
        companyCode: c.companyCode,
        phone: c.phone,
        totalCompletedOrders: companyOrders.length,
        unbilledOrdersCount,
        totalInvoiced: roundMoney(invoiced),
        totalPaid: roundMoney(paid),
        outstandingBalance: roundMoney(outstanding),
      };
    });

    return res.status(200).json({
      success: true,
      data: { report },
    });
  } catch (error) {
    console.error('getCompanyBillingReport error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to generate company billing report.' },
    });
  }
};

/**
 * GET /api/reports/payments
 * Payments ledger with date filters
 */
export const getPaymentLedger = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { startDate, endDate, companyId, limit = 50 } = req.query;

    const query = { transportBusinessId, status: 'recorded' };
    if (companyId) query.companyId = companyId;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('companyId', 'companyName companyCode')
      .populate('invoiceId', 'invoiceNumber')
      .populate('receivedByUserId', 'name')
      .sort({ paymentDate: -1 })
      .limit(Math.min(100, parseInt(limit, 10)))
      .lean();

    return res.status(200).json({
      success: true,
      data: { payments },
    });
  } catch (error) {
    console.error('getPaymentLedger error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve payment ledger.' },
    });
  }
};

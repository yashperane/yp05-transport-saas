import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { Company } from '../models/Company.js';
import { billingService } from '../services/billingService.js';
import { roundMoney } from '../services/pricingService.js';

/**
 * GET /api/invoices
 * List invoices with filters, search, and pagination
 */
export const getInvoices = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userRole = req.user.role;
    const { companyId, status, search, page = 1, limit = 20 } = req.query;

    const query = { transportBusinessId };

    // Tenant / Company scoping: If company user, restrict to their company only
    if (['company_admin', 'company_employee'].includes(userRole)) {
      query.companyId = req.user.companyId;
      // Company users should not see draft invoices
      query.status = { $ne: 'draft' };
    } else if (companyId) {
      query.companyId = companyId;
    }

    if (status) {
      query.status = status;
    }

    if (search && search.trim()) {
      query.invoiceNumber = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [invoices, total] = await Promise.all([
      Invoice.find(query)
        .populate('companyId', 'companyName companyCode phone email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Invoice.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        invoices,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('getInvoices error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve invoices.' },
    });
  }
};

/**
 * GET /api/invoices/unbilled-orders
 * List completed, unbilled orders eligible for inclusion in an invoice
 */
export const getUnbilledOrders = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Company ID is required.' },
      });
    }

    const orders = await Order.find({
      transportBusinessId,
      companyId,
      status: 'completed',
      invoicingStatus: 'unbilled',
    })
      .sort({ completedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error('getUnbilledOrders error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve unbilled orders.' },
    });
  }
};

/**
 * GET /api/invoices/:invoiceId
 * Retrieve full invoice details including linked line items and payments
 */
export const getInvoiceById = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { invoiceId } = req.params;
    const userRole = req.user.role;

    const invoice = await Invoice.findOne({ _id: invoiceId, transportBusinessId })
      .populate('companyId', 'companyName companyCode phone email address billingAddress')
      .populate('createdByUserId', 'name email')
      .lean();

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invoice not found.' },
      });
    }

    // Role check: Company user cannot view other company's invoice
    if (['company_admin', 'company_employee'].includes(userRole)) {
      if (invoice.companyId._id.toString() !== req.user.companyId.toString()) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Unauthorized to view this invoice.' },
        });
      }
    }

    const payments = await Payment.find({ invoiceId, transportBusinessId })
      .sort({ paymentDate: -1 })
      .populate('receivedByUserId', 'name')
      .lean();

    return res.status(200).json({
      success: true,
      data: { invoice, payments },
    });
  } catch (error) {
    console.error('getInvoiceById error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve invoice details.' },
    });
  }
};

/**
 * POST /api/invoices
 * Create a new invoice
 */
export const createInvoice = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    const invoice = await billingService.createInvoice({
      ...req.body,
      transportBusinessId,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully.',
      data: { invoice },
    });
  } catch (error) {
    console.error('createInvoice error:', error);
    return res.status(400).json({
      success: false,
      error: { code: 'INVOICE_CREATION_FAILED', message: error.message },
    });
  }
};

/**
 * POST /api/invoices/:invoiceId/issue
 * Issue a draft invoice
 */
export const issueInvoice = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { invoiceId } = req.params;
    const userId = req.user._id;

    const invoice = await billingService.issueInvoice({
      transportBusinessId,
      invoiceId,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Invoice issued successfully.',
      data: { invoice },
    });
  } catch (error) {
    console.error('issueInvoice error:', error);
    return res.status(400).json({
      success: false,
      error: { code: 'ISSUE_FAILED', message: error.message },
    });
  }
};

/**
 * POST /api/invoices/:invoiceId/cancel
 * Cancel an invoice
 */
export const cancelInvoice = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { invoiceId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const invoice = await billingService.cancelInvoice({
      transportBusinessId,
      invoiceId,
      reason,
      userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Invoice cancelled successfully.',
      data: { invoice },
    });
  } catch (error) {
    console.error('cancelInvoice error:', error);
    return res.status(400).json({
      success: false,
      error: { code: 'CANCEL_FAILED', message: error.message },
    });
  }
};

/**
 * POST /api/payments
 * Record a payment against an invoice
 */
export const recordPayment = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;
    const { invoiceId, amount, paymentMethod, paymentDate, transactionReference, notes } = req.body;

    const result = await billingService.recordPayment({
      transportBusinessId,
      invoiceId,
      amount,
      paymentMethod,
      paymentDate,
      transactionReference,
      notes,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      data: result,
    });
  } catch (error) {
    console.error('recordPayment error:', error);
    return res.status(400).json({
      success: false,
      error: { code: 'PAYMENT_FAILED', message: error.message },
    });
  }
};

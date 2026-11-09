import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { generateInvoiceNumber, generatePaymentReference } from './billingNumberService.js';
import { roundMoney } from './pricingService.js';
import { realtimeService } from './realtimeService.js';

export const billingService = {
  /**
   * Calculate invoice totals with integer paise/cents rounding
   */
  calculateInvoiceTotals({ lineItems = [], additionalCharges = 0, discount = 0, taxPercentage = 0 }) {
    const subtotal = roundMoney(
      lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0)
    );
    const validAdditional = Math.max(0, roundMoney(additionalCharges));
    const validDiscount = Math.max(0, roundMoney(discount));
    const netBeforeTax = Math.max(0, roundMoney(subtotal + validAdditional - validDiscount));

    const validTaxPercent = Math.max(0, Math.min(100, Number(taxPercentage) || 0));
    const taxAmount = roundMoney((netBeforeTax * validTaxPercent) / 100);
    const totalAmount = roundMoney(netBeforeTax + taxAmount);

    return {
      subtotal,
      additionalCharges: validAdditional,
      discount: validDiscount,
      taxPercentage: validTaxPercent,
      taxAmount,
      totalAmount,
    };
  },

  /**
   * Create an invoice from completed, unbilled orders
   */
  async createInvoice({
    transportBusinessId,
    companyId,
    orderIds = [],
    dueDate,
    additionalCharges = 0,
    additionalChargesDescription = '',
    discount = 0,
    taxPercentage = 0,
    paymentInstructions = {},
    notes = '',
    userId,
    status = 'draft',
  }) {
    if (!companyId) throw new Error('Company is required for invoicing.');
    if (!dueDate) throw new Error('Due date is required.');

    // Fetch and validate orders: must be completed and unbilled
    let lineItems = [];
    let validOrderIds = [];

    if (orderIds && orderIds.length > 0) {
      const orders = await Order.find({
        _id: { $in: orderIds },
        transportBusinessId,
        companyId,
      });

      for (const order of orders) {
        if (order.status !== 'completed') {
          throw new Error(`Order ${order.orderNumber} is not completed. Only completed orders can be invoiced.`);
        }
        if (order.invoicingStatus === 'invoiced') {
          throw new Error(`Order ${order.orderNumber} has already been invoiced in an existing invoice.`);
        }

        const pricing = order.pricingDetails || {};
        const amount = roundMoney(pricing.finalAmount || pricing.agreedRate || 0);

        lineItems.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          description: `Transport Service - Order ${order.orderNumber}`,
          routeDescription: `${order.pickupLocation?.address || ''} -> ${order.destinationLocation?.address || ''}`,
          vehicleType: order.requiredVehicleType || 'pickup',
          pricingType: pricing.pricingType || 'fixed_per_trip',
          rate: roundMoney(pricing.agreedRate || amount),
          quantity: 1,
          amount,
        });

        validOrderIds.push(order._id);
      }
    }

    const totals = this.calculateInvoiceTotals({
      lineItems,
      additionalCharges,
      discount,
      taxPercentage,
    });

    const invoiceNumber = await generateInvoiceNumber(transportBusinessId);

    const invoice = await Invoice.create({
      transportBusinessId,
      companyId,
      invoiceNumber,
      orderReferences: validOrderIds,
      lineItems,
      subtotal: totals.subtotal,
      additionalCharges: totals.additionalCharges,
      additionalChargesDescription: additionalChargesDescription.trim(),
      discount: totals.discount,
      taxPercentage: totals.taxPercentage,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      amountPaid: 0,
      balanceDue: totals.totalAmount,
      dueDate: new Date(dueDate),
      status: status === 'issued' ? 'issued' : 'draft',
      paymentInstructions,
      notes: notes.trim(),
      createdByUserId: userId,
      issuedByUserId: status === 'issued' ? userId : null,
    });

    // If issued immediately, mark orders as invoiced
    if (status === 'issued' && validOrderIds.length > 0) {
      await Order.updateMany(
        { _id: { $in: validOrderIds } },
        { invoicingStatus: 'invoiced', invoiceId: invoice._id, invoicedAt: new Date() }
      );
    }

    // Socket.IO real-time notification
    realtimeService.emitToTenant(transportBusinessId, 'invoice:created', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      companyId,
      totalAmount: invoice.totalAmount,
      status: invoice.status,
    });

    return invoice;
  },

  /**
   * Issue a draft invoice
   */
  async issueInvoice({ transportBusinessId, invoiceId, userId }) {
    const invoice = await Invoice.findOne({ _id: invoiceId, transportBusinessId });
    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status !== 'draft') throw new Error(`Only draft invoices can be issued. Current status: ${invoice.status}`);

    invoice.status = 'issued';
    invoice.issuedByUserId = userId;
    invoice.issueDate = new Date();
    await invoice.save();

    // Lock linked orders as invoiced
    if (invoice.orderReferences && invoice.orderReferences.length > 0) {
      await Order.updateMany(
        { _id: { $in: invoice.orderReferences } },
        { invoicingStatus: 'invoiced', invoiceId: invoice._id, invoicedAt: new Date() }
      );
    }

    realtimeService.emitToTenant(transportBusinessId, 'invoice:issued', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
    });

    return invoice;
  },

  /**
   * Record a payment against an invoice
   */
  async recordPayment({
    transportBusinessId,
    invoiceId,
    amount,
    paymentMethod,
    paymentDate = new Date(),
    transactionReference = '',
    notes = '',
    userId,
  }) {
    const parsedAmount = roundMoney(amount);
    if (parsedAmount <= 0) throw new Error('Payment amount must be greater than zero.');

    const invoice = await Invoice.findOne({ _id: invoiceId, transportBusinessId });
    if (!invoice) throw new Error('Invoice not found.');
    if (['cancelled', 'draft'].includes(invoice.status)) {
      throw new Error(`Payments cannot be recorded on ${invoice.status} invoices.`);
    }

    if (parsedAmount > invoice.balanceDue) {
      throw new Error(`Payment (₹${parsedAmount}) exceeds the remaining balance due (₹${invoice.balanceDue}).`);
    }

    const paymentReference = await generatePaymentReference(transportBusinessId);

    const payment = await Payment.create({
      transportBusinessId,
      invoiceId,
      companyId: invoice.companyId,
      paymentReference,
      amount: parsedAmount,
      paymentMethod,
      paymentDate: new Date(paymentDate),
      transactionReference: transactionReference.trim(),
      notes: notes.trim(),
      receivedByUserId: userId,
    });

    // Atomically recalculate invoice balances
    const newAmountPaid = roundMoney(invoice.amountPaid + parsedAmount);
    const newBalanceDue = roundMoney(invoice.totalAmount - newAmountPaid);
    const newStatus = newBalanceDue === 0 ? 'paid' : 'partially_paid';

    invoice.amountPaid = newAmountPaid;
    invoice.balanceDue = newBalanceDue;
    invoice.status = newStatus;
    await invoice.save();

    realtimeService.emitToTenant(transportBusinessId, 'payment:recorded', {
      paymentId: payment._id,
      invoiceId: invoice._id,
      amount: parsedAmount,
      newBalanceDue,
      status: invoice.status,
    });

    return { payment, invoice };
  },

  /**
   * Cancel an invoice and release its orders back to unbilled
   */
  async cancelInvoice({ transportBusinessId, invoiceId, reason, userId }) {
    const invoice = await Invoice.findOne({ _id: invoiceId, transportBusinessId });
    if (!invoice) throw new Error('Invoice not found.');
    if (invoice.status === 'paid') throw new Error('Fully paid invoices cannot be cancelled.');

    if (invoice.amountPaid > 0) {
      throw new Error('Invoices with recorded payments cannot be cancelled. Reverse payments first.');
    }

    invoice.status = 'cancelled';
    invoice.cancelledAt = new Date();
    invoice.cancelledByUserId = userId;
    invoice.cancellationReason = (reason || '').trim();
    await invoice.save();

    // Release linked orders back to unbilled
    if (invoice.orderReferences && invoice.orderReferences.length > 0) {
      await Order.updateMany(
        { _id: { $in: invoice.orderReferences } },
        { invoicingStatus: 'unbilled', invoiceId: null, invoicedAt: null }
      );
    }

    realtimeService.emitToTenant(transportBusinessId, 'invoice:cancelled', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      status: 'cancelled',
    });

    return invoice;
  },
};

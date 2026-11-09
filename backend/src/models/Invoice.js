import mongoose from 'mongoose';

/**
 * Line item schema for transport invoice
 */
const invoiceLineItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    orderNumber: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    routeDescription: {
      type: String,
      default: '',
    },
    vehicleType: {
      type: String,
      default: '',
    },
    pricingType: {
      type: String,
      default: 'fixed_per_trip',
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true }
);

/**
 * Invoice Model
 * Represents a formal billing document issued by a Transport Business to a Client Company.
 */
const invoiceSchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    billingPeriod: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
    },
    orderReferences: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
      },
    ],
    lineItems: [invoiceLineItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    additionalCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    additionalChargesDescription: {
      type: String,
      default: '',
      trim: true,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    issueDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
      index: true,
    },
    paymentInstructions: {
      bankName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    issuedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for tenant isolation & unique invoice numbering
invoiceSchema.index({ transportBusinessId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ transportBusinessId: 1, companyId: 1, status: 1 });
invoiceSchema.index({ transportBusinessId: 1, dueDate: 1, status: 1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);

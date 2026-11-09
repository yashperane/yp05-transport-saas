import mongoose from 'mongoose';

/**
 * Payment Model
 * Records a real-world payment received against an issued invoice.
 */
const paymentSchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    paymentReference: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Payment amount must be greater than zero'],
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'UPI', 'bank_transfer', 'cheque', 'other'],
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    receivedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['recorded', 'reconciled', 'void'],
      default: 'recorded',
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ transportBusinessId: 1, invoiceId: 1 });
paymentSchema.index({ transportBusinessId: 1, paymentDate: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);

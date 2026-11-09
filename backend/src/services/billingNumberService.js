import { Counter } from '../models/Counter.js';

/**
 * Generate sequential invoice number: INV-YYYYMM-XXXX
 * Uses atomic findOneAndUpdate on the Counter collection to ensure uniqueness even under concurrency.
 */
export const generateInvoiceNumber = async (transportBusinessId) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const period = `${year}${month}`; // e.g. "202611"
  const counterKey = `invoice_${transportBusinessId}_${period}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const sequence = String(counter.seq).padStart(4, '0');
  return `INV-${period}-${sequence}`;
};

/**
 * Generate payment reference number: PAY-YYYYMM-XXXX
 */
export const generatePaymentReference = async (transportBusinessId) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const period = `${year}${month}`;
  const counterKey = `payment_${transportBusinessId}_${period}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const sequence = String(counter.seq).padStart(4, '0');
  return `PAY-${period}-${sequence}`;
};

import { Counter } from '../models/Counter.js';

/**
 * Generate a sequential, collision-safe Order Number per transport business.
 * Uses atomic MongoDB findOneAndUpdate with $inc to guarantee no race conditions.
 * Format: ORD-000001, ORD-000002, etc.
 * 
 * @param {string|mongoose.Types.ObjectId} transportBusinessId 
 * @returns {Promise<string>} Generated order number
 */
export const generateOrderNumber = async (transportBusinessId) => {
  const counter = await Counter.findOneAndUpdate(
    { transportBusinessId, key: 'order' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  const paddedSequence = String(counter.sequence).padStart(6, '0');
  return `ORD-${paddedSequence}`;
};

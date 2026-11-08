import { OrderHistory } from '../models/OrderHistory.js';

/**
 * Log an immutable order event to the audit trail
 * 
 * @param {object} params
 * @param {string|ObjectId} params.transportBusinessId
 * @param {string|ObjectId} params.orderId
 * @param {string|ObjectId} params.performedByUserId
 * @param {string} params.action (ORDER_CREATED, STATUS_UPDATED, ORDER_CANCELLED, etc.)
 * @param {any} [params.previousValue]
 * @param {any} [params.newValue]
 * @param {string} [params.description]
 */
export const recordOrderHistory = async ({
  transportBusinessId,
  orderId,
  performedByUserId,
  action,
  previousValue = null,
  newValue = null,
  description = '',
}) => {
  try {
    await OrderHistory.create({
      transportBusinessId,
      orderId,
      performedByUserId,
      action,
      previousValue,
      newValue,
      description,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to write OrderHistory audit log:', err.message);
  }
};

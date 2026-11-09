import { PricingAgreement } from '../models/PricingAgreement.js';
import { Company } from '../models/Company.js';
import { Order } from '../models/Order.js';
import { pricingEngine, roundMoney } from '../services/pricingService.js';
import { recordOrderHistory } from '../services/orderHistoryService.js';
import { realtimeService } from '../services/realtimeService.js';

/**
 * GET /api/pricing/agreements
 * List all pricing agreements for tenant with filters.
 */
export const getAgreements = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { companyId, status, pricingType, search } = req.query;

    const query = { transportBusinessId };
    if (companyId) query.companyId = companyId;
    if (status) query.status = status;
    if (pricingType) query.pricingType = pricingType;

    if (search && search.trim()) {
      query.agreementName = { $regex: search.trim(), $options: 'i' };
    }

    const agreements = await PricingAgreement.find(query)
      .populate('companyId', 'companyName companyCode contactPerson phone email')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { agreements },
    });
  } catch (error) {
    console.error('getAgreements error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to retrieve pricing agreements.' },
    });
  }
};

/**
 * POST /api/pricing/agreements
 * Create a new pricing agreement for a client company.
 */
export const createAgreement = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const userId = req.user._id;

    const {
      companyId,
      agreementName,
      pricingType,
      fixedTripRate,
      perKilometreRate,
      monthlyAmount,
      includedTrips,
      includedKilometres,
      additionalTripRate,
      additionalKmRate,
      customRules,
      routeRules,
      vehicleTypeRules,
      effectiveFrom,
      effectiveUntil,
      notes,
    } = req.body;

    if (!companyId || !agreementName || !pricingType) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Company, Agreement Name, and Pricing Type are required.' },
      });
    }

    // Verify company belongs to tenant
    const company = await Company.findOne({ _id: companyId, transportBusinessId });
    if (!company) {
      return res.status(404).json({
        success: false,
        error: { code: 'COMPANY_NOT_FOUND', message: 'Target company not found in this business.' },
      });
    }

    const agreement = await PricingAgreement.create({
      transportBusinessId,
      companyId,
      agreementName: agreementName.trim(),
      pricingType,
      fixedTripRate: roundMoney(fixedTripRate),
      perKilometreRate: roundMoney(perKilometreRate),
      monthlyAmount: roundMoney(monthlyAmount),
      includedTrips: Number(includedTrips) || 0,
      includedKilometres: Number(includedKilometres) || 0,
      additionalTripRate: roundMoney(additionalTripRate),
      additionalKmRate: roundMoney(additionalKmRate),
      customRules: customRules ? customRules.trim() : '',
      routeRules: Array.isArray(routeRules) ? routeRules : [],
      vehicleTypeRules: Array.isArray(vehicleTypeRules) ? vehicleTypeRules : [],
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
      status: 'active',
      notes: notes ? notes.trim() : '',
      createdByUserId: userId,
    });

    // Real-time socket event
    realtimeService.emitToTenant(transportBusinessId, 'pricing:agreement_created', {
      agreementId: agreement._id,
      companyId,
      agreementName: agreement.agreementName,
      pricingType: agreement.pricingType,
    });

    return res.status(201).json({
      success: true,
      message: 'Pricing agreement created successfully.',
      data: { agreement },
    });
  } catch (error) {
    console.error('createAgreement error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create agreement.' },
    });
  }
};

/**
 * PATCH /api/pricing/agreements/:agreementId/status
 * Activate, deactivate or expire agreement.
 */
export const updateAgreementStatus = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { agreementId } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'expired', 'terminated'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Invalid agreement status.' },
      });
    }

    const agreement = await PricingAgreement.findOneAndUpdate(
      { _id: agreementId, transportBusinessId },
      { status },
      { new: true }
    );

    if (!agreement) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Agreement not found.' },
      });
    }

    realtimeService.emitToTenant(transportBusinessId, 'pricing:agreement_status_updated', {
      agreementId: agreement._id,
      status: agreement.status,
    });

    return res.status(200).json({
      success: true,
      message: `Agreement status updated to ${status}.`,
      data: { agreement },
    });
  } catch (error) {
    console.error('updateAgreementStatus error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update agreement status.' },
    });
  }
};

/**
 * PATCH /api/orders/:orderId/pricing
 * Owner/Dispatcher reviews, confirms or updates order-level pricing.
 */
export const updateOrderPricing = async (req, res) => {
  try {
    const transportBusinessId = req.user.transportBusinessId;
    const { orderId } = req.params;
    const userId = req.user._id;

    const {
      pricingType,
      agreedRate,
      billableDistance,
      distanceSource,
      discount = 0,
      adjustment = 0,
      pricingNotes = '',
      reason = 'Order pricing confirmed/updated by staff',
    } = req.body;

    const order = await Order.findOne({ _id: orderId, transportBusinessId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found.' },
      });
    }

    // Preserve historical snapshot: calculate new breakdown
    const calc = pricingEngine.calculate({
      pricingType: pricingType || order.pricingDetails?.pricingType || 'fixed_per_trip',
      agreedRate: roundMoney(agreedRate),
      billableDistance: roundMoney(billableDistance),
      discount: roundMoney(discount),
      adjustment: roundMoney(adjustment),
    });

    const previousPricing = { ...order.pricingDetails };

    order.pricingDetails = {
      ...order.pricingDetails,
      pricingType: pricingType || order.pricingDetails?.pricingType,
      agreedRate: roundMoney(agreedRate),
      billableDistance: roundMoney(billableDistance),
      distanceSource: distanceSource || order.pricingDetails?.distanceSource || 'manual_entry',
      calculationBreakdown: calc.calculationBreakdown,
      subtotal: calc.subtotal,
      discount: calc.discount,
      adjustment: calc.adjustment,
      finalAmount: calc.finalAmount,
      pricingStatus: 'manually_confirmed',
      calculatedAt: new Date(),
      calculatedByUserId: userId,
      pricingNotes: pricingNotes.trim(),
    };

    await order.save();

    // Record audit trail
    await recordOrderHistory({
      transportBusinessId,
      orderId: order._id,
      performedByUserId: userId,
      action: 'ORDER_PRICING_UPDATED',
      previousValue: previousPricing,
      newValue: order.pricingDetails,
      description: `${reason}. Final Amount: ₹${calc.finalAmount}.`,
    });

    // Notify relevant sockets
    realtimeService.emitToTenant(transportBusinessId, 'order:pricing_updated', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      finalAmount: calc.finalAmount,
      pricingStatus: 'manually_confirmed',
    });

    return res.status(200).json({
      success: true,
      message: 'Order pricing updated and locked successfully.',
      data: { order },
    });
  } catch (error) {
    console.error('updateOrderPricing error:', error);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update order pricing.' },
    });
  }
};

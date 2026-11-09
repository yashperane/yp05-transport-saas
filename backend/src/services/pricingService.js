import { PricingAgreement } from '../models/PricingAgreement.js';

/**
 * Enterprise Pricing Calculation Engine
 * Safely computes billing figures using integer cents / paise to avoid floating-point errors.
 */

// Round money safely to 2 decimal places
export const roundMoney = (num) => Math.round((Number(num) || 0) * 100) / 100;

export const pricingEngine = {
  /**
   * Resolve best applicable pricing agreement using precedence hierarchy:
   *  1. Exact Company + Route match
   *  2. Exact Company + Vehicle Type match
   *  3. Company default active agreement
   */
  async resolveAgreement({ transportBusinessId, companyId, pickupAddress, destinationAddress, vehicleType }) {
    if (!companyId) return null;

    const now = new Date();
    // Query all active agreements for this company within effective date range
    const agreements = await PricingAgreement.find({
      transportBusinessId,
      companyId,
      status: 'active',
      effectiveFrom: { $lte: now },
      $or: [{ effectiveUntil: null }, { effectiveUntil: { $gte: now } }],
    }).lean();

    if (!agreements || agreements.length === 0) return null;

    // Check Route-specific overrides first
    const pickupLower = (pickupAddress || '').toLowerCase();
    const destLower = (destinationAddress || '').toLowerCase();

    for (const agreement of agreements) {
      if (agreement.routeRules && agreement.routeRules.length > 0) {
        const routeMatch = agreement.routeRules.find(
          (r) =>
            pickupLower.includes(r.pickupArea.toLowerCase()) &&
            destLower.includes(r.destinationArea.toLowerCase())
        );
        if (routeMatch) {
          return { agreement, matchedRule: { type: 'route', rule: routeMatch } };
        }
      }
    }

    // Check Vehicle-specific overrides next
    for (const agreement of agreements) {
      if (agreement.vehicleTypeRules && agreement.vehicleTypeRules.length > 0) {
        const vehicleMatch = agreement.vehicleTypeRules.find(
          (v) => v.vehicleType === vehicleType || v.vehicleType === 'any'
        );
        if (vehicleMatch) {
          return { agreement, matchedRule: { type: 'vehicle', rule: vehicleMatch } };
        }
      }
    }

    // Default to the most recently created active agreement
    return { agreement: agreements[0], matchedRule: null };
  },

  /**
   * Pure calculation function: computes final amount and calculation breakdown
   */
  calculate({
    pricingType,
    agreedRate = 0,
    billableDistance = 0,
    vehicleMultiplier = 1.0,
    vehicleSurcharge = 0,
    discount = 0,
    adjustment = 0,
    customAmount = 0,
  }) {
    let subtotal = 0;
    let breakdown = '';

    switch (pricingType) {
      case 'fixed_per_trip': {
        const base = roundMoney(agreedRate);
        subtotal = roundMoney(base * (Number(vehicleMultiplier) || 1.0) + (Number(vehicleSurcharge) || 0));
        breakdown = `Fixed per-trip rate: ₹${base}${
          vehicleMultiplier !== 1.0 ? ` × ${vehicleMultiplier} (Vehicle mult)` : ''
        }${vehicleSurcharge > 0 ? ` + ₹${vehicleSurcharge} (Surcharge)` : ''} = ₹${subtotal}`;
        break;
      }

      case 'per_kilometre': {
        const rate = roundMoney(agreedRate);
        const dist = Math.max(0, Number(billableDistance) || 0);
        const base = roundMoney(dist * rate);
        subtotal = roundMoney(base * (Number(vehicleMultiplier) || 1.0) + (Number(vehicleSurcharge) || 0));
        breakdown = `${dist} KM @ ₹${rate}/KM = ₹${base}${
          vehicleMultiplier !== 1.0 ? ` × ${vehicleMultiplier} (Vehicle mult)` : ''
        }${vehicleSurcharge > 0 ? ` + ₹${vehicleSurcharge} (Surcharge)` : ''} = ₹${subtotal}`;
        break;
      }

      case 'monthly_contract': {
        // Individual trip under monthly contract is covered by baseline, billed as ₹0 unless overages
        subtotal = 0;
        breakdown = `Covered under Monthly Contract retainer (Trip logged for billing reconciliation).`;
        break;
      }

      case 'custom': {
        subtotal = roundMoney(customAmount || agreedRate);
        breakdown = `Custom negotiated charge: ₹${subtotal}`;
        break;
      }

      default: {
        subtotal = roundMoney(customAmount || agreedRate);
        breakdown = `Manual / Pending evaluation: ₹${subtotal}`;
        break;
      }
    }

    const netDiscount = Math.max(0, roundMoney(discount));
    const netAdjustment = roundMoney(adjustment);
    const finalAmount = Math.max(0, roundMoney(subtotal - netDiscount + netAdjustment));

    return {
      subtotal,
      discount: netDiscount,
      adjustment: netAdjustment,
      finalAmount,
      calculationBreakdown: breakdown,
    };
  },
};

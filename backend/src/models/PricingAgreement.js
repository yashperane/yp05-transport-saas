import mongoose from 'mongoose';

/**
 * Route-specific pricing override rule
 */
const routeRuleSchema = new mongoose.Schema(
  {
    pickupArea: { type: String, trim: true, required: true },
    destinationArea: { type: String, trim: true, required: true },
    rate: { type: Number, required: true, min: 0 },
    rateType: { type: String, enum: ['fixed', 'per_km'], default: 'fixed' },
  },
  { _id: true }
);

/**
 * Vehicle type pricing override rule
 */
const vehicleTypeRuleSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      enum: ['pickup', 'tempo', 'truck', 'trailer', 'any'],
      required: true,
    },
    rateMultiplier: { type: Number, default: 1.0, min: 0.1 },
    baseSurcharge: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

/**
 * Comprehensive Pricing Agreement Schema
 * Handles fixed per-trip, per-km, monthly contracts, and custom negotiated terms.
 */
const pricingAgreementSchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: [true, 'Transport business reference is required'],
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company reference is required'],
      index: true,
    },
    agreementName: {
      type: String,
      required: [true, 'Agreement name is required'],
      trim: true,
      maxlength: 120,
    },
    pricingType: {
      type: String,
      enum: ['fixed_per_trip', 'per_kilometre', 'monthly_contract', 'custom'],
      required: [true, 'Pricing type is required'],
      index: true,
    },
    // Fixed per-trip pricing
    fixedTripRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Per-kilometre pricing
    perKilometreRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Monthly contract terms
    monthlyAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    includedTrips: {
      type: Number,
      default: 0,
      min: 0,
    },
    includedKilometres: {
      type: Number,
      default: 0,
      min: 0,
    },
    additionalTripRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    additionalKmRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Custom & Negotiated pricing
    customRules: {
      type: String,
      trim: true,
      default: '',
    },
    // Specific Route & Vehicle overrides
    routeRules: [routeRuleSchema],
    vehicleTypeRules: [vehicleTypeRuleSchema],
    // Validity & Activation
    effectiveFrom: {
      type: Date,
      default: Date.now,
      index: true,
    },
    effectiveUntil: {
      type: Date,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'terminated'],
      default: 'active',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for contract lookup precedence
pricingAgreementSchema.index({ transportBusinessId: 1, companyId: 1, status: 1 });
pricingAgreementSchema.index({ transportBusinessId: 1, status: 1, effectiveFrom: 1, effectiveUntil: 1 });

export const PricingAgreement = mongoose.model('PricingAgreement', pricingAgreementSchema);

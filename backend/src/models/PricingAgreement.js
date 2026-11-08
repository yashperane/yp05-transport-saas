import mongoose from 'mongoose';

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
    pricingType: {
      type: String,
      enum: ['fixed_per_trip', 'per_kilometre', 'monthly_contract', 'custom'],
      required: [true, 'Pricing type is required'],
    },
    fixedTripRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    perKilometreRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyContractAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    customRules: {
      type: String,
      trim: true,
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    effectiveUntil: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'terminated'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

pricingAgreementSchema.index({ transportBusinessId: 1, companyId: 1, status: 1 });

export const PricingAgreement = mongoose.model('PricingAgreement', pricingAgreementSchema);

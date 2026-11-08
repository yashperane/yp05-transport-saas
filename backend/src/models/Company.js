import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: [true, 'Transport business reference is required'],
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    companyCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    billingAddress: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
    },
    pricingAgreementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PricingAgreement',
      default: null,
    },
    settings: {
      requireOrderApproval: {
        type: Boolean,
        default: false,
      },
      trackingVisibilityOverride: {
        type: String,
        enum: ['inherit', 'status_only', 'status_and_eta', 'full_tracking'],
        default: 'inherit',
      },
    },
  },
  {
    timestamps: true,
  }
);

companySchema.index({ transportBusinessId: 1, companyName: 1 });

export const Company = mongoose.model('Company', companySchema);

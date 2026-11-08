import mongoose from 'mongoose';

const transportBusinessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    businessCode: {
      type: String,
      required: [true, 'Business code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    contactName: {
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
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'trial'],
      default: 'active',
    },
    settings: {
      /**
       * dispatchMode controls how orders are assigned to drivers:
       *  manual_assignment - Only owner/dispatcher can assign
       *  driver_self_claim - Drivers claim available orders themselves
       *  both              - Owner can assign OR make available for self-claim
       */
      dispatchMode: {
        type: String,
        enum: ['manual_assignment', 'driver_self_claim', 'both'],
        default: 'both',
      },
      /**
       * driverOrderVisibility controls what drivers can see:
       *  assigned_only         - Only their own assigned orders
       *  available_only        - Only available-to-claim orders
       *  assigned_and_available - Both
       */
      driverOrderVisibility: {
        type: String,
        enum: ['assigned_only', 'available_only', 'assigned_and_available'],
        default: 'assigned_and_available',
      },
      companyTrackingVisibility: {
        type: String,
        enum: ['status_only', 'status_and_eta', 'full_tracking'],
        default: 'status_only',
      },
      // Legacy field — kept for backward compat; use dispatchMode instead
      allowDriverSelfAssignment: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const TransportBusiness = mongoose.model('TransportBusiness', transportBusinessSchema);

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
      driverVisibility: {
        type: String,
        enum: ['assigned_only', 'available_only', 'assigned_and_available'],
        default: 'assigned_and_available',
      },
      companyTrackingVisibility: {
        type: String,
        enum: ['status_only', 'status_and_eta', 'full_tracking'],
        default: 'status_only',
      },
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

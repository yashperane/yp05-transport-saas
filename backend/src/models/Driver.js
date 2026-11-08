import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: [true, 'Transport business reference is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Driver full name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    alternatePhoneNumber: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContactName: {
      type: String,
      trim: true,
      default: '',
    },
    emergencyContactNumber: {
      type: String,
      trim: true,
      default: '',
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: '',
    },
    licenseType: {
      type: String,
      enum: ['LMV', 'HMV', 'Commercial', 'Other'],
      default: 'LMV',
    },
    licenseExpiryDate: {
      type: Date,
      default: null,
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    employmentStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'off_duty'],
      default: 'available',
      index: true,
    },
    currentVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    trackingConsentStatus: {
      type: String,
      enum: ['granted', 'denied', 'pending'],
      default: 'pending',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound Indexes for query performance and tenant safety
driverSchema.index({ transportBusinessId: 1, employmentStatus: 1 });
driverSchema.index({ transportBusinessId: 1, availabilityStatus: 1 });
driverSchema.index({ transportBusinessId: 1, phoneNumber: 1 });

export const Driver = mongoose.model('Driver', driverSchema);

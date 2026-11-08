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
    driverName: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    licenseDetails: {
      licenseNumber: {
        type: String,
        trim: true,
      },
      expiryDate: {
        type: Date,
      },
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'busy', 'offline', 'on_leave'],
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
  },
  {
    timestamps: true,
  }
);

driverSchema.index({ transportBusinessId: 1, availabilityStatus: 1 });

export const Driver = mongoose.model('Driver', driverSchema);

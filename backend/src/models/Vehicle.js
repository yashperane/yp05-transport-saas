import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: [true, 'Transport business reference is required'],
      index: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      default: '', // Internal identifier e.g. V-01, Tempo-1
    },
    registrationNumber: {
      type: String,
      required: [true, 'Registration number is required'],
      uppercase: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ['pickup', 'tempo', 'mini_truck', 'truck', 'trailer', 'other'],
      default: 'pickup',
      index: true,
    },
    manufacturer: {
      type: String,
      trim: true,
      default: '',
    },
    model: {
      type: String,
      trim: true,
      default: '',
    },
    capacity: {
      type: Number,
      default: 1000, // in kg
      min: [0, 'Capacity cannot be negative'],
    },
    capacityUnit: {
      type: String,
      enum: ['kg', 'ton', 'workers'],
      default: 'kg',
    },
    fuelType: {
      type: String,
      enum: ['diesel', 'petrol', 'cng', 'electric', 'other'],
      default: 'diesel',
    },
    registrationExpiryDate: {
      type: Date,
      default: null,
    },
    insuranceExpiryDate: {
      type: Date,
      default: null,
    },
    fitnessCertificateExpiryDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'in_maintenance', 'inactive'],
      default: 'active',
      index: true,
    },
    currentDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
      index: true,
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

// Compound index guaranteeing registration uniqueness per transport business
vehicleSchema.index({ transportBusinessId: 1, registrationNumber: 1 }, { unique: true });
vehicleSchema.index({ transportBusinessId: 1, status: 1 });
vehicleSchema.index({ transportBusinessId: 1, currentDriverId: 1 });

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);

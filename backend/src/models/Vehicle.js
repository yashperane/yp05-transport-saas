import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: [true, 'Transport business reference is required'],
      index: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Vehicle registration number is required'],
      uppercase: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ['pickup', 'tempo', 'truck', 'trailer', 'other'],
      default: 'pickup',
    },
    capacity: {
      weightKg: {
        type: Number,
        default: 0,
        min: 0,
      },
      workerSeats: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    assignedDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'assigned', 'on_trip', 'unavailable', 'maintenance'],
      default: 'available',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

vehicleSchema.index({ transportBusinessId: 1, registrationNumber: 1 }, { unique: true });

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);

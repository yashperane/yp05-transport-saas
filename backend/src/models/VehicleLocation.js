import mongoose from 'mongoose';

/**
 * VehicleLocation Model (Latest Snapshot)
 * Stores the most up-to-date GPS telemetry coordinate for each active vehicle.
 * Allows O(1) fleet queries without aggregating thousands of history logs.
 */
const vehicleLocationSchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: true,
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
      index: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
      index: true,
    },
    activeOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    heading: {
      type: Number,
      default: null,
    },
    speed: {
      type: Number,
      default: null,
    },
    isSharing: {
      type: Boolean,
      default: true,
      index: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    source: {
      type: String,
      enum: ['driver_mobile_browser', 'driver_app', 'hardware_gps'],
      default: 'driver_mobile_browser',
    },
  },
  {
    timestamps: true,
  }
);

vehicleLocationSchema.index({ transportBusinessId: 1, isSharing: 1, recordedAt: -1 });

export const VehicleLocation = mongoose.model('VehicleLocation', vehicleLocationSchema);

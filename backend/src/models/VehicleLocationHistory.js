import mongoose from 'mongoose';

/**
 * VehicleLocationHistory Model (Future Module Schema)
 * Designed for Chapter 4 / 6 when live GPS telemetry is enabled.
 * Includes TTL index for automated 30-day data retention cleanup.
 */
const vehicleLocationHistorySchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: [true, 'Transport business reference is required'],
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
      required: [true, 'Driver reference is required'],
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: -180,
      max: 180,
    },
    accuracy: {
      type: Number,
      default: null,
    },
    speed: {
      type: Number,
      default: null,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      enum: ['driver_mobile_browser', 'driver_app', 'hardware_gps'],
      default: 'driver_mobile_browser',
    },
  },
  {
    versionKey: false,
  }
);

// Query index: latest coordinates per vehicle
vehicleLocationHistorySchema.index({ vehicleId: 1, recordedAt: -1 });

// Retention index: Automatically remove records older than 30 days
vehicleLocationHistorySchema.index(
  { recordedAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 30 }
);

export const VehicleLocationHistory = mongoose.model(
  'VehicleLocationHistory',
  vehicleLocationHistorySchema
);

import mongoose from 'mongoose';

/**
 * Counter Model for Collision-Safe Sequential Number Generation
 * Used to generate atomic sequence numbers per transport business.
 * (e.g., ORD-000001, ORD-000002 for Sherkar Transport)
 */
const counterSchema = new mongoose.Schema(
  {
    transportBusinessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportBusiness',
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
    },
    sequence: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

counterSchema.index({ transportBusinessId: 1, key: 1 }, { unique: true });

export const Counter = mongoose.model('Counter', counterSchema);

import mongoose from 'mongoose';

const ngoProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  organizationName: {
    type: String,
    required: true,
    trim: true
  },
  registrationNumber: {
    type: String,
    required: true
  },
  beneficiaryCount: {
    type: Number,
    required: true,
    min: 1
  },
  dailyReceivingCapacity: {
    type: Number,
    required: true,
    min: 10
  },
  activeCommittedServings: {
    type: Number,
    default: 0,
    min: 0
  },
  coldStorageAvailable: {
    type: Boolean,
    default: false
  },
  hotHoldingAvailable: {
    type: Boolean,
    default: false
  },
  operatingHours: {
    open: { type: String, default: '08:00' },
    close: { type: String, default: '21:00' }
  },
  isApprovedByAdmin: {
    type: Boolean,
    default: true
  },
  reliabilityScore: {
    type: Number,
    default: 1.0,
    min: 0.1,
    max: 1.0
  }
}, { timestamps: true });

export const NGOProfile = mongoose.model('NGOProfile', ngoProfileSchema);

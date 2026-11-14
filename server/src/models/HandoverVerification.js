import mongoose from 'mongoose';

const handoverVerificationSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickupAssignment',
    required: true,
    unique: true
  },
  // Hashed OTP for Donor Pickup Verification
  donorOtpHash: {
    type: String,
    required: true
  },
  donorOtpSalt: {
    type: String,
    required: true
  },
  donorConfirmedAt: {
    type: Date,
    default: null
  },
  donorFailedAttempts: {
    type: Number,
    default: 0
  },

  // Hashed OTP for NGO Receipt Verification
  ngoOtpHash: {
    type: String,
    required: true
  },
  ngoOtpSalt: {
    type: String,
    required: true
  },
  ngoConfirmedAt: {
    type: Date,
    default: null
  },
  ngoFailedAttempts: {
    type: Number,
    default: 0
  },

  receivedServings: {
    type: Number,
    default: 0
  },
  storageConditionAtReceipt: {
    type: String,
    enum: ['compliant', 'deviated', 'rejected'],
    default: 'compliant'
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export const HandoverVerification = mongoose.model('HandoverVerification', handoverVerificationSchema);


import mongoose from 'mongoose';

const donorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  orgType: {
    type: String,
    enum: ['restaurant', 'caterer', 'hotel', 'supermarket', 'corporate', 'individual'],
    default: 'restaurant'
  },
  fssaiLicenseNumber: {
    type: String,
    default: null
  },
  pickupInstructions: {
    type: String,
    default: ''
  },
  totalDonationsCount: {
    type: Number,
    default: 0
  },
  totalServingsDonated: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export const DonorProfile = mongoose.model('DonorProfile', donorProfileSchema);


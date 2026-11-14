import mongoose from 'mongoose';
import { FOOD_CATEGORIES, STORAGE_CONDITIONS, DONATION_STATUS } from '../config/constants.js';

const foodDonationSchema = new mongoose.Schema({
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: Object.values(FOOD_CATEGORIES),
    required: true
  },
  items: [{
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'servings' }
  }],
  totalServings: {
    type: Number,
    required: true,
    min: 1
  },
  remainingServings: {
    type: Number,
    required: true,
    min: 0
  },
  preparationTime: {
    type: Date,
    required: true
  },
  safeUseDeadline: {
    type: Date,
    required: true
  },
  storageCondition: {
    type: String,
    enum: Object.values(STORAGE_CONDITIONS),
    required: true
  },
  allergenAlerts: [{
    type: String
  }],
  packagingDescription: {
    type: String,
    default: 'Food-grade sealed containers'
  },
  donorCertifiedSafe: {
    type: Boolean,
    default: true
  },
  pickupAddress: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true } // [lng, lat]
    }
  },
  status: {
    type: String,
    enum: Object.values(DONATION_STATUS),
    default: DONATION_STATUS.SUBMITTED,
    index: true
  },
  aiMetadata: {
    rawPrompt: { type: String, default: null },
    extractedByGemini: { type: Boolean, default: false },
    safetyNotes: [{ type: String }]
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

foodDonationSchema.index({ 'pickupAddress.location': '2dsphere' });
foodDonationSchema.index({ status: 1, safeUseDeadline: 1 });

export const FoodDonation = mongoose.model('FoodDonation', foodDonationSchema);

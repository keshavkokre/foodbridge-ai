import mongoose from 'mongoose';
import { ALLOCATION_STATUS } from '../config/constants.js';

const allocationSchema = new mongoose.Schema({
  donationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDonation',
    required: true,
    index: true
  },
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  demandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NGOFoodDemand',
    required: true
  },
  allocatedServings: {
    type: Number,
    required: true,
    min: 1
  },
  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  scoreBreakdown: {
    distanceScore: { type: Number, min: 0, max: 1 },
    urgencyScore: { type: Number, min: 0, max: 1 },
    capacityScore: { type: Number, min: 0, max: 1 },
    historyScore: { type: Number, min: 0, max: 1 },
    distanceKm: { type: Number }
  },
  recommendationRationale: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(ALLOCATION_STATUS),
    default: ALLOCATION_STATUS.PROPOSED,
    index: true
  },
  responseDeadline: {
    type: Date,
    required: true,
    index: true
  },
  declinedReason: {
    type: String,
    default: null
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

allocationSchema.index({ donationId: 1, ngoId: 1 });
allocationSchema.index({ status: 1, responseDeadline: 1 });

export const Allocation = mongoose.model('Allocation', allocationSchema);


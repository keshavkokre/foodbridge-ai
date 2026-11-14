import mongoose from 'mongoose';
import { ASSIGNMENT_STATUS } from '../config/constants.js';

const pickupAssignmentSchema = new mongoose.Schema({
  allocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Allocation',
    required: true,
    index: true
  },
  donationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoodDonation',
    required: true
  },
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  pickupAddress: {
    street: String,
    city: String,
    coordinates: [Number] // [lng, lat]
  },
  dropoffAddress: {
    street: String,
    city: String,
    coordinates: [Number] // [lng, lat]
  },
  estimatedDistanceKm: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: Object.values(ASSIGNMENT_STATUS),
    default: ASSIGNMENT_STATUS.UNCLAIMED,
    index: true
  },
  timeline: {
    claimedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null }
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

pickupAssignmentSchema.index({ status: 1, volunteerId: 1 });

export const PickupAssignment = mongoose.model('PickupAssignment', pickupAssignmentSchema);


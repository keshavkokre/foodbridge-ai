import mongoose from 'mongoose';
import { FOOD_CATEGORIES, DEMAND_STATUS, URGENCY_LEVELS } from '../config/constants.js';

const ngoFoodDemandSchema = new mongoose.Schema({
  ngoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  requestedCategories: [{
    type: String,
    enum: Object.values(FOOD_CATEGORIES),
    required: true
  }],
  requestedServings: {
    type: Number,
    required: true,
    min: 1
  },
  fulfilledServings: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingServings: {
    type: Number,
    required: true,
    min: 0
  },
  urgencyLevel: {
    type: String,
    enum: Object.values(URGENCY_LEVELS),
    default: URGENCY_LEVELS.STANDARD
  },
  requiredBefore: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(DEMAND_STATUS),
    default: DEMAND_STATUS.ACTIVE,
    index: true
  },
  notes: {
    type: String,
    default: ''
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

ngoFoodDemandSchema.index({ ngoId: 1, status: 1 });

export const NGOFoodDemand = mongoose.model('NGOFoodDemand', ngoFoodDemandSchema);

import mongoose from 'mongoose';

const volunteerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  vehicleType: {
    type: String,
    enum: ['two_wheeler', 'car', 'van', 'on_foot'],
    default: 'two_wheeler'
  },
  maxPayloadKg: {
    type: Number,
    default: 25
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  activeAssignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickupAssignment',
    default: null
  },
  completedDeliveriesCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

export const VolunteerProfile = mongoose.model('VolunteerProfile', volunteerProfileSchema);

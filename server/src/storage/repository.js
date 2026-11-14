import { isMongoConnected, dbStore, generateId } from './dbAdapter.js';
import { User } from '../models/User.js';
import { DonorProfile } from '../models/DonorProfile.js';
import { NGOProfile } from '../models/NGOProfile.js';
import { VolunteerProfile } from '../models/VolunteerProfile.js';
import { FoodDonation } from '../models/FoodDonation.js';
import { NGOFoodDemand } from '../models/NGOFoodDemand.js';
import { Allocation } from '../models/Allocation.js';
import { PickupAssignment } from '../models/PickupAssignment.js';
import { HandoverVerification } from '../models/HandoverVerification.js';

export const repo = {
  // Users
  users: {
    async findOne(filter) {
      if (isMongoConnected()) return User.findOne(filter);
      return dbStore.collection('users').findOne(filter);
    },
    async findById(id) {
      if (isMongoConnected()) return User.findById(id).select('-passwordHash');
      const u = dbStore.collection('users').findById(id);
      if (!u) return null;
      const { passwordHash, ...rest } = u;
      return rest;
    },
    async create(doc) {
      if (isMongoConnected()) {
        const u = new User(doc);
        return u.save();
      }
      return dbStore.collection('users').insert(doc);
    },
    async count(filter = {}) {
      if (isMongoConnected()) return User.countDocuments(filter);
      return dbStore.collection('users').countDocuments(filter);
    },
    async deleteMany(filter = {}) {
      if (isMongoConnected()) return User.deleteMany(filter);
      return dbStore.collection('users').deleteMany(filter);
    }
  },

  // Donor Profiles
  donorProfiles: {
    async findOne(filter) {
      if (isMongoConnected()) return DonorProfile.findOne(filter);
      return dbStore.collection('donorProfiles').findOne(filter);
    },
    async create(doc) {
      if (isMongoConnected()) {
        const p = new DonorProfile(doc);
        return p.save();
      }
      return dbStore.collection('donorProfiles').insert(doc);
    },
    async updateOne(filter, update) {
      if (isMongoConnected()) return DonorProfile.updateOne(filter, update);
      return dbStore.collection('donorProfiles').findOneAndUpdate(filter, update);
    },
    async deleteMany(filter = {}) {
      if (isMongoConnected()) return DonorProfile.deleteMany(filter);
      return dbStore.collection('donorProfiles').deleteMany(filter);
    }
  },

  // NGO Profiles
  ngoProfiles: {
    async findOne(filter) {
      if (isMongoConnected()) return NGOProfile.findOne(filter);
      return dbStore.collection('ngoProfiles').findOne(filter);
    },
    async find(filter = {}) {
      if (isMongoConnected()) return NGOProfile.find(filter);
      return dbStore.collection('ngoProfiles').find(filter);
    },
    async create(doc) {
      if (isMongoConnected()) {
        const p = new NGOProfile(doc);
        return p.save();
      }
      return dbStore.collection('ngoProfiles').insert(doc);
    },
    async updateOne(filter, update) {
      if (isMongoConnected()) return NGOProfile.updateOne(filter, update);
      return dbStore.collection('ngoProfiles').findOneAndUpdate(filter, update);
    },
    async deleteMany(filter = {}) {
      if (isMongoConnected()) return NGOProfile.deleteMany(filter);
      return dbStore.collection('ngoProfiles').deleteMany(filter);
    }
  },

  // Volunteer Profiles
  volunteerProfiles: {
    async findOne(filter) {
      if (isMongoConnected()) return VolunteerProfile.findOne(filter);
      return dbStore.collection('volunteerProfiles').findOne(filter);
    },
    async create(doc) {
      if (isMongoConnected()) {
        const p = new VolunteerProfile(doc);
        return p.save();
      }
      return dbStore.collection('volunteerProfiles').insert(doc);
    },
    async updateOne(filter, update) {
      if (isMongoConnected()) return VolunteerProfile.updateOne(filter, update);
      return dbStore.collection('volunteerProfiles').findOneAndUpdate(filter, update);
    },
    async deleteMany(filter = {}) {
      if (isMongoConnected()) return VolunteerProfile.deleteMany(filter);
      return dbStore.collection('volunteerProfiles').deleteMany(filter);
    }
  },

  // Food Donations
  donations: {
    async find(filter = {}) {
      if (isMongoConnected()) {
        return FoodDonation.find(filter).sort({ createdAt: -1 }).populate('donorId', 'fullName email address');
      }
      const list = dbStore.collection('foodDonations').find(filter);
      // Populate donorId
      return list.map(d => {
        const donor = dbStore.collection('users').findById(d.donorId);
        return { ...d, donorId: donor || d.donorId };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async findById(id) {
      if (isMongoConnected()) {
        return FoodDonation.findById(id).populate('donorId', 'fullName email address phone');
      }
      const d = dbStore.collection('foodDonations').findById(id);
      if (!d) return null;
      const donor = dbStore.collection('users').findById(d.donorId);
      return { ...d, donorId: donor || d.donorId };
    },
    async create(doc) {
      if (isMongoConnected()) {
        const d = new FoodDonation(doc);
        return d.save();
      }
      return dbStore.collection('foodDonations').insert(doc);
    },
    async updateOne(filter, update) {
      if (isMongoConnected()) return FoodDonation.updateOne(filter, update);
      return dbStore.collection('foodDonations').findOneAndUpdate(filter, update);
    },
    async findOneAndUpdate(filter, update, options = {}) {
      if (isMongoConnected()) return FoodDonation.findOneAndUpdate(filter, update, options);
      return dbStore.collection('foodDonations').findOneAndUpdate(filter, update, options);
    },
    async deleteMany(filter = {}) {
      if (isMongoConnected()) return FoodDonation.deleteMany(filter);
      return dbStore.collection('foodDonations').deleteMany(filter);
    }
  },

  // NGO Demands
  demands: {
    async find(filter = {}) {
      if (isMongoConnected()) {
        return NGOFoodDemand.find(filter).sort({ createdAt: -1 }).populate('ngoId', 'fullName email address phone');
      }
      const list = dbStore.collection('ngoFoodDemands').find(filter);
      return list.map(d => {
        const ngo = dbStore.collection('users').findById(d.ngoId);
        return { ...d, ngoId: ngo || d.ngoId };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async findById(id) {
      if (isMongoConnected()) return NGOFoodDemand.findById(id);
      return dbStore.collection('ngoFoodDemands').findById(id);
    },
    async create(doc) {
      if (isMongoConnected()) {
        const d = new NGOFoodDemand(doc);
        return d.save();
      }
      return dbStore.collection('ngoFoodDemands').insert(doc);
    },
    async updateOne(filter, update) {
      if (isMongoConnected()) return NGOFoodDemand.updateOne(filter, update);
      return dbStore.collection('ngoFoodDemands').findOneAndUpdate(filter, update);
    },
    async deleteMany(filter = {}) {
      if (isMongoConnected()) return NGOFoodDemand.deleteMany(filter);
      return dbStore.collection('ngoFoodDemands').deleteMany(filter);
    }
  },

  // Allocations
  allocations: {
    async find(filter = {}) {
      if (isMongoConnected()) {
        return Allocation.find(filter).sort({ createdAt: -1 }).populate('donationId').populate('demandId').populate('ngoId', 'fullName address phone');
      }
      const list = dbStore.collection('allocations').find(filter);
      return list.map(a => {
        const donation = dbStore.collection('foodDonations').findById(a.donationId);
        const demand = dbStore.collection('ngoFoodDemands').findById(a.demandId);
        const ngo = dbStore.collection('users').findById(a.ngoId);
        return {
          ...a,
          donationId: donation || a.donationId,
          demandId: demand || a.demandId,
          ngoId: ngo || a.ngoId
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async findById(id) {
      if (isMongoConnected()) return Allocation.findById(id);
      return dbStore.collection('allocations').findById(id);
    },
    async create(doc) {
      if (isMongoConnected()) {
        const a = new Allocation(doc);
        return a.save();
      }
      return dbStore.collection('allocations').insert(doc);
    },
    async findOneAndUpdate(filter, update, options = {}) {
      if (isMongoConnected()) return Allocation.findOneAndUpdate(filter, update, options);
      return dbStore.collection('allocations').findOneAndUpdate(filter, update, options);
    },
    async updateOne(filter, update) {
      if (isMongoConnected()) return Allocation.updateOne(filter, update);
      return dbStore.collection('allocations').findOneAndUpdate(filter, update);
    },
    async deleteMany(filter = {}) {
      if (isMongoConnected()) return Allocation.deleteMany(filter);
      return dbStore.collection('allocations').deleteMany(filter);
    }
  },

  // Pickup Assignments
  assignments: {
    async find(filter = {}) {
      if (isMongoConnected()) {
        return PickupAssignment.find(filter).sort({ createdAt: -1 }).populate('donationId').populate('ngoId', 'fullName address phone');
      }
      const list = dbStore.collection('pickupAssignments').find(filter);
      return list.map(p => {
        const donation = dbStore.collection('foodDonations').findById(p.donationId);
        const ngo = dbStore.collection('users').findById(p.ngoId);
        return {
          ...p,
          donationId: donation || p.donationId,
          ngoId: ngo || p.ngoId
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    async findOne(filter = {}) {
      if (isMongoConnected()) {
        return PickupAssignment.findOne(filter).populate('donationId').populate('ngoId', 'fullName address phone');
      }
      const p = dbStore.collection('pickupAssignments').findOne(filter);
      if (!p) return null;
      const donation = dbStore.collection('foodDonations').findById(p.donationId);
      const ngo = dbStore.collection('users').findById(p.ngoId);
      return {
        ...p,
        donationId: donation || p.donationId,
        ngoId: ngo || p.ngoId
      };
    },
    async findById(id) {
      if (isMongoConnected()) return PickupAssignment.findById(id);
      return dbStore.collection('pickupAssignments').findById(id);
    },
    async create(doc) {
      if (isMongoConnected()) {
        const a = new PickupAssignment(doc);
        return a.save();
      }
      return dbStore.collection('pickupAssignments').insert(doc);
    },
    async findByIdAndUpdate(id, update, options = {}) {
      if (isMongoConnected()) return PickupAssignment.findByIdAndUpdate(id, update, options);
      return dbStore.collection('pickupAssignments').updateById(id, update);
    },
    async findOneAndUpdate(filter, update, options = {}) {
      if (isMongoConnected()) return PickupAssignment.findOneAndUpdate(filter, update, options);
      return dbStore.collection('pickupAssignments').findOneAndUpdate(filter, update, options);
    },
    async updateOne(filter, update) {
      if (isMongoConnected()) return PickupAssignment.updateOne(filter, update);
      return dbStore.collection('pickupAssignments').findOneAndUpdate(filter, update);
    },
    async deleteMany(filter = {}) {
      if (isMongoConnected()) return PickupAssignment.deleteMany(filter);
      return dbStore.collection('pickupAssignments').deleteMany(filter);
    }
  },

  // Handover Verifications
  handovers: {
    async find(filter = {}) {
      if (isMongoConnected()) {
        return HandoverVerification.find(filter).sort({ createdAt: -1 });
      }
      return dbStore.collection('handoverVerifications').find(filter);
    },
    async findOne(filter = {}) {
      if (isMongoConnected()) return HandoverVerification.findOne(filter);
      return dbStore.collection('handoverVerifications').findOne(filter);
    },
    async create(doc) {
      if (isMongoConnected()) {
        const h = new HandoverVerification(doc);
        return h.save();
      }
      return dbStore.collection('handoverVerifications').insert(doc);
    },
    async updateOne(filter, update) {
      if (isMongoConnected()) return HandoverVerification.updateOne(filter, update);
      return dbStore.collection('handoverVerifications').findOneAndUpdate(filter, update);
    },
    async deleteMany(filter = {}) {
      if (isMongoConnected()) return HandoverVerification.deleteMany(filter);
      return dbStore.collection('handoverVerifications').deleteMany(filter);
    }
  }
};


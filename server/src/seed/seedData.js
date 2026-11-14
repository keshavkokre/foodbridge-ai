import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { DonorProfile } from '../models/DonorProfile.js';
import { NGOProfile } from '../models/NGOProfile.js';
import { VolunteerProfile } from '../models/VolunteerProfile.js';
import { FoodDonation } from '../models/FoodDonation.js';
import { NGOFoodDemand } from '../models/NGOFoodDemand.js';
import { Allocation } from '../models/Allocation.js';
import { PickupAssignment } from '../models/PickupAssignment.js';
import { HandoverVerification } from '../models/HandoverVerification.js';
import { hashPassword } from '../utils/passwordService.js';
import { createOtpCredentials } from '../utils/otpSecurity.js';
import { ROLES, FOOD_CATEGORIES, STORAGE_CONDITIONS, DONATION_STATUS, DEMAND_STATUS, ALLOCATION_STATUS, ASSIGNMENT_STATUS, URGENCY_LEVELS } from '../config/constants.js';

export async function seedDemoData() {
  console.log('[SEED] Connecting to MongoDB...');
  await connectDB();

  console.log('[SEED] Cleaning previous demonstration fixtures (isDemo: true)...');
  await User.deleteMany({ isDemo: true });
  await DonorProfile.deleteMany({});
  await NGOProfile.deleteMany({});
  await VolunteerProfile.deleteMany({});
  await FoodDonation.deleteMany({ isDemo: true });
  await NGOFoodDemand.deleteMany({ isDemo: true });
  await Allocation.deleteMany({ isDemo: true });
  await PickupAssignment.deleteMany({ isDemo: true });
  await HandoverVerification.deleteMany({ isDemo: true });

  const defaultPassword = 'DemoPassword2026!';
  const passwordHash = await hashPassword(defaultPassword);

  console.log('[SEED] Seeding demonstration users...');

  // 1. Hotel Donor
  const donorHotel = await User.create({
    email: 'hotel.donor@foodbridge.demo',
    passwordHash,
    role: ROLES.DONOR,
    fullName: '[DEMO] Grand Palace Hotel & Banquets',
    phone: '+91 98450 11223',
    address: {
      street: '42 MG Road, Central Business District',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    },
    isVerified: true,
    isDemo: true
  });

  await DonorProfile.create({
    userId: donorHotel._id,
    orgType: 'hotel',
    fssaiLicenseNumber: 'FSSAI-112233445566',
    pickupInstructions: 'Enter via Loading Dock 3 behind banquet hall; ask for Chef Anand.'
  });

  // 2. Supermarket Donor
  const donorMarket = await User.create({
    email: 'market.donor@foodbridge.demo',
    passwordHash,
    role: ROLES.DONOR,
    fullName: '[DEMO] FreshHarvest Organics Market',
    phone: '+91 98451 99887',
    address: {
      street: '18 100ft Road, Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560038',
      location: { type: 'Point', coordinates: [77.6412, 12.9784] }
    },
    isVerified: true,
    isDemo: true
  });

  await DonorProfile.create({
    userId: donorMarket._id,
    orgType: 'supermarket',
    fssaiLicenseNumber: 'FSSAI-998877665544',
    pickupInstructions: 'Service counter at rear entrance.'
  });

  // 3. NGO 1: Ashraya Children's Home (Proximity: 1.4 km)
  const ngoAshraya = await User.create({
    email: 'ashraya.shelter@foodbridge.demo',
    passwordHash,
    role: ROLES.NGO,
    fullName: '[DEMO] Ashraya Children Home',
    phone: '+91 94480 33445',
    address: {
      street: '12 Richmond Crescent',
      city: 'Bangalore',
      location: { type: 'Point', coordinates: [77.6050, 12.9750] }
    },
    isVerified: true,
    isDemo: true
  });

  await NGOProfile.create({
    userId: ngoAshraya._id,
    organizationName: '[DEMO] Ashraya Children Home',
    registrationNumber: 'REG-KA-2018-8834',
    beneficiaryCount: 45,
    dailyReceivingCapacity: 75,
    activeCommittedServings: 0,
    coldStorageAvailable: true,
    hotHoldingAvailable: true,
    reliabilityScore: 0.98
  });

  // 4. NGO 2: Sneha Care Old Age Shelter (Proximity: 3.2 km)
  const ngoSneha = await User.create({
    email: 'sneha.care@foodbridge.demo',
    passwordHash,
    role: ROLES.NGO,
    fullName: '[DEMO] Sneha Care Senior Sanctuary',
    phone: '+91 94481 55667',
    address: {
      street: '88 Victoria Layout',
      city: 'Bangalore',
      location: { type: 'Point', coordinates: [77.6200, 12.9800] }
    },
    isVerified: true,
    isDemo: true
  });

  await NGOProfile.create({
    userId: ngoSneha._id,
    organizationName: '[DEMO] Sneha Care Senior Sanctuary',
    registrationNumber: 'REG-KA-2015-4421',
    beneficiaryCount: 50,
    dailyReceivingCapacity: 50,
    activeCommittedServings: 0,
    coldStorageAvailable: true,
    hotHoldingAvailable: false,
    reliabilityScore: 0.92
  });

  // 5. NGO 3: St. Jude Community Kitchen (Proximity: 5.0 km)
  const ngoStJude = await User.create({
    email: 'stjude.kitchen@foodbridge.demo',
    passwordHash,
    role: ROLES.NGO,
    fullName: '[DEMO] St. Jude Community Kitchen',
    phone: '+91 94482 77889',
    address: {
      street: '102 Domlur 2nd Stage',
      city: 'Bangalore',
      location: { type: 'Point', coordinates: [77.6400, 12.9600] }
    },
    isVerified: true,
    isDemo: true
  });

  await NGOProfile.create({
    userId: ngoStJude._id,
    organizationName: '[DEMO] St. Jude Community Kitchen',
    registrationNumber: 'REG-KA-2020-9901',
    beneficiaryCount: 80,
    dailyReceivingCapacity: 100,
    activeCommittedServings: 0,
    coldStorageAvailable: true,
    hotHoldingAvailable: true,
    reliabilityScore: 0.95
  });

  // 6. Volunteer Driver
  const volunteer = await User.create({
    email: 'rohan.volunteer@foodbridge.demo',
    passwordHash,
    role: ROLES.VOLUNTEER,
    fullName: 'Rohan Sharma (Volunteer Driver)',
    phone: '+91 97400 66778',
    address: {
      city: 'Bangalore',
      location: { type: 'Point', coordinates: [77.6000, 12.9700] }
    },
    isVerified: true,
    isDemo: true
  });

  await VolunteerProfile.create({
    userId: volunteer._id,
    vehicleType: 'car',
    maxPayloadKg: 60,
    isAvailable: true,
    completedDeliveriesCount: 14
  });

  // 7. Platform Admin
  await User.create({
    email: 'admin@foodbridge.demo',
    passwordHash,
    role: ROLES.ADMIN,
    fullName: 'Ananya Deshmukh (Compliance Officer)',
    phone: '+91 98000 11111',
    isVerified: true,
    isDemo: true
  });

  console.log('[SEED] Registering active NGO dietary demands...');
  // Active demand for Ashraya
  const demandAshraya = await NGOFoodDemand.create({
    ngoId: ngoAshraya._id,
    requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS],
    requestedServings: 60,
    fulfilledServings: 0,
    remainingServings: 60,
    urgencyLevel: URGENCY_LEVELS.HIGH,
    requiredBefore: new Date(Date.now() + 5 * 3600 * 1000), // in 5 hours
    notes: 'Dinner requirements for 45 children; warm rice and dal preferred.',
    status: DEMAND_STATUS.ACTIVE,
    isDemo: true
  });

  // Active demand for Sneha Care
  const demandSneha = await NGOFoodDemand.create({
    ngoId: ngoSneha._id,
    requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS, FOOD_CATEGORIES.BAKERY_DAIRY],
    requestedServings: 40,
    fulfilledServings: 0,
    remainingServings: 40,
    urgencyLevel: URGENCY_LEVELS.STANDARD,
    requiredBefore: new Date(Date.now() + 6 * 3600 * 1000),
    notes: 'Elderly residents dinner; low spice meals preferred.',
    status: DEMAND_STATUS.ACTIVE,
    isDemo: true
  });

  // Active demand for St. Jude
  await NGOFoodDemand.create({
    ngoId: ngoStJude._id,
    requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS, FOOD_CATEGORIES.RAW_PRODUCE],
    requestedServings: 50,
    fulfilledServings: 0,
    remainingServings: 50,
    urgencyLevel: URGENCY_LEVELS.STANDARD,
    requiredBefore: new Date(Date.now() + 7 * 3600 * 1000),
    notes: 'Night shelter feeding program.',
    status: DEMAND_STATUS.ACTIVE,
    isDemo: true
  });

  console.log('[SEED] Seeding 1 verified completed rescue for baseline impact metrics...');
  const pastDonation = await FoodDonation.create({
    donorId: donorHotel._id,
    title: '[DEMO] Executive Buffet Rice & Dal Surplus',
    category: FOOD_CATEGORIES.COOKED_MEALS,
    items: [{ name: 'Jeera Rice & Dal Tadka', quantity: 80, unit: 'servings' }],
    totalServings: 80,
    remainingServings: 0,
    preparationTime: new Date(Date.now() - 24 * 3600 * 1000),
    safeUseDeadline: new Date(Date.now() - 18 * 3600 * 1000),
    storageCondition: STORAGE_CONDITIONS.HOT_HOLDING,
    pickupAddress: {
      street: '42 MG Road',
      city: 'Bangalore',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    },
    status: DONATION_STATUS.COMPLETED,
    isDemo: true
  });

  const pastAlloc = await Allocation.create({
    donationId: pastDonation._id,
    ngoId: ngoAshraya._id,
    demandId: demandAshraya._id,
    allocatedServings: 80,
    matchScore: 96,
    scoreBreakdown: { distanceScore: 0.95, urgencyScore: 0.90, capacityScore: 1.0, historyScore: 0.98, distanceKm: 1.4 },
    recommendationRationale: 'Allocated 80 servings to Ashraya Children Home (1.4 km) based on highest composite match score and verified hot-holding equipment.',
    status: ALLOCATION_STATUS.ACCEPTED,
    responseDeadline: new Date(Date.now() - 23 * 3600 * 1000),
    isDemo: true
  });

  const pastAssignment = await PickupAssignment.create({
    allocationId: pastAlloc._id,
    donationId: pastDonation._id,
    ngoId: ngoAshraya._id,
    volunteerId: volunteer._id,
    status: ASSIGNMENT_STATUS.DELIVERED,
    timeline: {
      claimedAt: new Date(Date.now() - 23 * 3600 * 1000),
      pickedUpAt: new Date(Date.now() - 22.5 * 3600 * 1000),
      deliveredAt: new Date(Date.now() - 22 * 3600 * 1000)
    },
    isDemo: true
  });

  const cred1 = createOtpCredentials();
  const cred2 = createOtpCredentials();
  await HandoverVerification.create({
    assignmentId: pastAssignment._id,
    donorOtpHash: cred1.hash,
    donorOtpSalt: cred1.salt,
    donorConfirmedAt: new Date(Date.now() - 22.5 * 3600 * 1000),
    ngoOtpHash: cred2.hash,
    ngoOtpSalt: cred2.salt,
    ngoConfirmedAt: new Date(Date.now() - 22 * 3600 * 1000),
    receivedServings: 80,
    storageConditionAtReceipt: 'compliant',
    isDemo: true
  });

  console.log('[SEED] Demonstration seed completed successfully!');
  console.log('[SEED] Demo Accounts Summary (Password: DemoPassword2026!):');
  console.log(' - Donor (Hotel):     hotel.donor@foodbridge.demo');
  console.log(' - Donor (Market):    market.donor@foodbridge.demo');
  console.log(' - NGO (Children):    ashraya.shelter@foodbridge.demo');
  console.log(' - NGO (Seniors):     sneha.care@foodbridge.demo');
  console.log(' - NGO (Kitchen):     stjude.kitchen@foodbridge.demo');
  console.log(' - Volunteer:         rohan.volunteer@foodbridge.demo');
  console.log(' - Admin:             admin@foodbridge.demo');

  await disconnectDB();
}

// Allow direct CLI invocation: node src/seed/seedData.js
if (process.argv[1]?.endsWith('seedData.js')) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[SEED ERROR]', err);
      process.exit(1);
    });
}

import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../config/db.js';
import { dbStore, isMongoConnected } from '../storage/dbAdapter.js';
import { repo } from '../storage/repository.js';
import { hashPassword } from '../utils/passwordService.js';
import { createOtpCredentials } from '../utils/otpSecurity.js';
import {
  ROLES,
  FOOD_CATEGORIES,
  STORAGE_CONDITIONS,
  DONATION_STATUS,
  DEMAND_STATUS,
  ALLOCATION_STATUS,
  ASSIGNMENT_STATUS,
  URGENCY_LEVELS
} from '../config/constants.js';

export async function seedDemoData() {
  console.log('[SEED] Checking database connectivity...');
  await connectDB();

  console.log(`[SEED] Storage mode: ${isMongoConnected() ? 'MongoDB Atlas' : 'Local Persistent Demo Store'}`);
  console.log('[SEED] Resetting previous demonstration fixtures...');

  await dbStore.resetDemoData();
  await repo.users.deleteMany({});
  await repo.donorProfiles.deleteMany({});
  await repo.ngoProfiles.deleteMany({});
  await repo.volunteerProfiles.deleteMany({});
  await repo.donations.deleteMany({});
  await repo.demands.deleteMany({});
  await repo.allocations.deleteMany({});
  await repo.assignments.deleteMany({});
  await repo.handovers.deleteMany({});

  const defaultPassword = 'DemoPassword2026!';
  const passwordHash = await hashPassword(defaultPassword);

  console.log('[SEED] Seeding demonstration users and profiles...');

  // 1. Hotel Donor
  const donorHotel = await repo.users.create({
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

  await repo.donorProfiles.create({
    userId: donorHotel._id || donorHotel.id,
    orgType: 'hotel',
    fssaiLicenseNumber: 'FSSAI-112233445566',
    pickupInstructions: 'Enter via Loading Dock 3 behind banquet hall; ask for Chef Anand.'
  });

  // 2. Supermarket Donor
  const donorMarket = await repo.users.create({
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

  await repo.donorProfiles.create({
    userId: donorMarket._id || donorMarket.id,
    orgType: 'supermarket',
    fssaiLicenseNumber: 'FSSAI-998877665544',
    pickupInstructions: 'Service counter at rear delivery bay.'
  });

  // 3. NGO A: Ashraya Children's Home (Proximity: 1.4 km, Capacity: 70 servings)
  const ngoAshraya = await repo.users.create({
    email: 'ashraya.shelter@foodbridge.demo',
    passwordHash,
    role: ROLES.NGO,
    fullName: '[DEMO] Ashraya Children Home (NGO A)',
    phone: '+91 94480 33445',
    address: {
      street: '12 Richmond Crescent',
      city: 'Bangalore',
      location: { type: 'Point', coordinates: [77.6050, 12.9750] }
    },
    isVerified: true,
    isDemo: true
  });

  await repo.ngoProfiles.create({
    userId: ngoAshraya._id || ngoAshraya.id,
    organizationName: '[DEMO] Ashraya Children Home (NGO A)',
    registrationNumber: 'REG-KA-2018-8834',
    beneficiaryCount: 45,
    dailyReceivingCapacity: 70, // Matches exact prompt capacity
    activeCommittedServings: 0,
    coldStorageAvailable: true,
    hotHoldingAvailable: true,
    reliabilityScore: 0.98,
    isApprovedByAdmin: true
  });

  // 4. NGO B: Sneha Care Senior Home (Proximity: 3.2 km, Capacity: 50 servings)
  const ngoSneha = await repo.users.create({
    email: 'sneha.care@foodbridge.demo',
    passwordHash,
    role: ROLES.NGO,
    fullName: '[DEMO] Sneha Care Senior Home (NGO B)',
    phone: '+91 94481 55667',
    address: {
      street: '88 Victoria Layout',
      city: 'Bangalore',
      location: { type: 'Point', coordinates: [77.6200, 12.9800] }
    },
    isVerified: true,
    isDemo: true
  });

  await repo.ngoProfiles.create({
    userId: ngoSneha._id || ngoSneha.id,
    organizationName: '[DEMO] Sneha Care Senior Home (NGO B)',
    registrationNumber: 'REG-KA-2015-4421',
    beneficiaryCount: 50,
    dailyReceivingCapacity: 50, // Matches exact prompt capacity
    activeCommittedServings: 0,
    coldStorageAvailable: true,
    hotHoldingAvailable: true,
    reliabilityScore: 0.92,
    isApprovedByAdmin: true
  });

  // 5. NGO C: St. Jude Community Kitchen (Proximity: 5.0 km, Capacity: 30 servings)
  const ngoStJude = await repo.users.create({
    email: 'stjude.kitchen@foodbridge.demo',
    passwordHash,
    role: ROLES.NGO,
    fullName: '[DEMO] St. Jude Community Kitchen (NGO C)',
    phone: '+91 94482 77889',
    address: {
      street: '102 Domlur 2nd Stage',
      city: 'Bangalore',
      location: { type: 'Point', coordinates: [77.6400, 12.9600] }
    },
    isVerified: true,
    isDemo: true
  });

  await repo.ngoProfiles.create({
    userId: ngoStJude._id || ngoStJude.id,
    organizationName: '[DEMO] St. Jude Community Kitchen (NGO C)',
    registrationNumber: 'REG-KA-2020-9901',
    beneficiaryCount: 30,
    dailyReceivingCapacity: 30, // Matches exact prompt capacity
    activeCommittedServings: 0,
    coldStorageAvailable: true,
    hotHoldingAvailable: true,
    reliabilityScore: 0.90,
    isApprovedByAdmin: true
  });

  // 6. BACKUP NGO D: Mother Teresa Relief Center (Proximity: 6.2 km, Capacity: 50 servings)
  const ngoBackup = await repo.users.create({
    email: 'backup.shelter@foodbridge.demo',
    passwordHash,
    role: ROLES.NGO,
    fullName: '[DEMO] Mother Teresa Crisis Center (Backup NGO D)',
    phone: '+91 94483 11223',
    address: {
      street: '45 Halasuru Lake Road',
      city: 'Bangalore',
      location: { type: 'Point', coordinates: [77.6300, 12.9850] }
    },
    isVerified: true,
    isDemo: true
  });

  await repo.ngoProfiles.create({
    userId: ngoBackup._id || ngoBackup.id,
    organizationName: '[DEMO] Mother Teresa Crisis Center (Backup NGO D)',
    registrationNumber: 'REG-KA-2021-3321',
    beneficiaryCount: 50,
    dailyReceivingCapacity: 50,
    activeCommittedServings: 0,
    coldStorageAvailable: true,
    hotHoldingAvailable: true,
    reliabilityScore: 0.95,
    isApprovedByAdmin: true
  });

  // 7. Volunteer Driver
  const volunteer = await repo.users.create({
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

  await repo.volunteerProfiles.create({
    userId: volunteer._id || volunteer.id,
    vehicleType: 'car',
    maxPayloadKg: 60,
    isAvailable: true,
    completedDeliveriesCount: 14
  });

  // 8. Platform Admin
  await repo.users.create({
    email: 'admin@foodbridge.demo',
    passwordHash,
    role: ROLES.ADMIN,
    fullName: 'Ananya Deshmukh (Compliance Officer)',
    phone: '+91 98000 11111',
    isVerified: true,
    isDemo: true
  });

  console.log('[SEED] Registering active NGO demands matching prompt requirements...');

  // Demand NGO A: 70 servings
  await repo.demands.create({
    ngoId: ngoAshraya._id || ngoAshraya.id,
    requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS],
    requestedServings: 70,
    fulfilledServings: 0,
    remainingServings: 70,
    urgencyLevel: URGENCY_LEVELS.HIGH,
    requiredBefore: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    notes: 'Breakfast requirement for 45 children.',
    status: DEMAND_STATUS.ACTIVE,
    isDemo: true
  });

  // Demand NGO B: 50 servings
  await repo.demands.create({
    ngoId: ngoSneha._id || ngoSneha.id,
    requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS],
    requestedServings: 50,
    fulfilledServings: 0,
    remainingServings: 50,
    urgencyLevel: URGENCY_LEVELS.HIGH,
    requiredBefore: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    notes: 'Lunch requirement for senior residents.',
    status: DEMAND_STATUS.ACTIVE,
    isDemo: true
  });

  // Demand NGO C: 30 servings
  await repo.demands.create({
    ngoId: ngoStJude._id || ngoStJude.id,
    requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS],
    requestedServings: 30,
    fulfilledServings: 0,
    remainingServings: 30,
    urgencyLevel: URGENCY_LEVELS.HIGH,
    requiredBefore: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    notes: 'Community kitchen dinner supplement.',
    status: DEMAND_STATUS.ACTIVE,
    isDemo: true
  });

  // Demand Backup NGO D: 50 servings (Ready to absorb declined quota!)
  await repo.demands.create({
    ngoId: ngoBackup._id || ngoBackup.id,
    requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS],
    requestedServings: 50,
    fulfilledServings: 0,
    remainingServings: 50,
    urgencyLevel: URGENCY_LEVELS.STANDARD,
    requiredBefore: new Date(Date.now() + 7 * 3600 * 1000).toISOString(),
    notes: 'Emergency night shelter reserve demand.',
    status: DEMAND_STATUS.ACTIVE,
    isDemo: true
  });

  console.log('[SEED] Seeding historical completed rescue for baseline verified metrics...');
  const pastDonation = await repo.donations.create({
    donorId: donorHotel._id || donorHotel.id,
    title: '[DEMO] Executive Buffet Rice & Dal Surplus',
    category: FOOD_CATEGORIES.COOKED_MEALS,
    items: [{ name: 'Jeera Rice & Dal Tadka', quantity: 80, unit: 'servings' }],
    totalServings: 80,
    remainingServings: 0,
    preparationTime: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    safeUseDeadline: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    storageCondition: STORAGE_CONDITIONS.HOT_HOLDING,
    pickupAddress: {
      street: '42 MG Road',
      city: 'Bangalore',
      location: { type: 'Point', coordinates: [77.5946, 12.9716] }
    },
    status: DONATION_STATUS.COMPLETED,
    isDemo: true
  });

  const pastAssignment = await repo.assignments.create({
    allocationId: 'alloc_historical_01',
    donationId: pastDonation._id || pastDonation.id,
    ngoId: ngoAshraya._id || ngoAshraya.id,
    volunteerId: volunteer._id || volunteer.id,
    status: ASSIGNMENT_STATUS.DELIVERED,
    timeline: {
      claimedAt: new Date(Date.now() - 23 * 3600 * 1000).toISOString(),
      pickedUpAt: new Date(Date.now() - 22.5 * 3600 * 1000).toISOString(),
      deliveredAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString()
    },
    isDemo: true
  });

  const cred1 = createOtpCredentials();
  const cred2 = createOtpCredentials();
  await repo.handovers.create({
    assignmentId: pastAssignment._id || pastAssignment.id,
    donorOtpHash: cred1.hash,
    donorOtpSalt: cred1.salt,
    donorConfirmedAt: new Date(Date.now() - 22.5 * 3600 * 1000).toISOString(),
    ngoOtpHash: cred2.hash,
    ngoOtpSalt: cred2.salt,
    ngoConfirmedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    receivedServings: 80,
    storageConditionAtReceipt: 'compliant',
    isDemo: true
  });

  console.log('[SEED] Demonstration fixtures successfully seeded!');
  console.log('[SEED] Accounts (Password: DemoPassword2026!):');
  console.log(' - Hotel Donor:        hotel.donor@foodbridge.demo');
  console.log(' - NGO A (Children):   ashraya.shelter@foodbridge.demo   (Demand: 70, Cap: 70)');
  console.log(' - NGO B (Seniors):    sneha.care@foodbridge.demo        (Demand: 50, Cap: 50)');
  console.log(' - NGO C (Kitchen):    stjude.kitchen@foodbridge.demo    (Demand: 30, Cap: 30)');
  console.log(' - Backup NGO D:       backup.shelter@foodbridge.demo    (Demand: 50, Cap: 50)');
  console.log(' - Volunteer:          rohan.volunteer@foodbridge.demo');
  console.log(' - Admin:              admin@foodbridge.demo');

  await disconnectDB();
}

if (process.argv[1]?.endsWith('seedData.js')) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[SEED ERROR]', err);
      process.exit(1);
    });
}

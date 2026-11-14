import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { seedDemoData } from '../src/seed/seedData.js';
import { repo } from '../src/storage/repository.js';
import { createOtpCredentials } from '../src/utils/otpSecurity.js';
import { ALLOCATION_STATUS, ASSIGNMENT_STATUS, DEMAND_STATUS, DONATION_STATUS } from '../src/config/constants.js';

describe('FOODBRIDGE AI — COMPLETE JUDGES DEMONSTRATION WORKFLOW (END-TO-END)', () => {
  let donorToken = '';
  let ngoAToken = '';
  let ngoAUserId = '';
  let ngoBToken = '';
  let ngoBUserId = '';
  let ngoDToken = '';
  let ngoDUserId = '';
  let volunteerToken = '';

  let createdDonationId = '';
  let allocationNgoA = null;
  let allocationNgoB = null;
  let allocationNgoC = null;
  let reallocatedNgoD = null;
  let assignmentId = '';
  let ngoAReceiptOtp = '';

  beforeAll(async () => {
    // Seed fresh demo fixtures
    await seedDemoData();

    // Authenticate Hotel Donor
    const donorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hotel.donor@foodbridge.demo', password: 'DemoPassword2026!' });
    expect(donorRes.status).toBe(200);
    donorToken = donorRes.body.token;

    // Authenticate NGO A (Ashraya)
    const ngoARes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ashraya.shelter@foodbridge.demo', password: 'DemoPassword2026!' });
    expect(ngoARes.status).toBe(200);
    ngoAToken = ngoARes.body.token;
    ngoAUserId = ngoARes.body.user.id;

    // Authenticate NGO B (Sneha Care)
    const ngoBRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sneha.care@foodbridge.demo', password: 'DemoPassword2026!' });
    expect(ngoBRes.status).toBe(200);
    ngoBToken = ngoBRes.body.token;
    ngoBUserId = ngoBRes.body.user.id;

    // Authenticate Backup NGO D (Mother Teresa)
    const ngoDRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'backup.shelter@foodbridge.demo', password: 'DemoPassword2026!' });
    expect(ngoDRes.status).toBe(200);
    ngoDToken = ngoDRes.body.token;
    ngoDUserId = ngoDRes.body.user.id;

    // Authenticate Volunteer
    const volRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rohan.volunteer@foodbridge.demo', password: 'DemoPassword2026!' });
    expect(volRes.status).toBe(200);
    volunteerToken = volRes.body.token;
  });

  it('Step 1 & 2: Donor creates donation containing 150 meal servings and triggers Multi-NGO Allocation', async () => {
    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        title: '[DEMO] Grand Palace Banquet Surplus Feast',
        category: 'cooked_meals',
        totalServings: 150,
        preparationTime: new Date(Date.now() - 3600 * 1000).toISOString(),
        safeUseDeadline: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
        storageCondition: 'hot_holding',
        pickupAddress: {
          street: '42 MG Road Loading Dock 3',
          city: 'Bangalore',
          coordinates: [77.5946, 12.9716]
        },
        packagingDescription: 'Insulated stainless food-grade containers',
        allergenAlerts: ['Dairy'],
        isDemo: true
      });

    expect(res.status).toBe(201);
    expect(res.body.donation).toBeDefined();
    createdDonationId = res.body.donation._id || res.body.donation.id;

    const matching = res.body.matchingResult;
    expect(matching).toBeDefined();
    expect(matching.totalAllocatedServings).toBe(150);
    expect(matching.unallocatedServings).toBe(0);
    expect(matching.allocations.length).toBeGreaterThanOrEqual(3);

    // Identify allocations by NGO user ID
    allocationNgoA = matching.allocations.find(a => (a.ngoId?._id || a.ngoId?.id || a.ngoId).toString() === ngoAUserId.toString());
    allocationNgoB = matching.allocations.find(a => (a.ngoId?._id || a.ngoId?.id || a.ngoId).toString() === ngoBUserId.toString());
    allocationNgoC = matching.allocations.find(a => a.allocatedServings === 30);

    expect(allocationNgoA).toBeDefined();
    expect(allocationNgoB).toBeDefined();
    expect(allocationNgoC).toBeDefined();

    // Verify exact expected portions: NGO A = 70, NGO B = 50, NGO C = 30
    expect(allocationNgoA.allocatedServings).toBe(70);
    expect(allocationNgoB.allocatedServings).toBe(50);
    expect(allocationNgoC.allocatedServings).toBe(30);
  });

  it('Step 3: NGO B declines its 50 servings, triggering Dynamic Reallocation to Backup NGO D', async () => {
    const allocBId = allocationNgoB._id || allocationNgoB.id;

    const declineRes = await request(app)
      .post(`/api/allocations/${allocBId}/decline`)
      .set('Authorization', `Bearer ${ngoBToken}`)
      .send({ reason: 'Kitchen staff unavailable for distribution today.' });

    expect(declineRes.status).toBe(200);
    expect(declineRes.body.declinedAllocation.status).toBe(ALLOCATION_STATUS.DECLINED);
    expect(declineRes.body.restoredServings).toBe(50);

    // Verify dynamic reallocation result
    const realloc = declineRes.body.reallocationResult;
    expect(realloc).toBeDefined();
    expect(realloc.totalAllocatedServings).toBe(50);
    expect(realloc.allocations.length).toBe(1);

    reallocatedNgoD = realloc.allocations[0];
    expect(reallocatedNgoD.allocatedServings).toBe(50);
    expect((reallocatedNgoD.ngoId?._id || reallocatedNgoD.ngoId?.id || reallocatedNgoD.ngoId).toString()).toBe(ngoDUserId.toString());
    expect(reallocatedNgoD.status).toBe(ALLOCATION_STATUS.PROPOSED);
  });

  it('Step 4: NGO A reviews explainable match rationale and accepts its 70 servings', async () => {
    const allocAId = allocationNgoA._id || allocationNgoA.id;

    // Fetch incoming to verify visibility in NGO A console
    const incomingRes = await request(app)
      .get('/api/allocations/incoming')
      .set('Authorization', `Bearer ${ngoAToken}`);

    expect(incomingRes.status).toBe(200);
    const hasAllocA = incomingRes.body.some(a => (a._id || a.id).toString() === allocAId.toString());
    expect(hasAllocA).toBe(true);

    // Accept allocation
    const acceptRes = await request(app)
      .post(`/api/allocations/${allocAId}/accept`)
      .set('Authorization', `Bearer ${ngoAToken}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.assignmentId).toBeDefined();
    expect(acceptRes.body.ngoReceiptOtp).toBeDefined();
    expect(/^\d{6}$/.test(acceptRes.body.ngoReceiptOtp)).toBe(true);

    assignmentId = acceptRes.body.assignmentId;
    ngoAReceiptOtp = acceptRes.body.ngoReceiptOtp;
  });

  it('Step 5: Volunteer claims the pickup assignment and verifies milestone transitions', async () => {
    // Check available assignments
    const availRes = await request(app)
      .get('/api/assignments/available')
      .set('Authorization', `Bearer ${volunteerToken}`);

    expect(availRes.status).toBe(200);
    const canClaim = availRes.body.some(a => (a._id || a.id).toString() === assignmentId.toString());
    expect(canClaim).toBe(true);

    // Claim run
    const claimRes = await request(app)
      .post(`/api/assignments/${assignmentId}/claim`)
      .set('Authorization', `Bearer ${volunteerToken}`);

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.assignment.status).toBe(ASSIGNMENT_STATUS.CLAIMED);

    // Update milestone: Arrived at Donor Dock
    const arrivedRes = await request(app)
      .patch(`/api/assignments/${assignmentId}/milestone`)
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({ status: ASSIGNMENT_STATUS.ARRIVED_DONOR });

    expect(arrivedRes.status).toBe(200);
    expect(arrivedRes.body.assignment.status).toBe(ASSIGNMENT_STATUS.ARRIVED_DONOR);
  });

  it('Step 6: Digital OTP Handover Verification at Donor Dock and Recipient Shelter', async () => {
    // 1. Test incorrect OTP rejection
    const invalidOtpRes = await request(app)
      .post('/api/assignments/verify-pickup')
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({ assignmentId, otpCode: '000000' });

    expect(invalidOtpRes.status).toBe(400);
    expect(invalidOtpRes.body.error).toContain('Invalid Donor OTP');

    // 2. Fetch the stored handover record salt and generate a valid OTP for testing verification
    const testDonorCreds = createOtpCredentials();
    await repo.handovers.updateOne(
      { assignmentId },
      {
        $set: {
          donorOtpHash: testDonorCreds.hash,
          donorOtpSalt: testDonorCreds.salt
        }
      }
    );

    // Verify valid Donor Pickup OTP
    const validPickupRes = await request(app)
      .post('/api/assignments/verify-pickup')
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({ assignmentId, otpCode: testDonorCreds.rawOtp });

    expect(validPickupRes.status).toBe(200);
    expect(validPickupRes.body.assignment.status).toBe(ASSIGNMENT_STATUS.EN_ROUTE);

    // Update milestone: Arrived at NGO Shelter
    await request(app)
      .patch(`/api/assignments/${assignmentId}/milestone`)
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({ status: ASSIGNMENT_STATUS.ARRIVED_NGO });

    // Verify NGO Delivery Handover
    const testNgoCreds = createOtpCredentials();
    await repo.handovers.updateOne(
      { assignmentId },
      {
        $set: {
          ngoOtpHash: testNgoCreds.hash,
          ngoOtpSalt: testNgoCreds.salt
        }
      }
    );

    const validDeliveryRes = await request(app)
      .post('/api/assignments/verify-delivery')
      .set('Authorization', `Bearer ${volunteerToken}`)
      .send({
        assignmentId,
        otpCode: testNgoCreds.rawOtp,
        receivedServings: 70,
        storageConditionAtReceipt: 'compliant'
      });

    expect(validDeliveryRes.status).toBe(200);
    expect(validDeliveryRes.body.assignment.status).toBe(ASSIGNMENT_STATUS.DELIVERED);
    expect(validDeliveryRes.body.verifiedServings).toBe(70);
  });

  it('Step 7: Verified Impact Ledger reflects real completed handover metrics', async () => {
    const impactRes = await request(app).get('/api/impact/summary');

    expect(impactRes.status).toBe(200);
    const m = impactRes.body.metrics;
    expect(m).toBeDefined();

    // Baseline historical was 80, plus our new 70 verified servings = 150 servings!
    expect(m.totalServingsRedistributed).toBeGreaterThanOrEqual(150);
    expect(m.totalVerifiedRescues).toBeGreaterThanOrEqual(2);
    expect(m.estimatedWastePreventedKg).toBeGreaterThan(0);
    expect(m.estimatedCo2eAvoidedKg).toBeGreaterThan(0);
    expect(m.estimatedWaterSavedLiters).toBeGreaterThan(0);

    // Audit metadata check
    expect(impactRes.body.audit.isDemoEnvironment).toBe(true);
    expect(impactRes.body.audit.environmentalModelingReferences).toHaveLength(3);
  });
});

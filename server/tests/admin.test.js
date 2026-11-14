import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { seedDemoData } from '../src/seed/seedData.js';
import { evaluateCandidateEligibility } from '../src/engine/eligibility.js';
import { FOOD_CATEGORIES } from '../src/config/constants.js';

describe('Admin Workspace & NGO Compliance Verification Engine', () => {
  let adminToken;
  let volunteerToken;
  let pendingNgoProfileId;

  beforeAll(async () => {
    await seedDemoData();

    // Authenticate Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@foodbridge.demo', password: 'DemoPassword2026!' });
    adminToken = adminRes.body.token;

    // Authenticate Non-Admin (Volunteer)
    const volRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rohan.volunteer@foodbridge.demo', password: 'DemoPassword2026!' });
    volunteerToken = volRes.body.token;
  });

  it('rejects non-admin access to admin workspace endpoints', async () => {
    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${volunteerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Forbidden');
  });

  it('returns comprehensive platform overview metrics for admin', async () => {
    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.systemHealth.status).toBe('HEALTHY');
    expect(res.body.systemHealth.storage).toBeDefined();
    expect(res.body.ngos.total).toBeGreaterThanOrEqual(4);
    expect(res.body.ngos.pending).toBeGreaterThanOrEqual(1);
    expect(res.body.donations).toBeDefined();
    expect(res.body.allocations).toBeDefined();
    expect(res.body.assignments).toBeDefined();
  });

  it('retrieves the NGO compliance verification queue including pending applicant', async () => {
    const res = await request(app)
      .get('/api/admin/verification-queue')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.queue)).toBe(true);

    const pendingNgo = res.body.queue.find(n => n.isApprovedByAdmin === false);
    expect(pendingNgo).toBeDefined();
    expect(pendingNgo.organizationName).toContain('Karuna Care');
    pendingNgoProfileId = pendingNgo._id || pendingNgo.id;
  });

  it('verifies that unapproved NGO is rejected by the algorithmic eligibility filter', () => {
    const fakeDonation = {
      category: FOOD_CATEGORIES.COOKED_MEALS,
      safeUseDeadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      remainingServings: 50,
      pickupAddress: { coordinates: [77.5946, 12.9716] }
    };
    const fakeDemand = {
      requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS],
      remainingServings: 50
    };
    const unapprovedNgo = {
      isApprovedByAdmin: false,
      dailyReceivingCapacity: 50,
      address: { location: { coordinates: [77.6000, 12.9700] } }
    };

    const result = evaluateCandidateEligibility(fakeDonation, fakeDemand, unapprovedNgo);
    expect(result.isEligible).toBe(false);
    expect(result.reason).toContain('not verified or approved');
  });

  it('allows admin to approve an NGO with audit notes', async () => {
    const res = await request(app)
      .post(`/api/admin/ngos/${pendingNgoProfileId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'FSSAI cert and 80G verified on state compliance portal.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.isApprovedByAdmin).toBe(true);
    expect(res.body.profile.verificationNotes).toContain('FSSAI cert and 80G verified');
  });

  it('allows admin to reject or revoke approval with clear compliance feedback', async () => {
    const res = await request(app)
      .post(`/api/admin/ngos/${pendingNgoProfileId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Kitchen hygiene certificate expired.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.isApprovedByAdmin).toBe(false);
    expect(res.body.profile.verificationNotes).toContain('REJECTED');
  });

  it('secures admin bootstrap endpoint requiring matching ADMIN_BOOTSTRAP_SECRET', async () => {
    // 1. Invalid secret fails
    const failRes = await request(app)
      .post('/api/admin/bootstrap')
      .send({ secret: 'wrong-secret', email: 'newadmin@foodbridge.demo' });
    expect(failRes.status).toBe(403);

    // 2. Valid secret provisions or confirms admin
    const successRes = await request(app)
      .post('/api/admin/bootstrap')
      .send({
        secret: 'FoodBridgeAdminSecret2026!',
        email: 'compliance.lead@foodbridge.demo',
        fullName: 'Compliance Director'
      });
    expect([200, 201]).toContain(successRes.status);
    expect(successRes.body.success).toBe(true);
  });
});

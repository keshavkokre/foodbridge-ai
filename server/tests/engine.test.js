import { describe, it, expect } from 'vitest';
import { computeMultiNgoAllocations } from '../src/engine/multiAllocator.js';
import { calculateCandidateScores } from '../src/engine/scoring.js';
import { parseUnstructuredDonation } from '../src/engine/geminiExplainer.js';
import { sanitizeTextForAi } from '../src/utils/sanitizeForAi.js';
import { FOOD_CATEGORIES, STORAGE_CONDITIONS, URGENCY_LEVELS } from '../src/config/constants.js';

describe('Multi-NGO Intelligent Allocation Engine & Mathematical Invariants', () => {
  const mockDonation = {
    _id: 'donation_101',
    category: FOOD_CATEGORIES.COOKED_MEALS,
    storageCondition: STORAGE_CONDITIONS.HOT_HOLDING,
    totalServings: 150,
    remainingServings: 150,
    preparationTime: new Date(Date.now() - 60 * 60 * 1000),
    safeUseDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
    pickupAddress: {
      location: { coordinates: [77.5946, 12.9716] }
    }
  };

  it('INVARIANT 1: Total allocated servings strictly cannot exceed available donation quantity', () => {
    const demands = [
      { _id: 'dem_1', ngoId: 'ngo_1', requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS], remainingServings: 80, urgencyLevel: URGENCY_LEVELS.HIGH },
      { _id: 'dem_2', ngoId: 'ngo_2', requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS], remainingServings: 100, urgencyLevel: URGENCY_LEVELS.STANDARD }
    ];

    const profilesMap = new Map([
      ['ngo_1', { organizationName: 'Shelter A', isApprovedByAdmin: true, dailyReceivingCapacity: 100, activeCommittedServings: 0, hotHoldingAvailable: true, coordinates: [77.6000, 12.9720] }],
      ['ngo_2', { organizationName: 'Shelter B', isApprovedByAdmin: true, dailyReceivingCapacity: 120, activeCommittedServings: 0, hotHoldingAvailable: true, coordinates: [77.6100, 12.9730] }]
    ]);

    const result = computeMultiNgoAllocations(mockDonation, demands, profilesMap);

    expect(result.totalAllocated).toBeLessThanOrEqual(mockDonation.remainingServings);
    expect(result.totalAllocated).toBe(150); // 80 to Shelter A + 70 to Shelter B
    expect(result.unallocatedServings).toBe(0);
    expect(result.allocations).toHaveLength(2);
  });

  it('INVARIANT 2: Consolidates shared NGO capacity across multiple demands from the same NGO', () => {
    // NGO 1 has two active demands (e.g. 50 + 50 = 100 needed), but their physical receiving capacity limit is only 60 servings!
    const demands = [
      { _id: 'dem_A', ngoId: 'ngo_shared', requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS], remainingServings: 50, urgencyLevel: URGENCY_LEVELS.HIGH },
      { _id: 'dem_B', ngoId: 'ngo_shared', requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS], remainingServings: 50, urgencyLevel: URGENCY_LEVELS.STANDARD }
    ];

    const profilesMap = new Map([
      ['ngo_shared', {
        organizationName: 'Limited Capacity Shelter',
        isApprovedByAdmin: true,
        dailyReceivingCapacity: 60, // Maximum cap
        activeCommittedServings: 0,
        hotHoldingAvailable: true,
        coordinates: [77.6000, 12.9720]
      }]
    ]);

    const result = computeMultiNgoAllocations(mockDonation, demands, profilesMap);

    // Sum of allocations for ngo_shared cannot exceed 60
    const allocatedToNgo = result.allocations
      .filter(a => a.ngoId.toString() === 'ngo_shared')
      .reduce((sum, a) => sum + a.allocatedServings, 0);

    expect(allocatedToNgo).toBeLessThanOrEqual(60);
    expect(allocatedToNgo).toBe(60); // 50 for dem_A + 10 for dem_B
  });

  it('INVARIANT 3: Urgency score strictly increases as time to expiry decreases (corrected inverse decay)', () => {
    const demand = { remainingServings: 50, urgencyLevel: URGENCY_LEVELS.STANDARD };
    const ngoProfile = { reliabilityScore: 0.9 };

    // Fresh food: 8 hours remaining out of 8 hours shelf life
    const freshDonation = {
      ...mockDonation,
      preparationTime: new Date(Date.now()),
      safeUseDeadline: new Date(Date.now() + 8 * 3600 * 1000)
    };

    // Urgent food: 45 minutes remaining out of 8 hours shelf life
    const urgentDonation = {
      ...mockDonation,
      preparationTime: new Date(Date.now() - 7.25 * 3600 * 1000),
      safeUseDeadline: new Date(Date.now() + 45 * 60 * 1000)
    };

    const freshScores = calculateCandidateScores(freshDonation, demand, 100, ngoProfile, 2.0);
    const urgentScores = calculateCandidateScores(urgentDonation, demand, 100, ngoProfile, 2.0);

    expect(urgentScores.urgencyScore).toBeGreaterThan(freshScores.urgencyScore);
  });

  it('INVARIANT 4: All scoring factors are strictly normalized in range [0.0, 1.0]', () => {
    const demand = { remainingServings: 50, urgencyLevel: URGENCY_LEVELS.CRITICAL };
    const ngoProfile = { reliabilityScore: 1.0 };

    const scores = calculateCandidateScores(mockDonation, demand, 80, ngoProfile, 1.2);

    expect(scores.distanceScore).toBeGreaterThanOrEqual(0.0);
    expect(scores.distanceScore).toBeLessThanOrEqual(1.0);

    expect(scores.urgencyScore).toBeGreaterThanOrEqual(0.0);
    expect(scores.urgencyScore).toBeLessThanOrEqual(1.0);

    expect(scores.capacityScore).toBeGreaterThanOrEqual(0.0);
    expect(scores.capacityScore).toBeLessThanOrEqual(1.0);

    expect(scores.historyScore).toBeGreaterThanOrEqual(0.0);
    expect(scores.historyScore).toBeLessThanOrEqual(1.0);

    expect(scores.compositeScore).toBeGreaterThanOrEqual(0);
    expect(scores.compositeScore).toBeLessThanOrEqual(100);
  });

  it('INVARIANT 5: Explicitly preserves unallocated portions when demand is less than donation', () => {
    // Donation is 150 servings, demand is only 40
    const smallDemand = [
      { _id: 'dem_small', ngoId: 'ngo_1', requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS], remainingServings: 40, urgencyLevel: URGENCY_LEVELS.STANDARD }
    ];

    const profilesMap = new Map([
      ['ngo_1', { organizationName: 'Shelter A', isApprovedByAdmin: true, dailyReceivingCapacity: 100, activeCommittedServings: 0, hotHoldingAvailable: true, coordinates: [77.6000, 12.9720] }]
    ]);

    const result = computeMultiNgoAllocations(mockDonation, smallDemand, profilesMap);

    expect(result.totalAllocated).toBe(40);
    expect(result.unallocatedServings).toBe(110);
    expect(result.isFullyAllocated).toBe(false);
  });

  it('sanitizes personal identifiable information (PII) before AI processing', () => {
    const rawText = "Call Rahul at 9876543210 or email contact@banquets.com, delivery to Flat 402, Building 3.";
    const clean = sanitizeTextForAi(rawText);

    expect(clean).not.toContain('9876543210');
    expect(clean).not.toContain('contact@banquets.com');
    expect(clean).not.toContain('Flat 402');
    expect(clean).toContain('[PHONE_REDACTED]');
    expect(clean).toContain('[EMAIL_REDACTED]');
    expect(clean).toContain('[UNIT_REDACTED]');
  });

  it('deterministic fallback parser extracts structured details without Gemini API', async () => {
    const text = "We have 75 hot meals of vegetable pulao packed fresh at 1 PM, contains dairy.";
    const parsed = await parseUnstructuredDonation(text);

    expect(parsed.totalServings).toBe(75);
    expect(parsed.category).toBe(FOOD_CATEGORIES.COOKED_MEALS);
    expect(parsed.storageCondition).toBe(STORAGE_CONDITIONS.HOT_HOLDING);
    expect(parsed.allergenAlerts).toContain('Dairy');
  });
});


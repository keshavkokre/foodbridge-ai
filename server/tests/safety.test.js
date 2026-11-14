import { describe, it, expect } from 'vitest';
import { evaluateCandidateEligibility } from '../src/engine/eligibility.js';
import { FOOD_CATEGORIES, STORAGE_CONDITIONS } from '../src/config/constants.js';

describe('Deterministic Food Safety & Eligibility Filter', () => {
  const baseDonation = {
    category: FOOD_CATEGORIES.COOKED_MEALS,
    storageCondition: STORAGE_CONDITIONS.HOT_HOLDING,
    totalServings: 100,
    remainingServings: 100,
    preparationTime: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    safeUseDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    pickupAddress: {
      location: { coordinates: [77.5946, 12.9716] } // Bangalore central
    }
  };

  const baseDemand = {
    requestedCategories: [FOOD_CATEGORIES.COOKED_MEALS],
    requestedServings: 60,
    remainingServings: 60
  };

  const baseNgo = {
    organizationName: 'City Children Shelter',
    isApprovedByAdmin: true,
    dailyReceivingCapacity: 100,
    activeCommittedServings: 0,
    hotHoldingAvailable: true,
    coldStorageAvailable: true,
    address: {
      location: { coordinates: [77.6050, 12.9750] } // ~1.5 km away
    }
  };

  it('approves candidate when all food safety and capacity criteria are satisfied', () => {
    const result = evaluateCandidateEligibility(baseDonation, baseDemand, baseNgo);
    expect(result.isEligible).toBe(true);
    expect(result.distanceKm).toBeLessThan(5);
    expect(result.estimatedTransitMins).toBeGreaterThan(0);
  });

  it('rejects candidate if NGO is not approved by administrator', () => {
    const unapprovedNgo = { ...baseNgo, isApprovedByAdmin: false };
    const result = evaluateCandidateEligibility(baseDonation, baseDemand, unapprovedNgo);
    expect(result.isEligible).toBe(false);
    expect(result.reason).toContain('not verified or approved');
  });

  it('rejects donation if safe-use window is below policy minimum', () => {
    // 20 minutes remaining is below the 60 min threshold for cooked meals
    const nearExpiryDonation = {
      ...baseDonation,
      safeUseDeadline: new Date(Date.now() + 20 * 60 * 1000)
    };
    const result = evaluateCandidateEligibility(nearExpiryDonation, baseDemand, baseNgo);
    expect(result.isEligible).toBe(false);
    expect(result.reason).toContain('below policy threshold');
  });

  it('rejects candidate when food category is not requested in NGO demand', () => {
    const mismatchedDemand = {
      ...baseDemand,
      requestedCategories: [FOOD_CATEGORIES.RAW_PRODUCE]
    };
    const result = evaluateCandidateEligibility(baseDonation, mismatchedDemand, baseNgo);
    expect(result.isEligible).toBe(false);
    expect(result.reason).toContain('does not include category');
  });

  it('rejects candidate if distance exceeds maximum policy radius', () => {
    // Coordinates ~60 km away (exceeds 25 km cooked meals max radius)
    const distantNgo = {
      ...baseNgo,
      address: {
        location: { coordinates: [77.2000, 13.5000] }
      }
    };
    const result = evaluateCandidateEligibility(baseDonation, baseDemand, distantNgo);
    expect(result.isEligible).toBe(false);
    expect(result.reason).toContain('exceeds maximum policy radius');
  });

  it('enforces hot-holding transit time limit when NGO lacks hot holding equipment', () => {
    const noHotHoldingNgo = {
      ...baseNgo,
      hotHoldingAvailable: false,
      address: {
        // ~20 km away -> transit ~59 mins which exceeds 45 mins limit without insulation
        location: { coordinates: [77.7500, 13.0500] }
      }
    };
    const result = evaluateCandidateEligibility(baseDonation, baseDemand, noHotHoldingNgo);
    expect(result.isEligible).toBe(false);
    expect(result.reason).toContain('safe hot-holding transit window');
  });
});


import { FoodSafetyPolicy } from '../config/foodSafetyPolicy.js';
import { calculateHaversineDistanceKm, estimateTransitMinutes } from './distance.js';
import { STORAGE_CONDITIONS } from '../config/constants.js';

/**
 * Deterministic Food Safety & Eligibility Filtration Engine.
 * Evaluates candidates against documented food safety standards (FSSAI/USDA principles).
 * AI NEVER decides safety eligibility.
 */
export function evaluateCandidateEligibility(donation, demand, ngoProfile, options = {}) {
  const policy = FoodSafetyPolicy.categories[donation.category] || FoodSafetyPolicy.categories.cooked_meals;
  const now = options.now || new Date();

  // 1. NGO Approval & Verification Gate
  if (!ngoProfile || !ngoProfile.isApprovedByAdmin) {
    return {
      isEligible: false,
      reason: 'NGO is not verified or approved by platform administration.'
    };
  }

  // 2. Expiration Check (Safe-Use Window)
  const expiryDate = new Date(donation.safeUseDeadline);
  const remainingMinutes = (expiryDate.getTime() - now.getTime()) / (60 * 1000);

  if (remainingMinutes < policy.minShelfLifeRemainingMinutes) {
    return {
      isEligible: false,
      reason: `Food remaining safe-use window (${Math.round(remainingMinutes)} mins) is below policy threshold (${policy.minShelfLifeRemainingMinutes} mins).`
    };
  }

  // 3. Category Match
  const isCategoryRequested = demand.requestedCategories?.includes(donation.category);
  if (!isCategoryRequested) {
    return {
      isEligible: false,
      reason: `NGO demand does not include category '${donation.category}'.`
    };
  }

  // 4. Geographic Radius & Distance Check
  const donorCoords = donation.pickupAddress?.location?.coordinates || donation.pickupAddress?.coordinates;
  const ngoCoords = ngoProfile.address?.location?.coordinates || ngoProfile.coordinates || [77.5946, 12.9716];

  const distanceKm = calculateHaversineDistanceKm(donorCoords, ngoCoords);
  if (distanceKm > policy.maxRadiusKm) {
    return {
      isEligible: false,
      reason: `Distance (${distanceKm} km) exceeds maximum policy radius (${policy.maxRadiusKm} km) for ${donation.category}.`
    };
  }

  // 5. Transit Time Feasibility & Temperature Protection
  const estimatedTransitMins = estimateTransitMinutes(distanceKm);
  const hasColdStorage = Boolean(ngoProfile.coldStorageAvailable);
  const hasHotHolding = Boolean(ngoProfile.hotHoldingAvailable);

  if (donation.storageCondition === STORAGE_CONDITIONS.HOT_HOLDING) {
    const allowedTransit = hasHotHolding
      ? policy.maxTransitMinutesWithInsulation || 90
      : policy.maxTransitMinutesWithoutActiveChilling || 45;

    if (estimatedTransitMins > allowedTransit) {
      return {
        isEligible: false,
        reason: `Estimated transit (${estimatedTransitMins} mins) exceeds safe hot-holding transit window (${allowedTransit} mins).`
      };
    }
  }

  if (donation.storageCondition === STORAGE_CONDITIONS.REFRIGERATED) {
    if (!hasColdStorage && estimatedTransitMins > (policy.maxTransitMinutesWithoutActiveChilling || 45)) {
      return {
        isEligible: false,
        reason: 'NGO lacks cold storage equipment and transit duration exceeds unchilled safety margin.'
      };
    }
  }

  // 6. Minimum Viable Batch
  const ngoEffectiveCap = Math.max(0, ngoProfile.dailyReceivingCapacity - (ngoProfile.activeCommittedServings || 0));
  const maxPossibleBatch = Math.min(donation.remainingServings, demand.remainingServings, ngoEffectiveCap);

  if (maxPossibleBatch < FoodSafetyPolicy.minBatchServings) {
    return {
      isEligible: false,
      reason: `Potential batch size (${maxPossibleBatch} servings) is below minimum logistical threshold (${FoodSafetyPolicy.minBatchServings} servings).`
    };
  }

  return {
    isEligible: true,
    distanceKm,
    estimatedTransitMins,
    remainingMinutesToExpiry: Math.round(remainingMinutes)
  };
}


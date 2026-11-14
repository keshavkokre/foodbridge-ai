import { FoodSafetyPolicy } from '../config/foodSafetyPolicy.js';
import { evaluateCandidateEligibility } from './eligibility.js';
import { calculateCandidateScores } from './scoring.js';

/**
 * Intelligent Multi-NGO Capacity-Constrained Allocation Engine.
 * 
 * Invariants Guaranteed:
 * 1. Total Allocated Servings <= Donation Available Quantity.
 * 2. NGO Capacity is shared and never exceeded across multiple active demands.
 * 3. Enforces Minimum Batch Size.
 * 4. Explicitly outputs remaining unallocated portions.
 */
export function computeMultiNgoAllocations(donation, demandsList, ngoProfilesMap, options = {}) {
  const policyConfig = options.policyConfig || FoodSafetyPolicy;
  const now = options.now || new Date();

  // 1. Initialize and track shared capacity per NGO across multiple demands
  const ngoRemainingCapacity = new Map();
  for (const [ngoIdStr, profile] of ngoProfilesMap.entries()) {
    const committed = profile.activeCommittedServings || 0;
    const initialAvailable = Math.max(0, profile.dailyReceivingCapacity - committed);
    ngoRemainingCapacity.set(ngoIdStr, initialAvailable);
  }

  // 2. Filter & Score Eligible Candidates
  const scoredCandidates = [];

  for (const demand of demandsList) {
    const ngoIdStr = (demand.ngoId._id || demand.ngoId).toString();
    const profile = ngoProfilesMap.get(ngoIdStr);
    if (!profile) continue;

    // Check shared capacity remaining for this NGO
    const availableCap = ngoRemainingCapacity.get(ngoIdStr) || 0;
    if (availableCap < policyConfig.minBatchServings) continue;

    // Evaluate eligibility filter
    const eligibility = evaluateCandidateEligibility(donation, demand, profile, { now });
    if (!eligibility.isEligible) continue;

    // Compute normalized scores
    const scoreResult = calculateCandidateScores(
      donation,
      demand,
      availableCap,
      profile,
      eligibility.distanceKm,
      { now }
    );

    scoredCandidates.push({
      demand,
      ngoProfile: profile,
      ngoIdStr,
      eligibility,
      scores: scoreResult,
      compositeScore: scoreResult.compositeScore
    });
  }

  // 3. Sort Descending by Composite Match Score
  scoredCandidates.sort((a, b) => b.compositeScore - a.compositeScore);

  // 4. Bounded Greedy Fractional Allocation
  let unallocatedServings = donation.remainingServings;
  const allocations = [];

  for (const candidate of scoredCandidates) {
    if (unallocatedServings <= 0) break;

    const currentNgoCap = ngoRemainingCapacity.get(candidate.ngoIdStr) || 0;
    const currentDemandNeed = candidate.demand.remainingServings;

    // Bounded portion calculation
    const portion = Math.min(unallocatedServings, currentDemandNeed, currentNgoCap);

    if (portion >= policyConfig.minBatchServings) {
      allocations.push({
        donationId: donation._id,
        ngoId: candidate.demand.ngoId,
        demandId: candidate.demand._id,
        allocatedServings: portion,
        matchScore: Math.round(candidate.compositeScore),
        scoreBreakdown: {
          ...candidate.scores,
          distanceKm: candidate.eligibility.distanceKm,
          estimatedTransitMins: candidate.eligibility.estimatedTransitMins
        },
        responseDeadline: new Date(now.getTime() + policyConfig.responseTtlMs),
        organizationName: candidate.ngoProfile.organizationName,
        status: 'PROPOSED'
      });

      // Deduct from remaining pools atomically
      unallocatedServings -= portion;
      ngoRemainingCapacity.set(candidate.ngoIdStr, currentNgoCap - portion);
    }
  }

  // Verification of Invariants
  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedServings, 0);
  if (totalAllocated > donation.remainingServings) {
    throw new Error(`CRITICAL INVARIANT VIOLATION: Allocated servings (${totalAllocated}) exceeded available (${donation.remainingServings}).`);
  }

  return {
    allocations,
    unallocatedServings,
    totalAllocated,
    isFullyAllocated: unallocatedServings === 0,
    candidateCount: scoredCandidates.length
  };
}

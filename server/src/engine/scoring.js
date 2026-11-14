import { FoodSafetyPolicy } from '../config/foodSafetyPolicy.js';
import { getAllocationWeights } from '../config/allocationWeights.js';
import { URGENCY_LEVELS } from '../config/constants.js';

/**
 * Calculates normalized scores for an eligible candidate demand.
 * All individual score components are strictly normalized between 0.0 and 1.0.
 * Composite score is scaled between 0 and 100.
 */
export function calculateCandidateScores(donation, demand, ngoCap, ngoProfile, distanceKm, options = {}) {
  const policy = FoodSafetyPolicy.categories[donation.category] || FoodSafetyPolicy.categories.cooked_meals;
  const weights = getAllocationWeights();
  const now = options.now || new Date();

  // 1. Distance Suitability Factor S_dist in [0.0, 1.0]
  const maxRadius = policy.maxRadiusKm || 30;
  const distanceScore = Math.max(0, Math.min(1, 1 - (distanceKm / maxRadius)));

  // 2. Urgency Alignment Factor S_urgency in [0.0, 1.0] (Mathematically Corrected Inverse Decay)
  // Closer to expiry -> higher time urgency (approaches 1.0)
  const expiryTime = new Date(donation.safeUseDeadline).getTime();
  const prepTime = new Date(donation.preparationTime || (expiryTime - 6 * 3600 * 1000)).getTime();
  const nowTime = now.getTime();

  const totalShelfLifeMs = Math.max(3600 * 1000, expiryTime - prepTime);
  const remainingLifeMs = Math.max(0, expiryTime - nowTime);

  // When remaining time is small, U_time -> 1.0
  const uTime = Math.max(0, Math.min(1, 1 - (remainingLifeMs / totalShelfLifeMs)));

  // Demand urgency tier mapping
  let uDemand = 0.2;
  if (demand.urgencyLevel === URGENCY_LEVELS.CRITICAL) {
    uDemand = 1.0;
  } else if (demand.urgencyLevel === URGENCY_LEVELS.HIGH) {
    uDemand = 0.6;
  }

  const urgencyScore = Math.round((0.6 * uTime + 0.4 * uDemand) * 1000) / 1000;

  // 3. Capacity & Demand Fit Factor S_capacity in [0.0, 1.0]
  // Evaluates actual potential portion against remaining donation, remaining demand, and remaining NGO capacity
  const potentialPortion = Math.min(donation.remainingServings, demand.remainingServings, ngoCap);
  const demandTarget = Math.min(donation.remainingServings, demand.remainingServings);

  let capacityScore = 0.0;
  if (demandTarget > 0 && ngoCap > 0) {
    capacityScore = Math.max(0, Math.min(1, potentialPortion / demandTarget));
  }

  // 4. Historical Reliability Factor S_history in [0.0, 1.0]
  const rawHistory = typeof ngoProfile?.reliabilityScore === 'number' ? ngoProfile.reliabilityScore : 1.0;
  const historyScore = Math.max(0.1, Math.min(1.0, rawHistory));

  // Composite Score Calculation [0 to 100]
  const composite = (
    weights.distance * distanceScore +
    weights.urgency * urgencyScore +
    weights.capacity * capacityScore +
    weights.history * historyScore
  ) * 100;

  const compositeScore = Math.round(composite * 10) / 10;

  return {
    compositeScore,
    distanceScore: Math.round(distanceScore * 100) / 100,
    urgencyScore: Math.round(urgencyScore * 100) / 100,
    capacityScore: Math.round(capacityScore * 100) / 100,
    historyScore: Math.round(historyScore * 100) / 100,
    weights
  };
}


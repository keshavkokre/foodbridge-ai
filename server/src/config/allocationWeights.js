/**
 * FoodBridge AI - Allocation Scoring Weights Configuration
 * Heuristic parameters for the normalized multi-factor matching engine.
 * Note: These are operational parameters calibrated for urban emergency rescue,
 * not claimed to be universal scientific constants.
 */
export const DEFAULT_ALLOCATION_WEIGHTS = {
  distance: 0.35,   // Proximity priority
  urgency: 0.30,    // Safe-use deadline urgency & demand priority
  capacity: 0.20,   // Batch size and NGO capacity fit
  history: 0.15     // Historical fulfillment reliability
};

export function getAllocationWeights() {
  const wDist = parseFloat(process.env.WEIGHT_DISTANCE) || DEFAULT_ALLOCATION_WEIGHTS.distance;
  const wUrg = parseFloat(process.env.WEIGHT_URGENCY) || DEFAULT_ALLOCATION_WEIGHTS.urgency;
  const wCap = parseFloat(process.env.WEIGHT_CAPACITY) || DEFAULT_ALLOCATION_WEIGHTS.capacity;
  const wHist = parseFloat(process.env.WEIGHT_HISTORY) || DEFAULT_ALLOCATION_WEIGHTS.history;

  const total = wDist + wUrg + wCap + wHist;
  return {
    distance: wDist / total,
    urgency: wUrg / total,
    capacity: wCap / total,
    history: wHist / total
  };
}

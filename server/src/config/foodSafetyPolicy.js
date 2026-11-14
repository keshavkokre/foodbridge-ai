/**
 * FoodBridge AI - Food Safety Policy Configuration
 * Aligned with FSSAI Safe Food Guidelines for Donated Food & USDA Temperature Danger Zone principles.
 */
export const FoodSafetyPolicy = {
  version: "2026.1-FSSAI-USDA-aligned",
  sourceReferences: [
    "FSSAI Safe Food and Hygiene Guidelines for Donated Food",
    "USDA FSIS Danger Zone Principles (40°F - 140°F / 4°C - 60°C)"
  ],
  categories: {
    cooked_meals: {
      displayName: "Prepared / Cooked Meals",
      maxTransitMinutesWithoutActiveChilling: 45,
      maxTransitMinutesWithInsulation: 90,
      maxRadiusKm: 25,
      minShelfLifeRemainingMinutes: 60,
      allowedStorageConditions: ['hot_holding', 'refrigerated']
    },
    raw_produce: {
      displayName: "Raw Fresh Produce",
      maxTransitMinutesWithoutActiveChilling: 180,
      maxRadiusKm: 50,
      minShelfLifeRemainingMinutes: 240,
      allowedStorageConditions: ['room_temperature', 'refrigerated']
    },
    packaged_groceries: {
      displayName: "Packaged Dry Groceries",
      maxTransitMinutesWithoutActiveChilling: 360,
      maxRadiusKm: 75,
      minShelfLifeRemainingMinutes: 1440, // 24 hours
      allowedStorageConditions: ['room_temperature', 'refrigerated', 'frozen']
    },
    bakery_dairy: {
      displayName: "Bakery & Dairy Items",
      maxTransitMinutesWithoutActiveChilling: 60,
      maxRadiusKm: 30,
      minShelfLifeRemainingMinutes: 120,
      allowedStorageConditions: ['refrigerated', 'room_temperature']
    }
  },
  minBatchServings: 10,
  responseTtlMs: 30 * 60 * 1000 // 30 minutes response deadline for proposed allocations
};


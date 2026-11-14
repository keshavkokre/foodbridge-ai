import { describe, it, expect } from 'vitest';
import { getAllocationWeights } from '../src/config/allocationWeights.js';
import { parseUnstructuredDonation } from '../src/engine/geminiExplainer.js';
import { getStorageMode } from '../src/storage/dbAdapter.js';
import { FoodSafetyPolicy } from '../src/config/foodSafetyPolicy.js';

describe('System Resilience, Fallbacks & Edge Cases', () => {
  it('handles missing or partial environment variables with robust defaults', () => {
    const weights = getAllocationWeights();
    expect(weights.distance).toBeGreaterThan(0);
    expect(weights.urgency).toBeGreaterThan(0);
    expect(weights.capacity).toBeGreaterThan(0);
    expect(weights.history).toBeGreaterThan(0);

    const sum = weights.distance + weights.urgency + weights.capacity + weights.history;
    expect(Math.round(sum * 100) / 100).toBe(1.0);
  });

  it('reports transparent storage mode when running in local demo mode', () => {
    const info = getStorageMode();
    expect(info.mode).toBeDefined();
    expect(['MONGODB_ATLAS', 'LOCAL_PERSISTENT_DEMO_STORE']).toContain(info.mode);
    expect(info.label).toBeDefined();
  });

  it('gracefully parses unstructured text when external AI API is unconfigured or rate limited', async () => {
    const prompt = 'Surplus 45 vegetarian meal boxes prepared at 1:30 PM, keep warm, safe until 5 PM.';
    const result = await parseUnstructuredDonation(prompt);

    expect(result.totalServings).toBe(45);
    expect(result.category).toBe('cooked_meals');
    expect(result.storageCondition).toBe('hot_holding');
  });

  it('protects against invalid or corrupted input strings in parser', async () => {
    const result = await parseUnstructuredDonation('');
    expect(result).toBeDefined();
    expect(result.totalServings).toBeGreaterThanOrEqual(10);
  });

  it('validates food safety policy configuration integrity', () => {
    expect(FoodSafetyPolicy.categories.cooked_meals.minShelfLifeRemainingMinutes).toBe(60);
    expect(FoodSafetyPolicy.categories.cooked_meals.maxRadiusKm).toBe(25);
    expect(FoodSafetyPolicy.minBatchServings).toBe(10);
    expect(FoodSafetyPolicy.responseTtlMs).toBe(30 * 60 * 1000);
  });
});


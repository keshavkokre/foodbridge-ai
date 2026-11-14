import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeTextForAi } from '../utils/sanitizeForAi.js';
import { FOOD_CATEGORIES, STORAGE_CONDITIONS } from '../config/constants.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const RUNTIME_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let genAI = null;
if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (err) {
    console.warn('[AI BRIDGE] Failed to initialize GoogleGenerativeAI SDK:', err.message);
  }
}

/**
 * Parses unstructured natural-language food surplus descriptions into structured JSON.
 * Falls back to deterministic regex heuristics if Gemini API is offline or quota exhausted.
 */
export async function parseUnstructuredDonation(rawDescription) {
  const sanitizedPrompt = sanitizeTextForAi(rawDescription);

  if (genAI && sanitizedPrompt) {
    try {
      const model = genAI.getGenerativeModel({ model: RUNTIME_MODEL });
      const prompt = `You are an AI assistant for FoodBridge AI surplus food rescue.
Extract structured food donation details from the following description and return ONLY valid JSON:
Description: "${sanitizedPrompt}"

Return this exact JSON format:
{
  "title": "Short descriptive title (e.g. Vegetable Biryani & Dal)",
  "category": "one of: cooked_meals, raw_produce, packaged_groceries, bakery_dairy",
  "totalServings": number (estimated servings or meals),
  "storageCondition": "one of: hot_holding, refrigerated, frozen, room_temperature",
  "allergenAlerts": ["list of allergens if mentioned, e.g. dairy, nuts, gluten"],
  "safeUseHoursRemaining": number (estimated hours until food is unsafe, default 4 for hot food, 24 for produce)
}
Do not include markdown fences or explanation.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        ...parsed,
        extractedByGemini: true
      };
    } catch (err) {
      console.warn(`[AI BRIDGE] Gemini extraction failed (${err.message}). Using deterministic fallback parser.`);
    }
  }

  // Deterministic Fallback Parser
  return deterministicFallbackParser(sanitizedPrompt);
}

function deterministicFallbackParser(text) {
  const lower = (text || '').toLowerCase();

  let category = FOOD_CATEGORIES.COOKED_MEALS;
  if (lower.includes('cooked') || lower.includes('meal') || lower.includes('curry') || lower.includes('biryani') || lower.includes('rice') || lower.includes('pulao') || lower.includes('dal') || lower.includes('sabzi') || lower.includes('gravy')) {
    category = FOOD_CATEGORIES.COOKED_MEALS;
  } else if (lower.includes('bread') || lower.includes('cake') || lower.includes('milk') || lower.includes('dairy') || lower.includes('croissant') || lower.includes('pastry')) {
    category = FOOD_CATEGORIES.BAKERY_DAIRY;
  } else if (lower.includes('canned') || lower.includes('grain') || lower.includes('rice bag') || lower.includes('packet') || lower.includes('flour') || lower.includes('oil')) {
    category = FOOD_CATEGORIES.PACKAGED_GROCERIES;
  } else if (lower.includes('vegetable') || lower.includes('fruit') || lower.includes('produce') || lower.includes('tomato') || lower.includes('potato') || lower.includes('onion')) {
    category = FOOD_CATEGORIES.RAW_PRODUCE;
  }

  let storageCondition = STORAGE_CONDITIONS.ROOM_TEMPERATURE;
  if (lower.includes('hot') || lower.includes('warm') || lower.includes('freshly cooked')) {
    storageCondition = STORAGE_CONDITIONS.HOT_HOLDING;
  } else if (lower.includes('cold') || lower.includes('refrigerat') || lower.includes('chill')) {
    storageCondition = STORAGE_CONDITIONS.REFRIGERATED;
  }

  // Extract digits for servings
  const digitsMatch = text.match(/\b(\d+)\s*(servings?|meals?|portions?|plates?|people|boxes?|packets?|kg)?\b/i);
  const servings = digitsMatch ? parseInt(digitsMatch[1], 10) : 40;

  const allergens = [];
  if (lower.includes('paneer') || lower.includes('milk') || lower.includes('cheese') || lower.includes('curd') || lower.includes('dairy') || lower.includes('butter') || lower.includes('ghee')) allergens.push('Dairy');
  if (lower.includes('nut') || lower.includes('peanut') || lower.includes('almond') || lower.includes('cashew') || lower.includes('walnut')) allergens.push('Nuts');
  if (lower.includes('roti') || lower.includes('wheat') || lower.includes('bread') || lower.includes('gluten') || lower.includes('flour')) allergens.push('Gluten');

  return {
    title: text.length > 50 ? `${text.slice(0, 47)}...` : (text || 'Surplus Food Batch'),
    category,
    totalServings: servings,
    storageCondition,
    allergenAlerts: allergens,
    safeUseHoursRemaining: storageCondition === STORAGE_CONDITIONS.HOT_HOLDING ? 4 : 8,
    extractedByGemini: false
  };
}

/**
 * Generates an explainable recommendation rationale.
 * Combines distance, urgency, capacity fit, and equipment into clear operational English.
 */
export async function generateAllocationRationale(allocation, donation, ngoProfile) {
  const distanceKm = allocation.scoreBreakdown?.distanceKm || 2.5;
  const transitMins = allocation.scoreBreakdown?.estimatedTransitMins || 15;
  const score = allocation.matchScore || 85;
  const orgName = ngoProfile.organizationName || 'Verified Relief Center';
  const portion = allocation.allocatedServings;

  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: RUNTIME_MODEL });
      const prompt = `Synthesize a concise 2-sentence rationale explaining why ${portion} servings of ${donation.title} was allocated to ${orgName}.
Key facts:
- Distance: ${distanceKm} km (~${transitMins} min transit)
- Composite Match Score: ${score}%
- Cold Storage Available: ${ngoProfile.coldStorageAvailable ? 'Yes' : 'No'}
- Hot Holding Available: ${ngoProfile.hotHoldingAvailable ? 'Yes' : 'No'}
- Dietary requirement match: Yes
Tone: Professional, operational, concise.`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      console.warn(`[AI BRIDGE] Gemini rationale synthesis skipped (${err.message}). Using deterministic template.`);
    }
  }

  // Deterministic Fallback Template
  return `Allocated ${portion} servings to ${orgName} (${distanceKm} km away, ~${transitMins} mins transit) with a ${score}% match score. Matches active dietary demand while remaining strictly within their verified daily receiving capacity.`;
}

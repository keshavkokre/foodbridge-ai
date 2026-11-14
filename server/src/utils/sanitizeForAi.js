/**
 * Sanitizes input text before transmitting to external LLM APIs (Gemini).
 * Removes personal identifiable information (PII) such as phone numbers,
 * email addresses, and specific residential apartment/flat numbers.
 */
export function sanitizeTextForAi(inputText) {
  if (!inputText || typeof inputText !== 'string') return '';

  let sanitized = inputText;

  // Mask email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[EMAIL_REDACTED]');

  // Mask 10-12 digit phone numbers
  sanitized = sanitized.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE_REDACTED]');

  // Mask explicit apartment/flat/unit numbers (e.g. "Flat 402", "Apt #12B")
  sanitized = sanitized.replace(/\b(Flat|Apt|Apartment|Room|Unit|Door)\s*#?\s*\d+[A-Za-z]?\b/gi, '[UNIT_REDACTED]');

  return sanitized.trim();
}


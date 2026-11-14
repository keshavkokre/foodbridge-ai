import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateSecureOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP with a unique cryptographic salt using SHA-256.
 */
export function hashOtp(rawOtp, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.createHash('sha256').update(rawOtp + salt).digest('hex');
  return { hash, salt };
}

/**
 * Validates an input OTP against stored salt and expected SHA-256 hash.
 */
export function verifyOtp(inputOtp, salt, expectedHash) {
  if (!inputOtp || !salt || !expectedHash) return false;
  const calculatedHash = crypto.createHash('sha256').update(inputOtp.toString().trim() + salt).digest('hex');
  // Safe string comparison
  return crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(expectedHash));
}

/**
 * Creates an OTP credentials packet (raw OTP delivered to holder, salt + hash stored in DB).
 */
export function createOtpCredentials() {
  const rawOtp = generateSecureOtp();
  const { hash, salt } = hashOtp(rawOtp);
  return { rawOtp, salt, hash };
}


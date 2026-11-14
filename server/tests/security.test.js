import { describe, it, expect } from 'vitest';
import { generateSecureOtp, hashOtp, verifyOtp, createOtpCredentials } from '../src/utils/otpSecurity.js';
import { signToken, verifyToken } from '../src/utils/tokenService.js';
import { hashPassword, comparePassword } from '../src/utils/passwordService.js';
import { roleGuard } from '../src/middleware/roleGuard.js';

describe('Security & Cryptographic Guardrails', () => {
  it('generates a 6-digit numeric OTP', () => {
    const otp = generateSecureOtp();
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  it('hashes OTP with unique salt and verifies correctly', () => {
    const { rawOtp, salt, hash } = createOtpCredentials();
    expect(rawOtp).toHaveLength(6);
    expect(salt).toBeDefined();
    expect(hash).toHaveLength(64); // SHA-256 hex digest length

    const isValid = verifyOtp(rawOtp, salt, hash);
    expect(isValid).toBe(true);

    const isInvalid = verifyOtp('000000', salt, hash);
    expect(isInvalid).toBe(false);
  });

  it('signs and verifies JWT tokens securely', () => {
    const payload = { userId: 'user_12345', role: 'ngo' };
    const token = signToken(payload, '1h');
    expect(token).toBeDefined();

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe('user_12345');
    expect(decoded.role).toBe('ngo');

    const invalid = verifyToken('corrupted.token.signature');
    expect(invalid).toBeNull();
  });

  it('hashes and compares passwords with bcrypt salt', async () => {
    const password = 'StrongPassword2026!';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);

    const isMatch = await comparePassword(password, hash);
    expect(isMatch).toBe(true);

    const isWrong = await comparePassword('WrongPassword', hash);
    expect(isWrong).toBe(false);
  });

  it('enforces RBAC roleGuard correctly', () => {
    const guard = roleGuard(['donor', 'admin']);

    let nextCalled = false;
    const reqAuthorized = { user: { role: 'donor' } };
    const res = {
      status: (code) => ({
        json: (data) => ({ code, data })
      })
    };

    guard(reqAuthorized, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);

    let forbiddenResponse = null;
    const resForbidden = {
      status: (code) => ({
        json: (data) => { forbiddenResponse = { code, data }; }
      })
    };
    const reqForbidden = { user: { role: 'volunteer' } };
    guard(reqForbidden, resForbidden, () => {});
    expect(forbiddenResponse.code).toBe(403);
    expect(forbiddenResponse.data.error).toContain('requires one of the following roles');
  });
});


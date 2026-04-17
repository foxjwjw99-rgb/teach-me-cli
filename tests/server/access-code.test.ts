import { describe, expect, it, vi } from 'vitest';
import { createHmac } from 'crypto';
import {
  ACCESS_TOKEN_MAX_AGE_MS,
  isAccessTokenTimestampValid,
  splitAccessToken,
} from '@/lib/server/access-code';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

describe('access-code token validation', () => {
  it('rejects timestamps outside the allowed window', () => {
    const now = 1_700_000_000_000;

    expect(isAccessTokenTimestampValid(String(now), now)).toBe(true);
    expect(isAccessTokenTimestampValid(String(now - ACCESS_TOKEN_MAX_AGE_MS + 1), now)).toBe(true);
    expect(isAccessTokenTimestampValid(String(now - ACCESS_TOKEN_MAX_AGE_MS - 1), now)).toBe(
      false,
    );
    expect(isAccessTokenTimestampValid(String(now + 6 * 60 * 1000), now)).toBe(false);
    expect(isAccessTokenTimestampValid('not-a-timestamp', now)).toBe(false);
  });

  it('rejects expired but otherwise correctly signed tokens', async () => {
    const { verifyAccessToken } = await import('@/app/api/access-code/verify/route');

    const accessCode = 'secret-access-code';
    const expiredTimestamp = String(Date.now() - ACCESS_TOKEN_MAX_AGE_MS - 1000);
    const signature = createHmac('sha256', accessCode).update(expiredTimestamp).digest('hex');

    expect(verifyAccessToken(`${expiredTimestamp}.${signature}`, accessCode)).toBe(false);
  });

  it('parses token payloads into timestamp and signature', () => {
    expect(splitAccessToken('12345.abcdef')).toEqual({
      timestamp: '12345',
      signature: 'abcdef',
    });
    expect(splitAccessToken('missing-dot')).toBeNull();
  });
});

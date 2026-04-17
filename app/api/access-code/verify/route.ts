import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  ACCESS_TOKEN_MAX_AGE_SECONDS,
  isAccessTokenTimestampValid,
  splitAccessToken,
} from '@/lib/server/access-code';

/** Create an HMAC-signed token: `timestamp.signature` */
function createAccessToken(accessCode: string): string {
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', accessCode).update(timestamp).digest('hex');
  return `${timestamp}.${signature}`;
}

/** Verify an HMAC-signed token against the access code */
export function verifyAccessToken(
  token: string,
  accessCode: string,
  now: number = Date.now(),
): boolean {
  const parsed = splitAccessToken(token);
  if (!parsed || !isAccessTokenTimestampValid(parsed.timestamp, now)) return false;

  const expected = createHmac('sha256', accessCode).update(parsed.timestamp).digest('hex');

  const sigBuf = Buffer.from(parsed.signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;

  return timingSafeEqual(sigBuf, expBuf);
}

export async function POST(request: Request) {
  const accessCode = process.env.ACCESS_CODE;
  if (!accessCode) {
    return apiSuccess({ valid: true });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Invalid JSON body');
  }

  // Constant-time comparison
  if (!body.code) {
    return apiError('INVALID_REQUEST', 401, 'Invalid access code');
  }
  const encoder = new TextEncoder();
  const a = encoder.encode(body.code);
  const b = encoder.encode(accessCode);
  if (a.byteLength !== b.byteLength || !timingSafeEqual(a, b)) {
    return apiError('INVALID_REQUEST', 401, 'Invalid access code');
  }

  const token = createAccessToken(accessCode);
  const cookieStore = await cookies();
  cookieStore.set('openmaic_access', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });

  return apiSuccess({ valid: true });
}

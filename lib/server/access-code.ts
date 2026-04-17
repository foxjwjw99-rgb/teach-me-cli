export const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const ACCESS_TOKEN_MAX_AGE_MS = ACCESS_TOKEN_MAX_AGE_SECONDS * 1000;
const ACCESS_TOKEN_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

export interface ParsedAccessToken {
  timestamp: string;
  signature: string;
}

export function splitAccessToken(token: string): ParsedAccessToken | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const timestamp = token.substring(0, dotIndex);
  const signature = token.substring(dotIndex + 1);
  if (!timestamp || !signature) return null;

  return { timestamp, signature };
}

export function isAccessTokenTimestampValid(
  timestamp: string,
  now: number = Date.now(),
): boolean {
  const issuedAt = Number(timestamp);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) {
    return false;
  }

  if (issuedAt - now > ACCESS_TOKEN_MAX_FUTURE_SKEW_MS) {
    return false;
  }

  return now - issuedAt <= ACCESS_TOKEN_MAX_AGE_MS;
}

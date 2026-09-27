/**
 * Unsigned token used only by the in-browser mock backend. It has the same
 * three-part shape as a JWT so the session logic is identical with the real API.
 */
const MOCK_SIGNATURE = 'arquitech-mock-signature';
const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

export interface MockTokenPayload {
  sub: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '='));
}

export function createMockToken(userId: number, email: string, role: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({ sub: userId, email, role, iat: issuedAt, exp: issuedAt + TOKEN_LIFETIME_SECONDS }),
  );
  return `${header}.${payload}.${MOCK_SIGNATURE}`;
}

export function verifyMockToken(token: string | null | undefined): MockTokenPayload | null {
  if (!token) {
    return null;
  }
  const [, payload, signature] = token.split('.');
  if (!payload || signature !== MOCK_SIGNATURE) {
    return null;
  }
  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as MockTokenPayload;
    return decoded.exp * 1000 > Date.now() ? decoded : null;
  } catch {
    return null;
  }
}

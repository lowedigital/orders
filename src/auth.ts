// Lightweight, dependency-free admin session handling using a signed cookie.
//
// Uses Web Crypto (globalThis.crypto.subtle), which is available both in the
// Node.js runtime (route handlers) and the Edge runtime (middleware.ts), so
// the exact same code verifies sessions in both places.
//
// Credentials + session secret are environment variables so they're trivial
// to rotate without touching code:
//   ADMIN_USERNAME (default: "admin")
//   ADMIN_PASSWORD (default: "admin")
//   ADMIN_SESSION_SECRET (default: dev-only fallback — set a real one in prod)

export const ADMIN_SESSION_COOKIE = 'jr_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

function getSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    'dev-only-insecure-secret-change-me-in-production'
  );
}

function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return base64UrlEncode(new Uint8Array(signature));
}

export async function createSessionToken(username: string): Promise<string> {
  const payload = JSON.stringify({ u: username, exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  const signature = await hmacSign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<{ username: string } | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const expectedSignature = await hmacSign(payloadB64);
  if (signature !== expectedSignature) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return { username: payload.u };
  } catch {
    return null;
  }
}

export function checkAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
  const expectedPassword = process.env.ADMIN_PASSWORD || 'admin';
  return username === expectedUsername && password === expectedPassword;
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

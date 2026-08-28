type Environment = Record<string, string | undefined>;
export const LOGIN_EMAIL = 'demo@railease.in';
export const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
const unhex = (value: string) => new Uint8Array(value.match(/../g)!.map((byte) => parseInt(byte, 16)));

export function sessionConfigured(env: Environment): boolean {
  return /^[a-f0-9]{64}$/.test(env.RAIL_SESSION_SECRET ?? '') && /^v1:[a-f0-9]{32}:[a-f0-9]{64}$/.test(env.RAIL_LOGIN_PASSWORD_VERIFIER ?? '');
}

/** Wrap the legacy digest in a salted, slow verifier without changing the password. */
export async function passwordProof(password: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(password));
  const key = await crypto.subtle.importKey('raw', digest, 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(salt), iterations: 100000 }, key, 256));
}

export async function validCredentials(email: unknown, password: unknown, env: Environment): Promise<boolean> {
  if (!sessionConfigured(env) || typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || !password.length || password.length > 256) return false;
  const [, salt, expected] = env.RAIL_LOGIN_PASSWORD_VERIFIER!.split(':');
  const actual = await passwordProof(password, salt);
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  return difference === 0 && email.trim().toLowerCase() === LOGIN_EMAIL;
}

const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
const decode = (value: string) => Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (character) => character.charCodeAt(0));
const signingKey = (env: Environment) => crypto.subtle.importKey('raw', unhex(env.RAIL_SESSION_SECRET!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
const cookieName = (url: string) => new URL(url).protocol === 'https:' ? '__Host-railease_session' : 'railease_session';

export async function createSession(url: string, env: Environment, now = Date.now()): Promise<string> {
  if (!sessionConfigured(env)) throw new Error('Sign-in is not configured');
  const issued = Math.floor(now / 1000);
  const payload = encode(encoder.encode(JSON.stringify({ email: LOGIN_EMAIL, aud: new URL(url).origin, iat: issued, exp: issued + SESSION_SECONDS, id: crypto.randomUUID() })));
  const signature = encode(new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(env), encoder.encode(payload))));
  return `${payload}.${signature}`;
}

export function sessionCookie(url: string, token: string | null): string {
  return `${cookieName(url)}=${token ?? ''}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? SESSION_SECONDS : 0}${new URL(url).protocol === 'https:' ? '; Secure' : ''}`;
}

export async function sessionIdentity(request: Request, env: Environment, now = Date.now()): Promise<string | null> {
  if (!sessionConfigured(env)) return null;
  const cookies = (request.headers.get('cookie') ?? '').split(';').map((part) => part.trim());
  const prefix = `${cookieName(request.url)}=`;
  const matches = cookies.filter((cookie) => cookie.startsWith(prefix));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(prefix.length);
  if (token.length > 1024) return null;
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra !== undefined || !/^[\w-]+$/.test(payload) || !/^[\w-]+$/.test(signature)) return null;
    if (!await crypto.subtle.verify('HMAC', await signingKey(env), decode(signature), encoder.encode(payload))) return null;
    const session = JSON.parse(new TextDecoder().decode(decode(payload)));
    const seconds = Math.floor(now / 1000);
    if (session.email !== LOGIN_EMAIL || session.aud !== new URL(request.url).origin || !Number.isInteger(session.iat) || !Number.isInteger(session.exp) || session.iat > seconds || session.exp <= seconds || session.exp - session.iat !== SESSION_SECONDS) return null;
    // All sessions for this shared account share the same paid-request budget.
    return `account:${LOGIN_EMAIL}`;
  } catch { return null; }
}

export function sameOrigin(request: Request): boolean {
  return request.headers.get('origin') === new URL(request.url).origin && request.headers.get('sec-fetch-site') !== 'cross-site';
}

/** Instance-wide throttle: cannot be reset by spoofing an IP or changing email. */
export class LoginLimiter {
  private since = 0;
  private attempts = 0;
  allow(now = Date.now()): boolean {
    if (now - this.since >= 60000) { this.since = now; this.attempts = 0; }
    return ++this.attempts <= 20;
  }
}

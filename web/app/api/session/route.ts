import { createSession, LoginLimiter, sameOrigin, sessionConfigured, sessionCookie, sessionIdentity, validCredentials } from '@/lib/auth/session';
import { readChatBody } from '@/lib/chat/access';
import { ChatServiceError } from '@/lib/chat/gemini';

const limiter = new LoginLimiter();
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', Vary: 'Cookie' };
const reply = (body: object, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });

export async function GET(request: Request) {
  return reply({ authenticated: Boolean(await sessionIdentity(request, process.env)) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: 'Please sign in from RailEase.' }, 403);
  if (!sessionConfigured(process.env)) return reply({ error: 'Sign-in is temporarily unavailable.' }, 503);
  if (!limiter.allow()) return reply({ error: 'Too many attempts. Please try again in a minute.' }, 429, { 'Retry-After': '60' });
  try {
    const body = await readChatBody(request, 4096);
    if (!body || typeof body !== 'object' || !('email' in body) || !('password' in body) || !await validCredentials(body.email, body.password, process.env)) return reply({ error: 'Incorrect email or password.' }, 401);
    const token = await createSession(request.url, process.env);
    return reply({ authenticated: true }, 200, { 'Set-Cookie': sessionCookie(request.url, token) });
  } catch (error) {
    return reply({ error: 'Unable to sign in. Please try again.' }, error instanceof ChatServiceError ? error.status : 500);
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return reply({ error: 'Please sign out from RailEase.' }, 403);
  return reply({ authenticated: false }, 200, { 'Set-Cookie': sessionCookie(request.url, null) });
}

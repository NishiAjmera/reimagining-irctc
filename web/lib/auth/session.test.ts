import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST, DELETE } from '@/app/api/session/route';
import { POST as chatPOST } from '@/app/api/chat/route';
import { chatIdentity } from '@/lib/chat/access';
import { emptyJourneyDraft } from '@/lib/chat/contract';
import { tripSnapshot } from '@/lib/chat/tripState';
import { createSession, LOGIN_EMAIL, LoginLimiter, passwordProof, SESSION_SECONDS, sessionCookie, sessionIdentity, validCredentials } from './session';

const origin = 'https://railease.test';
const url = `${origin}/api/session`;
const password = 'only-a-unit-test-password';
const env = { RAIL_SESSION_SECRET: 'a'.repeat(64), RAIL_LOGIN_PASSWORD_VERIFIER: '', GEMINI_CHAT_ACCESS: 'demo_session', NODE_ENV: 'production' };
const makeRequest = (method = 'POST', body: unknown = { email: LOGIN_EMAIL, password }, cookie?: string) => new Request(url, { method, headers: { origin, 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) });
const withToken = (token: string, target = url) => new Request(target, { headers: { origin: new URL(target).origin, cookie: sessionCookie(target, token).split(';')[0] } });

beforeAll(async () => { const salt = 'b'.repeat(32); env.RAIL_LOGIN_PASSWORD_VERIFIER = `v1:${salt}:${await passwordProof(password, salt)}`; });
beforeEach(() => { for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('verified account sessions', () => {
  it('requires both credentials, normalizes email, and never accepts a password digest', async () => {
    await expect(validCredentials(' DEMO@RAILEASE.IN ', password, env)).resolves.toBe(true);
    await expect(validCredentials(LOGIN_EMAIL, 'wrong', env)).resolves.toBe(false);
    await expect(validCredentials('another@example.test', password, env)).resolves.toBe(false);
    await expect(validCredentials(LOGIN_EMAIL, env.RAIL_LOGIN_PASSWORD_VERIFIER, env)).resolves.toBe(false);
    await expect(validCredentials(LOGIN_EMAIL, password, {})).resolves.toBe(false);
  });
  it('issues HttpOnly host-only cookies and restores authenticated status without exposing tokens in JSON', async () => {
    const response = await POST(makeRequest());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
    const cookie = response.headers.get('set-cookie')!;
    expect(cookie).toContain('__Host-railease_session=');
    expect(cookie).toContain('HttpOnly; SameSite=Strict; Max-Age=28800; Secure');
    expect(cookie).not.toContain('Domain=');
    const restored = await GET(makeRequest('GET', null, cookie.split(';')[0]));
    expect(await restored.json()).toEqual({ authenticated: true });
    expect(await (await GET(makeRequest('GET'))).json()).toEqual({ authenticated: false });
  });
  it('rejects invalid credentials, oversized input, missing configuration and cross-origin sign-in', async () => {
    const wrong = await POST(makeRequest('POST', { email: LOGIN_EMAIL, password: 'wrong' }));
    expect(wrong.status).toBe(401); expect(wrong.headers.has('set-cookie')).toBe(false);
    expect((await POST(makeRequest('POST', { email: LOGIN_EMAIL, password: 'x'.repeat(5000) }))).status).toBe(413);
    const crossOrigin = makeRequest(); crossOrigin.headers.set('origin', 'https://attacker.test');
    expect((await POST(crossOrigin)).status).toBe(403);
    vi.stubEnv('RAIL_SESSION_SECRET', '');
    expect((await POST(makeRequest())).status).toBe(503);
  });
  it('expires sessions and rejects tampering, future issuance, other sites, duplicate cookies and key rotation', async () => {
    const now = Date.now();
    const token = await createSession(url, env, now);
    await expect(sessionIdentity(withToken(token), env, now)).resolves.toBe(`account:${LOGIN_EMAIL}`);
    await expect(sessionIdentity(withToken(token), env, now + SESSION_SECONDS * 1000)).resolves.toBeNull();
    await expect(sessionIdentity(withToken(token), env, now - 2000)).resolves.toBeNull();
    const [payload, signature] = token.split('.');
    const changedSignature = `${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
    await expect(sessionIdentity(withToken(`${payload}.${changedSignature}`), env)).resolves.toBeNull();
    await expect(sessionIdentity(withToken(token, 'https://other.test/api/session'), env)).resolves.toBeNull();
    await expect(sessionIdentity(withToken(token), { ...env, RAIL_SESSION_SECRET: 'c'.repeat(64) })).resolves.toBeNull();
    const duplicate = withToken(token); duplicate.headers.append('cookie', `; ${duplicate.headers.get('cookie')}`);
    await expect(sessionIdentity(duplicate, env)).resolves.toBeNull();
    await expect(sessionIdentity(withToken('malformed'), env)).resolves.toBeNull();
  });
  it('clears the browser cookie on same-origin sign-out', async () => {
    const response = await DELETE(makeRequest('DELETE'));
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('__Host-railease_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure');
    const request = makeRequest('DELETE'); request.headers.set('sec-fetch-site', 'cross-site');
    expect((await DELETE(request)).status).toBe(403);
    expect(sessionCookie('http://localhost:3000', null)).not.toContain('Secure');
  });
  it('throttles attempts independently of email/IP and resets the bounded window', () => {
    const limiter = new LoginLimiter();
    for (let index = 0; index < 20; index++) expect(limiter.allow(100000)).toBe(true);
    expect(limiter.allow(100001)).toBe(false);
    expect(limiter.allow(160000)).toBe(true);
  });
});

describe('paid chat session gate', () => {
  it('uses the same account budget across separately issued sessions', async () => {
    const one = await createSession(url, env); const two = await createSession(url, env);
    expect(one).not.toBe(two);
    await expect(chatIdentity(withToken(one), env)).resolves.toBe(`account:${LOGIN_EMAIL}`);
    await expect(chatIdentity(withToken(two), env)).resolves.toBe(`account:${LOGIN_EMAIL}`);
  });
  it('rejects email/header spoofing and anonymous requests without calling Gemini', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'unit-test-key');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const request = makeRequest('POST', { email: LOGIN_EMAIL });
    request.headers.set('oai-authenticated-user-id', LOGIN_EMAIL);
    const response = await chatPOST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'ACCESS_REQUIRED' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('checks origin and validates request input after session authentication', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'unit-test-key');
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const token = await createSession(url, env);
    const request = makeRequest('POST', {}, sessionCookie(url, token).split(';')[0]);
    expect((await chatPOST(request)).status).toBe(400);
    const crossed = withToken(token); crossed.headers.set('origin', 'https://attacker.test');
    await expect(chatIdentity(crossed, env)).rejects.toMatchObject({ status: 403 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('unlocks a Gemini turn after login and caches identical requests', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'unit-test-key');
    vi.spyOn(console, 'info').mockImplementation(() => {});
    const draft = emptyJourneyDraft();
    const output = { trip: tripSnapshot(draft), answer: null, clarification: 'Where are you travelling from?', suggestions: [] };
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(output) }] }] })));
    vi.stubGlobal('fetch', fetcher);
    const login = await POST(makeRequest());
    const cookie = login.headers.get('set-cookie')!.split(';')[0];
    const body = { conversationId: 'session-integration-test', messages: [{ id: 'first', role: 'user', text: 'Help me plan a journey.' }], draft };
    const first = await chatPOST(makeRequest('POST', body, cookie));
    const second = await chatPOST(makeRequest('POST', body, cookie));
    expect(first.status).toBe(200); expect(second.status).toBe(200);
    expect(await first.json()).toEqual(await second.json());
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

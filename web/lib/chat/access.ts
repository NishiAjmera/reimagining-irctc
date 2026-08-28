import { ChatServiceError } from './gemini';
import { sessionIdentity } from '@/lib/auth/session';

type Environment = Record<string, string | undefined>;
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Browser-only login is not authorization for a paid API. Fail closed by default. */
export async function chatIdentity(request: Request, env: Environment): Promise<string> {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (origin !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new ChatServiceError(403, 'FORBIDDEN', 'Please open chat from RailEase.');
  if (env.GEMINI_CHAT_ACCESS === 'local' && env.NODE_ENV !== 'production' && localHosts.has(url.hostname)) return 'local-preview';
  if (env.GEMINI_CHAT_ACCESS === 'demo_session') {
    const identity = await sessionIdentity(request, env);
    if (identity) return identity;
  }
  // Sites owns and verifies these headers. Never enable this mode behind an
  // arbitrary proxy that passes user-supplied identity headers through.
  if (env.GEMINI_CHAT_ACCESS === 'sites') {
    const id = request.headers.get('oai-authenticated-user-id');
    const allowed = (env.GEMINI_ALLOWED_USER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    if (id && allowed.includes(id)) return `sites:${id}`;
  }
  throw new ChatServiceError(403, 'ACCESS_REQUIRED', 'Chat access is unavailable for this session. You can still search using trip details.');
}

export async function readChatBody(request: Request, maxBytes = 32000): Promise<unknown> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ChatServiceError(415, 'INVALID_REQUEST', 'Please send a valid chat message.');
  const reader = request.body?.getReader();
  if (!reader) throw new ChatServiceError(400, 'INVALID_REQUEST', 'Please enter a message.');
  const decoder = new TextDecoder();
  let length = 0;
  let body = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new ChatServiceError(413, 'TOO_LARGE', 'Please shorten your message.'); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    try { return JSON.parse(body); } catch { throw new ChatServiceError(400, 'INVALID_REQUEST', 'Please send a valid chat message.'); }
  } finally { reader.releaseLock(); }
}

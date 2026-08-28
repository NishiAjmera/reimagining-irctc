import { chatIdentity, readChatBody } from '@/lib/chat/access';
import { indiaToday, validateChatRequest } from '@/lib/chat/contract';
import { ChatCostControls, requestFingerprint } from '@/lib/chat/costControls';
import { ChatServiceError, generateChatReply, GEMINI_MODEL, PROMPT_VERSION } from '@/lib/chat/gemini';

const controls = new ChatCostControls();
const headers = { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new ChatServiceError(503, 'NOT_CONFIGURED', 'Chat is temporarily unavailable. You can continue with trip details.');
    const identity = chatIdentity(request, process.env);
    const body = await readChatBody(request);
    let input;
    try { input = validateChatRequest(body); } catch { throw new ChatServiceError(400, 'INVALID_REQUEST', 'Please check your message and trip details.'); }
    const today = indiaToday();
    const key = await requestFingerprint({ identity, model: GEMINI_MODEL, version: PROMPT_VERSION, today, input });
    const { result, cacheHit } = await controls.run(key, identity, () => generateChatReply(input, apiKey, today));
    // Numeric usage only; no API key, identity, contact details or chat content.
    console.info('railease_chat_usage', { model: GEMINI_MODEL, responseCacheHit: cacheHit, ...(cacheHit ? { inputTokens: 0, outputTokens: 0, cachedTokens: 0, totalTokens: 0 } : result.usage) });
    return new Response(JSON.stringify(result.reply), { headers });
  } catch (error) {
    const failure = error instanceof ChatServiceError ? error : new ChatServiceError(500, 'UNAVAILABLE', 'Chat is temporarily unavailable. Please use trip details.');
    return new Response(JSON.stringify({ error: failure.message, code: failure.code }), { status: failure.status, headers: { ...headers, ...(failure.status === 429 ? { 'Retry-After': '60' } : {}) } });
  }
}

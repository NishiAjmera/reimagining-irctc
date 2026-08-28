import { ChatServiceError, type GeminiResult } from './gemini';

/** Bounded, instance-local caches. No cross-user response reuse or durable chat logs. */
export class ChatCostControls {
  private cache = new Map<string, { expires: number; result: GeminiResult }>();
  private pending = new Map<string, Promise<GeminiResult>>();
  private calls = new Map<string, { since: number; count: number }>();
  private daily = { date: '', count: 0 };
  constructor(private now: () => number = Date.now) {}

  async run(key: string, identity: string, generate: () => Promise<GeminiResult>): Promise<{ result: GeminiResult; cacheHit: boolean }> {
    const now = this.now();
    for (const [id, item] of this.cache) if (item.expires <= now) this.cache.delete(id);
    for (const [id, item] of this.calls) if (now - item.since >= 60000) this.calls.delete(id);
    const cached = this.cache.get(key);
    if (cached) return { result: cached.result, cacheHit: true };
    const pending = this.pending.get(key);
    if (pending) return { result: await pending, cacheHit: true };
    const calls = this.calls.get(identity) ?? { since: now, count: 0 };
    const date = new Date(now).toISOString().slice(0, 10);
    if (this.daily.date !== date) this.daily = { date, count: 0 };
    if (calls.count >= 8 || this.daily.count >= 300 || this.pending.size >= 4 || this.calls.size >= 500) throw new ChatServiceError(429, 'RATE_LIMITED', 'Chat has reached its usage limit. Please try later or use trip details.');
    this.calls.set(identity, { ...calls, count: calls.count + 1 });
    this.daily.count += 1; // Failed upstream attempts also consume the budget.
    const task = generate();
    this.pending.set(key, task);
    try {
      const result = await task;
      if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key, { expires: this.now() + 120000, result });
      return { result, cacheHit: false };
    } finally { this.pending.delete(key); }
  }
}

export async function requestFingerprint(value: unknown) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

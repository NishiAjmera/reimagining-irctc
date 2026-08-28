# Gemini journey chat

Status: release 21 published on 28 August 2026 with the user-configured hosted Gemini secret (environment revision 2). Live multi-turn extraction and search regressions pass locally. Hosted paid chat remains locked because `GEMINI_CHAT_ACCESS` and `GEMINI_ALLOWED_USER_IDS` are not yet configured; user approval of permitted chat identities and sign-in wiring is still needed. Public Site access is unchanged.

## Local setup

Create `web/.env.local` using the entries in `web/.env.example`:

```dotenv
GEMINI_API_KEY=your_key_here
GEMINI_CHAT_ACCESS=local
```

Use a dedicated Gemini project/key for this application. Keep the key in this ignored server-side file, not in chat, source control, browser storage, or a `NEXT_PUBLIC_`/`VITE_` variable. Restart the local dev server after changing it. The existing product login is unchanged. No new dependency is required.

The default model is pinned to `gemini-3.7-flash`. Requests use the Gemini Interactions REST API, structured JSON output and low thinking. No sampling parameters removed from this model are sent. Each request is a fresh, bounded snapshot with `store: false`, rather than replaying Gemini thought/signature steps or retaining provider conversation IDs.

## Experience

- Describe trip and Search by details enter the same chat workspace. Manual entry opens the trip form with a collapsed chat icon and makes no model call until the user sends a question.
- Natural-language entry sends the initial message to Gemini. It asks for missing origin, destination, departure date and traveller count; town journeys additionally need a train-only/complete-journey choice. Dates are interpreted relative to the server's current date in Asia/Kolkata.
- Gemini returns a complete, required-field trip snapshot, using null for unknown or cleared values. The server validates every field, computes a minimal patch against the authoritative form, and generates update confirmations from the saved values—not model prose. Missing fields or malformed output are rejected. Readiness and ambiguity are checked separately.
- Form edits are authoritative and invalidate pending responses/results. Questions with an empty patch preserve the results. Returning from traveller details preserves conversation and results; starting a new trip clears them.
- Only an explicit Search trains button fetches journeys. Chat cannot reserve tickets, charge money, dispatch assistance or call booking tools. Search continues using the existing catalogue/RailRadar adapter; generated text is not live railway data.
- Follow-up questions receive a compact snapshot of up to five displayed journey options (including class choices and road/rail legs). Booking passenger names, contact details, payment preferences and assistance contacts are not included in this snapshot. The text the user voluntarily enters in chat is sent to Gemini.
- Optional departure time, arrival deadline/date, budget, preferred class, comfort and ranking preferences remain editable. Primary search results must match the requested dates, timing, full-itinerary budget, confirmed-seat filter and class. Non-matching journeys remain selectable under Other options, with explicit trade-offs. Both bus legs count toward timing and total fare. Inventory is still supplied by the existing catalogue/provider, not the LLM.
- Missing configuration, access failures, provider errors, malformed output and timeouts have a visible recovery message and retry action. Manual search remains available. Failed turns are not replaced by fabricated local LLM answers.

## Cost and caching

1. **Gemini implicit caching:** enabled by Google automatically. The model instructions and output schema are stable prefixes; dynamic date, messages, itinerary and results follow. Gemini 3.7 Flash's documented minimum is 4,096 input tokens, so short requests may have no cache hits. Prompts are not padded to reach this threshold. No explicit cache resources/storage charges are created.
2. **Application response cache:** exact same user + conversation + draft + messages + results + model + prompt version + date reuse a validated reply for 120 seconds. Concurrent duplicates coalesce. No cross-user/conversation reply sharing. Failed replies are not cached. The cache is bounded to 100 entries.
3. **Request limits:** 2,000 characters per message, 16 recent messages, 12,000 history characters, 6,000 result-context characters, 32 KB request body, 1,400 output tokens and a 25-second provider timeout. There are no automatic paid retries. The client has a 35-second request timeout and a 40-turn conversation limit.
4. **Instance-local limits:** eight uncached attempts/minute per authorized identity, four concurrent provider calls and 300 attempts/day per server instance. Failed calls count. These are not a durable/global spend cap: process restarts and multiple edge instances reset/multiply them. Configure provider quotas and billing alerts before live testing; add a durable distributed limiter before broad public rollout. Alerts alone do not stop spend.
5. **Observability:** server logs contain numeric input/output/cached/total token usage and response-cache hit flags, never chat content, identities or keys. Cached app responses report zero new provider usage. Inspect actual `cachedTokens` during live tests; cache savings are not guaranteed.

## Public access gate

The existing browser-only login is **not** trusted to authorize paid Gemini calls. `local` access works only in development on a loopback URL and is rejected in production. Same-origin JSON requests are required.

For deployment on Sites, configure `GEMINI_CHAT_ACCESS=sites` and `GEMINI_ALLOWED_USER_IDS` with explicitly allowed platform-authenticated user IDs. The API validates the Sites-owned `oai-authenticated-user-id` header. Anonymous/non-allowlisted users are rejected. This mode must only run behind the Sites dispatcher, not a proxy that forwards arbitrary client identity headers. The current public site's UI login does not create this platform identity; configure/test platform sign-in and allowlisting before enabling paid chat. Release 21 has the hosted secret, but these access settings remain unset. In post-deployment checks, unauthenticated chat returned the expected HTTP 403 ACCESS_REQUIRED; the site returned HTTP 200. No authentication policy was changed.

## Verification and key-based acceptance checks

95 automated tests pass, covering complete-state extraction, corrections/clearing, missing details, both-town mode selection, Indian dates/times, preferred class and arrival deadlines, search API validation, full-itinerary budget enforcement, provider errors/timeouts, cache coalescing/expiry/isolation, throttling, access checks and safe sample luggage contacts. Typecheck, lint and production build pass.

The opt-in live regression runs six sequential Gemini turns: town-to-town planning, bus connections and budget, passenger/class/time corrections, authoritative manual edits with a question-only turn, clearing preferences, and replacing both route ends. It then calls the actual train-search endpoint and verifies that matching results honor the captured fields. A concurrent duplicate returned the same validated reply with one provider call and an application cache hit. Short live requests reported zero provider-cached tokens; implicit-cache savings are not claimed.

With the local dev server running and the server-side key configured, run `node scripts/test-chat-live.mjs` from `web`. This makes bounded, billable provider calls; it never reads or prints the key. Repeat only when evaluating a relevant change.

Signed-in browser QA verified natural-language Mumbai → Pune capture, preference-matching results, a fare question grounded in the displayed trains, journey selection/back navigation, collapse/reopen history retention, and a manual edit overriding an in-flight reply. One provider request exceeded the 25-second limit; its explicit retry succeeded without duplicating the user message or losing results. Manual Khategaon → Mandawa entry also carried its date and travellers into the same chat, which added both bus connections, budget and confirmed-only preferences. A native date-input event-sync issue found during QA was fixed for departure and arrival-deadline controls.

Additional local acceptance scenarios:

- “I need to get to Jaipur” → asks origin/date/travellers without filling guesses.
- “Bengaluru to Jaipur next Friday, three people, arrive before 4 pm, no waitlist” → clarifies ambiguous timing/dates and shows a reviewable itinerary.
- “Actually two people, and change Jaipur to Delhi” → changes only requested fields.
- “Budget doesn't matter, and waitlist is fine” → clears the budget/confirmed-only preference.
- Khategaon → Mandawa → offers train-only or bus + train + bus, never auto-selecting bus transport.
- Begin with manual details, ask a question, change a field while chat is pending, search, choose a journey, then return → no stale overwrite or lost conversation.
- Ask about displayed class/transfer options → answer grounded in the displayed snapshot, not invented availability.
- Unknown town, invalid date, off-topic prompt and instruction-injection attempt → safe clarification/redirect.
- Duplicate request → one provider call; replay → response cache hit; repeated long-prefix turns → inspect real provider cached-token count.

References: [Gemini 3.7 Flash](https://ai.google.dev/gemini-api/docs/latest-model), [Interactions API](https://ai.google.dev/gemini-api/docs/interactions-overview), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [context caching](https://ai.google.dev/gemini-api/docs/caching).

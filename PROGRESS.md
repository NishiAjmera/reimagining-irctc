# Project Progress

Last updated: 28 August 2026

## Overall status

**Conversational search and booking review validated locally; public update awaiting approval**

Travel-extras discovery is now visible before confirmation: a compact, informational icon strip on search results, manual traveller/payment review and chat traveller/final review names cabs, food on train, luggage assistance and parcels, and directs users to the confirmation page. Extras remain optional and separately arranged; no premature service buttons or duplicate preview appear on confirmation. All 138 tests, typecheck, lint and production build pass. This addition remains local pending public publishing approval, together with the conversational checkout changes below.

The chat-only Search trains button has been removed. Explicit conversational consent (including “go ahead and serach”) now triggers search and shows results on the right; the manual details-panel search button remains. Chat can select a real displayed/recommended journey or class, collect each traveller's name/age/gender/optional berth preference and booking contact, then show a complete review on the right. Only an explicit final confirmation after that review completes the existing local journey-summary flow. Any changed journey, fare or details invalidates the prior review; repeated confirmation keeps one reference. No real ticket, payment or reservation is created.

Validation: 134 automated tests, typecheck, lint and production build pass. A six-turn live Gemini regression verified search consent, typo handling, recommended selection, two-passenger details, contact capture and “do not book yet” correction. The first live attempt timed out; the bounded rerun passed. A follow-up question no longer discards supplied traveller details. Public publishing approval has been requested; release 22 remains live until approved.

Release 22 was published successfully on 28 August 2026 from Site source `b0b5345`, matching GitHub app source `f5c8d0b`, with hosted environment revision 3. The existing `demo@railease.in` login now verifies credentials server-side and creates a signed eight-hour session. No credentials are displayed or embedded in the client. Same-origin checks, cookie expiry, password-attempt throttling, and a shared-account chat budget protect the paid endpoint. All 105 automated tests, typecheck, lint and production build pass; 69 build artifacts contain none of the configured secrets. Public Site access and previous luggage changes are preserved.

Live HTTP checks passed: homepage 200, anonymous chat 403, incorrect password 401, signed session recognized, and authenticated Gemini chat 200 with correct Mumbai → Pune, 10 September 2026, two-traveller capture. An identical replay returned the same validated response. The hosted smoke test used a server-signed account cookie; successful password entry is covered by automated login-to-chat tests, not a new browser login. Existing users should refresh and sign in again with their unchanged credentials.

## Milestones

- [x] Trigger search through explicit chat consent while preserving manual search
- [x] Select displayed journeys/classes and collect validated traveller/contact details in chat
- [x] Require a fresh, complete review and explicit final confirmation before local completion
- [x] Test stale-review protection, duplicate confirmation, waitlist selection and live checkout conversation

- [x] Define product goal and MVP boundaries
- [x] Define primary AI-assisted journey flow
- [x] Define traditional-search fallback flow
- [x] Define explainable ranked-result model
- [x] Scaffold the Next.js, React, and TypeScript application
- [x] Build responsive home and search experiences
- [x] Build editable intent constraints
- [x] Build the purposeful search transition
- [x] Build ranked journey recommendation cards
- [x] Add contextual railway explanations
- [x] Add selection and mock booking handoff
- [x] Add deterministic ranking and no-results alternatives
- [x] Add prototype analytics for time to confident choice
- [x] Add focused parser and ranking tests
- [x] Complete desktop and 390px mobile demo-flow QA
- [x] Pass lint, typecheck, tests, and production build
- [x] Publish the validated MVP
- [x] Add a production-style sign-in screen without exposed credentials
- [x] Simplify product copy and remove repetitive UI content
- [x] Replace decorative AI-style treatments with a restrained product UI
- [x] Revalidate lint, types, tests, build, and the signed-in journey flow
- [x] Publish the refreshed site with public link access
- [x] Expand search coverage to 16 major Indian cities
- [x] Add date-aligned sample services for every supported city pair
- [x] Add an optional server-side timetable provider with automatic fallback
- [x] Add tests for major-city parsing and generated search results
- [x] Expand natural-language entry into a persistent planning conversation
- [x] Ask guided follow-up questions for missing trip details
- [x] Add an editable journey panel beside the conversation
- [x] Open ranked results in the right panel after confirmation
- [x] Support follow-up journey questions after results load
- [x] Preserve the manual search-details tab and flow
- [x] Animate the compact prompt expanding into the split chat workspace
- [x] Add a collapsible chat panel with a clear open and close control
- [x] Add mouse, touch, and keyboard-accessible chat-width resizing
- [x] Refine the chat workspace with a compact header, rail-icon reopen control, scroll fade, and borderless panel separation
- [x] Replace the open-state divider with an inset conversation card and spacious visual gutter
- [x] Expand the selected-journey card with dates, duration, and overnight context
- [x] Add passenger and booking-contact details after journey selection
- [x] Add a realistic simulated payment step with UPI, card, and net-banking choices
- [x] Add a complete booking confirmation state and sample booking reference
- [x] Show lower-ranked and waitlisted alternatives as full selectable journey cards
- [x] Label waitlisted alternatives explicitly instead of reusing recommendation badges
- [x] Add contextual chat help to the manual journey-details review page
- [x] Add one-change journey options with transfer time, per-leg train details, combined fare, and availability
- [x] Add consistent supported-city selectors to From and To fields across manual and conversational details
- [x] Group all available travel classes within one card per train and preserve class-specific fare and availability
- [x] Standardise the rail-chat launcher across direct and indirect journey contexts
- [x] Add compact expected-platform and station-facility indicators beside station names
- [x] Add towns without railway stations to the origin and destination selectors
- [x] Keep train-only search available with an explicit user-selected railhead
- [x] Add optional complete bus-and-train suggestions with transfer buffers and combined fares
- [x] Carry multimodal journey details through traveller review, payment, and confirmation

## Current focus

Gemini 3.7 Flash chat is configured and live-tested locally, with one shared conversation for natural-language and manual entry, explicit search confirmation and grounded result follow-ups. Testing exposed omitted fields in optional model patches; a complete required-field trip snapshot now produces validated diffs and confirmations derived from the saved state. Search enforces captured dates, timing, arrival deadlines, preferred class, confirmed seats and full-trip budget, including both bus legs. Non-matching options remain available with trade-offs. The key stays server-side. Two-minute isolated response caching and duplicate-request coalescing were verified; short requests had no provider-cache hits. Release 21 includes this code and the hosted secret, but production chat stays locked pending a configured mode and verified user allowlist. Post-deployment checks returned HTTP 200 for the site and the expected HTTP 403 ACCESS_REQUIRED for unauthenticated chat. Setup, limits and regression instructions: `docs/gemini-chat.md`.

Local review: replaced Guest with Nishi Ajmera, removed developer-style copy from customer screens, and added the booking contact phone plus a luggage-assistance contact area. Direct porter calling stays disabled without a confirmed number; railway enquiries remains available on 139. Planning/estimated/provider-confirmation wording replaces false paid or reserved claims. No changes to provider integrations or authentication.

Travel extras includes cab, food and parcel provider handoffs plus mock luggage booking at departure, arrival, or both, with optional same-station transfers, per-stop bag counts and sample ₹80-per-bag pricing. Confirmation shows fictional porter names, meeting landmarks and times; cancellation returns to the editable form. No charge, dispatch or external reservation occurs for luggage assistance. The provider handoffs were committed separately as `809507f`. See `docs/travel-services.md` for integration boundaries.

The original compact icon-only station facility row now includes cloakroom, lockers and Divyangjan facilities, with sample availability requested for the prototype. Unavailable facilities remain greyed out. Short custom tooltips explain each icon and its status on hover, keyboard focus or tap; no expanding notes or extra information panels. Escape dismisses tooltips. Unknown stations retain the unverified fallback.

Compact journey cards now use a single travel-order timeline, including bus → train → bus journeys. Full-trip timing, transfer buffers, class choices, warnings and the complete fare stay visible; secondary details expand on demand. Priorities are inline instead of occupying a sidebar.

The refreshed product is live with public-link access at [railease-journey-planner.nishiajmera21.chatgpt.site](https://railease-journey-planner.nishiajmera21.chatgpt.site). Access credentials are distributed separately and are never displayed in the UI or repository documentation.

## Verification

- Gemini/search and luggage validation: 95 automated tests, typecheck, lint and production build pass. Six-turn live Gemini regression passes for town connections, corrections, manual-state authority, preference clearing and complete route replacement; the actual search endpoint returns only preference-matching primary options. Concurrent duplicate calls reuse one validated response. The key remains ignored and server-side; no secret was found in the deployment artifacts.

- Signed-in browser QA: natural-language capture reaches search and traveller review; questions use displayed fare data; retry recovers a slow provider response without duplicate messages; closing/reopening and returning from journey selection preserve the conversation. Manual edits invalidate in-flight replies. Manual town-to-town details feed the shared chat and optional bus connections. Fixed native date-input synchronization discovered during this check.

- 36 automated tests pass, covering itinerary ordering and fares, station facilities, travel-service handoffs, luggage pricing and selections, product-style copy, and contact safety (no invented callable porter number). Typecheck, lint and production build pass for the profile and copy update.

- Intent parser correctly extracts the primary Bengaluru → Jaipur scenario.
- Confirmed, on-time 3A ranks above cheaper waitlisted choices.
- Late-arriving journeys receive the hard-constraint penalty.
- The confirmed Thursday alternative is surfaced.
- Senior-traveller comfort receives a ranking bonus.
- Routes without direct matches return practical alternatives.
- The primary journey completes traveller details, payment review, and sample booking confirmation.
- Traditional Indore → Delhi search reaches the priority-selection step.
- Product sign-in rejects invalid credentials and opens the planner with the private access pair.
- The refreshed interface completes the Bengaluru → Jaipur results flow with concise copy.
- Unsupported city pairs still return practical alternatives; supported major-city pairs return three journeys.
- Provider credentials stay server-side and failures fall back to local data.
- Complete requests move directly to confirmation; incomplete requests collect only the missing essentials.
- Conversation and results stack vertically on narrower screens without changing the manual search path.
- The chat panel can be resized on desktop, collapsed to prioritise results, and reopened without losing the conversation.
- Choosing a journey now continues through traveller details, payment review, and confirmation without processing a real charge.
- Indirect results use two compatible services, allow 90 minutes to 12 hours for transfer, and preserve both train legs through checkout.
- Each train appears once with selectable class options and recalculated fare, availability, reasons, and trade-offs.
- Direct, indirect, review, and payment contexts preserve the selected train class and station details.
- Station rows show compact expected-platform, washroom, retiring-room, and AC waiting-room information with accessible labels.
- Khategaon → Jaipur supports both a train-only search from Harda or Indore and a complete bus-to-station itinerary.
- Multimodal results show bus operator, coach, seats, luggage, timing, connection buffer, and complete fare without forcing the bus option.

## Decisions

- Optimise for **time to confident choice**, not raw click count.
- Keep intent parsing and explanations behind replaceable interfaces.
- Keep ranking deterministic, readable, and independently tested.
- Show three viable options rather than a dense train table.
- Use simulated data; do not integrate with live IRCTC services.
- Use RailRadar only as an optional timetable source; keep fare and seat-status claims explicitly illustrative.
- Never present confirmation confidence as a guarantee.

## Update convention

This file is updated at each milestone. GitHub Issue #1 is the implementation tracker, while commits provide the chronological delivery record.

# Project Progress

Last updated: 28 August 2026

## Overall status

**Product refresh complete and publicly released**

## Milestones

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

The original compact icon-only station facility row now includes cloakroom, lockers and Divyangjan facilities, with sample availability requested for the prototype. Unavailable facilities remain greyed out. Short custom tooltips explain each icon and its status on hover, keyboard focus or tap; no expanding notes or extra information panels. Escape dismisses tooltips. Unknown stations retain the unverified fallback.

Compact journey cards now use a single travel-order timeline, including bus → train → bus journeys. Full-trip timing, transfer buffers, class choices, warnings and the complete fare stay visible; secondary details expand on demand. Priorities are inline instead of occupying a sidebar.

The refreshed product is live with public-link access at [railease-journey-planner.nishiajmera21.chatgpt.site](https://railease-journey-planner.nishiajmera21.chatgpt.site). Access credentials are distributed separately and are never displayed in the UI or repository documentation.

## Verification

- 21 automated tests cover town-to-town segment order, transfer buffers, full fare after class changes, train-only mode, overnight timing, sample facility data, linked tooltips, greyed-out unavailable facilities, and the unknown-station fallback.

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

# RailEase — railway journey planning

RailEase is a polished hackathon MVP for **Build What Moves India 2026**. It helps travellers move from a broad train search to a small set of viable, understandable journey choices.

**Live demo:** [railease-journey-planner.nishiajmera21.chatgpt.site](https://railease-journey-planner.nishiajmera21.chatgpt.site)

> **The objective is not to help users search more efficiently. It is to reduce the number of railway decisions they have to make unaided.**

## The problem

Traditional railway search makes the traveller compare trains, classes, dates, stations, availability codes, timing, fare, and risk by themselves. RailEase turns those inputs into a decision: three practical options, why each fits, and the trade-off involved.

## Product thesis

RailEase optimises for **time to confident choice**. AI is embedded as an intent and explanation layer—not presented as a generic chatbot. Deterministic logic handles ranking so every recommendation remains stable, transparent, and testable.

## Working MVP

- Expanding conversational journey planning with guided follow-up questions
- Traditional origin, destination, date, and passenger search
- Local intent extraction with editable constraints
- Nearby-date, nearby-station, class, availability, timing, comfort, and fare consideration
- Three ranked recommendation cards with reasons and explicit trade-offs
- Full, selectable detail cards for lower-ranked and waitlisted alternatives
- Selectable one-change itineraries with interchange, transfer time, per-leg availability, and combined fare
- Explicit waitlist-alternative labels and selection actions that preserve availability context
- Plain-language explanations for railway classes, RAC, and waitlist
- Contextual questions tied to the selected journey
- Responsive traveller details, fare review, simulated payment, and booking confirmation flow
- Client-side product analytics for time to results and time to selection
- Useful alternatives instead of a blank no-results state
- Date-aligned sample results across 16 major Indian cities
- Optional server-side RailRadar timetable integration with automatic local fallback
- Split planning workspace with persistent chat and confirmed results on the right
- Compact, collapsible chat presented as an inset card with adjustable width, scroll-edge text fading, and keyboard-accessible controls
- Contextual journey-help chat on the manual details review page

## Architecture

The application lives in [`web/`](./web) and uses Next.js App Router, React, TypeScript, Tailwind CSS, and the OpenAI Sites runtime.

```text
web/
├── app/                    # Application shell, metadata, and visual system
├── components/journey/     # Search, constraints, results, Q&A, and checkout UI
├── components/railway/     # Reusable accessible terminology explanations
├── lib/data/               # Stations and simulated train availability
├── lib/intent/             # Parser interface and local heuristic parser
├── lib/ranking/            # Transparent scoring and recommendation selection
├── lib/explanation/        # Railway terms and contextual explanations
├── lib/analytics.ts        # Console/local-storage prototype analytics
└── types/                  # Strong shared journey types
```

## How AI is used

`IntentParser` separates the product contract from its implementation. The current `LocalIntentParser` understands the complete demo flow without an API key. A future hosted model adapter can implement the same interface for broader free-form language while preserving the local fallback.

The `JourneyExplainer`-style helpers answer common contextual questions locally. They can later be enhanced by a model, but the demo never depends on one.

## Train data

RailEase currently covers Ahmedabad, Bengaluru, Bhopal, Bhubaneswar, Chandigarh, Chennai, Delhi, Hyderabad, Indore, Jaipur, Kochi, Kolkata, Lucknow, Mumbai, Patna, and Pune. Known corridors use seeded train names and numbers; other supported city pairs receive three realistic sample services aligned to the selected date.

The conversational search smoothly expands after the first message, keeps the planning thread on the left, and builds an editable trip summary on the right. It asks only for missing essentials, waits for confirmation, then replaces the summary with ranked train results. The chat can be collapsed or resized with a pointer or keyboard without losing the conversation. The transition respects reduced-motion preferences. The original **Search by details** tab remains available for users who prefer a manual form.

An optional server-side adapter can fetch timetable names, numbers, departure times, arrivals, and durations from [RailRadar's trains-between-stations API](https://railradar.in/docs/trains-between-stations). Add `RAILRADAR_API_KEY` to the server environment to enable it. The key is never sent to the browser, and local results remain available if the provider is unavailable. Fares and seat status remain illustrative because that endpoint does not supply booking inventory.

The [official Open Government Data timetable catalog](https://www.data.gov.in/catalog/indian-railways-train-time-table) is useful as a historical reference, but its published timetable is old and the resource currently has no API. Indian Railways' [passenger enquiry](https://www.indianrail.gov.in/enquiry/SCHEDULE/TrainSchedule.jsp) remains the authoritative consumer-facing schedule reference.

## Why ranking is deterministic

The scoring algorithm starts from a base score and applies readable weights:

- Arrival deadline: `+30` when satisfied, `-60` when violated
- Confirmed: `+30`; RAC: `+5`; waitlist: `-20` to `-50`
- Preferred date: `+15`; flexible alternative date: `+5`
- Comfortable AC sleeper for a senior traveller: `+10`
- Fare, duration, and nearby-station adjustments

The selection layer then surfaces the best overall choice, a viable budget choice, and a strong nearby-date alternative. Direct recommendations remain primary; a separate section offers up to two one-change itineraries when a practical 90-minute-to-12-hour connection can be formed from the available services. The UI exposes the key score contributions instead of hiding them behind an opaque confidence claim.

## Run locally

```bash
cd web
npm install
npm run dev
```

Then open `http://localhost:3000`.

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Example scenario

Use **Use example** or paste:

> I need to travel from Bengaluru to Jaipur next Friday for a wedding. I need to reach by 4 PM. We’re three people including my mother, and I don’t want a waitlisted ticket.

The app extracts the constraints, recommends a confirmed 3A overnight journey, explains the confirmed Sleeper budget trade-off, surfaces a Thursday availability alternative, answers “What does RAC mean?”, and continues through traveller details, payment review, and a simulated booking confirmation.

## What is mocked

Without a configured provider key, train schedules, fares, availability, confirmation confidence, station distance, and booking confirmation are local sample data. With RailRadar enabled, timetable details come from that provider while fares and availability remain illustrative. Traveller and payment fields remain in local interface state only; RailEase does not connect to IRCTC, transmit booking details, process payments, or guarantee future availability.

## Future integrations

- Authorised live train, schedule, fare, and availability data
- Hosted intent parser and free-form journey explanation adapter
- Secure handoff into an official reservation flow
- Saved trips, language localisation, and richer accessibility preferences
- Real product analytics and ranking evaluation

## Success metrics

The north-star metric is **time to confident choice**, supported by journey-start, time-to-results, recommendation-explanation, contextual-question, selection, and handoff events. Prototype events are stored locally in the browser and printed to the console.

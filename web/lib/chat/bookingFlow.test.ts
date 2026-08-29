import { describe, expect, it } from 'vitest';
import { rankJourneys } from '@/lib/ranking/rankJourneys';
import { emptyJourneyDraft, validateChatRequest } from './contract';
import { parseGeminiOutput } from './gemini';
import { tripSnapshot } from './tripState';
import { applyBookingReply, beginBooking, bookingPrompt, completePayment, confirmBooking, createBookingDetails, explicitBookingConfirmation, mergeBookingDetails, nextBookingQuestion, NO_ACTION, NO_BOOKING_UPDATES, pickJourney, readBookingUpdates, readWorkflow, startBooking, updateBooking, type BookingDetails } from './bookingFlow';

const draft = { ...emptyJourneyDraft(), originCity: 'Mumbai', destinationCity: 'Pune', preferredDate: '2026-09-10', passengerCount: 2, journeyMode: 'train_only' as const };
const outcome = rankJourneys(draft);
const journey = outcome.options[0];
const request = { conversationId: 'checkout-test-1234', messages: [{ id: '1', role: 'user' as const, text: 'Go ahead and search.' }], draft };
const output = { trip: tripSnapshot(draft), answer: null, clarification: null, suggestions: [], action: NO_ACTION, bookingUpdates: NO_BOOKING_UPDATES };
const complete: BookingDetails = { passengers: [{ name: 'Asha Test', age: '32', gender: 'Female', berth: 'Lower' }, { name: 'Ravi Test', age: '34', gender: 'Male', berth: 'No preference' }], email: 'travel@example.test', phone: '9000000000' };

describe('conversational search and selection', () => {
  it('emits search only when requested and all required trip fields are valid', () => {
    expect(parseGeminiOutput(output, request, '2026-08-28').action?.type).toBe('none');
    expect(parseGeminiOutput({ ...output, action: { ...NO_ACTION, type: 'search' } }, request, '2026-08-28').action?.type).toBe('search');
    const incomplete = { ...output, trip: tripSnapshot({ ...draft, passengerCount: 0 }), action: { ...NO_ACTION, type: 'search' } };
    const reply = parseGeminiOutput(incomplete, request, '2026-08-28');
    expect(reply.action?.type).toBe('none'); expect(reply.missingFields).toContain('passengerCount');
  });
  it('suppresses actions while clarifying and prevents stale selection after trip changes', () => {
    expect(parseGeminiOutput({ ...output, action: { ...NO_ACTION, type: 'search' }, clarification: 'Which departure date?' }, request, '2026-08-28').action?.type).toBe('none');
    expect(parseGeminiOutput({ ...output, trip: tripSnapshot({ ...draft, passengerCount: 3 }), action: { type: 'select', journeyId: 'recommended', classCode: null } }, request, '2026-08-28').action?.type).toBe('none');
  });
  it('resolves the recommended journey from actual results and never invents IDs or classes', () => {
    const selected = pickJourney(outcome, { type: 'select', journeyId: 'recommended', classCode: null });
    expect(selected?.classOption.status).toBe('CONFIRMED');
    expect(pickJourney(outcome, { type: 'select', journeyId: 'made-up', classCode: null })).toBeNull();
    expect(pickJourney(outcome, { type: 'select', journeyId: journey.id, classCode: 'INVALID' })).toBeNull();
  });
  it('does not recommend waitlisted-only alternatives but permits explicit selection', () => {
    const waitlisted = { ...journey, classChoices: undefined, classOption: { ...journey.classOption, status: 'WAITLIST' as const } };
    const waiting = { ...outcome, options: [], indirectOptions: [], otherOptions: [waitlisted] };
    expect(pickJourney(waiting, { type: 'select', journeyId: 'recommended', classCode: null })).toBeNull();
    expect(pickJourney(waiting, { type: 'select', journeyId: waitlisted.id, classCode: null })?.classOption.status).toBe('WAITLIST');
  });
  it('uses class-specific fares and preserves bus/transfer legs', () => {
    const choice = journey.classChoices![0];
    const selected = pickJourney(outcome, { type: 'select', journeyId: journey.id, classCode: choice.classOption.code });
    expect(selected?.totalFare).toBe(choice.totalFare);
    expect(selected?.classOption).toEqual(choice.classOption);
    expect(selected?.roadLegs).toEqual(journey.roadLegs);
  });
});

describe('traveller collection', () => {
  it('shows a selected-journey review before collecting traveller details', () => {
    const selected = startBooking(journey, 2);
    expect(selected.phase).toBe('selected');
    expect(beginBooking(selected).phase).toBe('collecting');
  });
  it('retains supplied details while asking a clarifying question and withholds final review', () => {
    const flow = startBooking(journey, 2);
    const updated = applyBookingReply(flow, { ...NO_BOOKING_UPDATES, passengers: [{ index: 1, name: 'Asha Test', age: '32', gender: 'Female', berth: 'Lower' }] }, true);
    expect(updated.details.passengers[0]).toEqual(complete.passengers[0]);
    expect(updated.phase).toBe('collecting');
    expect(updated.reviewKey).toBeNull();
    expect(confirmBooking(updated, 'Confirm booking', 'reference-1')).toBe(updated);
  });
  it('asks for every passenger then contact details without inventing missing fields', () => {
    const details = createBookingDetails(2);
    expect(nextBookingQuestion(details)).toContain('traveller 1');
    details.passengers[0] = complete.passengers[0];
    expect(nextBookingQuestion(details)).toContain('traveller 2');
    details.passengers[1] = complete.passengers[1];
    expect(nextBookingQuestion(details)).toContain('email');
    expect(nextBookingQuestion(complete)).toBeNull();
  });
  it('merges individual updates, preserves other travellers and supports clearing', () => {
    const changed = mergeBookingDetails(complete, { ...NO_BOOKING_UPDATES, passengers: [{ index: 2, name: null, age: '35', gender: null, berth: 'Upper' }] });
    expect(changed.passengers[0]).toEqual(complete.passengers[0]);
    expect(changed.passengers[1]).toMatchObject({ name: 'Ravi Test', age: '35', berth: 'Upper' });
    expect(changed.email).toBe(complete.email);
    expect(nextBookingQuestion(mergeBookingDetails(complete, { ...NO_BOOKING_UPDATES, email: '' }))).toContain('email');
  });
  it.each([{ index: 9 }, { index: 1, age: '130' }, { index: 1, gender: 'guessed' }, { index: 1, berth: 'window' }])('rejects invalid traveller updates %j', (override) => {
    expect(() => readBookingUpdates({ ...NO_BOOKING_UPDATES, passengers: [{ name: null, age: null, gender: null, berth: null, ...override }] })).toThrow();
  });
  it('rejects duplicate indices, extra passengers and unbounded workflow data', () => {
    const passenger = { index: 1, name: null, age: null, gender: null, berth: null };
    expect(() => readBookingUpdates({ ...NO_BOOKING_UPDATES, passengers: [passenger, passenger] })).toThrow();
    expect(() => mergeBookingDetails(complete, { ...NO_BOOKING_UPDATES, passengers: [{ ...passenger, index: 3 }] })).toThrow();
    expect(() => readWorkflow({ phase: 'review', journeyId: journey.id, details: complete, journeySummary: 'x'.repeat(5001) })).toThrow();
    expect(() => validateChatRequest({ ...request, workflow: { phase: 'review', journeyId: journey.id, details: { ...complete, passengers: Array(9).fill(complete.passengers[0]) }, journeySummary: null } })).toThrow();
  });
  it('does not accept malformed ages or contact details for final review', () => {
    expect(nextBookingQuestion({ ...complete, phone: '123' })).not.toBeNull();
    expect(nextBookingQuestion({ ...complete, email: 'invalid' })).not.toBeNull();
    expect(nextBookingQuestion({ ...complete, passengers: [{ ...complete.passengers[0], age: '1.5' }] })).not.toBeNull();
    expect(nextBookingQuestion({ ...complete, phone: '+91 90000 00000' })).toBeNull();
  });
});

describe('final confirmation guard', () => {
  it.each(['Confirm booking', 'yes, book it', 'Go ahead and book it.', 'Yes, confirm my booking', 'looks good', 'confirm', 'just confirm', 'yes please', 'perfect', 'let\'s do it', 'conform booking'])('accepts natural final confirmation %s', (text) => {
    const flow = updateBooking(startBooking(journey, 2), complete);
    expect(explicitBookingConfirmation(text)).toBe(true);
    expect(confirmBooking(flow, text, 'reference-1').phase).toBe('payment');
  });
  it.each(['do not confirm booking', 'Confirm booking?', 'How do I confirm booking?', 'confirm booking but change my age', 'book it tomorrow', 'not yet', 'yes, book it if seats are confirmed'])('rejects conditional, negative or question-like consent %s', (text) => {
    const flow = updateBooking(startBooking(journey, 2), complete);
    expect(confirmBooking(flow, text, 'reference-1')).toBe(flow);
  });
  it('cannot skip collection or the final review, even with complete data', () => {
    const flow = startBooking(journey, 2);
    expect(confirmBooking(flow, 'Confirm booking', 'reference-1')).toBe(flow);
    const enteredButNotReviewed = { ...flow, details: complete };
    expect(confirmBooking(enteredButNotReviewed, 'Confirm booking', 'reference-1')).toBe(enteredButNotReviewed);
  });
  it('invalidates the review on any changed passenger, contact, fare, class or date', () => {
    const flow = updateBooking(startBooking(journey, 2), complete);
    const variants = [
      { ...flow, details: { ...complete, email: 'changed@example.test' } },
      { ...flow, details: { ...complete, passengers: [{ ...complete.passengers[0], age: '33' }, complete.passengers[1]] } },
      { ...flow, journey: { ...journey, totalFare: journey.totalFare + 100 } },
      { ...flow, journey: { ...journey, classOption: { ...journey.classOption, code: '2A' } } },
      { ...flow, journey: { ...journey, departureDateTime: '2026-09-11T10:00:00+05:30' } },
    ];
    for (const variant of variants) expect(confirmBooking(variant, 'Confirm booking', 'reference-1')).toBe(variant);
  });
  it('is idempotent and never claims that payment or ticketing occurred', () => {
    const payment = confirmBooking(updateBooking(startBooking(journey, 2), complete), 'Confirm booking', 'reference-1');
    expect(confirmBooking(payment, 'Confirm booking', 'reference-2')).toBe(payment);
    const completed = completePayment(payment);
    expect(completePayment(completed)).toBe(completed);
    expect(completed.reference).toBe('reference-1');
    expect(bookingPrompt(completed)).toContain('cabs');
  });
});

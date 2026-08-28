import { describe, expect, it } from 'vitest';
import { emptyJourneyDraft, applyIntentPatch } from './contract';
import { parseGeminiOutput } from './gemini';
import { readTripState, tripFields, tripSnapshot } from './tripState';

const draft = { ...emptyJourneyDraft(), originCity: 'Mumbai', destinationCity: 'Pune', preferredDate: '2026-09-10', passengerCount: 2, confirmedOnly: true, budgetMax: 1000 };
const request = { conversationId: 'trip-state-test', messages: [{ id: 'one', role: 'user' as const, text: 'Actually three travellers.' }], draft };
const response = { trip: tripSnapshot({ ...draft, passengerCount: 3 }), answer: null, clarification: null, suggestions: [] };

describe('complete extraction and canonical replies', () => {
  it.each(tripFields)('rejects silent omission of %s', (field) => {
    const trip = { ...response.trip }; delete trip[field];
    expect(() => readTripState(trip, draft)).toThrow('Incomplete trip state');
  });
  it('rejects the old partial response that claimed missing fields were saved', () => {
    expect(() => parseGeminiOutput({ message: 'Pune with confirmed seats under 1000.', patch: { originCity: 'Mumbai' }, suggestions: [] }, request, '2026-08-28')).toThrow();
  });
  it('builds change confirmations only from validated fields, not model claims', () => {
    const reply = parseGeminiOutput({ ...response, answer: 'Booked flights to Paris for 9 passengers!' }, request, '2026-08-28');
    expect(reply.message).toContain('Mumbai → Pune');
    expect(reply.message).toContain('3 travellers');
    expect(reply.message).toContain('₹1,000');
    expect(reply.message).not.toContain('Paris');
    expect(applyIntentPatch(draft, reply.patch).passengerCount).toBe(3);
  });
  it('makes removals explicit and preserves all unrelated manual fields', () => {
    const trip = { ...tripSnapshot(draft), budgetMax: null, confirmedOnly: false };
    const { next, patch } = readTripState(trip, draft);
    expect(patch).toEqual({ budgetMax: null, confirmedOnly: false });
    expect(next.destinationCity).toBe('Pune'); expect(next.passengerCount).toBe(2);
  });
  it('blocks search while an ambiguity is unresolved even if old details are complete', () => {
    const reply = parseGeminiOutput({ ...response, trip: tripSnapshot(draft), clarification: 'Which Springfield do you mean?' }, request, '2026-08-28');
    expect(reply.readyToSearch).toBe(false); expect(reply.needsClarification).toBe(true);
  });
  it('asks for missing essentials rather than falsely saying ready', () => {
    const reply = parseGeminiOutput({ ...response, trip: tripSnapshot({ ...emptyJourneyDraft(), destinationCity: 'Jaipur' }) }, { ...request, draft: emptyJourneyDraft() }, '2026-08-28');
    expect(reply.readyToSearch).toBe(false); expect(reply.message).toContain('Where will you be travelling from?');
  });
});

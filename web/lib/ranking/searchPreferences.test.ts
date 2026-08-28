import { describe, expect, it, vi } from 'vitest';
import { emptyJourneyDraft } from '@/lib/chat/contract';
import { POST } from '@/app/api/trains/route';
import type { SearchOutcome } from '@/types/journey';
import { rankJourneys } from './rankJourneys';
import { preferenceWarnings } from './searchPreferences';

vi.mock('@/lib/data/railRadar', () => ({ fetchRailRadarServices: vi.fn().mockResolvedValue(null) }));
const intent = { ...emptyJourneyDraft(), originCity: 'Mumbai', destinationCity: 'Pune', preferredDate: '2099-09-10', passengerCount: 2, journeyMode: 'train_only' as const };

describe('search uses captured preferences', () => {
  it('keeps only exact matches in primary and connecting results, with alternatives visible', () => {
    const requested = { ...intent, confirmedOnly: true, budgetMax: 900, departureAfter: '20:00', preferredClass: '3A' };
    const result = rankJourneys(requested);
    for (const option of [...result.options, ...result.indirectOptions]) expect(preferenceWarnings(option, requested)).toEqual([]);
    expect(result.otherOptions.length).toBeGreaterThan(0);
    for (const other of result.otherOptions) {
      expect(preferenceWarnings(other, requested).length).toBeGreaterThan(0);
      expect(other.tradeoffs).toEqual(expect.arrayContaining(preferenceWarnings(other, requested)));
    }
  });
  it('does not promote any journey above a strict budget when none fit', () => {
    const result = rankJourneys({ ...intent, budgetMax: 1 });
    expect(result.options).toEqual([]); expect(result.indirectOptions).toEqual([]); expect(result.otherOptions.length).toBeGreaterThan(0);
  });
  it('checks complete fare and timing including both bus legs', () => {
    const requested = { ...intent, originCity: 'Khategaon', destinationCity: 'Mandawa', journeyMode: 'complete' as const, budgetMax: 700, departureAfter: '09:00' };
    const result = rankJourneys(requested);
    const all = [...result.options, ...result.otherOptions, ...result.indirectOptions];
    expect(all.length).toBeGreaterThan(0); expect(all[0].roadLegs).toHaveLength(2);
    for (const option of [...result.options, ...result.indirectOptions]) expect(preferenceWarnings(option, requested)).toEqual([]);
    expect(result.otherOptions.some((option) => option.tradeoffs.some((warning) => warning.includes('budget')))).toBe(true);
  });
  it('compares departure times in India, not the ISO UTC hour', () => {
    const option = rankJourneys(intent).options[0];
    const train = { ...option, departureDateTime: '2099-09-10T15:00:00Z', arrivalDateTime: '2099-09-11T02:00:00Z', legs: undefined, roadLegs: undefined };
    expect(preferenceWarnings(train, { ...intent, departureAfter: '20:00' })).toEqual([]);
    expect(preferenceWarnings(train, { ...intent, departureAfter: '21:00' })).toContain('Leaves before your 21:00 departure preference');
  });
  it('checks the full arrival date, not just the clock, for overnight journeys', () => {
    const option = rankJourneys(intent).options[0];
    const train = { ...option, departureDateTime: '2099-09-10T15:00:00Z', arrivalDateTime: '2099-09-12T02:00:00Z', legs: undefined, roadLegs: undefined };
    expect(preferenceWarnings(train, { ...intent, arrivalDate: '2099-09-11', arrivalBefore: '16:00' })).toContain('Arrives after your deadline');
  });
  it('rejects incomplete and malformed search requests at the server boundary', async () => {
    for (const draft of [emptyJourneyDraft(), { ...intent, passengerCount: 99 }, { ...intent, preferredDate: '2099-02-30' }, { ...intent, departureAfter: '25:00' }]) {
      const response = await POST(new Request('http://localhost/api/trains', { method: 'POST', body: JSON.stringify(draft) }));
      expect(response.status).toBe(400);
    }
  });
  it('carries the actual captured route, class and budget through the search API', async () => {
    const requested = { ...intent, preferredClass: '3A', budgetMax: 1000, confirmedOnly: true };
    const response = await POST(new Request('http://localhost/api/trains', { method: 'POST', body: JSON.stringify(requested) }));
    expect(response.status).toBe(200);
    const { outcome } = await response.json() as { outcome: SearchOutcome };
    for (const option of [...outcome.options, ...outcome.indirectOptions]) expect(preferenceWarnings(option, requested)).toEqual([]);
  });
});

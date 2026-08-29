import { describe, expect, it } from 'vitest';
import { emptyJourneyDraft } from '@/lib/chat/contract';
import { rankJourneys } from './rankJourneys';
import { buildDecisionResults } from './decisionSupport';

const intent = { ...emptyJourneyDraft(), originCity: 'Khategaon', destinationCity: 'Mandawa', preferredDate: '2026-09-10', passengerCount: 2, seniorTraveller: true, confirmedOnly: false, journeyMode: 'complete' as const };

describe('decision-support presentation', () => {
  it('creates three intentionally differentiated top choices when the catalogue allows it', () => {
    const results = buildDecisionResults(rankJourneys(intent), intent);
    expect(results.top).toHaveLength(3);
    expect(results.top[0].label).toBe('Best overall');
    expect(new Set(results.top.map((item) => item.journey.id)).size).toBe(3);
    expect(results.top[1].label).toMatch(/Save|Lowest fare/);
    expect(results.top[2].label).toMatch(/Arrive|Fastest route/);
    expect(results.top.every((item) => item.reason.length > 10 && item.tradeoff.length > 10)).toBe(true);
  });

  it('surfaces dynamic priorities and automatically chosen town connections', () => {
    const results = buildDecisionResults(rankJourneys({ ...intent, confirmedOnly: true }), { ...intent, confirmedOnly: true });
    expect(results.priorities).toContain('Confirmed seats');
    expect(results.priorities).toContain('Senior-friendly comfort');
    expect(results.top[0].journey.roadLegs).toHaveLength(2);
    expect(results.top.every((item) => item.journey.classOption.status === 'CONFIRMED')).toBe(true);
    expect(results.scope).toMatch(/trains.*classes.*stations/);
  });

  it('reranks the same option set when priorities change', () => {
    const outcome = rankJourneys(intent);
    const comfortFirst = buildDecisionResults(outcome, intent);
    const priceFirst = buildDecisionResults(outcome, { ...intent, seniorTraveller: false, rankingPriority: 'price' });
    expect(new Set(comfortFirst.top.concat(comfortFirst.other).map((item) => item.journey.id))).toEqual(new Set(priceFirst.top.concat(priceFirst.other).map((item) => item.journey.id)));
    expect(priceFirst.priorities).toContain('Lowest fare first');
  });
});

import { describe, expect, it } from 'vitest';
import { trains } from '@/lib/data/trains';
import { LocalIntentParser } from '@/lib/intent/localParser';
import type { JourneyIntent } from '@/types/journey';
import { rankJourneys, recommendAlternatives } from './rankJourneys';
import { scoreJourney } from './scoreJourney';

const intent: JourneyIntent = new LocalIntentParser().parse("I need to travel from Bengaluru to Jaipur next Friday. Reach by 4 PM. We’re three people including my mother, and I don’t want a waitlisted ticket.");

describe('journey ranking', () => {
  it('ranks a confirmed on-time journey above a cheaper waitlisted journey', () => {
    const confirmed = scoreJourney(trains[0], 0, intent);
    const waitlisted = scoreJourney(trains[1], 1, intent);
    expect(confirmed.score).toBeGreaterThan(waitlisted.score);
  });

  it('heavily penalises a journey arriving after the deadline', () => {
    const onTime = scoreJourney(trains[0], 0, intent);
    const late = scoreJourney(trains[3], 0, intent);
    expect(late.scoreBreakdown.arrival).toBe(-60);
    expect(onTime.score - late.score).toBeGreaterThan(50);
  });

  it('surfaces the confirmed Thursday alternative', () => {
    const outcome = rankJourneys(intent);
    expect(outcome.options.some((option) => option.recommendationType === 'ALTERNATIVE_DATE' && option.classOption.status === 'CONFIRMED')).toBe(true);
  });

  it('adds a comfort bonus for a senior traveller', () => {
    const comfortable = scoreJourney(trains[0], 0, intent);
    const neutral = scoreJourney(trains[0], 0, { ...intent, seniorTraveller: false, comfortPreference: 'any' });
    expect(comfortable.score).toBe(neutral.score + 10);
  });

  it('returns useful alternatives instead of a blank result', () => {
    const outcome = recommendAlternatives({ ...intent, originCity: 'Goa', destinationCity: 'Srinagar' });
    expect(outcome).toHaveLength(3);
    expect(outcome[0]).toContain('nearby');
  });

  it('returns sample journeys between supported major cities', () => {
    const outcome = rankJourneys({ ...intent, originCity: 'Kolkata', destinationCity: 'Pune', preferredDate: '2026-09-12' });
    expect(outcome.options).toHaveLength(3);
    expect(outcome.options[0].departureStation.city).toBe('Kolkata');
    expect(outcome.options[0].arrivalStation.city).toBe('Pune');
  });

  it('builds practical one-change journeys from the existing route data', () => {
    const outcome = rankJourneys(intent);
    expect(outcome.indirectOptions.length).toBeGreaterThan(0);
    const connection = outcome.indirectOptions[0];
    expect(connection.legs).toHaveLength(2);
    expect(connection.transfer?.durationMinutes).toBeGreaterThanOrEqual(90);
    expect(connection.transfer?.durationMinutes).toBeLessThanOrEqual(720);
    expect(connection.departureStation.city).toBe('Bengaluru');
    expect(connection.arrivalStation.city).toBe('Jaipur');
    expect(connection.classOption.fare).toBe(connection.legs?.reduce((total, leg) => total + leg.classOption.fare, 0));
  });

  it('groups available classes under one card per train', () => {
    const outcome = rankJourneys(intent);
    const trainNumbers = outcome.options.map((option) => option.trainNumber);
    expect(new Set(trainNumbers).size).toBe(trainNumbers.length);
    expect(outcome.options[0].classChoices?.map((choice) => choice.classOption.code)).toEqual(['2A', '3A', 'SL']);
    expect(outcome.options[0].classChoices?.find((choice) => choice.classOption.code === '3A')?.id).toBe(outcome.options[0].id);
  });
});

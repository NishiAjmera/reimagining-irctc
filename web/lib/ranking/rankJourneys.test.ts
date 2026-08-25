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
    const outcome = recommendAlternatives({ ...intent, originCity: 'Pune', destinationCity: 'Chennai' });
    expect(outcome).toHaveLength(3);
    expect(outcome[0]).toContain('nearby');
  });
});

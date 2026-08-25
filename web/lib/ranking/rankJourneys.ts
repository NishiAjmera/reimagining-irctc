import { trains } from '@/lib/data/trains';
import type { JourneyIntent, JourneyOption, SearchOutcome } from '@/types/journey';
import { scoreJourney, withRecommendation } from './scoreJourney';

const byScore = (a: JourneyOption, b: JourneyOption) => b.score - a.score;

export function rankJourneys(intent: JourneyIntent): SearchOutcome {
  const matching = trains.filter((train) =>
    train.departureStation.city.toLowerCase() === intent.originCity.toLowerCase() &&
    train.arrivalStation.city.toLowerCase() === intent.destinationCity.toLowerCase(),
  );

  if (matching.length === 0) {
    return {
      options: [], otherOptions: [],
      alternatives: ['Try a nearby departure station', 'Allow one day of date flexibility', 'Check journeys with one simple change'],
      considered: { dates: intent.flexibilityDays * 2 + 1, stations: 0, trains: 0, classes: 0 },
    };
  }

  const candidates = matching.flatMap((train) => train.classes.map((_, index) => scoreJourney(train, index, intent))).sort(byScore);
  const exactDate = candidates.filter((option) => option.departureDateTime.slice(0, 10) === intent.preferredDate);
  const confirmed = exactDate.filter((option) => option.classOption.status === 'CONFIRMED');
  const best = (intent.confirmedOnly ? confirmed[0] : candidates[0]) ?? candidates[0];
  const cheapest = confirmed
    .filter((option) => option.id !== best.id && option.scoreBreakdown.arrival > 0)
    .sort((a, b) => a.classOption.fare - b.classOption.fare)[0];
  const alternative = candidates.filter((option) => option.departureDateTime.slice(0, 10) !== intent.preferredDate && option.classOption.status === 'CONFIRMED').sort(byScore)[0];

  const selected: JourneyOption[] = [];
  if (best) selected.push(withRecommendation(best, 'BEST_OVERALL'));
  if (cheapest) selected.push(withRecommendation(cheapest, 'CHEAPEST'));
  if (alternative) selected.push(withRecommendation(alternative, 'ALTERNATIVE_DATE'));
  for (const candidate of candidates) {
    if (selected.length >= 3) break;
    if (!selected.some((option) => option.id === candidate.id)) selected.push(withRecommendation(candidate, candidate.tags.includes('fastest') ? 'FASTEST' : 'BEST_AVAILABILITY'));
  }

  const selectedIds = new Set(selected.map((option) => option.id));
  const otherOptions = candidates.filter((option) => !selectedIds.has(option.id)).slice(0, 2);
  return {
    options: selected,
    otherOptions,
    alternatives: confirmed.length === 0 ? ['Leave one day earlier for confirmed seats', 'Try a nearby station', 'Consider RAC with high confirmation confidence'] : [],
    considered: {
      dates: intent.flexibilityDays * 2 + 1,
      stations: new Set(matching.flatMap((train) => [train.departureStation.code, train.arrivalStation.code])).size,
      trains: matching.length,
      classes: new Set(matching.flatMap((train) => train.classes.map((item) => item.code))).size,
    },
  };
}

export function recommendAlternatives(intent: JourneyIntent) {
  const outcome = rankJourneys(intent);
  return outcome.options.length ? outcome.options : outcome.alternatives;
}

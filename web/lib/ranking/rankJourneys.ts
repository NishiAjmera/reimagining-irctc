import { createSampleServices, trains } from '@/lib/data/trains';
import type { JourneyIntent, JourneyOption, SearchOutcome, TrainService } from '@/types/journey';
import { scoreJourney, withRecommendation } from './scoreJourney';

const byScore = (a: JourneyOption, b: JourneyOption) => b.score - a.score;

export function rankJourneys(intent: JourneyIntent): SearchOutcome {
  const stored = trains.filter((train) =>
    train.departureStation.city.toLowerCase() === intent.originCity.toLowerCase() &&
    train.arrivalStation.city.toLowerCase() === intent.destinationCity.toLowerCase(),
  );
  const generated = createSampleServices(intent.originCity, intent.destinationCity);
  const services = stored.length >= 2 ? stored : [...stored, ...generated];
  return rankJourneyServices(intent, services);
}

export function rankJourneyServices(intent: JourneyIntent, services: TrainService[]): SearchOutcome {
  const matching = services.map((train) => alignToSearchDate(train, intent.preferredDate));

  if (matching.length === 0) {
    return {
      options: [], otherOptions: [],
      alternatives: ['Try a nearby departure station', 'Allow one day of date flexibility', 'Check journeys with one simple change'],
      considered: { dates: intent.flexibilityDays * 2 + 1, stations: 0, trains: 0, classes: 0 },
    };
  }

  const candidates = matching.flatMap((train) => train.classes.map((_, index) => scoreJourney(train, index, intent))).sort(byScore);
  const exactDate = candidates.filter((option) => localDate(option.departureDateTime) === intent.preferredDate);
  const confirmed = exactDate.filter((option) => option.classOption.status === 'CONFIRMED');
  const best = (intent.confirmedOnly ? confirmed[0] : candidates[0]) ?? candidates[0];
  const cheapest = confirmed
    .filter((option) => option.id !== best.id && option.scoreBreakdown.arrival > 0)
    .sort((a, b) => a.classOption.fare - b.classOption.fare)[0];
  const alternative = candidates.filter((option) => localDate(option.departureDateTime) !== intent.preferredDate && option.classOption.status === 'CONFIRMED').sort(byScore)[0];

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

function alignToSearchDate(train: TrainService, preferredDate: string): TrainService {
  const departureDate = shiftDate(preferredDate, train.searchDateOffset ?? 0);
  const departureTime = train.departureDateTime.slice(11, 19);
  const departure = new Date(`${departureDate}T${departureTime}+05:30`);
  return {
    ...train,
    departureDateTime: departure.toISOString(),
    arrivalDateTime: new Date(departure.getTime() + train.durationMinutes * 60_000).toISOString(),
  };
}

function shiftDate(date: string, offset: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function localDate(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function recommendAlternatives(intent: JourneyIntent) {
  const outcome = rankJourneys(intent);
  return outcome.options.length ? outcome.options : outcome.alternatives;
}

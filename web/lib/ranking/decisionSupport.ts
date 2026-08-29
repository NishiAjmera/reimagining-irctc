import { itineraryOverview } from '@/lib/journey/itinerary';
import type { JourneyIntent, JourneyOption, RankingPriority, SearchOutcome } from '@/types/journey';

export type PresentedJourney = {
  journey: JourneyOption;
  label: string;
  reason: string;
  tradeoff: string;
  priorityHits: string[];
};

export type DecisionResults = {
  top: PresentedJourney[];
  other: PresentedJourney[];
  priorities: string[];
  practicalCount: number;
  scope: string;
};

const statusValue = { CONFIRMED: 3, RAC: 2, WAITLIST: 1 } as const;
const comfortValue = (code: string) => ({ '1A': 7, '2A': 6, '3A': 5, '3E': 4, CC: 3, SL: 2, '2S': 1 }[code] ?? 0);
const duration = (journey: JourneyOption) => journey.doorToDoorDurationMinutes ?? journey.durationMinutes;
const arrival = (journey: JourneyOption) => Date.parse(itineraryOverview(journey).arrival);

function priorityScore(journey: JourneyOption, intent: JourneyIntent) {
  const status = statusValue[journey.classOption.status] * (intent.confirmedOnly || intent.rankingPriority === 'confirmation' ? 45 : 22);
  const comfort = comfortValue(journey.classOption.code) * (intent.seniorTraveller || intent.comfortPreference === 'comfortable' ? 9 : 2);
  const price = -journey.totalFare / (intent.rankingPriority === 'price' ? 90 : 450);
  const speed = -duration(journey) / (intent.rankingPriority === 'duration' ? 8 : 35);
  const arrivalScore = intent.rankingPriority === 'arrival' ? -arrival(journey) / 36e5 : 0;
  const transferPenalty = (journey.legs?.length ?? 1) > 1 ? 15 : 0;
  return status + comfort + price + speed + arrivalScore - transferPenalty + journey.score / 8;
}

function uniqueJourneys(outcome: SearchOutcome) {
  const seen = new Set<string>();
  return [...outcome.options, ...outcome.indirectOptions, ...outcome.otherOptions].filter((journey) => {
    const key = `${journey.trainNumber}-${journey.departureDateTime}-${journey.classOption.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hours(minutes: number) {
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [whole ? `${whole}h` : '', rest ? `${rest}m` : ''].filter(Boolean).join(' ');
}

export function activePriorities(intent: JourneyIntent) {
  const values: string[] = [];
  if (intent.confirmedOnly) values.push('Confirmed seats');
  if (intent.seniorTraveller) values.push('Senior-friendly comfort');
  if (intent.arrivalBefore) values.push(`Arrive by ${intent.arrivalBefore}`);
  if (intent.preferredClass) values.push(`${intent.preferredClass} preferred`);
  if (intent.budgetMax) values.push(`Up to ₹${intent.budgetMax.toLocaleString('en-IN')} / traveller`);
  const priority: Record<RankingPriority, string> = { best: 'Best overall balance', confirmation: 'Seat confirmation first', price: 'Lowest fare first', duration: 'Shortest journey first', arrival: 'Earlier arrival first' };
  values.push(priority[intent.rankingPriority]);
  return values;
}

function hits(journey: JourneyOption, intent: JourneyIntent) {
  const values: string[] = [];
  if (journey.classOption.status === 'CONFIRMED') values.push('Confirmed');
  if (intent.seniorTraveller && comfortValue(journey.classOption.code) >= 4) values.push('Senior-friendly');
  if (intent.arrivalBefore && journey.scoreBreakdown.arrival > 0) values.push('Before deadline');
  if (intent.budgetMax && journey.totalFare <= intent.budgetMax * intent.passengerCount) values.push('Within budget');
  if ((journey.legs?.length ?? 1) === 1) values.push('No train change');
  return values.slice(0, 3);
}

function describe(journey: JourneyOption, intent: JourneyIntent, best: JourneyOption, role: 'best' | 'save' | 'fast' | 'other'): PresentedJourney {
  const saving = best.totalFare - journey.totalFare;
  const minutesEarlier = Math.round((arrival(best) - arrival(journey)) / 60000);
  const label = role === 'best' ? 'Best overall' : role === 'save' ? (saving > 0 ? `Save ₹${saving.toLocaleString('en-IN')}` : 'Lowest fare') : role === 'fast' ? (minutesEarlier > 0 ? `Arrive ${hours(minutesEarlier)} earlier` : 'Fastest route') : journey.classOption.status === 'WAITLIST' ? 'Waitlisted option' : journey.classOption.status === 'RAC' ? 'RAC option' : 'Other option';
  const priorityHits = hits(journey, intent);
  let reason = journey.reasons[0] ?? 'A practical option for this trip';
  if (role === 'best') reason = intent.seniorTraveller && comfortValue(journey.classOption.code) >= 4 ? 'Best balance of confirmed seating, comfort and travel time for your group.' : 'Best balance of availability, travel time and total fare.';
  if (role === 'save') reason = `The lowest practical total fare in this set${journey.classOption.status === 'CONFIRMED' ? ', with confirmed seats' : ''}.`;
  if (role === 'fast') reason = 'Gets you to the destination sooner than the other practical choices.';
  if (role === 'other') {
    if (statusValue[journey.classOption.status] < statusValue[best.classOption.status]) reason = `Ranks lower because ${journey.classOption.status === 'WAITLIST' ? 'a seat is not confirmed' : 'a full berth is not confirmed'}.`;
    else if (journey.totalFare > best.totalFare) reason = `Ranks lower because it costs ₹${(journey.totalFare - best.totalFare).toLocaleString('en-IN')} more than the best-overall choice.`;
    else if (duration(journey) > duration(best)) reason = `Ranks lower because the complete journey takes ${hours(duration(journey) - duration(best))} longer.`;
    else reason = 'A workable alternative, but it matches fewer of your stated priorities.';
  }
  let tradeoff = journey.tradeoffs[0] ?? 'No major compromise against your stated priorities.';
  if (role === 'save' && comfortValue(journey.classOption.code) < comfortValue(best.classOption.code)) tradeoff = `${journey.classOption.code} is less comfortable than the ${best.classOption.code} best-overall choice.`;
  if (role === 'fast' && journey.totalFare > best.totalFare) tradeoff = `Costs ₹${(journey.totalFare - best.totalFare).toLocaleString('en-IN')} more than the best-overall choice.`;
  if (journey.classOption.status === 'RAC') tradeoff = `RAC ${journey.classOption.position ?? ''}: travel is allowed, but a full berth is not yet confirmed.`;
  if (journey.classOption.status === 'WAITLIST') tradeoff = `WL ${journey.classOption.position ?? ''}: no seat or berth is confirmed yet.`;
  return { journey, label, reason, tradeoff, priorityHits };
}

export function buildDecisionResults(outcome: SearchOutcome, intent: JourneyIntent): DecisionResults {
  const ranked = uniqueJourneys(outcome).sort((a, b) => priorityScore(b, intent) - priorityScore(a, intent));
  const nonWaitlisted = ranked.filter((item) => item.classOption.status !== 'WAITLIST');
  const allowed = intent.confirmedOnly ? ranked.filter((item) => item.classOption.status === 'CONFIRMED') : (nonWaitlisted.length >= 3 ? nonWaitlisted : ranked);
  const pool = allowed.length ? allowed : ranked;
  const best = pool[0];
  if (!best) return { top: [], other: [], priorities: activePriorities(intent), practicalCount: 0, scope: `Checked ${outcome.considered.trains} trains across ${outcome.considered.dates} date${outcome.considered.dates === 1 ? '' : 's'}.` };
  const top: PresentedJourney[] = [describe(best, intent, best, 'best')];
  const unused = () => pool.filter((item) => !top.some(({ journey }) => journey.id === item.id));
  const cheaper = unused().filter((item) => item.totalFare < best.totalFare).sort((a, b) => a.totalFare - b.totalFare)[0] ?? unused().sort((a, b) => a.totalFare - b.totalFare)[0];
  if (cheaper) top.push(describe(cheaper, intent, best, 'save'));
  const faster = unused().sort((a, b) => arrival(a) - arrival(b) || duration(a) - duration(b))[0];
  if (faster) top.push(describe(faster, intent, best, 'fast'));
  while (top.length < Math.min(3, pool.length)) {
    const next = unused()[0];
    if (!next) break;
    top.push(describe(next, intent, best, top.length === 1 ? 'save' : 'fast'));
  }
  const topIds = new Set(top.map(({ journey }) => journey.id));
  const other = ranked.filter((journey) => !topIds.has(journey.id)).map((journey) => describe(journey, intent, best, 'other'));
  const stationCount = outcome.considered.stations || new Set(ranked.flatMap((item) => [item.departureStation.code, item.arrivalStation.code])).size;
  return { top, other, priorities: activePriorities(intent), practicalCount: pool.length, scope: `Checked ${outcome.considered.trains} trains, ${outcome.considered.classes} classes and ${stationCount} stations across ${outcome.considered.dates} date${outcome.considered.dates === 1 ? '' : 's'}.` };
}

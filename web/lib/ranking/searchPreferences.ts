import { itineraryOverview } from '@/lib/journey/itinerary';
import type { JourneyIntent, JourneyOption, SearchOutcome } from '@/types/journey';

export function indianDate(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}
export function indianTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
}

export function preferenceWarnings(journey: JourneyOption, intent: JourneyIntent) {
  const full = itineraryOverview(journey);
  const warnings: string[] = [];
  const dayOffset = Math.abs(Date.parse(indianDate(full.departure)) - Date.parse(intent.preferredDate)) / 86400000;
  if (dayOffset > intent.flexibilityDays) warnings.push('Departs outside your selected dates');
  if (intent.departureAfter && indianTime(full.departure) < intent.departureAfter) warnings.push(`Leaves before your ${intent.departureAfter} departure preference`);
  const deadline = intent.arrivalDate ? Date.parse(`${intent.arrivalDate}T${intent.arrivalBefore ?? '23:59'}:00+05:30`) : null;
  if (deadline !== null ? Date.parse(full.arrival) > deadline : intent.arrivalBefore && indianTime(full.arrival) > intent.arrivalBefore) warnings.push('Arrives after your deadline');
  if (intent.budgetMax && journey.totalFare > intent.budgetMax * intent.passengerCount) warnings.push(`Above your ₹${intent.budgetMax.toLocaleString('en-IN')} per-traveller budget`);
  if (intent.confirmedOnly && journey.classOption.status !== 'CONFIRMED') warnings.push('Does not meet your confirmed-seats preference');
  if (intent.preferredClass && journey.classOption.code !== intent.preferredClass) warnings.push(`Different from your preferred ${intent.preferredClass} class`);
  return warnings;
}

/** Keep non-matching options visible, but never promote them as matching results. */
export function applySearchPreferences(outcome: SearchOutcome, intent: JourneyIntent): SearchOutcome {
  const prepare = (option: JourneyOption) => {
    const choices = option.classChoices?.map((choice) => {
      const candidate = { ...option, ...choice };
      return { ...choice, tradeoffs: [...new Set([...choice.tradeoffs, ...preferenceWarnings(candidate, intent)])] };
    });
    const matchingChoice = choices?.find((choice) => !preferenceWarnings({ ...option, ...choice }, intent).length);
    const selected = preferenceWarnings(option, intent).length && matchingChoice ? { ...option, ...matchingChoice } : option;
    const warnings = preferenceWarnings(selected, intent);
    return { ...selected, classChoices: choices, tradeoffs: [...new Set([...selected.tradeoffs, ...warnings])] };
  };
  const direct = [...outcome.options, ...outcome.otherOptions].map(prepare);
  const indirect = outcome.indirectOptions.map(prepare);
  const options = direct.filter((option) => !preferenceWarnings(option, intent).length);
  const indirectOptions = indirect.filter((option) => !preferenceWarnings(option, intent).length);
  const otherOptions = [...direct, ...indirect].filter((option) => preferenceWarnings(option, intent).length);
  return { ...outcome, options, indirectOptions, otherOptions, alternatives: !options.length && !indirectOptions.length && otherOptions.length ? ['No exact match for these preferences. Review the trade-offs below or edit your trip.'] : outcome.alternatives };
}

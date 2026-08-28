import { applyIntentPatch, emptyJourneyDraft, intentProperties, isRecord, missingJourneyFields, validatePatch, type IntentPatch } from './contract';
import type { JourneyIntent } from '@/types/journey';

export const tripFields = Object.keys(intentProperties) as (keyof JourneyIntent)[];

/** Every slot is present; null means genuinely unknown/cleared, never omitted. */
export function tripSnapshot(draft: JourneyIntent) {
  return Object.fromEntries(tripFields.map((field) => [field, draft[field] === '' || (field === 'passengerCount' && draft[field] === 0) ? null : draft[field] ?? null]));
}

export function readTripState(value: unknown, current: JourneyIntent) {
  if (!isRecord(value) || tripFields.some((field) => !Object.hasOwn(value, field))) throw new Error('Incomplete trip state');
  const next = applyIntentPatch(emptyJourneyDraft(), validatePatch(value));
  const before = tripSnapshot(current);
  const after = tripSnapshot(next);
  const patch: IntentPatch = {};
  for (const field of tripFields) if (before[field] !== after[field]) Object.assign(patch, { [field]: after[field] });
  return { next, patch };
}

export function nextTripQuestion(draft: JourneyIntent, today: string) {
  const field = missingJourneyFields(draft, today)[0];
  if (field === 'originCity') return 'Where will you be travelling from?';
  if (field === 'destinationCity') return 'Where would you like to go?';
  if (field === 'preferredDate') return 'What date would you like to leave?';
  if (field === 'passengerCount') return 'How many people are travelling?';
  if (field === 'journeyMode') return 'Would you like bus connections included, or will you arrange travel to and from the stations?';
  if (field === 'arrivalDate') return 'Your arrival deadline is before departure. Which date should I change?';
  return field ? 'Please check the trip details before searching.' : 'Do these details look right? Tell me to go ahead and search when you’re ready.';
}

/** Never use generated prose to confirm a mutation: describe the committed state. */
export function tripUpdateMessage(draft: JourneyIntent, patch: IntentPatch, today: string) {
  const parts: string[] = [];
  if (draft.originCity && draft.destinationCity) parts.push(`${draft.originCity} → ${draft.destinationCity}`);
  else if (draft.originCity) parts.push(`From ${draft.originCity}`);
  else if (draft.destinationCity) parts.push(`To ${draft.destinationCity}`);
  if (draft.preferredDate) parts.push(new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${draft.preferredDate}T00:00:00Z`)));
  if (draft.passengerCount) parts.push(`${draft.passengerCount} traveller${draft.passengerCount === 1 ? '' : 's'}`);
  if (draft.journeyMode) parts.push(draft.journeyMode === 'complete' ? 'Bus + train connections' : 'Train only');
  if (draft.confirmedOnly) parts.push('Confirmed seats only');
  else if ('confirmedOnly' in patch) parts.push('Waitlisted options allowed');
  if (draft.budgetMax) parts.push(`Up to ₹${draft.budgetMax.toLocaleString('en-IN')} per traveller`);
  else if ('budgetMax' in patch) parts.push('No budget limit');
  if (draft.departureAfter) parts.push(`Leave after ${draft.departureAfter}`);
  else if ('departureAfter' in patch) parts.push('Any departure time');
  if (draft.arrivalBefore) parts.push(`Arrive before ${draft.arrivalBefore}`);
  else if ('arrivalBefore' in patch) parts.push('Any arrival time');
  if (draft.flexibilityDays) parts.push(`±${draft.flexibilityDays} day${draft.flexibilityDays === 1 ? '' : 's'}`);
  if (draft.arrivalDate) parts.push(`Arrive by ${draft.arrivalDate}`);
  if (draft.preferredClass) parts.push(`${draft.preferredClass} class`);
  if (draft.seniorTraveller) parts.push('Senior traveller');
  return `${parts.length ? `${parts.join(' · ')}.\n` : ''}${nextTripQuestion(draft, today)}`;
}

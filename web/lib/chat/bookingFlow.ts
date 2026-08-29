import type { JourneyOption, SearchOutcome } from '@/types/journey';
import { applyClassChoice } from '@/lib/journey/classChoice';

export type PassengerDetails = { name: string; age: string; gender: string; berth: string };
export type BookingDetails = { passengers: PassengerDetails[]; email: string; phone: string };
export type ChatAction = { type: 'none' | 'search' | 'select' | 'cancel' | 'confirm'; journeyId: string | null; classCode: string | null };
export const NO_ACTION: ChatAction = { type: 'none', journeyId: null, classCode: null };
export type BookingUpdates = { passengers: Array<{ index: number; name: string | null; age: string | null; gender: string | null; berth: string | null }>; email: string | null; phone: string | null };
export const NO_BOOKING_UPDATES: BookingUpdates = { passengers: [], email: null, phone: null };
export type BookingFlow = { phase: 'selected' | 'collecting' | 'review' | 'payment' | 'completed'; journey: JourneyOption; details: BookingDetails; reviewKey: string | null; reference: string | null };
export type WorkflowContext = { phase: 'planning' | 'results' | BookingFlow['phase']; journeyId: string | null; details: BookingDetails | null; journeySummary: string | null };
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
export const genders = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
export const berths = ['No preference', 'Lower', 'Middle', 'Upper', 'Side lower', 'Side upper'];
export const createBookingDetails = (count: number): BookingDetails => ({ passengers: Array.from({ length: count }, () => ({ name: '', age: '', gender: '', berth: 'No preference' })), email: '', phone: '' });

export function readAction(value: unknown): ChatAction {
  if (value === undefined) return NO_ACTION;
  if (!record(value) || !['none', 'search', 'select', 'cancel', 'confirm'].includes(String(value.type)) || !(value.journeyId === null || typeof value.journeyId === 'string' && value.journeyId.length <= 200) || !(value.classCode === null || ['1A', '2A', '3A', '3E', 'CC', 'SL', '2S'].includes(String(value.classCode)))) throw new Error('Invalid chat action');
  return { type: value.type as ChatAction['type'], journeyId: value.journeyId as string | null, classCode: value.classCode as string | null };
}

export function readBookingUpdates(value: unknown): BookingUpdates {
  if (value === undefined) return NO_BOOKING_UPDATES;
  if (!record(value) || !Array.isArray(value.passengers) || value.passengers.length > 8) throw new Error('Invalid traveller updates');
  const nullable = (item: unknown, max: number) => item === null || typeof item === 'string' && item.length <= max;
  if (!nullable(value.email, 254) || !nullable(value.phone, 30)) throw new Error('Invalid contact update');
  const indices = new Set<number>();
  const passengers = value.passengers.map((item) => {
    if (!record(item) || !Number.isInteger(item.index) || Number(item.index) < 1 || Number(item.index) > 8 || indices.has(Number(item.index)) || !nullable(item.name, 100) || !nullable(item.age, 3) || !nullable(item.gender, 20) || !nullable(item.berth, 20)) throw new Error('Invalid traveller update');
    if (item.age !== null && item.age !== '' && (!/^\d{1,3}$/.test(String(item.age)) || Number(item.age) < 1 || Number(item.age) > 120)) throw new Error('Invalid age');
    if (item.gender !== null && item.gender !== '' && !genders.includes(String(item.gender))) throw new Error('Invalid gender');
    if (item.berth !== null && !berths.includes(String(item.berth))) throw new Error('Invalid berth');
    indices.add(Number(item.index));
    return { index: Number(item.index), name: item.name as string | null, age: item.age as string | null, gender: item.gender as string | null, berth: item.berth as string | null };
  });
  return { passengers, email: value.email as string | null, phone: value.phone as string | null };
}

export function readWorkflow(value: unknown): WorkflowContext | undefined {
  if (value === undefined) return undefined;
  if (!record(value) || !['planning', 'results', 'selected', 'collecting', 'review', 'payment', 'completed'].includes(String(value.phase)) || !(value.journeyId === null || typeof value.journeyId === 'string' && value.journeyId.length <= 200) || !(value.journeySummary === null || typeof value.journeySummary === 'string' && value.journeySummary.length <= 5000)) throw new Error('Invalid workflow');
  let details: BookingDetails | null = null;
  if (value.details !== null) {
    if (!record(value.details) || !Array.isArray(value.details.passengers) || value.details.passengers.length < 1 || value.details.passengers.length > 8) throw new Error('Invalid booking');
    const checked = readBookingUpdates({ passengers: value.details.passengers.map((passenger, index) => ({ ...(record(passenger) ? passenger : {}), index: index + 1 })), email: value.details.email, phone: value.details.phone });
    if (checked.email === null || checked.phone === null || checked.passengers.some((passenger) => Object.values(passenger).includes(null))) throw new Error('Incomplete booking structure');
    details = { email: checked.email, phone: checked.phone, passengers: checked.passengers.map(({ name, age, gender, berth }) => ({ name: name!, age: age!, gender: gender!, berth: berth! })) };
  }
  return { phase: value.phase as WorkflowContext['phase'], journeyId: value.journeyId as string | null, journeySummary: value.journeySummary as string | null, details };
}

export function mergeBookingDetails(details: BookingDetails, updates: BookingUpdates): BookingDetails {
  if (updates.passengers.some(({ index }) => index > details.passengers.length)) throw new Error('Traveller does not exist');
  return {
    passengers: details.passengers.map((passenger, index) => {
      const patch = updates.passengers.find((item) => item.index === index + 1);
      return patch ? Object.fromEntries(Object.entries(passenger).map(([key, value]) => [key, (patch[key as keyof PassengerDetails] ?? value).trim()])) as PassengerDetails : passenger;
    }),
    email: (updates.email ?? details.email).trim(), phone: (updates.phone ?? details.phone).trim(),
  };
}

export function nextBookingQuestion(details: BookingDetails): string | null {
  for (const [index, passenger] of details.passengers.entries()) {
    const missing: string[] = [];
    if (passenger.name.trim().length < 2) missing.push('full name as on ID');
    if (!/^\d{1,3}$/.test(passenger.age) || Number(passenger.age) < 1 || Number(passenger.age) > 120) missing.push('age');
    if (!genders.includes(passenger.gender)) missing.push('gender');
    if (missing.length) return `Please share traveller ${index + 1}’s ${missing.join(', ')}. You can add a berth preference too.`;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email) || !/^(?:\+91|91)?[6-9]\d{9}$/.test(details.phone.replace(/[\s()-]/g, ''))) return 'What email address and Indian mobile number should we use for booking updates?';
  return null;
}

export const reviewFingerprint = (journey: JourneyOption, details: BookingDetails) => JSON.stringify({ journey, details });
export function startBooking(journey: JourneyOption, count: number): BookingFlow {
  return { phase: 'selected', journey, details: createBookingDetails(count), reviewKey: null, reference: null };
}
export function beginBooking(flow: BookingFlow): BookingFlow {
  return flow.phase === 'selected' ? { ...flow, phase: 'collecting' } : flow;
}
export function updateBooking(flow: BookingFlow, details: BookingDetails): BookingFlow {
  if (flow.phase === 'payment' || flow.phase === 'completed') return flow;
  return { ...flow, details, phase: nextBookingQuestion(details) ? 'collecting' : 'review', reviewKey: nextBookingQuestion(details) ? null : reviewFingerprint(flow.journey, details) };
}

export function applyBookingReply(flow: BookingFlow, updates: BookingUpdates, needsClarification: boolean): BookingFlow {
  if (flow.phase === 'payment' || flow.phase === 'completed') return flow;
  const next = updateBooking(flow, mergeBookingDetails(flow.details, updates));
  // A follow-up question must not discard the details already supplied.
  return needsClarification ? { ...next, phase: 'collecting', reviewKey: null } : next;
}

/** Only an unambiguous reply AFTER the exact review was shown can finish. */
export function explicitBookingConfirmation(text: string): boolean {
  const normalized = text.toLowerCase().trim().replace(/[.!]+$/, '').replace(/\s+/g, ' ');
  if (/\b(?:not|don't|do not|if|but|change|later|tomorrow)\b|\?$/.test(normalized)) return false;
  return /^(?:yes|yes please|yep|sure|okay|ok|confirm|confirmed|conform|looks good|sounds good|all good|perfect|proceed|continue|go ahead|let's do it|please proceed|please confirm|just confirm|just book it|book now|pay and book|conform booking|confirm (?:the |my )?booking|yes[, ]+(?:please[, ]+)?(?:confirm (?:the |my )?booking|book (?:it|this journey)|go ahead and book(?: it)?)|go ahead and book(?: it)?|book (?:it|this journey)|haan[, ]+book kar do)$/.test(normalized);
}
export function confirmBooking(flow: BookingFlow, text: string, reference: string): BookingFlow {
  if (flow.phase !== 'review' || !explicitBookingConfirmation(text) || nextBookingQuestion(flow.details) || flow.reviewKey !== reviewFingerprint(flow.journey, flow.details)) return flow;
  return { ...flow, phase: 'payment', reference };
}
export function completePayment(flow: BookingFlow): BookingFlow {
  return flow.phase === 'payment' ? { ...flow, phase: 'completed' } : flow;
}

export function pickJourney(outcome: SearchOutcome, action: ChatAction): JourneyOption | null {
  const primary = [...outcome.options, ...outcome.indirectOptions];
  const all = [...primary, ...outcome.otherOptions];
  const journey = action.journeyId === 'recommended'
    ? primary.find((item) => item.recommendationType === 'BEST_OVERALL' && item.classOption.status === 'CONFIRMED') ?? primary.find((item) => item.classOption.status === 'CONFIRMED')
    : all.find((item) => item.id === action.journeyId || item.classChoices?.some((choice) => choice.id === action.journeyId));
  if (!journey) return null;
  const choice = journey.classChoices?.find((item) => action.classCode ? item.classOption.code === action.classCode : item.id === action.journeyId);
  if (action.classCode && action.classCode !== journey.classOption.code && !choice) return null;
  return choice ? applyClassChoice(journey, choice) : journey;
}

export function bookingPrompt(flow: BookingFlow): string {
  if (flow.phase === 'completed') return 'Your journey summary is ready. You can also ask me about cabs, food delivery, luggage assistance or parcel services for this trip.';
  if (flow.phase === 'payment') return 'Everything is confirmed. Choose a payment method on the right to complete the booking flow.';
  return nextBookingQuestion(flow.details) ?? 'Please check the final journey, travellers, contact details and total on the right. When it looks right, say “book it”, “confirm”, “looks good”, or tell me what to change.';
}

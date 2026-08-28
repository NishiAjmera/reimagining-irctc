import { hasRoadConnection, railConnectionsFor, travelLocations } from '@/lib/data/locations';
import type { JourneyIntent } from '@/types/journey';
import { readWorkflow, type WorkflowContext, type ChatAction, type BookingUpdates } from './bookingFlow';

export type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string };
export type IntentPatch = { [K in keyof JourneyIntent]?: JourneyIntent[K] | null };
export type ChatRequest = { conversationId: string; messages: ChatMessage[]; draft: JourneyIntent; resultContext?: string; workflow?: WorkflowContext };
export type ChatReply = {
  message: string;
  patch: IntentPatch;
  missingFields: string[];
  readyToSearch: boolean;
  needsClarification?: boolean;
  suggestions: string[];
  action?: ChatAction;
  bookingUpdates?: BookingUpdates;
};

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_HISTORY_MESSAGES = 16;
export const MAX_HISTORY_CHARACTERS = 12000;

export function indiaToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function emptyJourneyDraft(): JourneyIntent {
  return { originCity: '', destinationCity: '', preferredDate: '', passengerCount: 0, flexibilityDays: 0, seniorTraveller: false, confirmedOnly: false, comfortPreference: 'any', rankingPriority: 'best' };
}

const locationNames = travelLocations.map(({ name }) => name);
export const intentProperties = {
  originCity: { type: ['string', 'null'], enum: [...locationNames, null] },
  destinationCity: { type: ['string', 'null'], enum: [...locationNames, null] },
  originRailCity: { type: ['string', 'null'], enum: [...locationNames, null] },
  destinationRailCity: { type: ['string', 'null'], enum: [...locationNames, null] },
  preferredDate: { type: ['string', 'null'], description: 'Departure date YYYY-MM-DD. Never guess an unknown date.' },
  passengerCount: { type: ['integer', 'null'], minimum: 1, maximum: 8 },
  flexibilityDays: { type: ['integer', 'null'], minimum: 0, maximum: 3 },
  arrivalBefore: { type: ['string', 'null'], description: '24-hour HH:mm arrival deadline, not departure time.' },
  arrivalDate: { type: ['string', 'null'], description: 'Explicit arrival deadline date YYYY-MM-DD; not the departure date.' },
  departureAfter: { type: ['string', 'null'], description: '24-hour HH:mm earliest departure.' },
  preferredClass: { type: ['string', 'null'], enum: ['1A', '2A', '3A', '3E', 'CC', 'SL', '2S', null] },
  budgetMax: { type: ['number', 'null'], minimum: 1, maximum: 100000 },
  seniorTraveller: { type: ['boolean', 'null'] },
  confirmedOnly: { type: ['boolean', 'null'] },
  comfortPreference: { type: ['string', 'null'], enum: ['any', 'comfortable', 'budget', null] },
  rankingPriority: { type: ['string', 'null'], enum: ['best', 'confirmation', 'price', 'duration', 'arrival', null] },
  journeyMode: { type: ['string', 'null'], enum: ['train_only', 'complete', null] },
} as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Validate both model patches and client fields. Unknown properties never reach search. */
export function validatePatch(value: unknown): IntentPatch {
  if (!isRecord(value)) throw new Error('Invalid itinerary');
  const patch: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(value)) {
    if (!(key in intentProperties) || !Object.hasOwn(intentProperties, key)) throw new Error('Unknown itinerary field');
    if (field === null) { patch[key] = null; continue; }
    const schema = intentProperties[key as keyof typeof intentProperties];
    const expected = schema.type[0];
    if (expected === 'integer' ? !Number.isInteger(field) : typeof field !== expected) throw new Error('Invalid itinerary field');
    if ('enum' in schema && !(schema.enum as readonly unknown[]).includes(field)) throw new Error('Unsupported itinerary value');
    if (typeof field === 'number' && (!Number.isFinite(field) || ('minimum' in schema && field < schema.minimum) || ('maximum' in schema && field > schema.maximum))) throw new Error('Itinerary value out of range');
    if ((key === 'preferredDate' || key === 'arrivalDate') && !validDate(field as string)) throw new Error('Invalid travel date');
    if ((key === 'arrivalBefore' || key === 'departureAfter') && !/^([01]\d|2[0-3]):[0-5]\d$/.test(field as string)) throw new Error('Invalid travel time');
    patch[key] = field;
  }
  return patch as IntentPatch;
}

export function applyIntentPatch(draft: JourneyIntent, patch: IntentPatch): JourneyIntent {
  const next = { ...draft };
  const defaults = emptyJourneyDraft();
  for (const key of Object.keys(patch) as (keyof JourneyIntent)[]) {
    const value = patch[key];
    if (value === null) {
      delete next[key];
      if (key in defaults) Object.assign(next, { [key]: defaults[key] });
    } else if (value !== undefined) Object.assign(next, { [key]: value });
  }
  for (const side of ['origin', 'destination'] as const) {
    const city = next[`${side}City`];
    const railKey = `${side}RailCity` as const;
    if (!railConnectionsFor(city).some(({ railCity }) => railCity === next[railKey])) delete next[railKey];
  }
  return next;
}

export function missingJourneyFields(draft: JourneyIntent, today = indiaToday()): string[] {
  const missing: string[] = [];
  if (!locationNames.includes(draft.originCity)) missing.push('originCity');
  if (!locationNames.includes(draft.destinationCity) || draft.destinationCity === draft.originCity) missing.push('destinationCity');
  if (!validDate(draft.preferredDate) || draft.preferredDate < today) missing.push('preferredDate');
  if (!Number.isInteger(draft.passengerCount) || draft.passengerCount < 1 || draft.passengerCount > 8) missing.push('passengerCount');
  if ((hasRoadConnection(draft.originCity) || hasRoadConnection(draft.destinationCity)) && !draft.journeyMode) missing.push('journeyMode');
  if (draft.arrivalDate && draft.preferredDate && draft.arrivalDate < draft.preferredDate) missing.push('arrivalDate');
  try { validateDraft(draft); } catch { missing.push('preferences'); }
  return missing;
}

export function validateDraft(value: unknown): JourneyIntent {
  if (!isRecord(value)) throw new Error('Invalid trip details');
  // Empty form fields are valid while the user is still planning.
  const fields = { ...value };
  for (const key of Object.keys(fields)) if (fields[key] === undefined) delete fields[key];
  for (const key of ['originCity', 'destinationCity', 'preferredDate']) if (fields[key] === '') delete fields[key];
  if (fields.passengerCount === 0) delete fields.passengerCount;
  return applyIntentPatch(emptyJourneyDraft(), validatePatch(fields));
}

export function boundedHistory(messages: ChatMessage[]) {
  const selected: ChatMessage[] = [];
  let length = 0;
  for (const message of messages.slice(-MAX_HISTORY_MESSAGES).reverse()) {
    if (length + message.text.length > MAX_HISTORY_CHARACTERS) break;
    selected.unshift(message);
    length += message.text.length;
  }
  return selected;
}

export function validateChatRequest(value: unknown): ChatRequest {
  if (!isRecord(value) || typeof value.conversationId !== 'string' || !/^[a-zA-Z0-9-]{10,80}$/.test(value.conversationId) || !Array.isArray(value.messages) || !value.messages.length || value.messages.length > MAX_HISTORY_MESSAGES) throw new Error('Invalid conversation');
  const messages = value.messages.map((message): ChatMessage => {
    if (!isRecord(message) || !['user', 'assistant'].includes(String(message.role)) || typeof message.text !== 'string' || !message.text.trim() || message.text.length > MAX_MESSAGE_LENGTH) throw new Error('Invalid message');
    return { id: '', role: message.role as ChatMessage['role'], text: message.text.trim() };
  });
  if (messages.at(-1)?.role !== 'user' || messages.reduce((length, message) => length + message.text.length, 0) > MAX_HISTORY_CHARACTERS) throw new Error('Conversation too long');
  if (value.resultContext !== undefined && (typeof value.resultContext !== 'string' || value.resultContext.length > 6000)) throw new Error('Invalid result context');
  return { conversationId: value.conversationId, messages, draft: validateDraft(value.draft), workflow: readWorkflow(value.workflow), ...(typeof value.resultContext === 'string' ? { resultContext: value.resultContext } : {}) };
}

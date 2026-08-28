import type { AssistanceStop } from './travelServices';

// Prototype-only pricing and fictional assignments. No provider or payment API.
export const SAMPLE_BAG_RATE = 80;
export const MAX_ASSISTANCE_BAGS = 8;
export type LuggageSelection = Record<string, { selected: boolean; bags: number }>;
export type LuggageQuote = { stop: AssistanceStop; bags: number; amount: number };
export type MockLuggageBooking = {
  sample: true;
  total: number;
  assignments: Array<LuggageQuote & { porterName: string; meetingPoint: string; meetingTime: string }>;
};

export function supportsLuggageAssistance(stop: AssistanceStop) {
  return !stop.nextStation || stop.nextStation.code === stop.station.code;
}

export function initialLuggageSelection(stops: AssistanceStop[]): LuggageSelection {
  return Object.fromEntries(stops.map((stop) => [stop.id, { selected: stop.id === 'boarding', bags: 2 }]));
}

export function luggageQuote(stops: AssistanceStop[], selection: LuggageSelection): LuggageQuote[] {
  return stops.filter((stop) => selection[stop.id]?.selected && supportsLuggageAssistance(stop)).map((stop) => {
    const bags = selection[stop.id].bags;
    if (!Number.isInteger(bags) || bags < 1 || bags > MAX_ASSISTANCE_BAGS) throw new Error('Choose between 1 and 8 bags.');
    return { stop, bags, amount: bags * SAMPLE_BAG_RATE };
  });
}

export function createMockLuggageBooking(stops: AssistanceStop[], selection: LuggageSelection): MockLuggageBooking {
  const quote = luggageQuote(stops, selection);
  if (!quote.length) throw new Error('Select at least one station.');
  const names = ['Rakesh Sharma', 'Amit Verma', 'Suresh Kumar', 'Vijay Singh'];
  const assignments = quote.map((item) => {
    const index = stops.findIndex((stop) => stop.id === item.stop.id);
    const departure = item.stop.id === 'boarding';
    return {
      ...item,
      // Snapshot the stop so later edits cannot change an existing confirmation.
      stop: { ...item.stop, station: { ...item.stop.station } },
      porterName: names[index % names.length],
      meetingPoint: departure ? 'Main entrance, beside the enquiry board' : 'On the arrival platform, beside the footbridge sign',
      meetingTime: new Date(Date.parse(item.stop.time) - (departure ? 30 * 60_000 : 0)).toISOString(),
    };
  });
  return { sample: true, total: assignments.reduce((total, item) => total + item.amount, 0), assignments };
}

import { describe, expect, it } from 'vitest';
import { rankJourneys } from '@/lib/ranking/rankJourneys';
import { LocalIntentParser } from '@/lib/intent/localParser';
import { applyClassChoice } from '@/components/journey/JourneyClassPicker';
import { itineraryOverview, itinerarySegments } from './itinerary';

const intent = new LocalIntentParser().parse('Khategaon to Mandawa next Friday with a bus for 3 passengers');

describe('complete itinerary presentation', () => {
  it('orders bus, train and onward bus with full town-to-town endpoints', () => {
    const journey = rankJourneys(intent).options[0];
    const trip = itineraryOverview(journey);
    expect(trip.segments.map(segment => segment.mode)).toEqual(['bus', 'train', 'bus']);
    expect(trip.origin).toBe('Khategaon');
    expect(trip.destination).toBe('Mandawa');
    expect(trip.changes).toBe(2);
    expect(trip.departure).toBe(journey.roadLegs?.[0].departureDateTime);
    expect(trip.arrival).toBe(journey.roadLegs?.[1].arrivalDateTime);
    expect(trip.durationMinutes).toBe(journey.doorToDoorDurationMinutes);
    expect((Date.parse(trip.segments[1].departure) - Date.parse(trip.segments[0].arrival)) / 60000).toBe(75);
    expect((Date.parse(trip.segments[2].departure) - Date.parse(trip.segments[1].arrival)) / 60000).toBe(45);
  });

  it('preserves both buses and the complete fare when changing train class', () => {
    const journey = rankJourneys(intent).options[0];
    const selected = applyClassChoice(journey, journey.classChoices![0]);
    expect(itinerarySegments(selected).map(segment => segment.mode)).toEqual(['bus', 'train', 'bus']);
    const roadFare = selected.roadLegs!.reduce((sum, leg) => sum + leg.farePerTraveller, 0);
    expect(selected.totalFare).toBe((selected.classOption.fare + roadFare) * intent.passengerCount);
    expect(itinerarySegments(selected)[1].train?.classOption.code).toBe(selected.classOption.code);
  });

  it('does not add buses or empty placeholders in train-only mode', () => {
    const journey = rankJourneys({ ...intent, journeyMode: 'train_only' }).options[0];
    expect(itinerarySegments(journey).map(segment => segment.mode)).toEqual(['train']);
    expect(itineraryOverview(journey)).toMatchObject({ origin: 'Harda', destination: 'Jaipur', changes: 0 });
  });

  it('includes both train legs in connecting town-to-town journeys', () => {
    const journey = rankJourneys(intent).indirectOptions[0];
    expect(itinerarySegments(journey).map(segment => segment.mode)).toEqual(['bus', 'train', 'train', 'bus']);
    expect(itineraryOverview(journey).changes).toBe(3);
  });

  it('counts cross-midnight travel using full timestamps, not clock times', () => {
    const journey = rankJourneys(intent).options[0];
    const trip = itineraryOverview({ ...journey, roadLegs: undefined, legs: undefined, departureDateTime: '2026-08-28T22:00:00+05:30', arrivalDateTime: '2026-08-29T06:00:00+05:30' });
    expect(trip.durationMinutes).toBe(480);
    expect(Date.parse(trip.arrival)).toBeGreaterThan(Date.parse(trip.departure));
  });
});

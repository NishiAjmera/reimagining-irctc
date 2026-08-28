import type { JourneyOption, Station } from '@/types/journey';
import { itinerarySegments, journeyClock, journeyDate } from './itinerary';

// Official handoff destinations. Do not append passenger details or sample PNRs.
export const travelServiceLinks = {
  ola: 'https://book.olacabs.com/',
  uber: 'https://m.uber.com/',
  swiggy: 'https://www.swiggy.com/order-food-online-in-train',
  railwayParcel: 'https://parcel.indianrail.gov.in/',
  porterGoods: 'https://porter.in/services',
  railwayEnquiries: 'tel:139',
} as const;

export type AssistanceStop = {
  id: string;
  label: string;
  station: Station;
  time: string;
  trainNumber: string;
  nextTrainNumber?: string;
  nextStation?: Station;
};

export function travelServiceContext(journey: JourneyOption) {
  const segments = itinerarySegments(journey);
  const trains = segments.flatMap((segment) => segment.train ? [segment.train] : []);
  const first = trains[0];
  const last = trains[trains.length - 1];
  const stops: AssistanceStop[] = [
    { id: 'boarding', label: 'Boarding', station: first.departureStation, time: first.departureDateTime, trainNumber: first.trainNumber },
    ...trains.slice(0, -1).map((train, index) => ({
      id: `transfer-${index}`, label: 'Train change', station: train.arrivalStation,
      time: train.arrivalDateTime, trainNumber: train.trainNumber,
      nextTrainNumber: trains[index + 1].trainNumber, nextStation: trains[index + 1].departureStation,
    })),
    { id: 'arrival', label: 'Arrival', station: last.arrivalStation, time: last.arrivalDateTime, trainNumber: last.trainNumber },
  ];
  const finalSegment = segments[segments.length - 1];
  const cabStops = [
    { id: 'station-arrival', label: 'From arrival station', location: `${last.arrivalStation.name}, ${last.arrivalStation.city}`, time: last.arrivalDateTime, field: 'Pickup' },
    { id: 'station-departure', label: 'To boarding station', location: `${first.departureStation.name}, ${first.departureStation.city}`, time: first.departureDateTime, field: 'Drop-off' },
  ];
  if (finalSegment.bus) cabStops.unshift({ id: 'final-stop', label: 'After the onward bus', location: finalSegment.destination, time: finalSegment.arrival, field: 'Pickup' });
  return { trains, stops, cabStops, defaultAssistanceId: stops.find((stop) => stop.nextTrainNumber)?.id ?? 'boarding' };
}

export function assistanceSummary(stop: AssistanceStop, bags: number) {
  const transfer = stop.nextTrainNumber
    ? `Train ${stop.trainNumber} → ${stop.nextTrainNumber}${stop.nextStation?.code !== stop.station.code ? ` at ${stop.nextStation?.name}` : ''}`
    : `Train ${stop.trainNumber}`;
  return `${stop.station.name} (${stop.station.code})\n${journeyDate(stop.time)} · ${journeyClock(stop.time)} IST\n${transfer}\n${bags} ${bags === 1 ? 'bag' : 'bags'}\nPlease confirm platforms and the assistance charge at the station.`;
}

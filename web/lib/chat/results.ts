import type { SearchOutcome } from '@/types/journey';

/** Only journey facts go to Gemini. Never include booking/contact/payment state. */
export function chatResultContext(outcome: SearchOutcome, source: 'sample' | 'railradar') {
  const options = [...outcome.options, ...outcome.otherOptions, ...outcome.indirectOptions].slice(0, 5).map((journey) => ({
    train: `${journey.trainName} #${journey.trainNumber}`,
    from: journey.departureStation.name, to: journey.arrivalStation.name,
    departure: journey.departureDateTime, arrival: journey.arrivalDateTime,
    durationMinutes: journey.durationMinutes, totalFare: journey.totalFare,
    class: journey.classOption.code, availability: journey.classOption.status, position: journey.classOption.position,
    classes: journey.classChoices?.map(({ classOption }) => ({ class: classOption.code, farePerTraveller: classOption.fare, availability: classOption.status, position: classOption.position })),
    transferMinutes: journey.transfer?.durationMinutes,
    legs: journey.legs?.map((leg) => ({ train: leg.trainName, from: leg.departureStation.name, to: leg.arrivalStation.name, departure: leg.departureDateTime, arrival: leg.arrivalDateTime })),
    buses: journey.roadLegs?.map((leg) => ({ from: leg.originName, to: leg.destinationName, departure: leg.departureDateTime, arrival: leg.arrivalDateTime, transferMinutes: leg.transferBufferMinutes })),
  }));
  const wrap = () => JSON.stringify({ source, notice: source === 'sample' ? 'Planning estimates, not live inventory.' : 'Timetables from RailRadar; fares and availability are estimates.', options });
  while (wrap().length > 6000) options.pop();
  return wrap();
}

import type { JourneyLeg, JourneyOption, RoadLeg} from '@/types/journey';

export type ItinerarySegment = {
  id:string; mode:'bus'|'train'; origin:string; destination:string;
  departure:string; arrival:string; label:string; bus?:RoadLeg; train?:JourneyLeg;
};

export function itinerarySegments(journey:JourneyOption):ItinerarySegment[] {
  const buses=journey.roadLegs??[];
  const trains:JourneyLeg[]=journey.legs?.length?journey.legs:[{...journey}];
  return [
    ...buses.filter(leg=>leg.direction==='to_station').map(busSegment),
    ...trains.map((leg):ItinerarySegment=>({id:leg.id,mode:'train',label:`${leg.trainName} #${leg.trainNumber}`,origin:`${leg.departureStation.name} (${leg.departureStation.code})`,destination:`${leg.arrivalStation.name} (${leg.arrivalStation.code})`,departure:leg.departureDateTime,arrival:leg.arrivalDateTime,train:leg})),
    ...buses.filter(leg=>leg.direction==='from_station').map(busSegment),
  ];
}
function busSegment(leg:RoadLeg):ItinerarySegment {
  return {id:leg.id,mode:'bus',origin:leg.originName,destination:leg.destinationName,departure:leg.departureDateTime,arrival:leg.arrivalDateTime,label:`${leg.operator} · ${leg.coachType}`,bus:leg};
}
export function itineraryOverview(journey:JourneyOption) {
  const segments=itinerarySegments(journey); const first=segments[0]; const last=segments[segments.length-1];
  return {segments,departure:first.departure,arrival:last.arrival,origin:first.bus?first.origin.replace(/ Bus Stand$/,''):journey.departureStation.city,destination:last.bus?last.destination.replace(/ Bus Stand$/,''):journey.arrivalStation.city,durationMinutes:Math.round((Date.parse(last.arrival)-Date.parse(first.departure))/60000),changes:segments.length-1};
}
export const journeyClock=(iso:string)=>new Intl.DateTimeFormat('en-IN',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(iso));
export const journeyDate=(iso:string)=>new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Kolkata'}).format(new Date(iso));
export const journeyDuration=(minutes:number)=>minutes<60?`${minutes}m`:`${Math.floor(minutes/60)}h${minutes%60?` ${minutes%60}m`:''}`;

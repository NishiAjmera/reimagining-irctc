import {ArrowRight,BusFront,Clock3,TrainFront} from 'lucide-react';
import type {JourneyOption} from '@/types/journey';
import {itineraryOverview,journeyClock,journeyDate,journeyDuration} from '@/lib/journey/itinerary';
import {StationInlineInfo} from './StationInlineInfo';

export function JourneyTimeline({journey,expanded=false}:{journey:JourneyOption;expanded?:boolean}) {
  const trip=itineraryOverview(journey);
  const overnight=journeyDate(trip.departure)!==journeyDate(trip.arrival);
  return <div className="compact-itinerary">
    <div className="itinerary-overview">
      <div><strong>{journeyClock(trip.departure)}</strong><b>{trip.origin}</b><small>{journeyDate(trip.departure)}</small></div>
      <div className="itinerary-duration"><span><Clock3 size={13}/>{journeyDuration(trip.durationMinutes)} total</span><ArrowRight size={22}/><small>{trip.changes?`${trip.changes} ${trip.changes===1?'change':'changes'}`:'Direct'}{overnight?' · Overnight':''}</small></div>
      <div className="itinerary-arrival"><strong>{journeyClock(trip.arrival)}</strong><b>{trip.destination}</b><small>{journeyDate(trip.arrival)}</small></div>
    </div>
    {trip.segments.length>1||expanded?<ol className="itinerary-segments" aria-label="Journey in travel order">
      {trip.segments.map((segment,index)=>{
        const next=trip.segments[index+1]; const buffer=next?Math.round((Date.parse(next.departure)-Date.parse(segment.arrival))/60000):0;
        return <li key={`${segment.mode}-${segment.id}`}>
          <div className={`itinerary-segment ${segment.mode}`}><span className="segment-mode">{segment.mode==='bus'?<BusFront size={16}/>:<TrainFront size={16}/>}<small>{segment.mode==='bus'?'Bus':segment.train?.classOption.code}</small></span><div className="segment-route"><strong>{segment.origin} <span>→</span> {segment.destination}</strong><small>{segment.mode==='bus'?segment.bus?.coachType:segment.train?.trainName}</small></div><div className="segment-times"><strong>{journeyClock(segment.departure)}–{journeyClock(segment.arrival)}</strong><small>{journeyDate(segment.departure)}{journeyDate(segment.departure)!==journeyDate(segment.arrival)?` → ${journeyDate(segment.arrival)}`:''}</small></div></div>
          {expanded?<div className="segment-extra">{segment.bus?<p>{segment.label} · {segment.bus.availableSeats} seats shown · ₹{segment.bus.farePerTraveller.toLocaleString('en-IN')} / traveller · Luggage included</p>:segment.train?<><p>#{segment.train.trainNumber} · {segment.train.classOption.name} · {segment.train.classOption.status==='CONFIRMED'?'Confirmed':`${segment.train.classOption.status==='RAC'?'RAC':'WL'} ${segment.train.classOption.position??''}`}</p><div className="segment-stations"><div><small>{segment.train.departureStation.name}</small><StationInlineInfo station={segment.train.departureStation} trainNumber={segment.train.trainNumber} direction="departure"/></div><div><small>{segment.train.arrivalStation.name}</small><StationInlineInfo station={segment.train.arrivalStation} trainNumber={segment.train.trainNumber} direction="arrival"/></div></div></>:null}</div>:null}
          {next?<div className={`itinerary-transfer ${buffer<45?'tight':''}`}><Clock3 size={11}/><span>{journeyDuration(buffer)} to {next.mode==='train'?'board the train':'board the onward bus'}{buffer<45?' · Tight connection':''}</span></div>:null}
        </li>;
      })}
    </ol>:<p className="direct-station-caption">{journey.departureStation.name} ({journey.departureStation.code}) → {journey.arrivalStation.name} ({journey.arrivalStation.code})</p>}
  </div>;
}

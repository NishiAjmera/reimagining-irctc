'use client';

import { ArrowRight, Check, Clock3, MapPin, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import type { JourneyLeg, JourneyOption } from '@/types/journey';
import { TermTip } from '@/components/railway/TermTip';
import { applyClassChoice, JourneyClassPicker } from './JourneyClassPicker';
import { StationInlineInfo } from './StationInlineInfo';
import { RoadConnectionStrip } from './RoadConnectionStrip';

export function IndirectJourneyCard({ journey, onChoose }: { journey: JourneyOption; onChoose: (journey: JourneyOption) => void }) {
  const [selectedClassId, setSelectedClassId] = useState(journey.id);
  const selectedChoice = journey.classChoices?.find((choice) => choice.id === selectedClassId);
  const activeJourney = selectedChoice ? applyClassChoice(journey, selectedChoice) : journey;
  const legs = activeJourney.legs ?? [];
  const status = activeJourney.classOption.status;
  const statusText = status === 'CONFIRMED' ? 'Confirmed on both legs' : status === 'RAC' ? `RAC ${activeJourney.classOption.position}` : `WL ${activeJourney.classOption.position}`;

  return <article className="indirect-card" aria-labelledby={`journey-${journey.id}`}>
    <div className="indirect-card-head"><div><span>1 change</span><h3 id={`journey-${journey.id}`}>Via {journey.transfer?.station.city}</h3></div><div><strong>{formatDuration(journey.durationMinutes)}</strong><small>Total journey</small></div></div>
    <RoadConnectionStrip journey={activeJourney} direction="to_station" />
    <div className="indirect-summary"><span>{formatClock(journey.departureDateTime)} <b>{journey.departureStation.code}</b></span><i /><span>{formatClock(journey.arrivalDateTime)} <b>{journey.arrivalStation.code}</b></span></div>
    <div className="indirect-legs">
      {legs.map((leg, index) => <div key={`${leg.id}-${index}`}>
        <Leg leg={leg} number={index + 1} />
        {index === 0 && journey.transfer ? <div className="transfer-row"><MapPin size={15} /><span>Change at <b>{journey.transfer.station.name}</b></span><strong>{formatDuration(journey.transfer.durationMinutes)} transfer</strong></div> : null}
      </div>)}
    </div>
    <RoadConnectionStrip journey={activeJourney} direction="from_station" />
    <div className="indirect-class-picker"><JourneyClassPicker journey={journey} selectedId={activeJourney.id} onSelect={(choice) => setSelectedClassId(choice.id)} /></div>
    <div className="indirect-footer"><div className="indirect-facts"><span><small>Class</small><strong><TermTip code={activeJourney.classOption.code} /></strong></span><span><small>Total fare</small><strong>₹{activeJourney.totalFare.toLocaleString('en-IN')}</strong></span><span><small>Availability</small><strong className={`status ${status.toLowerCase()}`}>{status === 'CONFIRMED' ? <Check size={15} /> : <TriangleAlert size={15} />}{statusText}</strong></span></div><button className="choose-button" type="button" onClick={() => onChoose(activeJourney)}>Choose connection <ArrowRight size={17} /></button></div>
  </article>;
}

function Leg({ leg, number }: { leg: JourneyLeg; number: number }) {
  const status = leg.classOption.status === 'CONFIRMED' ? 'Confirmed' : leg.classOption.status === 'RAC' ? `RAC ${leg.classOption.position}` : `WL ${leg.classOption.position}`;
  return <div className="indirect-leg"><span className="leg-number">{number}</span><div className="leg-train"><strong>{leg.trainName}</strong><small>#{leg.trainNumber} · {leg.classOption.code} · {status}</small></div><div className="leg-time"><strong>{formatClock(leg.departureDateTime)}</strong><small>{formatDate(leg.departureDateTime)} · {leg.departureStation.code}</small><StationInlineInfo station={leg.departureStation} trainNumber={leg.trainNumber} direction="departure" /></div><div className="leg-line"><Clock3 size={12} /><span>{formatDuration(leg.durationMinutes)}</span></div><div className="leg-time arrival"><strong>{formatClock(leg.arrivalDateTime)}</strong><small>{formatDate(leg.arrivalDateTime)} · {leg.arrivalStation.code}</small><StationInlineInfo station={leg.arrivalStation} trainNumber={leg.trainNumber} direction="arrival" /></div></div>;
}

const formatClock = (iso: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(iso));
const formatDate = (iso: string) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

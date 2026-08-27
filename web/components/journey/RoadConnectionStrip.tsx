import { ArrowRight, BusFront, Clock3, Luggage, Users } from 'lucide-react';
import type { JourneyOption, RoadLeg } from '@/types/journey';

export function RoadConnectionStrip({ journey, compact = false, direction }: { journey: JourneyOption; compact?: boolean; direction?: RoadLeg['direction'] }) {
  const legs = direction ? journey.roadLegs?.filter((leg) => leg.direction === direction) : journey.roadLegs;
  if (!legs?.length) return null;
  return <div className={`road-connections ${compact ? 'compact' : ''}`}>
    {legs.map((leg) => <RoadLegRow key={leg.id} leg={leg} compact={compact} />)}
  </div>;
}

function RoadLegRow({ leg, compact }: { leg: RoadLeg; compact: boolean }) {
  const connectionCopy = leg.direction === 'to_station' ? `${leg.transferBufferMinutes} min before train` : `${leg.transferBufferMinutes} min after arrival`;
  return <section className="road-leg" aria-label={`Bus from ${leg.originName} to ${leg.destinationName}`}>
    <span className="road-leg-icon"><BusFront size={18} /></span>
    <div className="road-leg-main"><span>Bus connection</span><strong>{leg.originName} <ArrowRight size={13} /> {leg.destinationName}</strong><small>{leg.operator} · {leg.coachType}</small></div>
    <div className="road-leg-time"><strong>{formatClock(leg.departureDateTime)}–{formatClock(leg.arrivalDateTime)}</strong><small><Clock3 size={12} /> {formatDuration(leg.durationMinutes)} · {connectionCopy}</small></div>
    {!compact ? <div className="road-leg-meta"><span><Users size={13} /> {leg.availableSeats} seats</span><span><Luggage size={13} /> Luggage included</span><strong>₹{leg.farePerTraveller.toLocaleString('en-IN')}</strong></div> : null}
  </section>;
}

const formatClock = (iso: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(iso));
const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

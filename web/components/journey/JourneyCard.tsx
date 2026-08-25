'use client';

import { ArrowRight, Check, ChevronDown, Clock3, IndianRupee, MapPin, Sparkles, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { track } from '@/lib/analytics';
import { recommendationSummary } from '@/lib/explanation/recommendation';
import type { JourneyIntent, JourneyOption } from '@/types/journey';
import { TermTip } from '@/components/railway/TermTip';

const badgeCopy = {
  BEST_OVERALL: ['Recommended', 'Best overall'], CHEAPEST: ['Save ₹850', 'Budget choice'],
  BEST_AVAILABILITY: ['Strong availability', 'Most certain'], FASTEST: ['Fastest', 'Shortest journey'],
  ALTERNATIVE_DATE: ['Leave one day earlier', 'Best availability'],
} as const;

export function JourneyCard({ journey, intent, index, onChoose }: { journey: JourneyOption; intent: JourneyIntent; index: number; onChoose: (journey: JourneyOption) => void }) {
  const [whyOpen, setWhyOpen] = useState(index === 0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [badge, title] = badgeCopy[journey.recommendationType];
  const status = journey.classOption.status;
  const statusText = status === 'CONFIRMED' ? 'Confirmed' : status === 'RAC' ? `RAC ${journey.classOption.position}` : `WL ${journey.classOption.position}`;
  const confidenceLabel = journey.classOption.confidence >= 95 ? 'Very high' : journey.classOption.confidence >= 82 ? 'High' : journey.classOption.confidence >= 70 ? 'Moderate' : 'Low';
  const cheapest = journey.recommendationType === 'CHEAPEST';
  const matchScore = Math.max(42, Math.min(98, Math.round(60 + (journey.score - 80) * 0.6)));

  return (
    <article className={`journey-card ${index === 0 ? 'featured' : ''}`} aria-labelledby={`journey-${journey.id}`}>
      <div className="card-ribbon"><span>{badge}</span><span>Option {index + 1}</span></div>
      <div className="journey-card-body">
        <div className="train-title-row">
          <div><p className="option-title">{title}</p><h3 id={`journey-${journey.id}`}>{journey.trainName}</h3><span className="train-number">#{journey.trainNumber}</span></div>
          <div className="match-score" aria-label={`${matchScore} percent preference match`}><strong>{matchScore}%</strong><span>match</span></div>
        </div>

        <div className="route-timeline">
          <div className="time-block"><strong>{formatClock(journey.departureDateTime)}</strong><span>{formatDate(journey.departureDateTime)}</span><b>{journey.departureStation.code}</b><small>{journey.departureStation.name}</small></div>
          <div className="duration-line"><span><Clock3 size={13} /> {formatDuration(journey.durationMinutes)}</span><i /><em>{journey.tags.includes('overnight') ? 'Overnight' : 'Day journey'}</em></div>
          <div className="time-block arrival"><strong>{formatClock(journey.arrivalDateTime)}</strong><span>{formatDate(journey.arrivalDateTime)}</span><b>{journey.arrivalStation.code}</b><small>{journey.arrivalStation.name}</small></div>
        </div>

        <div className="journey-metrics">
          <div><span>Class</span><strong><TermTip code={journey.classOption.code} /></strong><small>{journey.classOption.name}</small></div>
          <div><span>Fare / traveller</span><strong>₹{journey.classOption.fare.toLocaleString('en-IN')}</strong><small>₹{journey.totalFare.toLocaleString('en-IN')} total</small></div>
          <div><span>Availability</span><strong className={`status ${status.toLowerCase()}`}>{status === 'CONFIRMED' ? <Check size={16} /> : <TriangleAlert size={16} />}{statusText}</strong><small>{confidenceLabel} confirmation confidence</small></div>
        </div>

        <div className="reason-strip"><Sparkles size={18} aria-hidden="true" /><p><strong>Why this works</strong>{journey.reasons.slice(0, 3).join(' · ')}</p></div>
        {journey.tradeoffs.length ? <div className="tradeoff-strip"><span>Trade-off</span><p>{cheapest ? `You save ₹850 per traveller, but travel without AC and the overnight journey may be less comfortable for your mother.` : journey.tradeoffs[0]}</p></div> : null}

        <div className="card-actions">
          <button type="button" className="why-button" onClick={() => { setWhyOpen((value) => !value); track('recommendation_explanation_opened', { journeyId: journey.id }); }} aria-expanded={whyOpen}>Why this one? <ChevronDown size={16} /></button>
          <button type="button" className="choose-button" onClick={() => onChoose(journey)}>{cheapest ? 'Choose budget option' : journey.recommendationType === 'ALTERNATIVE_DATE' ? 'Choose Thursday option' : 'Choose this journey'} <ArrowRight size={17} /></button>
        </div>

        {whyOpen ? <div className="why-panel"><p>{recommendationSummary(journey, intent)}</p><ul>{journey.reasons.map((reason) => <li key={reason}><Check size={16} /> {reason}</li>)}</ul><div className="score-detail"><span>Transparent score</span><span>Timing {journey.scoreBreakdown.arrival > 0 ? '+' : ''}{journey.scoreBreakdown.arrival}</span><span>Seat certainty +{journey.scoreBreakdown.availability}</span><span>Comfort {journey.scoreBreakdown.comfort >= 0 ? '+' : ''}{journey.scoreBreakdown.comfort}</span></div></div> : null}

        <button type="button" className="details-toggle" onClick={() => setDetailsOpen((value) => !value)} aria-expanded={detailsOpen}><MapPin size={15} /> Journey details and class explanation <ChevronDown size={15} /></button>
        {detailsOpen ? <div className="details-panel"><p><strong>Board at:</strong> {journey.departureStation.name}, {journey.departureStation.distanceFromCityCentreKm} km from city centre.</p><p><strong>Arrive at:</strong> {journey.arrivalStation.name}, {journey.arrivalStation.distanceFromCityCentreKm} km from city centre.</p><p><IndianRupee size={14} /> Fares are simulated and may change in a real booking flow.</p></div> : null}
      </div>
    </article>
  );
}

const formatClock = (iso: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(iso));
const formatDate = (iso: string) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

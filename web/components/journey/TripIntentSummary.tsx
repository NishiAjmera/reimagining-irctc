'use client';

import { BusFront, Check, ChevronDown, MessageCircle, Pencil, TrainFront } from 'lucide-react';
import { hasRoadConnection, railConnectionsFor, resolveRailCity } from '@/lib/data/locations';
import type { JourneyIntent, JourneyOption, RankingPriority } from '@/types/journey';

const priorityOptions: Array<[RankingPriority, string]> = [['best', 'Best overall'], ['confirmation', 'Confirmation'], ['price', 'Lowest fare'], ['duration', 'Shortest time'], ['arrival', 'Earlier arrival']];

export function TripIntentSummary({ intent, journey, onEdit, onViewConversation, onPriorityChange }: { intent: JourneyIntent; journey?: JourneyOption; onEdit?: () => void; onViewConversation?: () => void; onPriorityChange?: (next: JourneyIntent) => void }) {
  const originRail = journey?.departureStation.city ?? resolveRailCity(intent.originCity, intent.originRailCity);
  const destinationRail = journey?.arrivalStation.city ?? resolveRailCity(intent.destinationCity, intent.destinationRailCity);
  const originRoad = journey?.roadLegs?.find((leg) => leg.direction === 'to_station') ?? railConnectionsFor(intent.originCity).find((item) => item.railCity === originRail);
  const destinationRoad = journey?.roadLegs?.find((leg) => leg.direction === 'from_station') ?? railConnectionsFor(intent.destinationCity).find((item) => item.railCity === destinationRail);
  const usesRoad = hasRoadConnection(intent.originCity) || hasRoadConnection(intent.destinationCity);
  return <section className="intent-summary" aria-labelledby="intent-summary-title">
    <header><div><p className="section-label">What we understood</p><h2 id="intent-summary-title">{intent.originCity} → {intent.destinationCity}</h2></div><div className="intent-summary-actions">{onViewConversation ? <button type="button" onClick={onViewConversation}><MessageCircle size={14} /> View conversation</button> : null}{onEdit ? <button type="button" onClick={onEdit}><Pencil size={14} /> Edit trip</button> : null}</div></header>
    <div className="intent-facts"><span><b>{intent.preferredDate || 'Date needed'}</b>Date</span><span><b>{intent.passengerCount || '—'}</b>Travellers</span><span><b>{intent.seniorTraveller ? 'Yes' : 'No'}</b>Senior traveller</span><span><b>{intent.confirmedOnly ? 'Required' : 'Flexible'}</b>Confirmed seats</span><span><b>{intent.comfortPreference === 'any' ? 'Any' : intent.comfortPreference}</b>Comfort</span><span><b>{intent.journeyMode === 'train_only' ? 'Train only' : 'Nearby connections allowed'}</b>Route</span></div>
    {usesRoad ? <div className="route-choice"><span>{intent.journeyMode === 'train_only' ? <TrainFront size={16} /> : <BusFront size={16} />}</span><div><strong>{intent.journeyMode === 'train_only' ? 'Train route selected' : 'Recommended nearby-station route'}</strong><p>{routeCopy(intent, originRail, destinationRail, originRoad, destinationRoad)}</p></div>{onEdit ? <button type="button" onClick={onEdit}>Change route</button> : null}</div> : null}
    {onPriorityChange ? <details className="priority-editor"><summary>Priorities <ChevronDown size={14} /></summary><div><label>Rank first<select value={intent.rankingPriority} onChange={(event) => onPriorityChange({ ...intent, rankingPriority: event.target.value as RankingPriority })}>{priorityOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label><input type="checkbox" checked={intent.confirmedOnly} onChange={(event) => onPriorityChange({ ...intent, confirmedOnly: event.target.checked })} /><Check size={13} /> Confirmed seats only</label><label><input type="checkbox" checked={intent.seniorTraveller} onChange={(event) => onPriorityChange({ ...intent, seniorTraveller: event.target.checked })} /><Check size={13} /> Senior-friendly comfort</label></div></details> : null}
  </section>;
}

function routeCopy(intent: JourneyIntent, originRail: string, destinationRail: string, originRoad?: { distanceKm: number }, destinationRoad?: { distanceKm: number }) {
  if (intent.journeyMode === 'train_only') return `Showing rail travel from ${originRail} to ${destinationRail}; local transfers are not included.`;
  const parts: string[] = [];
  if (hasRoadConnection(intent.originCity)) parts.push(`${intent.originCity} → ${originRail} (${originRoad?.distanceKm ?? 'nearby'} km by road)`);
  parts.push(`${originRail} → ${destinationRail} by train`);
  if (hasRoadConnection(intent.destinationCity)) parts.push(`${destinationRail} → ${intent.destinationCity} (${destinationRoad?.distanceKm ?? 'nearby'} km by road)`);
  return `${parts.join(' · ')}. Chosen for the most practical rail connection and transfer time.`;
}

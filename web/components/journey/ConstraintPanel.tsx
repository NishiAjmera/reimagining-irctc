'use client';

import { CalendarDays, Check, Clock3, Minus, Plus, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import type { JourneyIntent, RankingPriority } from '@/types/journey';

type Props = { intent: JourneyIntent; onChange: (intent: JourneyIntent) => void; onSearch: () => void; onBack: () => void };

const priorities: Array<{ value: RankingPriority; label: string }> = [
  { value: 'best', label: 'Best overall' }, { value: 'confirmation', label: 'Confirmed seat' },
  { value: 'arrival', label: 'Reach early' }, { value: 'price', label: 'Lowest fare' }, { value: 'duration', label: 'Shortest journey' },
];

export function ConstraintPanel({ intent, onChange, onSearch, onBack }: Props) {
  const set = <K extends keyof JourneyIntent>(key: K, value: JourneyIntent[K]) => onChange({ ...intent, [key]: value });
  const chips = [
    { id: 'route', label: `${intent.originCity || 'Origin'} → ${intent.destinationCity || 'Destination'}`, icon: <Check size={15} /> },
    { id: 'date', label: 'Fri, 28 Aug', icon: <CalendarDays size={15} /> },
    ...(intent.arrivalBefore ? [{ id: 'arrival', label: `Arrive before ${formatTime(intent.arrivalBefore)}`, icon: <Clock3 size={15} /> }] : []),
    { id: 'passengers', label: `${intent.passengerCount} travellers`, icon: <Users size={15} /> },
    ...(intent.confirmedOnly ? [{ id: 'confirmed', label: 'Confirmed seats only', icon: <ShieldCheck size={15} /> }] : []),
    ...(intent.seniorTraveller ? [{ id: 'senior', label: 'Travelling with senior passenger', icon: <UserRound size={15} /> }] : []),
    ...(intent.flexibilityDays ? [{ id: 'flexibility', label: `Flexible ±${intent.flexibilityDays} day`, icon: <CalendarDays size={15} /> }] : []),
  ];

  const remove = (id: string) => {
    if (id === 'arrival') set('arrivalBefore', undefined);
    if (id === 'confirmed') set('confirmedOnly', false);
    if (id === 'senior') set('seniorTraveller', false);
    if (id === 'flexibility') set('flexibilityDays', 0);
  };

  return (
    <section className="constraints-screen screen-shell" aria-labelledby="constraints-title">
      <button className="back-link" type="button" onClick={onBack}>← Back to search</button>
      <div className="screen-kicker">We understood your journey</div>
      <h1 id="constraints-title">Let’s make sure we’ve got it right.</h1>
      <p className="screen-intro">These details guide every recommendation. Adjust anything before we compare trains, classes, dates and nearby stations.</p>

      <div className="constraint-chips" aria-label="Extracted journey preferences">
        {chips.map((chip) => (
          <span className="constraint-chip" key={chip.id}>{chip.icon}{chip.label}
            {!['route', 'date', 'passengers'].includes(chip.id) ? <button type="button" onClick={() => remove(chip.id)} aria-label={`Remove ${chip.label}`}><X size={14} /></button> : null}
          </span>
        ))}
      </div>

      <div className="edit-grid">
        <label>From<input value={intent.originCity} onChange={(event) => set('originCity', event.target.value)} /></label>
        <label>To<input value={intent.destinationCity} onChange={(event) => set('destinationCity', event.target.value)} /></label>
        <label>Travel date<input type="date" value={intent.preferredDate} onChange={(event) => set('preferredDate', event.target.value)} /></label>
        <label>Arrive before<input type="time" value={intent.arrivalBefore ?? ''} onChange={(event) => set('arrivalBefore', event.target.value || undefined)} /></label>
      </div>

      <div className="preference-row">
        <div className="passenger-stepper">
          <span>Travellers</span>
          <button type="button" onClick={() => set('passengerCount', Math.max(1, intent.passengerCount - 1))} aria-label="Remove traveller"><Minus size={16} /></button>
          <strong>{intent.passengerCount}</strong>
          <button type="button" onClick={() => set('passengerCount', Math.min(8, intent.passengerCount + 1))} aria-label="Add traveller"><Plus size={16} /></button>
        </div>
        <label className="check-control"><input type="checkbox" checked={intent.confirmedOnly} onChange={(event) => set('confirmedOnly', event.target.checked)} /> Confirmed seats strongly preferred</label>
        <label className="check-control"><input type="checkbox" checked={intent.seniorTraveller} onChange={(event) => set('seniorTraveller', event.target.checked)} /> Travelling with an older family member</label>
      </div>

      <fieldset className="priority-picker">
        <legend>What matters most for this journey?</legend>
        {priorities.map((item) => <label key={item.value}><input type="radio" name="priority" value={item.value} checked={intent.rankingPriority === item.value} onChange={() => set('rankingPriority', item.value)} /><span>{item.label}</span></label>)}
      </fieldset>

      <div className="constraint-footer">
        <p><ShieldCheck size={17} /> We’ll explain every recommendation and trade-off.</p>
        <button className="primary-button" type="button" onClick={onSearch}>Find journeys that work <span>→</span></button>
      </div>
    </section>
  );
}

function formatTime(value: string) {
  const [hourString, minute] = value.split(':'); const hour = Number(hourString);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

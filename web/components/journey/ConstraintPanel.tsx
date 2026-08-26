'use client';

import { Minus, Plus } from 'lucide-react';
import type { JourneyIntent, RankingPriority } from '@/types/journey';

type Props = { intent: JourneyIntent; onChange: (intent: JourneyIntent) => void; onSearch: () => void; onBack: () => void };

const priorities: Array<{ value: RankingPriority; label: string }> = [
  { value: 'best', label: 'Best overall' }, { value: 'confirmation', label: 'Confirmed seat' },
  { value: 'arrival', label: 'Reach early' }, { value: 'price', label: 'Lowest fare' }, { value: 'duration', label: 'Shortest journey' },
];

export function ConstraintPanel({ intent, onChange, onSearch, onBack }: Props) {
  const set = <K extends keyof JourneyIntent>(key: K, value: JourneyIntent[K]) => onChange({ ...intent, [key]: value });
  return (
    <section className="constraints-screen screen-shell" aria-labelledby="constraints-title">
      <button className="back-link" type="button" onClick={onBack}>← Back to search</button>
      <div className="screen-kicker">Check your trip</div>
      <h1 id="constraints-title">Check the details.</h1>
      <p className="screen-intro">Edit anything before searching.</p>

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
        <label className="check-control"><input type="checkbox" checked={intent.confirmedOnly} onChange={(event) => set('confirmedOnly', event.target.checked)} /> Prefer confirmed seats</label>
        <label className="check-control"><input type="checkbox" checked={intent.seniorTraveller} onChange={(event) => set('seniorTraveller', event.target.checked)} /> Senior traveller</label>
      </div>

      <fieldset className="priority-picker">
        <legend>What matters most?</legend>
        {priorities.map((item) => <label key={item.value}><input type="radio" name="priority" value={item.value} checked={intent.rankingPriority === item.value} onChange={() => set('rankingPriority', item.value)} /><span>{item.label}</span></label>)}
      </fieldset>

      <div className="constraint-footer">
        <span />
        <button className="primary-button" type="button" onClick={onSearch}>Show journeys <span>→</span></button>
      </div>
    </section>
  );
}

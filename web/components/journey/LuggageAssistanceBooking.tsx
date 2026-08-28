'use client';

import { useId, useRef, useState } from 'react';
import { Check, Clock3, MapPin, Phone, UserRound } from 'lucide-react';
import type { AssistanceStop } from '@/lib/journey/travelServices';
import { createMockLuggageBooking, initialLuggageSelection, luggageQuote, MAX_ASSISTANCE_BAGS, SAMPLE_BAG_RATE, supportsLuggageAssistance, type MockLuggageBooking, type PorterContact } from '@/lib/journey/luggageAssistance';
import { journeyClock, journeyDate } from '@/lib/journey/itinerary';

const rupees = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
const stopLabel = (stop: AssistanceStop) => stop.id === 'boarding' ? 'From · Departure station' : stop.id === 'arrival' ? 'To · Arrival station' : 'At train change';

export function LuggageAssistanceBooking({ stops }: { stops: AssistanceStop[] }) {
  const [selection, setSelection] = useState(() => initialLuggageSelection(stops));
  const [booking, setBooking] = useState<MockLuggageBooking | null>(null);
  const [notice, setNotice] = useState('');
  const id = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const quote = luggageQuote(stops, selection);
  const total = quote.reduce((sum, item) => sum + item.amount, 0);
  const selectBoth = () => setSelection((current) => Object.fromEntries(stops.map((stop) => [stop.id, {
    ...current[stop.id], selected: stop.id === 'boarding' || stop.id === 'arrival' || current[stop.id]?.selected,
  }])));
  const book = (event: React.FormEvent) => {
    event.preventDefault();
    if (!quote.length || booking) return;
    setBooking(createMockLuggageBooking(stops, selection));
    setNotice('Assistance booked for your selected stations.');
    headingRef.current?.focus();
  };

  return <div className="luggage-booking">
    <div className="luggage-heading"><h4 ref={headingRef} tabIndex={-1}>{booking ? 'Assistance booked' : 'Where would you like a hand?'}</h4>{booking ? <span className="luggage-status">Reserved</span> : null}</div>
    <span role="status" className="sr-only">{notice}</span>
    {booking ? <>
      <div className="luggage-assignments">{booking.assignments.map((assignment) => <article className="luggage-assignment" key={assignment.stop.id}>
        <div className="luggage-assignment-top"><span><Check size={14} aria-hidden="true" />{stopLabel(assignment.stop)}</span><strong>{rupees(assignment.amount)}</strong></div>
        <h5>{assignment.stop.station.name}</h5>
        <div className="luggage-person"><span className="luggage-avatar"><UserRound size={19} aria-hidden="true" /></span><div><strong>{assignment.porterName}</strong><small>{assignment.bags} {assignment.bags === 1 ? 'bag' : 'bags'} · {assignment.stop.nextTrainNumber ? `Train ${assignment.stop.trainNumber} → ${assignment.stop.nextTrainNumber}` : `Train ${assignment.stop.trainNumber}`}</small></div></div>
        <p className="luggage-meeting"><MapPin size={15} aria-hidden="true" /><span>Preferred meeting point: <strong>{assignment.meetingPoint.toLowerCase()}</strong>.</span></p>
        <p className="luggage-meeting"><Clock3 size={15} aria-hidden="true" /><span>{journeyDate(assignment.meetingTime)} · {journeyClock(assignment.meetingTime)}{assignment.stop.id === 'boarding' ? ' · 30 min before departure' : ' · On train arrival'}</span></p>
        <PorterContactDetails contact={assignment.contact} />
      </article>)}</div>
      <div className="luggage-booking-footer"><span>Estimated total <strong>{rupees(booking.total)}</strong></span><button type="button" className="luggage-text-button" onClick={() => { setBooking(null); setNotice('Assistance selection cleared. Choose stations to start again.'); headingRef.current?.focus(); }}>Change assistance</button></div>
      <p className="service-footnote">Confirm your assistant, meeting point and final charge with the provider before travel.</p>
    </> : <form onSubmit={book}>
      <fieldset className="luggage-station-picker"><legend>Choose one or both ends of your journey</legend><div className="luggage-rate-row"><span>Estimated {rupees(SAMPLE_BAG_RATE)} per bag, per station</span><button type="button" className="luggage-text-button" onClick={selectBoth}>Select both ends</button></div>
        <div className="luggage-station-options">{stops.map((stop) => {
          const supported = supportsLuggageAssistance(stop);
          const selected = selection[stop.id]?.selected && supported;
          const bags = selection[stop.id]?.bags ?? 2;
          return <div key={stop.id} className={`luggage-station-option ${selected ? 'selected' : ''}`}>
            <label className="luggage-station-toggle"><input type="checkbox" checked={Boolean(selected)} disabled={!supported} onChange={(event) => { const checked = event.target.checked; setSelection((current) => ({ ...current, [stop.id]: { ...current[stop.id], selected: checked } })); }} /><span><small>{stopLabel(stop)}</small><strong>{stop.station.name}</strong><small>{journeyDate(stop.time)} · {journeyClock(stop.time)}</small></span></label>
            {!supported ? <p className="service-footnote">This is a change of stations; transport between stations must be arranged separately.</p> : <div className="luggage-bag-row"><label htmlFor={`${id}-${stop.id}-bags`}>Bags</label><select id={`${id}-${stop.id}-bags`} value={bags} disabled={!selected} onChange={(event) => { const count = Number(event.target.value); setSelection((current) => ({ ...current, [stop.id]: { ...current[stop.id], bags: count } })); }}>{Array.from({ length: MAX_ASSISTANCE_BAGS }, (_, index) => index + 1).map((count) => <option value={count} key={count}>{count}</option>)}</select><strong>{selected ? rupees(bags * SAMPLE_BAG_RATE) : '—'}</strong></div>}
          </div>;
        })}</div>
      </fieldset>
      <div className="luggage-booking-footer"><div className="luggage-total" aria-live="polite"><small>{quote.length} {quote.length === 1 ? 'station' : 'stations'} selected</small><span>Estimated total <strong>{rupees(total)}</strong></span></div><button type="submit" className="primary-button" disabled={!quote.length}>Book assistance · {rupees(total)}</button></div>
      <p className="service-footnote">Provider confirmation is required to reserve assistance.</p>
    </form>}
  </div>;
}

export function PorterContactDetails({ contact }: { contact: PorterContact }) {
  return <div className="porter-contact"><div><strong>Contact details</strong><span>{contact.phoneLabel}</span><span>{contact.email}</span></div><button type="button" disabled title="Calling is unavailable"><Phone size={13} aria-hidden="true" /> Call assistant</button><a href="tel:139">Railway enquiries · 139</a></div>;
}

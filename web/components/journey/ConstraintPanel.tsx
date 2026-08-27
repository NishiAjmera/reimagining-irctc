'use client';

import { Minus, Plus, Send, TrainFront, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { JourneyIntent, RankingPriority } from '@/types/journey';
import { CitySelect } from './CitySelect';

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
        <label>From<CitySelect value={intent.originCity} exclude={intent.destinationCity} onChange={(city) => set('originCity', city)} /></label>
        <label>To<CitySelect value={intent.destinationCity} exclude={intent.originCity} onChange={(city) => set('destinationCity', city)} /></label>
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
      <DetailsChat intent={intent} />
    </section>
  );
}

type DetailsMessage = { id: number; role: 'assistant' | 'user'; text: string };

function DetailsChat({ intent }: { intent: JourneyIntent }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [messages, setMessages] = useState<DetailsMessage[]>([{ id: 1, role: 'assistant', text: 'Ask me about dates, seat status, classes or which preference to choose.' }]);
  const threadEnd = useRef<HTMLDivElement | null>(null);
  useEffect(() => { threadEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);

  const send = (value: string) => {
    const question = value.trim();
    if (!question) return;
    setReply('');
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text: question }]);
    window.setTimeout(() => setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', text: answerDetailsQuestion(question, intent) }]), 180);
  };

  return <div className={`details-chat ${open ? 'is-open' : ''}`}>
    {!open ? <button className="details-chat-launcher" type="button" onClick={() => setOpen(true)} aria-label="Open journey help chat" aria-controls="details-chat-panel" aria-expanded="false"><TrainFront size={21} /><span role="tooltip">Ask RailEase</span></button> : null}
    {open ? <aside className="details-chat-panel" id="details-chat-panel" aria-label="Journey help chat"><header><span><TrainFront size={16} /></span><div><strong>RailEase</strong><small>Journey help</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Close journey help chat"><X size={17} /></button></header><div className="details-chat-context"><span>{intent.originCity}</span><b>→</b><span>{intent.destinationCity}</span></div><div className="details-chat-thread" aria-live="polite">{messages.map((message) => <div className={`details-chat-message ${message.role}`} key={message.id}><span>{message.role === 'assistant' ? <TrainFront size={13} /> : <UserRound size={13} />}</span><p>{message.text}</p></div>)}<div ref={threadEnd} /></div><div className="details-chat-compose"><div className="details-chat-prompts"><button type="button" onClick={() => send('What does confirmed mean?')}>Seat status</button><button type="button" onClick={() => send('Which class is comfortable?')}>Classes</button><button type="button" onClick={() => send('Can I travel with a waitlisted ticket?')}>Waitlist</button></div><form onSubmit={(event) => { event.preventDefault(); send(reply); }}><label className="sr-only" htmlFor="details-chat-reply">Ask about this journey</label><input id="details-chat-reply" name="journey-question" autoComplete="off" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Ask about your trip…" /><button type="submit" aria-label="Send question"><Send size={17} /></button></form></div></aside> : null}
  </div>;
}

function answerDetailsQuestion(question: string, intent: JourneyIntent) {
  const value = question.toLowerCase();
  if (/waitlist|waiting|wl\b/.test(value)) return 'A waitlisted ticket is not confirmed. If it remains fully waitlisted at chart preparation, it cannot be used for reserved travel. You can keep “Prefer confirmed seats” selected to rank safer options first.';
  if (/rac|reservation against cancellation/.test(value)) return 'RAC allows travel with a shared berth or seat while you wait for a full berth. It is more certain than a waitlisted ticket, but less comfortable than confirmed availability.';
  if (/confirm|seat status|availability/.test(value)) return intent.confirmedOnly ? 'Confirmed-seat preference is already on, so confirmed journeys will rank ahead of RAC and waitlisted choices.' : 'Turn on “Prefer confirmed seats” if certainty matters more than price or journey time.';
  if (/class|3a|2a|sleeper|comfort|senior/.test(value)) return intent.seniorTraveller ? 'For a senior traveller, 3A or 2A is usually more comfortable because it is air-conditioned and has sleeping berths. Keep “Senior traveller” selected so comfort is considered.' : 'Sleeper is usually the lowest-cost berth option. 3A adds air-conditioning and is often a better balance of comfort and fare; 2A offers more space and privacy.';
  if (/date|day|flex|earlier|later/.test(value)) return `Your selected travel date is ${formatDetailDate(intent.preferredDate)}. You can change it above before searching; nearby-date alternatives may still appear in the results.`;
  if (/arrive|arrival|reach|time/.test(value)) return intent.arrivalBefore ? `The search will favour journeys arriving before ${formatDetailTime(intent.arrivalBefore)}.` : 'Add an “Arrive before” time if reaching by a deadline matters. Journeys that miss it will rank lower.';
  if (/traveller|passenger|people/.test(value)) return `The search is set for ${intent.passengerCount} ${intent.passengerCount === 1 ? 'traveller' : 'travellers'}. Availability and total fare will use that count.`;
  if (/fare|price|cheap|budget|cost/.test(value)) return 'Choose “Lowest fare” if price matters most. RailEase will still show seat status and trade-offs so a cheaper waitlisted option is not mistaken for a safer one.';
  return 'You can ask about seat status, RAC, waitlist, classes, timing, fare or the preferences on this page. I’ll use the trip details currently shown here.';
}

const formatDetailDate = (date: string) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const formatDetailTime = (time: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(`2026-01-01T${time}:00Z`));

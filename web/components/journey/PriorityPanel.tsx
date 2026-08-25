import { CalendarRange, CheckCircle2, Clock3, MapPin, ScanSearch, ShieldCheck, UserRound } from 'lucide-react';
import type { JourneyIntent, SearchOutcome } from '@/types/journey';

export function PriorityPanel({ intent, considered }: { intent: JourneyIntent; considered: SearchOutcome['considered'] }) {
  return (
    <aside className="priority-panel" aria-label="Journey priorities">
      <div className="priority-card">
        <p className="sidebar-label">Your priorities</p>
        <ul>
          {intent.arrivalBefore ? <li><Clock3 size={17} /> Arrive before 4 PM</li> : null}
          {intent.confirmedOnly ? <li><ShieldCheck size={17} /> Confirmed seats</li> : null}
          {intent.seniorTraveller ? <li><UserRound size={17} /> Comfort for senior traveller</li> : null}
          {intent.flexibilityDays ? <li><CalendarRange size={17} /> ±{intent.flexibilityDays} day flexibility</li> : null}
          <li><CheckCircle2 size={17} /> {intent.passengerCount} travellers together</li>
        </ul>
      </div>
      <div className="considered-card">
        <p className="sidebar-label"><ScanSearch size={16} /> We considered</p>
        <div><strong>{considered.dates}</strong><span>dates</span></div>
        <div><strong>{considered.stations}</strong><span>stations</span></div>
        <div><strong>{considered.trains}</strong><span>trains</span></div>
        <div><strong>{considered.classes}</strong><span>classes</span></div>
        <p><MapPin size={14} /> Nearby stations included automatically</p>
      </div>
      <div className="prototype-note"><strong>Prototype data</strong><p>Fares and availability are realistic simulations for this demo—not live railway data.</p></div>
    </aside>
  );
}

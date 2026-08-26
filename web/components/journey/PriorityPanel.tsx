import { CalendarRange, CheckCircle2, Clock3, ShieldCheck, UserRound } from 'lucide-react';
import type { JourneyIntent } from '@/types/journey';

export function PriorityPanel({ intent }: { intent: JourneyIntent }) {
  return (
    <aside className="priority-panel" aria-label="Journey priorities">
      <div className="priority-card">
        <p className="sidebar-label">Your priorities</p>
        <ul>
          {intent.arrivalBefore ? <li><Clock3 size={17} /> Arrive by {formatTime(intent.arrivalBefore)}</li> : null}
          {intent.confirmedOnly ? <li><ShieldCheck size={17} /> Confirmed seats</li> : null}
          {intent.seniorTraveller ? <li><UserRound size={17} /> Senior-friendly</li> : null}
          {intent.flexibilityDays ? <li><CalendarRange size={17} /> ±{intent.flexibilityDays} day</li> : null}
          <li><CheckCircle2 size={17} /> {intent.passengerCount} travellers</li>
        </ul>
      </div>
    </aside>
  );
}

function formatTime(value: string) {
  const [hourString, minute] = value.split(':');
  const hour = Number(hourString);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

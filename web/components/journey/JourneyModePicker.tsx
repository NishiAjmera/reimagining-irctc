import { BusFront, TrainFront } from 'lucide-react';
import { hasRoadConnection, railConnectionsFor } from '@/lib/data/locations';
import type { JourneyIntent, JourneyMode } from '@/types/journey';

export function JourneyModePicker({ intent, onChange, compact = false }: { intent: JourneyIntent; onChange: (intent: JourneyIntent) => void; compact?: boolean }) {
  const originNeedsRoad = hasRoadConnection(intent.originCity);
  const destinationNeedsRoad = hasRoadConnection(intent.destinationCity);
  if (!originNeedsRoad && !destinationNeedsRoad) return null;
  const mode = intent.journeyMode;
  const setMode = (journeyMode: JourneyMode) => onChange({ ...intent, journeyMode });
  const updateRailCity = (direction: 'origin' | 'destination', railCity: string) => onChange({ ...intent, [direction === 'origin' ? 'originRailCity' : 'destinationRailCity']: railCity });

  return <section className={`journey-mode-picker ${compact ? 'compact' : ''}`} aria-labelledby="journey-mode-title">
    <div><p className="section-label">How do you want to plan?</p><h2 id="journey-mode-title">Choose what RailEase should include</h2></div>
    <div className="journey-mode-options">
      <button type="button" className={mode === 'train_only' ? 'selected' : ''} onClick={() => setMode('train_only')} aria-pressed={mode === 'train_only'}><TrainFront size={19} /><span><strong>Train only</strong><small>I’ll arrange travel to the station.</small></span></button>
      <button type="button" className={mode === 'complete' ? 'selected' : ''} onClick={() => setMode('complete')} aria-pressed={mode === 'complete'}><BusFront size={19} /><span><strong>Complete journey suggestions</strong><small>Include practical bus connections.</small></span></button>
    </div>
    <div className="railhead-fields">
      {originNeedsRoad ? <label>Board train at<RailheadSelect location={intent.originCity} value={intent.originRailCity} onChange={(value) => updateRailCity('origin', value)} /></label> : null}
      {destinationNeedsRoad ? <label>Leave train at<RailheadSelect location={intent.destinationCity} value={intent.destinationRailCity} onChange={(value) => updateRailCity('destination', value)} /></label> : null}
    </div>
    <p className="journey-mode-note">{mode === 'complete' ? 'Bus segments, connection time and total fare will be included in the results.' : mode === 'train_only' ? 'Results begin and end at the selected railway station; local transport is not included.' : 'Choose train-only results or include bus connections.'}</p>
  </section>;
}

function RailheadSelect({ location, value, onChange }: { location: string; value?: string; onChange: (value: string) => void }) {
  const connections = railConnectionsFor(location);
  return <select value={value ?? connections[0]?.railCity ?? ''} onChange={(event) => onChange(event.target.value)}>{connections.map((connection) => <option key={connection.railCity} value={connection.railCity}>{connection.railCity} · {connection.distanceKm} km by road</option>)}</select>;
}

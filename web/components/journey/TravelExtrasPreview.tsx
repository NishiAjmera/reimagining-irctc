import { CarFront, Luggage, Package, Utensils } from 'lucide-react';

const extras = [
  { label: 'Cabs', Icon: CarFront },
  { label: 'Food on train', Icon: Utensils },
  { label: 'Luggage assistance', Icon: Luggage },
  { label: 'Parcels', Icon: Package },
] as const;

/** Informational only: service booking stays on the confirmation screen. */
export function TravelExtrasPreview() {
  return <aside className="travel-extras-preview" aria-label="Travel extras after confirmation">
    <div><strong>Travel extras after confirmation</strong><p>Optional services, arranged separately from your confirmation page.</p></div>
    <ul aria-label="Available travel extras">{extras.map(({ label, Icon }) => <li key={label}><Icon size={17} aria-hidden="true" /><span>{label}</span></li>)}</ul>
  </aside>;
}

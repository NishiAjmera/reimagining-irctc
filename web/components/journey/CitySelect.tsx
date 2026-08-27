import { travelLocations } from '@/lib/data/locations';

export function CitySelect({ value, onChange, exclude }: { value: string; onChange: (city: string) => void; exclude?: string }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="" disabled>Select city or town</option>
    <optgroup label="Cities with railway stations">{travelLocations.filter((location) => location.kind === 'rail_city').map((location) => <option value={location.name} key={location.name} disabled={location.name === exclude}>{location.name}</option>)}</optgroup>
    <optgroup label="Towns — nearby station required">{travelLocations.filter((location) => location.kind === 'town').map((location) => <option value={location.name} key={location.name} disabled={location.name === exclude}>{location.name}, {location.state}</option>)}</optgroup>
  </select>;
}

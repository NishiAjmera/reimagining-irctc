import { cityNames } from '@/lib/data/stations';

export function CitySelect({ value, onChange, exclude }: { value: string; onChange: (city: string) => void; exclude?: string }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="" disabled>Select city</option>
    {cityNames.map((city) => <option value={city} key={city} disabled={city === exclude}>{city}</option>)}
  </select>;
}

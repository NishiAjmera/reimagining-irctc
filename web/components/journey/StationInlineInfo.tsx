import { Armchair, Bath, BedDouble } from 'lucide-react';
import { expectedPlatform, stationAmenitiesByCode } from '@/lib/data/stations';
import type { Station } from '@/types/journey';

export function StationInlineInfo({ station, trainNumber, direction }: { station: Station; trainNumber: string; direction: 'arrival' | 'departure' }) {
  const amenities = stationAmenitiesByCode[station.code] ?? { washrooms: true, retiringRoom: false, acWaitingRoom: false };
  const platform = expectedPlatform(trainNumber, station.code, direction);
  return <span className="station-inline-info">
    <span className="platform-pill" title="Expected platform. Confirm on station displays.">P{platform}<small>expected</small></span>
    <FacilityIcon label="Washrooms" available={amenities.washrooms}><Bath size={13} /></FacilityIcon>
    <FacilityIcon label="Retiring room" available={amenities.retiringRoom}><BedDouble size={13} /></FacilityIcon>
    <FacilityIcon label="AC waiting room" available={amenities.acWaitingRoom}><Armchair size={13} /></FacilityIcon>
  </span>;
}

function FacilityIcon({ label, available, children }: { label: string; available: boolean; children: React.ReactNode }) {
  const description = `${label}: ${available ? 'available' : 'not available'}`;
  return <span className={`facility-icon ${available ? 'available' : 'unavailable'}`} title={description} aria-label={description} role="img">{children}</span>;
}

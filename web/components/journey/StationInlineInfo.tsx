'use client';

import { Fragment, useId, useState } from 'react';
import { Accessibility, Armchair, Bath, BedDouble, Luggage, Vault } from 'lucide-react';
import { expectedPlatform, stationAmenitiesByCode } from '@/lib/data/stations';
import type { Station } from '@/types/journey';

export function StationInlineInfo({ station, trainNumber, direction }: { station: Station; trainNumber: string; direction: 'arrival' | 'departure' }) {
  const amenities = stationAmenitiesByCode[station.code];
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [tooltipsDismissed, setTooltipsDismissed] = useState(false);
  const tooltipPrefix = useId();
  const platform = expectedPlatform(trainNumber, station.code, direction);
  const facilities = [
    { key: 'washrooms', label: 'Washrooms', available: amenities?.washrooms, Icon: Bath },
    { key: 'retiringRoom', label: 'Retiring room', available: amenities?.retiringRoom, Icon: BedDouble },
    { key: 'acWaitingRoom', label: 'AC waiting room', available: amenities?.acWaitingRoom, Icon: Armchair },
    { key: 'cloakroom', label: 'Cloakroom', available: amenities?.cloakroom, Icon: Luggage },
    { key: 'lockers', label: 'Lockers', available: amenities?.lockers, Icon: Vault },
    { key: 'divyangjan', label: 'Divyangjan facilities', available: amenities?.divyangjan, Icon: Accessibility },
  ];
  return <span className="station-inline-info" data-tooltips-dismissed={tooltipsDismissed} onKeyDown={(event) => {
    if (event.key === 'Escape') {
      setActiveTooltip(null);
      setTooltipsDismissed(true);
    }
  }}>
    <span className="platform-pill" title="Expected platform. Confirm on station displays.">P{platform}<small>expected</small></span>
    {facilities.map(({ key, label, available, Icon }) => {
      const description = `${label} at ${station.name}: ${availabilityLabel(available)}`;
      const tooltipId = `${tooltipPrefix}-${key}-tooltip`;
      return <Fragment key={key}>
        <button type="button" className={`facility-icon ${available == null ? 'unverified' : available ? 'available' : 'unavailable'}`} aria-label={description} aria-describedby={tooltipId} data-tooltip-open={activeTooltip === key} onPointerEnter={() => setTooltipsDismissed(false)} onFocus={() => setTooltipsDismissed(false)} onBlur={() => setActiveTooltip(null)} onClick={() => {
          setActiveTooltip(activeTooltip === key ? null : key);
          setTooltipsDismissed(activeTooltip === key);
        }}><Icon size={13} aria-hidden="true" /></button>
        <span className="station-tooltip" id={tooltipId} role="tooltip"><span>{label} · {availabilityLabel(available)}</span></span>
      </Fragment>;
    })}
  </span>;
}

function availabilityLabel(available: boolean | null | undefined) {
  return available == null ? 'Not verified' : available ? 'Available' : 'Not available';
}

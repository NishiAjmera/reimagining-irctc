import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StationInlineInfo } from '@/components/journey/StationInlineInfo';
import { stationAmenitiesByCode, stations } from './stations';

describe('station facilities', () => {
  it('provides sample facility availability for every station', () => {
    for (const station of Object.values(stations)) {
      expect(stationAmenitiesByCode[station.code]).toMatchObject({
        cloakroom: true, lockers: true, divyangjan: true,
      });
    }
  });

  it('renders compact facility controls with linked custom tooltips', () => {
    const html = renderToStaticMarkup(createElement(StationInlineInfo, {
      station: stations.HD, trainNumber: '12450', direction: 'departure',
    }));
    for (const label of ['Cloakroom', 'Lockers', 'Divyangjan facilities']) {
      expect(html).toContain(`aria-label="${label} at Harda: Available"`);
    }
    expect(html.match(/data-tooltip-open="false"/g)).toHaveLength(6);
    expect(html.match(/role="tooltip"/g)).toHaveLength(6);
    const describedIds = [...html.matchAll(/aria-describedby="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(describedIds).size).toBe(6);
    for (const id of describedIds) expect(html).toContain(`id="${id}" role="tooltip"`);
    expect(html).not.toContain('title="Cloakroom');
    expect(html).not.toContain('facility-detail');
    expect(html).not.toContain('aria-expanded');
    expect(html).not.toContain('facility-unknown');
  });

  it('keeps unavailable facilities greyed and explains their status in tooltips', () => {
    const html = renderToStaticMarkup(createElement(StationInlineInfo, {
      station: stations.GADJ, trainNumber: '12450', direction: 'arrival',
    }));
    expect(html.match(/class="facility-icon unavailable"/g)).toHaveLength(2);
    expect(html).toContain('Retiring room · Not available');
    expect(html).toContain('AC waiting room · Not available');
  });

  it('does not describe an unknown station as available or unavailable', () => {
    const html = renderToStaticMarkup(createElement(StationInlineInfo, {
      station: { ...stations.HD, code: 'UNKNOWN' }, trainNumber: '12450', direction: 'arrival',
    }));
    expect(html.match(/class="facility-icon unverified"/g)).toHaveLength(6);
  });
});

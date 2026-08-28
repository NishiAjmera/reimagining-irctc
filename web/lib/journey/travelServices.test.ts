import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LocalIntentParser } from '@/lib/intent/localParser';
import { rankJourneys } from '@/lib/ranking/rankJourneys';
import { TravelServices } from '@/components/journey/TravelServices';
import { assistanceSummary, travelServiceContext, travelServiceLinks } from './travelServices';

const intent = new LocalIntentParser().parse('Khategaon to Mandawa next Friday with a bus for 3 passengers');
const complete = rankJourneys(intent);
const direct = rankJourneys({ ...intent, journeyMode: 'train_only' }).options[0];

describe('post-booking travel services', () => {
  it('uses boarding and arrival stations for direct trains', () => {
    const context = travelServiceContext(direct);
    expect(context.stops.map((stop) => stop.id)).toEqual(['boarding', 'arrival']);
    expect(context.defaultAssistanceId).toBe('boarding');
    expect(context.cabStops[0].location).toContain(direct.arrivalStation.name);
    expect(context.cabStops[0].time).toBe(direct.arrivalDateTime);
    expect(context.cabStops[1].field).toBe('Drop-off');
  });

  it('offers pickup after the final bus, without losing rail-station options', () => {
    const journey = complete.options[0];
    const context = travelServiceContext(journey);
    const bus = journey.roadLegs!.find((leg) => leg.direction === 'from_station')!;
    expect(context.cabStops).toHaveLength(3);
    expect(context.cabStops[0]).toMatchObject({ id: 'final-stop', location: bus.destinationName, time: bus.arrivalDateTime });
    expect(context.stops.every((stop) => !stop.station.name.includes('Bus Stand'))).toBe(true);
  });

  it('defaults luggage assistance to the actual train-change station', () => {
    const journey = complete.indirectOptions[0];
    const context = travelServiceContext(journey);
    const change = context.stops.find((stop) => stop.id === context.defaultAssistanceId)!;
    expect(change.station.code).toBe(journey.legs![0].arrivalStation.code);
    expect(change.nextTrainNumber).toBe(journey.legs![1].trainNumber);
    expect(change.time).toBe(journey.legs![0].arrivalDateTime);
    expect(assistanceSummary(change, 3)).toContain('3 bags');
    expect(assistanceSummary(change, 1)).toContain('1 bag\n');
    expect(assistanceSummary(change, 3)).toContain('confirm platforms');
    expect(assistanceSummary(change, 3)).not.toContain('reserved');
  });

  it('does not describe a change of stations as a platform-only transfer', () => {
    const journey = complete.indirectOptions[0];
    const legs = journey.legs!.map((leg, index) => index === 1 ? {
      ...leg, departureStation: { ...leg.departureStation, code: 'OTHER', name: 'Other city station' },
    } : leg);
    const context = travelServiceContext({ ...journey, legs });
    const stop = context.stops.find((item) => item.nextTrainNumber)!;
    expect(assistanceSummary(stop, 2)).toContain('at Other city station');
    const html = renderToStaticMarkup(createElement(TravelServices, { journey: { ...journey, legs } }));
    expect(html).toContain('transport between stations must be arranged separately');
  });

  it('links only to official service destinations without sharing booking data', () => {
    for (const [service, link] of Object.entries(travelServiceLinks)) {
      if (service === 'railwayEnquiries') { expect(link).toBe('tel:139'); continue; }
      const url = new URL(link);
      expect(url.protocol).toBe('https:');
      expect(url.search).toBe('');
      expect(url.username).toBe('');
    }
    expect(travelServiceLinks.swiggy).toContain('/order-food-online-in-train');
  });

  it('renders four compact, initially closed service options and secure external links', () => {
    const html = renderToStaticMarkup(createElement(TravelServices, { journey: direct }));
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(4);
    expect(html.match(/class="travel-service-panel"[^>]*hidden=""/g)).toHaveLength(4);
    expect(html.match(/target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"/g)).toHaveLength(5);
    for (const match of html.matchAll(/aria-controls="([^"]+)"/g)) expect(html).toContain(`id="${match[1]}"`);
    expect(html).toContain('sample reference is not a railway PNR');
    expect(html).toContain('no porter has been reserved');
  });
});

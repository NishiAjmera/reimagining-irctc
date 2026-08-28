import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LuggageAssistanceBooking, PorterContactDetails } from '@/components/journey/LuggageAssistanceBooking';
import { LocalIntentParser } from '@/lib/intent/localParser';
import { rankJourneys } from '@/lib/ranking/rankJourneys';
import { travelServiceContext } from './travelServices';
import { createMockLuggageBooking, initialLuggageSelection, luggageQuote, SAMPLE_BAG_RATE, supportsLuggageAssistance } from './luggageAssistance';

const intent = new LocalIntentParser().parse('Khategaon to Mandawa next Friday with a bus');
const journeys = rankJourneys(intent);
const stops = travelServiceContext(journeys.options[0]).stops;

describe('mock luggage assistance booking', () => {
  it('starts with two bags at departure and prices each bag per station', () => {
    const selection = initialLuggageSelection(stops);
    const quote = luggageQuote(stops, selection);
    expect(quote).toHaveLength(1);
    expect(quote[0]).toMatchObject({ bags: 2, amount: 160 });
    expect(quote[0].stop.id).toBe('boarding');
    expect(SAMPLE_BAG_RATE).toBe(80);
  });

  it('books both ends with independent bag counts and exact totals', () => {
    const selection = initialLuggageSelection(stops);
    selection.boarding.bags = 3;
    selection.arrival = { selected: true, bags: 1 };
    const booking = createMockLuggageBooking(stops, selection);
    expect(booking.sample).toBe(true);
    expect(booking.total).toBe(320);
    expect(booking.assignments.map((item) => item.amount)).toEqual([240, 80]);
    expect(new Set(booking.assignments.map((item) => item.porterName)).size).toBe(2);
    expect(booking.assignments[0].meetingPoint).toContain('enquiry board');
    expect(booking.assignments[1].meetingPoint).toContain('footbridge');
  });

  it('supports arrival-only bookings', () => {
    const selection = initialLuggageSelection(stops);
    selection.boarding.selected = false;
    selection.arrival = { selected: true, bags: 4 };
    const booking = createMockLuggageBooking(stops, selection);
    expect(booking.total).toBe(320);
    expect(booking.assignments).toHaveLength(1);
    expect(booking.assignments[0].stop.id).toBe('arrival');
  });

  it('sets departure meetings 30 minutes early and arrival meetings at arrival time', () => {
    const selection = initialLuggageSelection(stops);
    selection.arrival.selected = true;
    const booking = createMockLuggageBooking(stops, selection);
    expect(Date.parse(booking.assignments[0].meetingTime)).toBe(Date.parse(stops[0].time) - 1_800_000);
    expect(Date.parse(booking.assignments[1].meetingTime)).toBe(Date.parse(stops[1].time));
  });

  it('keeps confirmed bag counts and amounts unchanged if the draft is edited', () => {
    const selection = initialLuggageSelection(stops);
    const booking = createMockLuggageBooking(stops, selection);
    selection.boarding.bags = 8;
    expect(booking.total).toBe(160);
    expect(booking.assignments[0].bags).toBe(2);
  });

  it('rejects empty bookings and invalid bag counts', () => {
    const selection = initialLuggageSelection(stops);
    for (const bags of [0, -1, 9, 1.5, NaN]) {
      selection.boarding.bags = bags;
      expect(() => createMockLuggageBooking(stops, selection)).toThrow('Choose between 1 and 8 bags.');
    }
    selection.boarding.selected = false;
    expect(() => createMockLuggageBooking(stops, selection)).toThrow('Select at least one station.');
  });

  it('allows same-station changes but excludes transport between different stations', () => {
    const context = travelServiceContext(journeys.indirectOptions[0]);
    const change = context.stops.find((stop) => stop.nextTrainNumber)!;
    expect(supportsLuggageAssistance(change)).toBe(true);
    const selection = initialLuggageSelection(context.stops);
    selection[change.id] = { selected: true, bags: 2 };
    expect(luggageQuote(context.stops, selection)).toHaveLength(2);
    const crossStation = { ...change, nextStation: { ...change.station, code: 'OTHER' } };
    expect(supportsLuggageAssistance(crossStation)).toBe(false);
    expect(luggageQuote([crossStation], selection)).toEqual([]);
  });

  it('shows estimated pricing and both endpoints with product-style copy', () => {
    const html = renderToStaticMarkup(createElement(LuggageAssistanceBooking, { stops }));
    expect(html).toContain('From · Departure station');
    expect(html).toContain('To · Arrival station');
    expect(html).toContain('Select both ends');
    expect(html).toContain('₹80');
    expect(html).toContain('per bag, per station');
    expect(html).toContain('Review assistance');
    expect(html).toContain('Provider confirmation is required');
    expect(html).not.toContain('Ask station staff');
    const visibleText = html.replace(/<[^>]*>/g, '');
    expect(visibleText).not.toMatch(/sample|prototype|fictional|demo|dispatch/i);
  });

  it('does not invent a callable porter number', () => {
    const html = renderToStaticMarkup(createElement(PorterContactDetails));
    expect(html).toContain('Contact details');
    expect(html).toContain('Direct number unavailable until confirmed');
    expect(html).toContain('disabled=""');
    expect([...html.matchAll(/href="(tel:[^"]+)"/g)].map((match) => match[1])).toEqual(['tel:139']);
  });
});

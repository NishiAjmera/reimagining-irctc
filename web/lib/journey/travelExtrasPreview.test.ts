import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { TravelExtrasPreview } from '@/components/journey/TravelExtrasPreview';
import { ChatBookingPanel } from '@/components/journey/ChatBookingPanel';
import { completePayment, confirmBooking, startBooking, updateBooking } from '@/lib/chat/bookingFlow';
import { emptyJourneyDraft } from '@/lib/chat/contract';
import { rankJourneys } from '@/lib/ranking/rankJourneys';

const intent = { ...emptyJourneyDraft(), originCity: 'Mumbai', destinationCity: 'Pune', preferredDate: '2026-09-10', passengerCount: 1, journeyMode: 'train_only' as const };
const journey = rankJourneys(intent).options[0];
const collecting = startBooking(journey, 1);
const review = updateBooking(collecting, { passengers: [{ name: 'Asha Test', age: '32', gender: 'Female', berth: 'No preference' }], email: 'travel@example.test', phone: '9000000000' });
const renderPanel = (flow: typeof collecting) => renderToStaticMarkup(createElement(ChatBookingPanel, { flow, intent, busy: false, onChange: () => {}, onContinue: () => {}, onReview: () => {}, onPaid: () => {}, onBack: () => {} }));

describe('travel extras discovery', () => {
  it('names all four extras and their location without offering premature booking controls', () => {
    const html = renderToStaticMarkup(createElement(TravelExtrasPreview));
    for (const label of ['cabs', 'food', 'luggage help', 'parcels']) expect(html).toContain(label);
    expect(html).toContain('Optional cabs, food, luggage help &amp; parcels on your confirmation page.');
    expect(html).not.toMatch(/<button|<a\s|<input|role="button"/);
    expect(html).not.toMatch(/<aside|<svg|<ul|<strong/);
    expect(html.match(/<p\b/g)).toHaveLength(1);
  });
  it.each([collecting, review])('does not repeat the results-page notice in $phase', (flow) => {
    const html = renderPanel(flow);
    expect(html).not.toContain('travel-extras-preview');
    expect(html).not.toContain('class="travel-service-options"');
  });
  it('replaces the preview with the actual extras on confirmation', () => {
    const html = renderPanel(completePayment(confirmBooking(review, 'Confirm booking', 'RE-TEST')));
    expect(html).not.toContain('class="travel-extras-preview"');
    expect(html).toContain('class="travel-service-options"');
  });
});

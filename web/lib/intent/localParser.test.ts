import { describe, expect, it } from 'vitest';
import { DEMO_DATE, LocalIntentParser } from './localParser';

describe('LocalIntentParser', () => {
  it('extracts the complete primary demo journey', () => {
    const intent = new LocalIntentParser().parse("I need to travel from Bengaluru to Jaipur next Friday for a wedding. I need to reach by 4 PM. We’re three people including my mother, and I don’t want a waitlisted ticket.");
    expect(intent).toMatchObject({
      originCity: 'Bengaluru', destinationCity: 'Jaipur', preferredDate: DEMO_DATE,
      flexibilityDays: 1, arrivalBefore: '16:00', passengerCount: 3,
      seniorTraveller: true, confirmedOnly: true, comfortPreference: 'comfortable',
    });
  });

  it('recognises additional major cities', () => {
    const intent = new LocalIntentParser().parse('Kolkata to Kochi for 2 passengers');
    expect(intent).toMatchObject({ originCity: 'Kolkata', destinationCity: 'Kochi', passengerCount: 2 });
  });

  it('recognises a town and an optional bus connection', () => {
    const intent = new LocalIntentParser().parse('Khategaon to Jaipur with a bus to the station');
    expect(intent).toMatchObject({ originCity: 'Khategaon', destinationCity: 'Jaipur', journeyMode: 'complete' });
  });
});

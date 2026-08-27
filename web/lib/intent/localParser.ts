import type { JourneyIntent } from '@/types/journey';

export const DEMO_DATE = '2026-08-28';

const CITY_ALIASES: Array<[RegExp, string]> = [
  [/bengaluru|bangalore/i, 'Bengaluru'], [/jaipur/i, 'Jaipur'], [/indore/i, 'Indore'],
  [/delhi/i, 'Delhi'], [/mumbai|bombay/i, 'Mumbai'], [/pune/i, 'Pune'],
  [/ahmedabad/i, 'Ahmedabad'], [/chennai|madras/i, 'Chennai'], [/hyderabad/i, 'Hyderabad'],
  [/kolkata|calcutta/i, 'Kolkata'], [/lucknow/i, 'Lucknow'], [/bhopal/i, 'Bhopal'],
  [/patna/i, 'Patna'], [/kochi|cochin|ernakulam/i, 'Kochi'], [/bhubaneswar/i, 'Bhubaneswar'],
  [/chandigarh/i, 'Chandigarh'],
  [/khategaon/i, 'Khategaon'], [/alibaug/i, 'Alibaug'], [/mahabaleshwar/i, 'Mahabaleshwar'],
  [/madikeri|coorg/i, 'Madikeri'], [/munnar/i, 'Munnar'], [/mandawa/i, 'Mandawa'], [/harda/i, 'Harda'],
];

const findCities = (input: string) => CITY_ALIASES
  .map(([pattern, city]) => ({ city, index: input.search(pattern) }))
  .filter((match) => match.index >= 0)
  .sort((left, right) => left.index - right.index)
  .map((match) => match.city);

export class LocalIntentParser {
  parse(input: string): JourneyIntent {
    const cities = findCities(input);
    const budgetMatch = input.match(/(?:under|below|budget(?: of)?)[^\d₹]*₹?\s?([\d,]+)/i);
    const passengersMatch = input.match(/(?:we(?:'re| are)|for)\s+(\d+)\s+(?:people|travellers?|passengers?)/i);
    const wordPassengers = /three people|three travellers|three passengers/i.test(input) ? 3 : undefined;
    const arrivalMatch = input.match(/(?:reach|arrive)(?:\s+by|\s+before)?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    const hour = arrivalMatch ? Number(arrivalMatch[1]) % 12 + (arrivalMatch[3].toLowerCase() === 'pm' ? 12 : 0) : undefined;

    return {
      originCity: cities[0] ?? '',
      destinationCity: cities[1] ?? '',
      journeyMode: /(?:include|add|with).*(?:bus|road)|complete journey|door[ -]to[ -]door/i.test(input) ? 'complete' : 'train_only',
      preferredDate: /next friday|28(?:th)? august|28 aug/i.test(input) ? DEMO_DATE : '2026-08-29',
      flexibilityDays: /next friday|flexible|nearby dates?|weekend/i.test(input) ? 1 : 0,
      arrivalBefore: hour !== undefined ? `${String(hour).padStart(2, '0')}:${arrivalMatch?.[2] ?? '00'}` : undefined,
      passengerCount: passengersMatch ? Number(passengersMatch[1]) : (wordPassengers ?? (/parents/i.test(input) ? 2 : 1)),
      seniorTraveller: /mother|father|parents?|senior|older/i.test(input),
      confirmedOnly: /don['’]?t want (?:a )?waitlisted?|no waitlist|confirmed(?: seats?)? only|confirmed option/i.test(input),
      budgetMax: budgetMatch ? Number(budgetMatch[1].replace(',', '')) : undefined,
      comfortPreference: /mother|father|parents?|senior|comfortable|comfort/i.test(input) ? 'comfortable' : (/cheap|budget|lowest|under|below/i.test(input) ? 'budget' : 'any'),
      rankingPriority: /cheapest|lowest fare|budget|under|below/i.test(input) ? 'price' : (/fastest|shortest/i.test(input) ? 'duration' : (/reach|arrive/i.test(input) ? 'arrival' : 'best')),
    };
  }
}

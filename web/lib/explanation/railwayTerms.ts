export const railwayTerms: Record<string, { label: string; explanation: string }> = {
  '1A': { label: 'First AC', explanation: 'The most spacious air-conditioned sleeper class, usually with lockable cabins or coupes.' },
  '2A': { label: 'AC 2 Tier', explanation: 'Air-conditioned sleeper coach with four berths per bay plus side berths. Quieter and more spacious than 3A.' },
  '3A': { label: 'AC 3 Tier', explanation: 'Air-conditioned sleeper coach with six berths per bay plus side berths. A good balance of comfort and price overnight.' },
  '3E': { label: 'AC 3 Economy', explanation: 'An air-conditioned sleeper class with slightly denser berths and usually a lower fare than 3A.' },
  SL: { label: 'Sleeper', explanation: 'Non-AC sleeper coach. Lower cost, but less comfortable for long or hot-weather journeys.' },
  CC: { label: 'AC Chair Car', explanation: 'Air-conditioned seated coach, best suited to daytime journeys.' },
  '2S': { label: 'Second Sitting', explanation: 'Basic non-AC reserved seating for shorter daytime journeys.' },
  GN: { label: 'General quota', explanation: 'The main reservation quota available to most travellers.' },
  Tatkal: { label: 'Tatkal', explanation: 'A limited last-minute booking quota that opens close to departure and usually costs more.' },
  RAC: { label: 'Reservation Against Cancellation', explanation: 'You can board the train, but a full berth is not guaranteed initially. It may upgrade if other passengers cancel.' },
  WL: { label: 'Waitlist', explanation: 'You do not currently have a confirmed seat. If an e-ticket remains waitlisted after charting, you may not be able to travel.' },
  GNWL: { label: 'General Waitlist', explanation: 'The most common waitlist, usually for passengers travelling from the train’s origin or a nearby major station.' },
  RLWL: { label: 'Remote Location Waitlist', explanation: 'A waitlist for intermediate stations with a smaller seat quota, so movement can be less predictable.' },
};

export function explainTerm(code: string) { return railwayTerms[code] ?? railwayTerms.WL; }

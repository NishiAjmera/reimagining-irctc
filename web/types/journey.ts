export type RankingPriority = 'best' | 'confirmation' | 'price' | 'duration' | 'arrival';
export type AvailabilityStatus = 'CONFIRMED' | 'RAC' | 'WAITLIST';
export type RecommendationType = 'BEST_OVERALL' | 'CHEAPEST' | 'BEST_AVAILABILITY' | 'FASTEST' | 'ALTERNATIVE_DATE';
export type JourneyMode = 'train_only' | 'complete';

export type Station = {
  code: string;
  name: string;
  city: string;
  distanceFromCityCentreKm: number;
};

export type JourneyIntent = {
  originCity: string;
  destinationCity: string;
  originRailCity?: string;
  destinationRailCity?: string;
  journeyMode?: JourneyMode;
  preferredDate: string;
  flexibilityDays: number;
  arrivalBefore?: string;
  arrivalDate?: string;
  departureAfter?: string;
  preferredClass?: string;
  passengerCount: number;
  seniorTraveller: boolean;
  confirmedOnly: boolean;
  budgetMax?: number;
  comfortPreference: 'any' | 'comfortable' | 'budget';
  rankingPriority: RankingPriority;
};

export type ClassAvailability = {
  code: string;
  name: string;
  fare: number;
  status: AvailabilityStatus;
  position?: number;
  confidence: number;
};

export type TrainService = {
  id: string;
  trainNumber: string;
  trainName: string;
  departureStation: Station;
  arrivalStation: Station;
  departureDateTime: string;
  arrivalDateTime: string;
  durationMinutes: number;
  classes: ClassAvailability[];
  trainTags: Array<'fastest' | 'overnight' | 'premium' | 'budget' | 'seniorFriendly'>;
  searchDateOffset?: number;
};

export type ScoreBreakdown = {
  total: number;
  arrival: number;
  availability: number;
  date: number;
  comfort: number;
  fare: number;
  duration: number;
  station: number;
};

export type JourneyOption = {
  id: string;
  trainNumber: string;
  trainName: string;
  departureStation: Station;
  arrivalStation: Station;
  departureDateTime: string;
  arrivalDateTime: string;
  durationMinutes: number;
  classOption: ClassAvailability;
  totalFare: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  recommendationType: RecommendationType;
  reasons: string[];
  tradeoffs: string[];
  tags: TrainService['trainTags'];
  classChoices?: JourneyClassChoice[];
  legs?: JourneyLeg[];
  transfer?: {
    station: Station;
    durationMinutes: number;
  };
  roadLegs?: RoadLeg[];
  doorToDoorDurationMinutes?: number;
};

export type RoadLeg = {
  id: string;
  mode: 'BUS';
  operator: string;
  serviceNumber: string;
  coachType: string;
  originName: string;
  destinationName: string;
  departureDateTime: string;
  arrivalDateTime: string;
  durationMinutes: number;
  distanceKm: number;
  farePerTraveller: number;
  availableSeats: number;
  transferBufferMinutes: number;
  direction: 'to_station' | 'from_station';
};

export type JourneyClassChoice = {
  id: string;
  classOption: ClassAvailability;
  totalFare: number;
  reasons: string[];
  tradeoffs: string[];
  legs?: JourneyLeg[];
};

export type JourneyLeg = {
  id: string;
  trainNumber: string;
  trainName: string;
  departureStation: Station;
  arrivalStation: Station;
  departureDateTime: string;
  arrivalDateTime: string;
  durationMinutes: number;
  classOption: ClassAvailability;
};

export type SearchOutcome = {
  options: JourneyOption[];
  otherOptions: JourneyOption[];
  indirectOptions: JourneyOption[];
  alternatives: string[];
  considered: { dates: number; stations: number; trains: number; classes: number };
};

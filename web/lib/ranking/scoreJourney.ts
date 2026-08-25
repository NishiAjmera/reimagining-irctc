import type { JourneyIntent, JourneyOption, RecommendationType, ScoreBreakdown, TrainService } from '@/types/journey';

const localDate = (iso: string) => iso.slice(0, 10);
const localTime = (iso: string) => iso.slice(11, 16);
const dayDistance = (left: string, right: string) => Math.round(Math.abs(Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) / 86_400_000);

export function scoreJourney(train: TrainService, classIndex: number, intent: JourneyIntent): JourneyOption {
  const classOption = train.classes[classIndex];
  const departureDate = localDate(train.departureDateTime);
  const dateDistance = dayDistance(departureDate, intent.preferredDate);

  const arrival = !intent.arrivalBefore || localTime(train.arrivalDateTime) <= intent.arrivalBefore ? 30 : -60;
  const availability = classOption.status === 'CONFIRMED' ? 30 : classOption.status === 'RAC' ? 5 : Math.max(-50, -20 - (classOption.position ?? 0));
  const date = dateDistance === 0 ? 15 : dateDistance <= intent.flexibilityDays ? 5 : -25;
  const comfort = intent.seniorTraveller || intent.comfortPreference === 'comfortable'
    ? (['1A', '2A', '3A', '3E'].includes(classOption.code) ? 10 : -5)
    : 0;
  const fare = intent.rankingPriority === 'price'
    ? Math.max(-10, Math.round((intent.budgetMax ?? 2500) / 250) - Math.round(classOption.fare / 250))
    : classOption.fare <= 1800 ? 5 : 0;
  const duration = train.durationMinutes <= 1000 ? 5 : train.durationMinutes > 1150 ? -5 : 0;
  const station = -(Math.max(0, train.departureStation.distanceFromCityCentreKm - 3) + Math.max(0, train.arrivalStation.distanceFromCityCentreKm - 3));
  const scoreBreakdown: ScoreBreakdown = { total: 0, arrival, availability, date, comfort, fare, duration, station };
  scoreBreakdown.total = 50 + arrival + availability + date + comfort + fare + duration + station;

  const reasons: string[] = [];
  const tradeoffs: string[] = [];
  if (arrival > 0 && intent.arrivalBefore) reasons.push(`Arrives before your ${formatTime(intent.arrivalBefore)} deadline`);
  if (classOption.status === 'CONFIRMED') reasons.push('Confirmed seats are available');
  if (dateDistance === 0) reasons.push('Travels on your preferred date');
  if (train.trainTags.includes('overnight')) reasons.push('Makes good use of an overnight journey');
  if (comfort > 0) reasons.push('A comfortable AC sleeper choice for an older traveller');
  if (classOption.status === 'RAC') tradeoffs.push('You can travel, but a full berth is not confirmed yet');
  if (classOption.status === 'WAITLIST') tradeoffs.push(`Currently waitlisted at WL ${classOption.position}`);
  if (arrival < 0) tradeoffs.push(`Arrives after your ${formatTime(intent.arrivalBefore ?? '16:00')} deadline`);
  if (dateDistance > 0) tradeoffs.push(`Leaves ${departureDate < intent.preferredDate ? 'one day earlier' : 'on a nearby date'}`);
  if (classOption.code === 'SL' && intent.seniorTraveller) tradeoffs.push('Sleeper is cheaper, but non-AC and less comfortable for your mother');
  if (train.departureStation.distanceFromCityCentreKm > 5) tradeoffs.push(`Departure station is ${train.departureStation.distanceFromCityCentreKm} km from the city centre`);

  return {
    id: `${train.id}-${classOption.code}`,
    trainNumber: train.trainNumber,
    trainName: train.trainName,
    departureStation: train.departureStation,
    arrivalStation: train.arrivalStation,
    departureDateTime: train.departureDateTime,
    arrivalDateTime: train.arrivalDateTime,
    durationMinutes: train.durationMinutes,
    classOption,
    totalFare: classOption.fare * intent.passengerCount,
    score: scoreBreakdown.total,
    scoreBreakdown,
    recommendationType: 'BEST_OVERALL',
    reasons,
    tradeoffs,
    tags: train.trainTags,
  };
}

export function formatTime(value: string) {
  const [hourString, minute] = value.split(':');
  const hour = Number(hourString);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function withRecommendation(option: JourneyOption, recommendationType: RecommendationType): JourneyOption {
  return { ...option, recommendationType };
}

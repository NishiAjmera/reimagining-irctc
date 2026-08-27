import { createSampleServices, trains } from '@/lib/data/trains';
import { getTravelLocation, railConnectionsFor, resolveRailCity } from '@/lib/data/locations';
import type { AvailabilityStatus, ClassAvailability, JourneyClassChoice, JourneyIntent, JourneyLeg, JourneyOption, RoadLeg, ScoreBreakdown, SearchOutcome, TrainService } from '@/types/journey';
import { scoreJourney, withRecommendation } from './scoreJourney';

const byScore = (a: JourneyOption, b: JourneyOption) => b.score - a.score;

export function rankJourneys(intent: JourneyIntent): SearchOutcome {
  const railIntent = resolveRailIntent(intent);
  const stored = trains.filter((train) =>
    train.departureStation.city.toLowerCase() === railIntent.originCity.toLowerCase() &&
    train.arrivalStation.city.toLowerCase() === railIntent.destinationCity.toLowerCase(),
  );
  const generated = createSampleServices(railIntent.originCity, railIntent.destinationCity);
  const services = stored.length >= 2 ? stored : [...stored, ...generated];
  const outcome = { ...rankJourneyServices(railIntent, services), indirectOptions: createIndirectJourneyOptions(railIntent) };
  return addRoadConnections(intent, outcome);
}

export function resolveRailIntent(intent: JourneyIntent): JourneyIntent {
  return {
    ...intent,
    originCity: resolveRailCity(intent.originCity, intent.originRailCity),
    destinationCity: resolveRailCity(intent.destinationCity, intent.destinationRailCity),
  };
}

export function addRoadConnections(intent: JourneyIntent, outcome: SearchOutcome): SearchOutcome {
  if (intent.journeyMode !== 'complete') return outcome;
  const apply = (option: JourneyOption) => attachRoadLegs(intent, option);
  return { ...outcome, options: outcome.options.map(apply), otherOptions: outcome.otherOptions.map(apply), indirectOptions: outcome.indirectOptions.map(apply) };
}

function attachRoadLegs(intent: JourneyIntent, option: JourneyOption): JourneyOption {
  const roadLegs: RoadLeg[] = [];
  const originConnection = selectedRoadConnection(intent.originCity, intent.originRailCity);
  const destinationConnection = selectedRoadConnection(intent.destinationCity, intent.destinationRailCity);
  if (originConnection) roadLegs.push(createRoadLeg(intent.originCity, option.departureStation.name, option.departureDateTime, originConnection, 'to_station'));
  if (destinationConnection) roadLegs.push(createRoadLeg(intent.destinationCity, option.arrivalStation.name, option.arrivalDateTime, destinationConnection, 'from_station'));
  if (!roadLegs.length) return option;
  const roadFare = roadLegs.reduce((total, leg) => total + leg.farePerTraveller * intent.passengerCount, 0);
  const firstDeparture = roadLegs.find((leg) => leg.direction === 'to_station')?.departureDateTime ?? option.departureDateTime;
  const finalArrival = roadLegs.find((leg) => leg.direction === 'from_station')?.arrivalDateTime ?? option.arrivalDateTime;
  const busTradeoff = 'Bus timings and availability should be reconfirmed before travel';
  const classChoices = option.classChoices?.map((choice) => ({ ...choice, totalFare: choice.totalFare + roadFare, reasons: [`Connects ${intent.originCity} to the rail journey`, ...choice.reasons], tradeoffs: [...choice.tradeoffs, busTradeoff] }));
  return {
    ...option,
    totalFare: option.totalFare + roadFare,
    classChoices,
    roadLegs,
    doorToDoorDurationMinutes: Math.round((Date.parse(finalArrival) - Date.parse(firstDeparture)) / 60_000),
    reasons: [`Connects ${intent.originCity} to the rail journey`, ...option.reasons],
    tradeoffs: [...option.tradeoffs, busTradeoff],
  };
}

function selectedRoadConnection(locationName: string, railCity?: string) {
  if (getTravelLocation(locationName)?.kind !== 'town') return undefined;
  const connections = railConnectionsFor(locationName);
  return connections.find((connection) => connection.railCity === railCity) ?? connections[0];
}

function createRoadLeg(town: string, stationName: string, trainTime: string, connection: ReturnType<typeof selectedRoadConnection> & {}, direction: RoadLeg['direction']): RoadLeg {
  const transferBufferMinutes = direction === 'to_station' ? 75 : 45;
  const trainDate = Date.parse(trainTime);
  const arrivalDateTime = direction === 'to_station' ? new Date(trainDate - transferBufferMinutes * 60_000) : new Date(trainDate + (transferBufferMinutes + connection.durationMinutes) * 60_000);
  const departureDateTime = direction === 'to_station' ? new Date(arrivalDateTime.getTime() - connection.durationMinutes * 60_000) : new Date(trainDate + transferBufferMinutes * 60_000);
  return {
    id: `bus-${town}-${connection.railCity}-${direction}`,
    mode: 'BUS', operator: connection.operator, serviceNumber: `RE-${connection.railCity.slice(0, 2).toUpperCase()}${connection.durationMinutes}`,
    coachType: connection.coachType,
    originName: direction === 'to_station' ? `${town} Bus Stand` : stationName,
    destinationName: direction === 'to_station' ? stationName : `${town} Bus Stand`,
    departureDateTime: departureDateTime.toISOString(), arrivalDateTime: arrivalDateTime.toISOString(),
    durationMinutes: connection.durationMinutes, distanceKm: connection.distanceKm, farePerTraveller: connection.fare,
    availableSeats: 18, transferBufferMinutes, direction,
  };
}

export function rankJourneyServices(intent: JourneyIntent, services: TrainService[]): SearchOutcome {
  const matching = services.map((train) => alignToSearchDate(train, intent.preferredDate));

  if (matching.length === 0) {
    return {
      options: [], otherOptions: [], indirectOptions: [],
      alternatives: ['Try a nearby departure station', 'Allow one day of date flexibility', 'Check journeys with one simple change'],
      considered: { dates: intent.flexibilityDays * 2 + 1, stations: 0, trains: 0, classes: 0 },
    };
  }

  const candidates = matching.flatMap((train) => train.classes.map((_, index) => scoreJourney(train, index, intent))).sort(byScore);
  const exactDate = candidates.filter((option) => localDate(option.departureDateTime) === intent.preferredDate);
  const confirmed = exactDate.filter((option) => option.classOption.status === 'CONFIRMED');
  const best = (intent.confirmedOnly ? confirmed[0] : candidates[0]) ?? candidates[0];
  const cheapest = confirmed
    .filter((option) => trainKey(option) !== trainKey(best) && option.scoreBreakdown.arrival > 0)
    .sort((a, b) => a.classOption.fare - b.classOption.fare)[0];
  const alternative = candidates.filter((option) => localDate(option.departureDateTime) !== intent.preferredDate && option.classOption.status === 'CONFIRMED').sort(byScore)[0];

  const selected: JourneyOption[] = [];
  if (best) addDistinct(selected, withRecommendation(best, 'BEST_OVERALL'));
  if (cheapest) addDistinct(selected, withRecommendation(cheapest, 'CHEAPEST'));
  if (alternative) addDistinct(selected, withRecommendation(alternative, 'ALTERNATIVE_DATE'));
  for (const candidate of candidates) {
    if (selected.length >= 3) break;
    addDistinct(selected, withRecommendation(candidate, candidate.tags.includes('fastest') ? 'FASTEST' : 'BEST_AVAILABILITY'));
  }

  const selectedTrains = new Set(selected.map(trainKey));
  const otherOptions: JourneyOption[] = [];
  for (const candidate of candidates) {
    if (selectedTrains.has(trainKey(candidate)) || otherOptions.some((option) => trainKey(option) === trainKey(candidate))) continue;
    otherOptions.push(candidate);
    if (otherOptions.length === 2) break;
  }
  return {
    options: selected.map((option) => attachClassChoices(option, candidates)),
    otherOptions: otherOptions.map((option) => attachClassChoices(option, candidates)),
    indirectOptions: [],
    alternatives: confirmed.length === 0 ? ['Leave one day earlier for confirmed seats', 'Try a nearby station', 'Consider RAC with high confirmation confidence'] : [],
    considered: {
      dates: intent.flexibilityDays * 2 + 1,
      stations: new Set(matching.flatMap((train) => [train.departureStation.code, train.arrivalStation.code])).size,
      trains: matching.length,
      classes: new Set(matching.flatMap((train) => train.classes.map((item) => item.code))).size,
    },
  };
}

const interchangeCities = ['Delhi', 'Mumbai', 'Bhopal', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad'];
const statusRank: Record<AvailabilityStatus, number> = { CONFIRMED: 0, RAC: 1, WAITLIST: 2 };

export function createIndirectJourneyOptions(intent: JourneyIntent): JourneyOption[] {
  const candidates = interchangeCities
    .filter((city) => city !== intent.originCity && city !== intent.destinationCity)
    .flatMap((city) => createConnectionsVia(intent, city))
    .sort((left, right) => {
      const availability = statusRank[left.classOption.status] - statusRank[right.classOption.status];
      return availability || left.durationMinutes - right.durationMinutes || left.totalFare - right.totalFare;
    });

  const selected: JourneyOption[] = [];
  for (const option of candidates) {
    if (selected.some((item) => item.transfer?.station.city === option.transfer?.station.city)) continue;
    selected.push(attachConnectionChoices(option, candidates));
    if (selected.length === 2) break;
  }
  return selected;
}

function addDistinct(options: JourneyOption[], candidate: JourneyOption) {
  if (!options.some((option) => trainKey(option) === trainKey(candidate))) options.push(candidate);
}

function trainKey(option: JourneyOption) {
  return `${option.trainNumber}-${option.departureStation.code}-${option.departureDateTime}`;
}

function attachClassChoices(option: JourneyOption, candidates: JourneyOption[]): JourneyOption {
  const classChoices = candidates
    .filter((candidate) => trainKey(candidate) === trainKey(option))
    .sort((left, right) => classOrder(left.classOption.code) - classOrder(right.classOption.code))
    .map(toClassChoice);
  return { ...option, classChoices };
}

function attachConnectionChoices(option: JourneyOption, candidates: JourneyOption[]): JourneyOption {
  const key = connectionKey(option);
  const classChoices = candidates
    .filter((candidate) => connectionKey(candidate) === key)
    .sort((left, right) => classOrder(left.classOption.code) - classOrder(right.classOption.code))
    .map(toClassChoice);
  return { ...option, classChoices };
}

function connectionKey(option: JourneyOption) {
  return option.legs?.map((leg) => leg.id).join('|') ?? option.id;
}

function toClassChoice(option: JourneyOption): JourneyClassChoice {
  return { id: option.id, classOption: option.classOption, totalFare: option.totalFare, reasons: option.reasons, tradeoffs: option.tradeoffs, legs: option.legs };
}

function classOrder(code: string) {
  return ['1A', '2A', '3A', '3E', 'CC', 'SL', '2S'].indexOf(code) + 1 || 99;
}

function createConnectionsVia(intent: JourneyIntent, interchangeCity: string): JourneyOption[] {
  const firstServices = servicesFor(intent.originCity, interchangeCity).map((service) => alignToSearchDate(service, intent.preferredDate));
  const secondServices = servicesFor(interchangeCity, intent.destinationCity).map((service) => alignToSearchDate(service, intent.preferredDate));
  const options: JourneyOption[] = [];

  for (const first of firstServices) {
    for (const secondBase of secondServices) {
      const second = scheduleAfter(secondBase, first.arrivalDateTime);
      const transferMinutes = Math.round((Date.parse(second.departureDateTime) - Date.parse(first.arrivalDateTime)) / 60_000);
      if (transferMinutes < 90 || transferMinutes > 720) continue;
      const sharedClasses = first.classes.filter((firstClass) => second.classes.some((secondClass) => secondClass.code === firstClass.code));
      for (const firstClass of sharedClasses) {
        const secondClass = second.classes.find((item) => item.code === firstClass.code);
        if (!secondClass) continue;
        options.push(buildConnection(intent, first, firstClass, second, secondClass, transferMinutes));
      }
    }
  }
  return options;
}

function servicesFor(originCity: string, destinationCity: string) {
  const stored = trains.filter((train) => train.departureStation.city === originCity && train.arrivalStation.city === destinationCity);
  return stored.length ? stored : createSampleServices(originCity, destinationCity);
}

function scheduleAfter(service: TrainService, afterIso: string): TrainService {
  let departure = new Date(service.departureDateTime);
  const earliest = Date.parse(afterIso) + 90 * 60_000;
  while (departure.getTime() < earliest) departure = new Date(departure.getTime() + 86_400_000);
  return {
    ...service,
    departureDateTime: departure.toISOString(),
    arrivalDateTime: new Date(departure.getTime() + service.durationMinutes * 60_000).toISOString(),
  };
}

function buildConnection(intent: JourneyIntent, first: TrainService, firstClass: ClassAvailability, second: TrainService, secondClass: ClassAvailability, transferMinutes: number): JourneyOption {
  const legs: JourneyLeg[] = [toLeg(first, firstClass), toLeg(second, secondClass)];
  const departure = Date.parse(first.departureDateTime);
  const arrival = Date.parse(second.arrivalDateTime);
  const durationMinutes = Math.round((arrival - departure) / 60_000);
  const classOption = combineClasses(firstClass, secondClass);
  const scoreBreakdown: ScoreBreakdown = { total: 0, arrival: 0, availability: classOption.status === 'CONFIRMED' ? 20 : classOption.status === 'RAC' ? 0 : -30, date: 15, comfort: 0, fare: 0, duration: -10, station: 0 };
  scoreBreakdown.total = 45 + scoreBreakdown.availability + scoreBreakdown.date + scoreBreakdown.duration;
  const overnight = localDate(first.departureDateTime) !== localDate(second.arrivalDateTime);
  const interchange = first.arrivalStation;

  return {
    id: `connection-${first.id}-${second.id}-${classOption.code}`,
    trainNumber: `${first.trainNumber} + ${second.trainNumber}`,
    trainName: `${intent.originCity} to ${intent.destinationCity} via ${interchange.city}`,
    departureStation: first.departureStation,
    arrivalStation: second.arrivalStation,
    departureDateTime: first.departureDateTime,
    arrivalDateTime: second.arrivalDateTime,
    durationMinutes,
    classOption,
    totalFare: classOption.fare * intent.passengerCount,
    score: scoreBreakdown.total,
    scoreBreakdown,
    recommendationType: 'BEST_AVAILABILITY',
    reasons: [`One change at ${interchange.name}`, `${formatDuration(transferMinutes)} to make the connection`, availabilityReason(classOption)],
    tradeoffs: ['Availability is checked separately for each train', 'A connection adds transfer time and platform movement'],
    tags: overnight ? ['overnight'] : [],
    legs,
    transfer: { station: interchange, durationMinutes: transferMinutes },
  };
}

function toLeg(service: TrainService, classOption: ClassAvailability): JourneyLeg {
  return { id: service.id, trainNumber: service.trainNumber, trainName: service.trainName, departureStation: service.departureStation, arrivalStation: service.arrivalStation, departureDateTime: service.departureDateTime, arrivalDateTime: service.arrivalDateTime, durationMinutes: service.durationMinutes, classOption };
}

function combineClasses(first: ClassAvailability, second: ClassAvailability): ClassAvailability {
  const riskier = statusRank[first.status] >= statusRank[second.status] ? first : second;
  return {
    code: first.code,
    name: first.name,
    fare: first.fare + second.fare,
    status: riskier.status,
    position: riskier.position,
    confidence: Math.min(first.confidence, second.confidence),
  };
}

function availabilityReason(option: ClassAvailability) {
  if (option.status === 'CONFIRMED') return 'Confirmed seats shown on both legs';
  if (option.status === 'RAC') return 'At least one leg is currently RAC';
  return `At least one leg is currently WL ${option.position}`;
}

function formatDuration(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

function alignToSearchDate(train: TrainService, preferredDate: string): TrainService {
  const departureDate = shiftDate(preferredDate, train.searchDateOffset ?? 0);
  const departureTime = train.departureDateTime.slice(11, 19);
  const departure = new Date(`${departureDate}T${departureTime}+05:30`);
  return {
    ...train,
    departureDateTime: departure.toISOString(),
    arrivalDateTime: new Date(departure.getTime() + train.durationMinutes * 60_000).toISOString(),
  };
}

function shiftDate(date: string, offset: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}

function localDate(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function recommendAlternatives(intent: JourneyIntent) {
  const outcome = rankJourneys(intent);
  return outcome.options.length ? outcome.options : outcome.alternatives;
}

import type { Station } from '@/types/journey';

export const stations: Record<string, Station> = {
  SBC: { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru', distanceFromCityCentreKm: 2 },
  YPR: { code: 'YPR', name: 'Yesvantpur Junction', city: 'Bengaluru', distanceFromCityCentreKm: 8 },
  SMVB: { code: 'SMVB', name: 'Sir M Visvesvaraya Terminal', city: 'Bengaluru', distanceFromCityCentreKm: 7 },
  JP: { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', distanceFromCityCentreKm: 2 },
  GADJ: { code: 'GADJ', name: 'Gandhinagar Jaipur', city: 'Jaipur', distanceFromCityCentreKm: 6 },
  INDB: { code: 'INDB', name: 'Indore Junction', city: 'Indore', distanceFromCityCentreKm: 2 },
  NDLS: { code: 'NDLS', name: 'New Delhi', city: 'Delhi', distanceFromCityCentreKm: 1 },
  NZM: { code: 'NZM', name: 'Hazrat Nizamuddin', city: 'Delhi', distanceFromCityCentreKm: 7 },
  MMCT: { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', distanceFromCityCentreKm: 3 },
  CSMT: { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus', city: 'Mumbai', distanceFromCityCentreKm: 1 },
  PUNE: { code: 'PUNE', name: 'Pune Junction', city: 'Pune', distanceFromCityCentreKm: 2 },
  ADI: { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', distanceFromCityCentreKm: 4 },
  MAS: { code: 'MAS', name: 'MGR Chennai Central', city: 'Chennai', distanceFromCityCentreKm: 3 },
  HYB: { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', distanceFromCityCentreKm: 2 },
  HWH: { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', distanceFromCityCentreKm: 5 },
  LKO: { code: 'LKO', name: 'Lucknow Junction', city: 'Lucknow', distanceFromCityCentreKm: 3 },
  RKMP: { code: 'RKMP', name: 'Rani Kamlapati', city: 'Bhopal', distanceFromCityCentreKm: 7 },
  PNBE: { code: 'PNBE', name: 'Patna Junction', city: 'Patna', distanceFromCityCentreKm: 2 },
  ERS: { code: 'ERS', name: 'Ernakulam Junction', city: 'Kochi', distanceFromCityCentreKm: 6 },
  BBS: { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', distanceFromCityCentreKm: 4 },
  CDG: { code: 'CDG', name: 'Chandigarh Junction', city: 'Chandigarh', distanceFromCityCentreKm: 8 },
};

export const cityNames = [
  'Ahmedabad', 'Bengaluru', 'Bhopal', 'Bhubaneswar', 'Chandigarh', 'Chennai', 'Delhi', 'Hyderabad',
  'Indore', 'Jaipur', 'Kochi', 'Kolkata', 'Lucknow', 'Mumbai', 'Patna', 'Pune',
];

export const primaryStationByCity = Object.fromEntries(
  cityNames.map((city) => [city, Object.values(stations).find((station) => station.city === city)]),
) as Record<string, Station | undefined>;

export type StationAmenities = {
  washrooms: boolean;
  retiringRoom: boolean;
  acWaitingRoom: boolean;
};

const limitedRetiringRooms = new Set(['GADJ', 'SMVB']);
const limitedAcWaitingRooms = new Set(['GADJ', 'SMVB', 'ERS', 'CDG']);

export const stationAmenitiesByCode = Object.fromEntries(
  Object.keys(stations).map((code) => [code, {
    washrooms: true,
    retiringRoom: !limitedRetiringRooms.has(code),
    acWaitingRoom: !limitedAcWaitingRooms.has(code),
  }]),
) as Record<string, StationAmenities>;

export function expectedPlatform(trainNumber: string, stationCode: string, direction: 'arrival' | 'departure') {
  const seed = [...`${trainNumber}-${stationCode}-${direction}`].reduce((total, character) => total + character.charCodeAt(0), 0);
  return 1 + (seed % 8);
}

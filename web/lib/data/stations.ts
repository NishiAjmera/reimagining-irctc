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
  PUNE: { code: 'PUNE', name: 'Pune Junction', city: 'Pune', distanceFromCityCentreKm: 2 },
  ADI: { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', distanceFromCityCentreKm: 4 },
  MAS: { code: 'MAS', name: 'MGR Chennai Central', city: 'Chennai', distanceFromCityCentreKm: 3 },
  HYB: { code: 'HYB', name: 'Hyderabad Deccan', city: 'Hyderabad', distanceFromCityCentreKm: 2 },
};

export const cityNames = ['Bengaluru', 'Jaipur', 'Indore', 'Delhi', 'Mumbai', 'Pune', 'Ahmedabad', 'Chennai', 'Hyderabad'];

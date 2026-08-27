import { cityNames, primaryStationByCity } from './stations';

export type RailConnection = {
  railCity: string;
  distanceKm: number;
  durationMinutes: number;
  fare: number;
  operator: string;
  coachType: string;
};

export type TravelLocation = {
  name: string;
  kind: 'rail_city' | 'town';
  state?: string;
  railConnections: RailConnection[];
};

const towns: TravelLocation[] = [
  { name: 'Khategaon', kind: 'town', state: 'Madhya Pradesh', railConnections: [
    { railCity: 'Harda', distanceKm: 33, durationMinutes: 70, fare: 299, operator: 'Minakshi Travels', coachType: 'Non-AC seater' },
    { railCity: 'Indore', distanceKm: 135, durationMinutes: 165, fare: 250, operator: 'District Transport', coachType: 'Non-AC seater' },
  ] },
  { name: 'Alibaug', kind: 'town', state: 'Maharashtra', railConnections: [{ railCity: 'Mumbai', distanceKm: 96, durationMinutes: 180, fare: 420, operator: 'Konkan Connect', coachType: 'AC seater' }] },
  { name: 'Mahabaleshwar', kind: 'town', state: 'Maharashtra', railConnections: [{ railCity: 'Pune', distanceKm: 121, durationMinutes: 210, fare: 480, operator: 'Western Ghats Travels', coachType: 'AC seater' }] },
  { name: 'Madikeri', kind: 'town', state: 'Karnataka', railConnections: [{ railCity: 'Bengaluru', distanceKm: 255, durationMinutes: 330, fare: 690, operator: 'Coorg Roadways', coachType: 'AC sleeper' }] },
  { name: 'Munnar', kind: 'town', state: 'Kerala', railConnections: [{ railCity: 'Kochi', distanceKm: 126, durationMinutes: 245, fare: 510, operator: 'High Range Transit', coachType: 'AC seater' }] },
  { name: 'Mandawa', kind: 'town', state: 'Rajasthan', railConnections: [{ railCity: 'Jaipur', distanceKm: 168, durationMinutes: 220, fare: 430, operator: 'Shekhawati Express', coachType: 'AC seater' }] },
];

const railCities: TravelLocation[] = cityNames.map((name) => ({ name, kind: 'rail_city', railConnections: [] }));

export const travelLocations = [...railCities, ...towns].sort((left, right) => left.name.localeCompare(right.name));
export const townNames = towns.map((town) => town.name);

export function getTravelLocation(name: string) {
  return travelLocations.find((location) => location.name === name);
}

export function hasRoadConnection(name: string) {
  return getTravelLocation(name)?.kind === 'town';
}

export function railConnectionsFor(name: string) {
  const location = getTravelLocation(name);
  if (!location) return [];
  if (location.kind === 'rail_city') {
    return primaryStationByCity[name] ? [{ railCity: name, distanceKm: 0, durationMinutes: 0, fare: 0, operator: '', coachType: '' }] : [];
  }
  return location.railConnections;
}

export function resolveRailCity(locationName: string, selectedRailCity?: string) {
  const connections = railConnectionsFor(locationName);
  return connections.find((connection) => connection.railCity === selectedRailCity)?.railCity ?? connections[0]?.railCity ?? locationName;
}

import { primaryStationByCity } from './stations';
import type { JourneyIntent, TrainService } from '@/types/journey';

type RailRadarTrain = {
  train: { number: string; name: string; type?: string };
  from: { departure: string };
  to: { arrival: string };
  duration: number;
};

type RailRadarResponse = {
  success: boolean;
  data?: { trains?: RailRadarTrain[] };
};

export async function fetchRailRadarServices(intent: JourneyIntent): Promise<TrainService[] | null> {
  const apiKey = process.env.RAILRADAR_API_KEY;
  const departureStation = primaryStationByCity[intent.originCity];
  const arrivalStation = primaryStationByCity[intent.destinationCity];
  if (!apiKey || !departureStation || !arrivalStation) return null;

  try {
    const url = new URL(`https://api.railradar.in/v1/trains/between/${departureStation.code}/${arrivalStation.code}`);
    url.searchParams.set('date', intent.preferredDate);
    url.searchParams.set('byCity', 'true');
    url.searchParams.set('live', 'false');
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(4_500),
    });
    if (!response.ok) return null;
    const payload = await response.json() as RailRadarResponse;
    const services = payload.data?.trains?.slice(0, 8) ?? [];
    if (!payload.success || services.length === 0) return null;

    return services.map((item, index) => {
      const departureDateTime = new Date(`${intent.preferredDate}T${item.from.departure}:00+05:30`);
      const acFare = Math.max(780, Math.round((item.duration * 2.05 + 420) / 10) * 10);
      return {
        id: `railradar-${item.train.number}-${index}`,
        trainNumber: item.train.number,
        trainName: item.train.name,
        departureStation,
        arrivalStation,
        departureDateTime: departureDateTime.toISOString(),
        arrivalDateTime: new Date(departureDateTime.getTime() + item.duration * 60_000).toISOString(),
        durationMinutes: item.duration,
        classes: [
          { code: '3A', name: 'AC 3 Tier', fare: acFare, status: index % 4 === 3 ? 'RAC' : 'CONFIRMED', confidence: index % 4 === 3 ? 76 : 90, position: index % 4 === 3 ? 8 : undefined },
          { code: 'SL', name: 'Sleeper', fare: Math.round(acFare * 0.58), status: index % 3 === 2 ? 'RAC' : 'CONFIRMED', confidence: index % 3 === 2 ? 72 : 88, position: index % 3 === 2 ? 12 : undefined },
        ],
        trainTags: [
          ...(item.duration > 600 ? ['overnight' as const] : []),
          ...(item.train.type?.toLowerCase().includes('rajdhani') || item.train.type?.toLowerCase().includes('shatabdi') ? ['premium' as const, 'seniorFriendly' as const] : []),
          ...(item.duration < 480 ? ['fastest' as const] : []),
        ],
      };
    });
  } catch {
    return null;
  }
}

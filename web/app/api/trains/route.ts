import { fetchRailRadarServices } from '@/lib/data/railRadar';
import { createIndirectJourneyOptions, rankJourneys, rankJourneyServices } from '@/lib/ranking/rankJourneys';
import type { JourneyIntent } from '@/types/journey';

export async function POST(request: Request) {
  const intent = await request.json() as JourneyIntent;
  if (!intent.originCity || !intent.destinationCity || !intent.preferredDate) {
    return Response.json({ error: 'Origin, destination and date are required.' }, { status: 400 });
  }

  const liveServices = await fetchRailRadarServices(intent);
  return Response.json({
    outcome: liveServices ? { ...rankJourneyServices(intent, liveServices), indirectOptions: createIndirectJourneyOptions(intent) } : rankJourneys(intent),
    source: liveServices ? 'railradar' : 'sample',
  });
}

import { fetchRailRadarServices } from '@/lib/data/railRadar';
import { addRoadConnections, createIndirectJourneyOptions, rankJourneys, rankJourneyServices, resolveRailIntent } from '@/lib/ranking/rankJourneys';
import type { JourneyIntent } from '@/types/journey';

export async function POST(request: Request) {
  const intent = await request.json() as JourneyIntent;
  if (!intent.originCity || !intent.destinationCity || !intent.preferredDate) {
    return Response.json({ error: 'Origin, destination and date are required.' }, { status: 400 });
  }

  const railIntent = resolveRailIntent(intent);
  const liveServices = await fetchRailRadarServices(railIntent);
  return Response.json({
    outcome: liveServices ? addRoadConnections(intent, { ...rankJourneyServices(railIntent, liveServices), indirectOptions: createIndirectJourneyOptions(railIntent) }) : rankJourneys(intent),
    source: liveServices ? 'railradar' : 'sample',
  });
}

import { fetchRailRadarServices } from '@/lib/data/railRadar';
import { addRoadConnections, createIndirectJourneyOptions, rankJourneys, rankJourneyServices, resolveRailIntent } from '@/lib/ranking/rankJourneys';
import type { JourneyIntent } from '@/types/journey';
import { missingJourneyFields, validateDraft } from '@/lib/chat/contract';

export async function POST(request: Request) {
  let intent: JourneyIntent;
  try {
    intent = validateDraft(await request.json());
    if (missingJourneyFields(intent).length) throw new Error('Incomplete trip');
  } catch { return Response.json({ error: 'Please check your route, dates, travellers and preferences.' }, { status: 400 }); }

  const railIntent = resolveRailIntent(intent);
  const liveServices = await fetchRailRadarServices(railIntent);
  return Response.json({
    outcome: liveServices ? addRoadConnections(intent, { ...rankJourneyServices(railIntent, liveServices), indirectOptions: createIndirectJourneyOptions(railIntent) }) : rankJourneys(intent),
    source: liveServices ? 'railradar' : 'sample',
  });
}

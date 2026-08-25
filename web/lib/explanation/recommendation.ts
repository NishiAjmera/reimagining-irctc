import type { JourneyIntent, JourneyOption } from '@/types/journey';
import { railwayTerms } from './railwayTerms';

export const suggestedQuestions = [
  'What does RAC mean?',
  'What happens if this becomes waitlisted?',
  'Why did you recommend this over Rajdhani?',
  'Can my mother get a lower berth?',
  'What’s the difference between 3A and Sleeper?',
];

export function explainQuestion(question: string, journey: JourneyOption, intent: JourneyIntent) {
  if (question.includes('RAC')) return `${railwayTerms.RAC.explanation} Because certainty matters for this trip, confirmed options are ranked above RAC.`;
  if (question.includes('waitlisted')) return `${railwayTerms.WL.explanation} We would bring confirmed alternatives forward before asking you to accept that risk.`;
  if (question.includes('Rajdhani')) return `The Rajdhani-style option is faster, but its best available class is RAC and it leaves from Yesvantpur. ${journey.trainName} is ranked higher because you asked for confirmed seats and a comfortable trip with your mother.`;
  if (question.includes('lower berth')) return 'Senior passengers can request a lower berth during booking, subject to availability. This prototype highlights suitable coaches but cannot reserve a berth.';
  if (question.includes('difference')) return `${railwayTerms['3A'].explanation} ${railwayTerms.SL.explanation}`;
  return `This option scored ${journey.score} because it best balances ${intent.arrivalBefore ? 'your arrival deadline, ' : ''}seat certainty, comfort and fare.`;
}

export function recommendationSummary(journey: JourneyOption, intent: JourneyIntent) {
  const priority = intent.confirmedOnly ? 'avoiding a waitlist' : 'finding a practical journey';
  return `You said ${intent.arrivalBefore ? 'arriving on time and ' : ''}${priority} matter more than simply choosing the cheapest fare. This option satisfies those priorities with the strongest overall trade-off.`;
}

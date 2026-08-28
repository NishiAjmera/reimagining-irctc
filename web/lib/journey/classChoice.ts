import type { JourneyClassChoice, JourneyOption } from '@/types/journey';

export function applyClassChoice(journey: JourneyOption, choice: JourneyClassChoice): JourneyOption {
  return { ...journey, id: choice.id, classOption: choice.classOption, totalFare: choice.totalFare, reasons: choice.reasons, tradeoffs: choice.tradeoffs, legs: choice.legs ?? journey.legs };
}

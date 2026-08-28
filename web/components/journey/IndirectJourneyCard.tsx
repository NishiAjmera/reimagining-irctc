import type {JourneyOption} from '@/types/journey';
import {JourneyCard} from './JourneyCard';

export function IndirectJourneyCard({journey,onChoose}:{journey:JourneyOption;onChoose:(journey:JourneyOption)=>void}) {
  return <JourneyCard journey={journey} index={1} onChoose={onChoose} isOtherOption/>;
}

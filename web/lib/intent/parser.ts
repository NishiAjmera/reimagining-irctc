import type { JourneyIntent } from '@/types/journey';
import { LocalIntentParser } from './localParser';

export interface IntentParser { parse(input: string): JourneyIntent }

export const intentParser: IntentParser = new LocalIntentParser();

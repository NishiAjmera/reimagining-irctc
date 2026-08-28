import { Check, TriangleAlert } from 'lucide-react';
import type { JourneyClassChoice, JourneyOption } from '@/types/journey';

export function JourneyClassPicker({ journey, selectedId, onSelect }: { journey: JourneyOption; selectedId: string; onSelect: (choice: JourneyClassChoice) => void }) {
  const choices = journey.classChoices?.length ? journey.classChoices : [toChoice(journey)];
  return <fieldset className="class-picker"><legend>Train class · fare per traveller</legend><div className="class-choice-grid">{choices.map((choice) => {
    const status = choice.classOption.status;
    const selected = choice.id === selectedId;
    const statusText = status === 'CONFIRMED' ? 'Confirmed' : status === 'RAC' ? `RAC ${choice.classOption.position}` : `WL ${choice.classOption.position}`;
    return <button className={selected ? 'selected' : ''} type="button" key={choice.id} onClick={() => onSelect(choice)} aria-pressed={selected} aria-label={`${choice.classOption.name}, ₹${choice.classOption.fare} per traveller, ${statusText}`}>
      <span className="class-choice-name"><strong>{choice.classOption.code}</strong><small>{choice.classOption.name}</small></span>
      <span className="class-choice-fare">₹{choice.classOption.fare.toLocaleString('en-IN')}</span>
      <span className={`class-choice-status ${status.toLowerCase()}`}>{status === 'CONFIRMED' ? <Check size={13} /> : <TriangleAlert size={13} />}{statusText}</span>
    </button>;
  })}</div></fieldset>;
}

export function applyClassChoice(journey: JourneyOption, choice: JourneyClassChoice): JourneyOption {
  return { ...journey, id: choice.id, classOption: choice.classOption, totalFare: choice.totalFare, reasons: choice.reasons, tradeoffs: choice.tradeoffs, legs: choice.legs ?? journey.legs };
}

function toChoice(journey: JourneyOption): JourneyClassChoice {
  return { id: journey.id, classOption: journey.classOption, totalFare: journey.totalFare, reasons: journey.reasons, tradeoffs: journey.tradeoffs, legs: journey.legs };
}

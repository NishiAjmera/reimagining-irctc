'use client';

import { MessageCircleQuestion, X } from 'lucide-react';
import { useState } from 'react';
import { track } from '@/lib/analytics';
import { explainQuestion, suggestedQuestions } from '@/lib/explanation/recommendation';
import type { JourneyIntent, JourneyOption } from '@/types/journey';

export function ContextQuestions({ journey, intent }: { journey: JourneyOption; intent: JourneyIntent }) {
  const [active, setActive] = useState<string | null>(null);
  const ask = (question: string) => { setActive(question); track('context_question_clicked', { question, journeyId: journey.id }); };
  return (
    <section className="questions-section" aria-labelledby="questions-title">
      <div><p className="screen-kicker">Clear answers, in context</p><h2 id="questions-title">Questions about this journey?</h2><p>Choose a question to get a short answer grounded in your priorities.</p></div>
      <div className="question-list">{suggestedQuestions.map((question) => <button key={question} type="button" onClick={() => ask(question)}>{question}<span>→</span></button>)}</div>
      {active ? <div className="inline-answer" role="status"><MessageCircleQuestion size={22} /><div><strong>{active}</strong><p>{explainQuestion(active, journey, intent)}</p></div><button type="button" onClick={() => setActive(null)} aria-label="Close answer"><X size={17} /></button></div> : null}
    </section>
  );
}

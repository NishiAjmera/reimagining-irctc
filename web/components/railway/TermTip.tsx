'use client';

import { CircleHelp } from 'lucide-react';
import { useId, useState } from 'react';
import { track } from '@/lib/analytics';
import { explainTerm } from '@/lib/explanation/railwayTerms';

export function TermTip({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const term = explainTerm(code);
  return (
    <span className="term-tip">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Explain ${code}`}
        onClick={() => { setOpen((value) => !value); track('railway_term_explained', { term: code }); }}
      >
        {code} <CircleHelp size={14} aria-hidden="true" />
      </button>
      {open ? <span className="term-popover" id={id} role="tooltip"><strong>{term.label}</strong>{term.explanation}</span> : null}
    </span>
  );
}

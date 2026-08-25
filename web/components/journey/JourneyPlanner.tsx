'use client';

import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleHelp, Languages, MapPin, Menu, Search, ShieldCheck, Sparkles, TrainFront, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { intentParser } from '@/lib/intent/parser';
import { rankJourneys } from '@/lib/ranking/rankJourneys';
import type { JourneyIntent, JourneyOption, SearchOutcome } from '@/types/journey';
import { ConstraintPanel } from './ConstraintPanel';
import { ContextQuestions } from './ContextQuestions';
import { JourneyCard } from './JourneyCard';
import { PriorityPanel } from './PriorityPanel';

type Stage = 'home' | 'constraints' | 'searching' | 'results' | 'booking' | 'handoff';
type SearchMode = 'ai' | 'structured';

export const DEMO_PROMPT = "I need to travel from Bengaluru to Jaipur next Friday for a wedding. I need to reach by 4 PM. We’re three people including my mother, and I don’t want a waitlisted ticket.";

const SAMPLE_PROMPTS = ['Reach Delhi before 9 AM tomorrow', 'Travel to Mumbai this weekend under ₹2,000', 'Find a comfortable confirmed option for my parents'];

const emptyStructured = { origin: 'Indore', destination: 'Delhi', date: '2026-08-29', passengers: 1 };

export function JourneyPlanner() {
  const [stage, setStage] = useState<Stage>('home');
  const [mode, setMode] = useState<SearchMode>('ai');
  const [query, setQuery] = useState('');
  const [structured, setStructured] = useState(emptyStructured);
  const [intent, setIntent] = useState<JourneyIntent | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [selected, setSelected] = useState<JourneyOption | null>(null);
  const [error, setError] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const startedAt = useRef<number | null>(null);
  const resultsAt = useRef<number | null>(null);

  useEffect(() => { track('journey_started'); startedAt.current = Date.now(); }, []);

  const submitAI = () => {
    if (!query.trim()) { setError('Tell us where you want to go—or try the demo journey.'); return; }
    const parsed = intentParser.parse(query);
    if (!parsed.originCity || !parsed.destinationCity) { setError('Add both your origin and destination so we can plan the journey.'); return; }
    setError(''); setIntent(parsed); setStage('constraints'); track('intent_submitted', { mode: 'natural_language' });
  };

  const submitStructured = () => {
    if (!structured.origin || !structured.destination || !structured.date) { setError('Add an origin, destination and travel date.'); return; }
    setError('');
    setIntent({ originCity: structured.origin, destinationCity: structured.destination, preferredDate: structured.date, flexibilityDays: 1, passengerCount: structured.passengers, seniorTraveller: false, confirmedOnly: false, comfortPreference: 'any', rankingPriority: 'best' });
    setStage('constraints'); track('intent_submitted', { mode: 'structured' });
  };

  const search = () => {
    if (!intent) return;
    setStage('searching'); track('constraints_edited');
    window.setTimeout(() => {
      const result = rankJourneys(intent); setOutcome(result); setStage('results');
      resultsAt.current = Date.now();
      track('results_viewed', { timeToResultsMs: startedAt.current ? Date.now() - startedAt.current : undefined, resultCount: result.options.length });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 850);
  };

  const choose = (journey: JourneyOption) => {
    setSelected(journey); setStage('booking');
    track('journey_selected', { journeyId: journey.id, timeToSelectionMs: resultsAt.current ? Date.now() - resultsAt.current : undefined });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tryDemo = () => { setMode('ai'); setQuery(DEMO_PROMPT); setError(''); document.getElementById('journey-query')?.focus(); };
  const reset = () => { setStage('home'); setIntent(null); setOutcome(null); setSelected(null); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <main className="min-h-screen bg-cream text-ink">
      <Header onHome={reset} mobileOpen={mobileNav} setMobileOpen={setMobileNav} />
      {stage === 'home' ? <HomeSearch mode={mode} setMode={setMode} query={query} setQuery={setQuery} structured={structured} setStructured={setStructured} error={error} tryDemo={tryDemo} submitAI={submitAI} submitStructured={submitStructured} /> : null}
      {stage === 'constraints' && intent ? <ConstraintPanel intent={intent} onChange={setIntent} onSearch={search} onBack={() => setStage('home')} /> : null}
      {stage === 'searching' && intent ? <Searching intent={intent} /> : null}
      {stage === 'results' && intent && outcome ? <Results intent={intent} outcome={outcome} onEdit={() => setStage('constraints')} onChoose={choose} onDemo={() => { setQuery(DEMO_PROMPT); setStage('home'); }} /> : null}
      {stage === 'booking' && intent && selected ? <Booking intent={intent} journey={selected} onBack={() => setStage('results')} onHandoff={() => { setStage('handoff'); track('booking_handoff_clicked', { journeyId: selected.id }); }} /> : null}
      {stage === 'handoff' && intent && selected ? <Handoff journey={selected} intent={intent} onChange={() => setStage('results')} onHome={reset} /> : null}
    </main>
  );
}

function Header({ onHome, mobileOpen, setMobileOpen }: { onHome: () => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  return <header className="site-header"><button className="brand" type="button" onClick={onHome} aria-label="RailEase home"><span className="brand-mark"><TrainFront size={21} /></span><span>RailEase</span></button><nav className={mobileOpen ? 'mobile-open' : ''} aria-label="Primary navigation"><button type="button" onClick={onHome}>Plan journey</button><button type="button" onClick={() => alert('My trips will be available when booking integration is added.')}>My trips</button><button type="button" onClick={() => alert('RailEase explains railway choices in plain language as you plan.')}>Help</button><button type="button" className="language"><Languages size={17} /> EN</button></nav><button className="menu-button" type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu" aria-expanded={mobileOpen}>{mobileOpen ? <X /> : <Menu />}</button></header>;
}

type HomeProps = {
  mode: SearchMode; setMode: (mode: SearchMode) => void; query: string; setQuery: (query: string) => void;
  structured: typeof emptyStructured; setStructured: (value: typeof emptyStructured) => void; error: string; tryDemo: () => void; submitAI: () => void; submitStructured: () => void;
};

function HomeSearch({ mode, setMode, query, setQuery, structured, setStructured, error, tryDemo, submitAI, submitStructured }: HomeProps) {
  return <section className="hero-shell"><div className="hero-copy"><p className="eyebrow"><span /> Journey planning, thoughtfully simplified</p><h1>Where do you need <em>to go?</em></h1><p className="lede">Tell us what matters. We’ll find the journeys that actually work for you.</p></div>
    <section id="planner" className="planner-card" aria-labelledby="planner-title"><div className="planner-tabs" role="tablist" aria-label="Journey search method"><button role="tab" aria-selected={mode === 'ai'} onClick={() => { setMode('ai'); track('journey_started', { mode: 'ai' }); }}><Sparkles size={17} /> Plan with AI</button><button role="tab" aria-selected={mode === 'structured'} onClick={() => { setMode('structured'); track('journey_started', { mode: 'structured' }); }}><MapPin size={17} /> Search trains</button></div>
      {mode === 'ai' ? <div className="planner-body"><div className="planner-heading"><div><p className="section-label">Describe your journey</p><h2 id="planner-title">What would make this trip work for you?</h2></div><button className="demo-button" type="button" onClick={tryDemo}>Try demo journey</button></div><label className="sr-only" htmlFor="journey-query">Describe your journey</label><textarea id="journey-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="I need to reach Jaipur by Friday afternoon with my parents and I don’t want a waitlisted ticket." rows={5} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitAI(); }} />{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="planner-actions"><p>Your preferences stay editable before we search.</p><button className="primary-button" type="button" onClick={submitAI}>Understand my journey <ArrowRight size={18} /></button></div></div> : <StructuredSearch value={structured} onChange={setStructured} onSubmit={submitStructured} error={error} />}
    </section>
    {mode === 'ai' ? <div className="sample-row" aria-label="Example journey prompts"><span>Try asking</span>{SAMPLE_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => setQuery(prompt)}>{prompt}</button>)}</div> : null}
    <div className="trust-row"><p><strong>Less searching.</strong> More confident choices.</p><p>Compares dates, stations, classes, comfort and availability—together.</p></div>
  </section>;
}

function StructuredSearch({ value, onChange, onSubmit, error }: { value: typeof emptyStructured; onChange: (value: typeof emptyStructured) => void; onSubmit: () => void; error: string }) {
  return <div className="planner-body structured-body"><div className="planner-heading"><div><p className="section-label">Traditional search</p><h2 id="planner-title">Start with the journey details you know.</h2></div></div><div className="structured-grid"><label>From<input value={value.origin} onChange={(event) => onChange({ ...value, origin: event.target.value })} /></label><button className="swap-button" type="button" aria-label="Swap origin and destination" onClick={() => onChange({ ...value, origin: value.destination, destination: value.origin })}>⇄</button><label>To<input value={value.destination} onChange={(event) => onChange({ ...value, destination: event.target.value })} /></label><label>Travel date<input type="date" value={value.date} onChange={(event) => onChange({ ...value, date: event.target.value })} /></label><label>Travellers<input type="number" min="1" max="8" value={value.passengers} onChange={(event) => onChange({ ...value, passengers: Number(event.target.value) })} /></label></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="planner-actions"><p>After search, we’ll ask what matters most and rank the options around it.</p><button className="primary-button" type="button" onClick={onSubmit}>Continue <ArrowRight size={18} /></button></div></div>;
}

function Searching({ intent }: { intent: JourneyIntent }) {
  const checks = ['Preferred and nearby dates', 'Bengaluru and Jaipur stations', 'Available trains and classes', 'Confirmation likelihood'];
  return <section className="searching-screen" role="status" aria-live="polite"><div className="search-illustration"><span className="track-line" /><span className="moving-train"><TrainFront size={27} /></span></div><p className="screen-kicker">{intent.originCity} → {intent.destinationCity}</p><h1>Finding journeys that <em>actually work</em> for you…</h1><p>We’re checking the combinations you shouldn’t have to search one by one.</p><div className="search-checks">{checks.map((check, index) => <span key={check} style={{ animationDelay: `${index * 120}ms` }}><Check size={16} /> {check}</span>)}</div></section>;
}

function Results({ intent, outcome, onEdit, onChoose, onDemo }: { intent: JourneyIntent; outcome: SearchOutcome; onEdit: () => void; onChoose: (journey: JourneyOption) => void; onDemo: () => void }) {
  if (!outcome.options.length) return <section className="empty-state screen-shell"><Search size={32} /><p className="screen-kicker">No direct journeys match yet</p><h1>We found practical ways to broaden the search.</h1><p>RailEase won’t leave you at “no results.” Try one of these adjustments:</p><ul>{outcome.alternatives.map((item) => <li key={item}><Check /> {item}</li>)}</ul><div><button className="secondary-button" onClick={onEdit}>Edit journey</button><button className="primary-button" onClick={onDemo}>Try demo journey</button></div></section>;
  return <section className="results-screen"><div className="results-header"><div><button type="button" className="back-link" onClick={onEdit}><ArrowLeft size={15} /> Edit journey</button><p className="screen-kicker">Your strongest options</p><h1>{intent.originCity} <span>→</span> {intent.destinationCity}</h1><p>Here are the journeys that best match what matters to you.</p></div><div className="journey-summary"><span><CalendarDays size={16} /> Fri, 28 Aug</span><span><Users size={16} /> {intent.passengerCount} travellers</span>{intent.confirmedOnly ? <span><ShieldCheck size={16} /> Confirmed preferred</span> : null}</div></div><div className="results-layout"><div className="journey-list">{outcome.options.map((journey, index) => <JourneyCard key={journey.id} journey={journey} intent={intent} index={index} onChoose={onChoose} />)}{outcome.otherOptions.length ? <details className="other-options"><summary>Other options we considered <span>{outcome.otherOptions.length}</span></summary><p>These journeys ranked lower because they miss a priority such as your arrival deadline or seat certainty.</p>{outcome.otherOptions.map((item) => <div key={item.id}><strong>{item.trainName} · {item.classOption.code}</strong><span>{item.tradeoffs[0] ?? 'Lower overall preference match'}</span></div>)}</details> : null}</div><PriorityPanel intent={intent} considered={outcome.considered} /></div><ContextQuestions journey={outcome.options[0]} intent={intent} /></section>;
}

function Booking({ intent, journey, onBack, onHandoff }: { intent: JourneyIntent; journey: JourneyOption; onBack: () => void; onHandoff: () => void }) {
  return <section className="booking-screen screen-shell"><button className="back-link" type="button" onClick={onBack}><ArrowLeft size={15} /> Back to results</button><div className="booking-success"><span><Check size={28} /></span><p className="screen-kicker">Your journey is ready</p><h1>{intent.originCity} <em>to</em> {intent.destinationCity}</h1><p>You’ve chosen a journey that fits the priorities you set.</p></div><div className="booking-ticket"><div className="ticket-head"><span>Selected journey</span><strong>{journey.trainName}</strong><small>#{journey.trainNumber}</small></div><div className="ticket-route"><div><strong>{formatClock(journey.departureDateTime)}</strong><span>{journey.departureStation.code}</span><small>{journey.departureStation.name}</small></div><i /><TrainFront size={25} /><i /><div><strong>{formatClock(journey.arrivalDateTime)}</strong><span>{journey.arrivalStation.code}</span><small>{journey.arrivalStation.name}</small></div></div><div className="ticket-meta"><span><b>Fri, 28 Aug</b>Departure date</span><span><b>{journey.classOption.code}</b>{journey.classOption.name}</span><span><b>{intent.passengerCount}</b>Travellers</span><span><b>₹{journey.totalFare.toLocaleString('en-IN')}</b>Estimated total</span></div></div><div className="booking-why"><h2>Why this works</h2>{journey.reasons.slice(0, 4).map((reason) => <span key={reason}><Check /> {reason}</span>)}</div><div className="booking-actions"><p>This prototype will not open or submit a real railway booking.</p><button className="primary-button" type="button" onClick={onHandoff}>Continue to IRCTC booking <ArrowRight size={18} /></button></div></section>;
}

function Handoff({ journey, intent, onChange, onHome }: { journey: JourneyOption; intent: JourneyIntent; onChange: () => void; onHome: () => void }) {
  return <section className="handoff-screen screen-shell"><div className="handoff-icon"><Check size={38} /></div><p className="screen-kicker">Prototype handoff complete</p><h1>Your confident choice is ready.</h1><p>The production experience would now securely hand this selected journey to IRCTC’s reservation flow.</p><div className="handoff-summary"><TrainFront size={24} /><div><strong>{journey.trainName}</strong><span>{intent.originCity} → {intent.destinationCity} · {journey.classOption.code} · {intent.passengerCount} travellers</span></div><b>₹{journey.totalFare.toLocaleString('en-IN')}</b></div><div className="handoff-actions"><button className="secondary-button" type="button" onClick={onChange}>Change journey</button><button className="primary-button" type="button" onClick={onHome}>Plan another trip</button></div><p className="prototype-disclaimer"><CircleHelp size={15} /> No live booking, payment or passenger data was sent.</p></section>;
}

const formatClock = (iso: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(iso));

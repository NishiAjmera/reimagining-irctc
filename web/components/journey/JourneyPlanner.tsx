'use client';

import { ArrowLeft, ArrowRight, CalendarDays, Check, Languages, LockKeyhole, MapPin, Menu, Search, ShieldCheck, TrainFront, UserRound, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { cityNames } from '@/lib/data/stations';
import { intentParser } from '@/lib/intent/parser';
import { rankJourneys } from '@/lib/ranking/rankJourneys';
import type { JourneyIntent, JourneyOption, SearchOutcome } from '@/types/journey';
import { ConstraintPanel } from './ConstraintPanel';
import { ContextQuestions } from './ContextQuestions';
import { JourneyCard } from './JourneyCard';
import { PriorityPanel } from './PriorityPanel';

type Stage = 'home' | 'constraints' | 'searching' | 'results' | 'booking' | 'handoff';
type SearchMode = 'describe' | 'structured';
type DataSource = 'sample' | 'railradar';

const ACCESS_DIGESTS = {
  email: '52d650d5ee686b8a810429e5ef84cc994c011659eb6018e37ec15962b4d260ca',
  password: '81fae0181799f34c87ac3c4e6315b7a071d9070788f0f0948cdf22c4e9c150c1',
} as const;

export const DEMO_PROMPT = "I need to travel from Bengaluru to Jaipur next Friday for a wedding. I need to reach by 4 PM. We’re three people including my mother, and I don’t want a waitlisted ticket.";

const emptyStructured = { origin: 'Indore', destination: 'Delhi', date: '2026-08-29', passengers: 1 };

export function JourneyPlanner() {
  const [stage, setStage] = useState<Stage>('home');
  const [authenticated, setAuthenticated] = useState(false);
  const [mode, setMode] = useState<SearchMode>('describe');
  const [query, setQuery] = useState('');
  const [structured, setStructured] = useState(emptyStructured);
  const [intent, setIntent] = useState<JourneyIntent | null>(null);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('sample');
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

  const search = async () => {
    if (!intent) return;
    setStage('searching'); track('constraints_edited');
    const startedSearchingAt = Date.now();
    try {
      const response = await fetch('/api/trains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(intent) });
      if (!response.ok) throw new Error('Search unavailable');
      const payload = await response.json() as { outcome: SearchOutcome; source: DataSource };
      const remainingDelay = Math.max(0, 650 - (Date.now() - startedSearchingAt));
      await new Promise((resolve) => window.setTimeout(resolve, remainingDelay));
      setOutcome(payload.outcome); setDataSource(payload.source); setStage('results');
      resultsAt.current = Date.now();
      track('results_viewed', { timeToResultsMs: startedAt.current ? Date.now() - startedAt.current : undefined, resultCount: payload.outcome.options.length, source: payload.source });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      const result = rankJourneys(intent);
      setOutcome(result); setDataSource('sample'); setStage('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const choose = (journey: JourneyOption) => {
    setSelected(journey); setStage('booking');
    track('journey_selected', { journeyId: journey.id, timeToSelectionMs: resultsAt.current ? Date.now() - resultsAt.current : undefined });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tryDemo = () => { setMode('describe'); setQuery(DEMO_PROMPT); setError(''); document.getElementById('journey-query')?.focus(); };
  const reset = () => { setStage('home'); setIntent(null); setOutcome(null); setSelected(null); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <main className="min-h-screen bg-cream text-ink">
      {!authenticated ? <DemoLogin onSuccess={() => setAuthenticated(true)} /> : null}
      {authenticated ? <Header onHome={reset} onSignOut={() => { reset(); setAuthenticated(false); }} mobileOpen={mobileNav} setMobileOpen={setMobileNav} /> : null}
      {authenticated ? <>
      {stage === 'home' ? <HomeSearch mode={mode} setMode={setMode} query={query} setQuery={setQuery} structured={structured} setStructured={setStructured} error={error} tryDemo={tryDemo} submitAI={submitAI} submitStructured={submitStructured} /> : null}
      {stage === 'constraints' && intent ? <ConstraintPanel intent={intent} onChange={setIntent} onSearch={search} onBack={() => setStage('home')} /> : null}
      {stage === 'searching' && intent ? <Searching intent={intent} /> : null}
      {stage === 'results' && intent && outcome ? <Results intent={intent} outcome={outcome} dataSource={dataSource} onEdit={() => setStage('constraints')} onChoose={choose} onDemo={() => { setQuery(DEMO_PROMPT); setStage('home'); }} /> : null}
      {stage === 'booking' && intent && selected ? <Booking intent={intent} journey={selected} onBack={() => setStage('results')} onHandoff={() => { setStage('handoff'); track('booking_handoff_clicked', { journeyId: selected.id }); }} /> : null}
      {stage === 'handoff' && intent && selected ? <Handoff journey={selected} intent={intent} onChange={() => setStage('results')} onHome={reset} /> : null}
      </> : null}
    </main>
  );
}

function DemoLogin({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    const [emailDigest, passwordDigest] = await Promise.all([digest(email.trim().toLowerCase()), digest(password)]);
    if (emailDigest === ACCESS_DIGESTS.email && passwordDigest === ACCESS_DIGESTS.password) { setLoginError(''); onSuccess(); return; }
    setLoginError('Incorrect email or password.');
  };
  return <section className="login-screen"><div className="login-brand"><span className="brand-mark"><TrainFront size={22} /></span><strong>RailEase</strong></div><div className="login-layout"><div className="login-copy"><p>Rail journey planning</p><h1>Plan your train journey with fewer decisions.</h1><span>Compare practical options by timing, availability, comfort and fare.</span></div><form className="login-card" onSubmit={signIn}><div className="login-icon"><LockKeyhole size={21} /></div><h2>Welcome back</h2><p>Sign in to continue.</p><label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{loginError ? <p className="form-error" role="alert">{loginError}</p> : null}<button className="primary-button login-submit" type="submit">Sign in <ArrowRight size={17} /></button></form></div></section>;
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function Header({ onHome, onSignOut, mobileOpen, setMobileOpen }: { onHome: () => void; onSignOut: () => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  return <header className="site-header"><button className="brand" type="button" onClick={onHome} aria-label="RailEase home"><span className="brand-mark"><TrainFront size={21} /></span><span>RailEase</span></button><nav className={mobileOpen ? 'mobile-open' : ''} aria-label="Primary navigation"><button type="button" onClick={onHome}>Plan</button><button type="button" className="language"><Languages size={17} /> EN</button><span className="demo-user"><UserRound size={15} /> Guest</span><button type="button" onClick={onSignOut}>Sign out</button></nav><button className="menu-button" type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu" aria-expanded={mobileOpen}>{mobileOpen ? <X /> : <Menu />}</button></header>;
}

type HomeProps = {
  mode: SearchMode; setMode: (mode: SearchMode) => void; query: string; setQuery: (query: string) => void;
  structured: typeof emptyStructured; setStructured: (value: typeof emptyStructured) => void; error: string; tryDemo: () => void; submitAI: () => void; submitStructured: () => void;
};

function HomeSearch({ mode, setMode, query, setQuery, structured, setStructured, error, tryDemo, submitAI, submitStructured }: HomeProps) {
  return <section className="hero-shell"><div className="hero-copy"><p className="eyebrow">Rail journey planner</p><h1>Plan a train journey.</h1><p className="lede">Tell us what matters and get a short list of practical options.</p></div>
    <section id="planner" className="planner-card" aria-labelledby="planner-title"><div className="planner-tabs" role="tablist" aria-label="Journey search method"><button role="tab" aria-selected={mode === 'describe'} onClick={() => { setMode('describe'); track('journey_started', { mode: 'describe' }); }}>Describe trip</button><button role="tab" aria-selected={mode === 'structured'} onClick={() => { setMode('structured'); track('journey_started', { mode: 'structured' }); }}><MapPin size={16} /> Search by details</button></div>
      {mode === 'describe' ? <div className="planner-body"><div className="planner-heading"><div><p className="section-label">Your trip</p><h2 id="planner-title">Where are you going?</h2></div><button className="demo-button" type="button" onClick={tryDemo}>Use example</button></div><label className="sr-only" htmlFor="journey-query">Describe your journey</label><textarea id="journey-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bengaluru to Jaipur next Friday. Three travellers. Arrive before 4 PM, confirmed seats only." rows={4} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitAI(); }} />{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="planner-actions"><span /><button className="primary-button" type="button" onClick={submitAI}>Continue <ArrowRight size={18} /></button></div></div> : <StructuredSearch value={structured} onChange={setStructured} onSubmit={submitStructured} error={error} />}
    </section>
  </section>;
}

function StructuredSearch({ value, onChange, onSubmit, error }: { value: typeof emptyStructured; onChange: (value: typeof emptyStructured) => void; onSubmit: () => void; error: string }) {
  return <div className="planner-body structured-body"><div className="planner-heading"><div><p className="section-label">Journey details</p><h2 id="planner-title">Search trains</h2></div></div><div className="structured-grid"><label>From<input list="major-cities" value={value.origin} onChange={(event) => onChange({ ...value, origin: event.target.value })} /></label><button className="swap-button" type="button" aria-label="Swap origin and destination" onClick={() => onChange({ ...value, origin: value.destination, destination: value.origin })}>⇄</button><label>To<input list="major-cities" value={value.destination} onChange={(event) => onChange({ ...value, destination: event.target.value })} /></label><label>Date<input type="date" value={value.date} onChange={(event) => onChange({ ...value, date: event.target.value })} /></label><label>Travellers<input type="number" min="1" max="8" value={value.passengers} onChange={(event) => onChange({ ...value, passengers: Number(event.target.value) })} /></label></div><datalist id="major-cities">{cityNames.map((city) => <option value={city} key={city} />)}</datalist>{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="planner-actions"><span /><button className="primary-button" type="button" onClick={onSubmit}>Continue <ArrowRight size={18} /></button></div></div>;
}

function Searching({ intent }: { intent: JourneyIntent }) {
  return <section className="searching-screen" role="status" aria-live="polite"><div className="simple-loader"><TrainFront size={24} /></div><p className="screen-kicker">{intent.originCity} → {intent.destinationCity}</p><h1>Finding suitable journeys…</h1><p>Checking nearby dates, stations and classes.</p></section>;
}

function Results({ intent, outcome, dataSource, onEdit, onChoose, onDemo }: { intent: JourneyIntent; outcome: SearchOutcome; dataSource: DataSource; onEdit: () => void; onChoose: (journey: JourneyOption) => void; onDemo: () => void }) {
  if (!outcome.options.length) return <section className="empty-state screen-shell"><Search size={32} /><p className="screen-kicker">No direct match</p><h1>Try one of these alternatives.</h1><ul>{outcome.alternatives.map((item) => <li key={item}><Check /> {item}</li>)}</ul><div><button className="secondary-button" onClick={onEdit}>Edit journey</button><button className="primary-button" onClick={onDemo}>Use demo trip</button></div></section>;
  return <section className="results-screen"><div className="results-header"><div><button type="button" className="back-link" onClick={onEdit}><ArrowLeft size={15} /> Edit</button><h1>{intent.originCity} <span>→</span> {intent.destinationCity}</h1></div><div className="journey-summary"><span><CalendarDays size={16} /> {formatTravelDate(intent.preferredDate)}</span><span><Users size={16} /> {intent.passengerCount} travellers</span>{intent.confirmedOnly ? <span><ShieldCheck size={16} /> Confirmed only</span> : null}</div></div><div className="results-layout"><div className="journey-list">{outcome.options.map((journey, index) => <JourneyCard key={journey.id} journey={journey} index={index} onChoose={onChoose} />)}{outcome.otherOptions.length ? <details className="other-options"><summary>Other options <span>{outcome.otherOptions.length}</span></summary>{outcome.otherOptions.map((item) => <div key={item.id}><strong>{item.trainName} · {item.classOption.code}</strong><span>{item.tradeoffs[0] ?? 'Lower preference match'}</span></div>)}</details> : null}</div><PriorityPanel intent={intent} /></div><p className="data-note">{dataSource === 'railradar' ? 'Timetables use RailRadar data. Fares and seat status are illustrative.' : 'Sample timetables, fares and seat status.'}</p><ContextQuestions journey={outcome.options[0]} intent={intent} /></section>;
}

function Booking({ intent, journey, onBack, onHandoff }: { intent: JourneyIntent; journey: JourneyOption; onBack: () => void; onHandoff: () => void }) {
  return <section className="booking-screen screen-shell"><button className="back-link" type="button" onClick={onBack}><ArrowLeft size={15} /> Back</button><div className="booking-success"><span><Check size={28} /></span><h1>{intent.originCity} <em>to</em> {intent.destinationCity}</h1></div><div className="booking-ticket"><div className="ticket-head"><span>Selected journey</span><strong>{journey.trainName}</strong><small>#{journey.trainNumber}</small></div><div className="ticket-route"><div><strong>{formatClock(journey.departureDateTime)}</strong><span>{journey.departureStation.code}</span><small>{journey.departureStation.name}</small></div><i /><TrainFront size={25} /><i /><div><strong>{formatClock(journey.arrivalDateTime)}</strong><span>{journey.arrivalStation.code}</span><small>{journey.arrivalStation.name}</small></div></div><div className="ticket-meta"><span><b>{formatTravelDate(intent.preferredDate)}</b>Date</span><span><b>{journey.classOption.code}</b>{journey.classOption.name}</span><span><b>{intent.passengerCount}</b>Travellers</span><span><b>₹{journey.totalFare.toLocaleString('en-IN')}</b>Total</span></div></div><div className="booking-why"><h2>Why it fits</h2>{journey.reasons.slice(0, 3).map((reason) => <span key={reason}><Check /> {reason}</span>)}</div><div className="booking-actions"><span /><button className="primary-button" type="button" onClick={onHandoff}>Continue <ArrowRight size={18} /></button></div></section>;
}

function Handoff({ journey, intent, onChange, onHome }: { journey: JourneyOption; intent: JourneyIntent; onChange: () => void; onHome: () => void }) {
  return <section className="handoff-screen screen-shell"><div className="handoff-icon"><Check size={38} /></div><h1>Journey selected.</h1><p>Reservation is unavailable in this preview.</p><div className="handoff-summary"><TrainFront size={24} /><div><strong>{journey.trainName}</strong><span>{intent.originCity} → {intent.destinationCity} · {journey.classOption.code} · {intent.passengerCount} travellers</span></div><b>₹{journey.totalFare.toLocaleString('en-IN')}</b></div><div className="handoff-actions"><button className="secondary-button" type="button" onClick={onChange}>Change journey</button><button className="primary-button" type="button" onClick={onHome}>Plan another trip</button></div></section>;
}

const formatClock = (iso: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(iso));
const formatTravelDate = (date: string) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

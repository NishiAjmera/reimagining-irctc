'use client';

import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, CreditCard, GripVertical, Languages, Landmark, LockKeyhole, MapPin, Menu, PanelLeftClose, Search, Send, ShieldCheck, Smartphone, TicketCheck, TrainFront, UserRound, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { cityNames } from '@/lib/data/stations';
import { explainQuestion, suggestedQuestions } from '@/lib/explanation/recommendation';
import { intentParser } from '@/lib/intent/parser';
import { rankJourneys } from '@/lib/ranking/rankJourneys';
import type { JourneyIntent, JourneyOption, SearchOutcome } from '@/types/journey';
import { ConstraintPanel } from './ConstraintPanel';
import { ContextQuestions } from './ContextQuestions';
import { JourneyCard } from './JourneyCard';
import { PriorityPanel } from './PriorityPanel';

type Stage = 'home' | 'chat' | 'constraints' | 'searching' | 'results' | 'booking' | 'payment' | 'confirmed';
type SearchMode = 'describe' | 'structured';
type DataSource = 'sample' | 'railradar';
type PassengerDetails = { name: string; age: string; gender: string; berth: string };
type BookingDetails = { passengers: PassengerDetails[]; email: string; phone: string };

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
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [bookingOrigin, setBookingOrigin] = useState<'chat' | 'results'>('results');
  const [error, setError] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const startedAt = useRef<number | null>(null);
  const resultsAt = useRef<number | null>(null);

  useEffect(() => { track('journey_started'); startedAt.current = Date.now(); }, []);

  const submitAI = () => {
    if (!query.trim()) { setError('Tell us where you want to go—or try the demo journey.'); return; }
    setError(''); setStage('chat'); track('intent_submitted', { mode: 'conversation' });
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
    setBookingOrigin(stage === 'chat' ? 'chat' : 'results');
    setSelected(journey);
    setBookingDetails(createBookingDetails(intent?.passengerCount ?? 1));
    setStage('booking');
    track('journey_selected', { journeyId: journey.id, timeToSelectionMs: resultsAt.current ? Date.now() - resultsAt.current : undefined });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tryDemo = () => { setMode('describe'); setQuery(DEMO_PROMPT); setError(''); document.getElementById('journey-query')?.focus(); };
  const reset = () => { setStage('home'); setIntent(null); setOutcome(null); setSelected(null); setBookingDetails(null); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <main className="min-h-screen bg-cream text-ink">
      {!authenticated ? <DemoLogin onSuccess={() => setAuthenticated(true)} /> : null}
      {authenticated ? <Header onHome={reset} onSignOut={() => { reset(); setAuthenticated(false); }} mobileOpen={mobileNav} setMobileOpen={setMobileNav} /> : null}
      {authenticated ? <>
      {stage === 'home' ? <HomeSearch mode={mode} setMode={setMode} query={query} setQuery={setQuery} structured={structured} setStructured={setStructured} error={error} tryDemo={tryDemo} submitAI={submitAI} submitStructured={submitStructured} /> : null}
      {stage === 'chat' ? <ConversationWorkspace initialQuery={query} onIntentChange={setIntent} onChoose={choose} /> : null}
      {stage === 'constraints' && intent ? <ConstraintPanel intent={intent} onChange={setIntent} onSearch={search} onBack={() => setStage('home')} /> : null}
      {stage === 'searching' && intent ? <Searching intent={intent} /> : null}
      {stage === 'results' && intent && outcome ? <Results intent={intent} outcome={outcome} dataSource={dataSource} onEdit={() => setStage('constraints')} onChoose={choose} onDemo={() => { setQuery(DEMO_PROMPT); setStage('home'); }} /> : null}
      {stage === 'booking' && intent && selected && bookingDetails ? <Booking intent={intent} journey={selected} details={bookingDetails} onChange={setBookingDetails} onBack={() => setStage(bookingOrigin)} onContinue={() => { setStage('payment'); track('traveller_details_completed', { journeyId: selected.id }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} /> : null}
      {stage === 'payment' && intent && selected && bookingDetails ? <Payment intent={intent} journey={selected} details={bookingDetails} onBack={() => setStage('booking')} onPaid={() => { setStage('confirmed'); track('sample_payment_completed', { journeyId: selected.id }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} /> : null}
      {stage === 'confirmed' && intent && selected && bookingDetails ? <Confirmation journey={selected} intent={intent} details={bookingDetails} onHome={reset} /> : null}
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

type ChatStep = 'route' | 'date' | 'passengers' | 'preference' | 'confirm';
type ChatMessage = { id: number; role: 'assistant' | 'user'; text: string };
type ChatPanel = 'details' | 'searching' | 'results';

function ConversationWorkspace({ initialQuery, onIntentChange, onChoose }: { initialQuery: string; onIntentChange: (intent: JourneyIntent) => void; onChoose: (journey: JourneyOption) => void }) {
  const initialIntent = intentParser.parse(initialQuery);
  const initialStep = getInitialChatStep(initialQuery, initialIntent);
  const [draft, setDraft] = useState(initialIntent);
  const [step, setStep] = useState<ChatStep>(initialStep);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: 'user', text: initialQuery },
    { id: 2, role: 'assistant', text: chatQuestion(initialStep, initialIntent) },
  ]);
  const [reply, setReply] = useState('');
  const [panel, setPanel] = useState<ChatPanel>('details');
  const [chatOutcome, setChatOutcome] = useState<SearchOutcome | null>(null);
  const [source, setSource] = useState<DataSource>('sample');
  const [chatOpen, setChatOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(420);
  const [resizing, setResizing] = useState(false);
  const threadEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => { onIntentChange(draft); }, [draft, onIntentChange]);
  useEffect(() => { threadEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);
  useEffect(() => {
    if (!resizing) return;
    const resize = (event: PointerEvent) => setChatWidth(Math.round(Math.max(320, Math.min(event.clientX, Math.min(680, window.innerWidth * .58)))));
    const stop = () => setResizing(false);
    window.addEventListener('pointermove', resize);
    window.addEventListener('pointerup', stop, { once: true });
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', stop);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing]);

  const addAssistant = (text: string) => setMessages((current) => [...current, { id: Date.now() + 1, role: 'assistant', text }]);
  const updateDraft = (next: JourneyIntent) => { setDraft(next); setPanel('details'); setChatOutcome(null); };

  const handleReply = (value: string) => {
    const text = value.trim();
    if (!text) return;
    setReply('');
    setMessages((current) => [...current, { id: Date.now(), role: 'user', text }]);

    if (panel === 'results' && chatOutcome?.options[0]) {
      window.setTimeout(() => addAssistant(explainQuestion(text, chatOutcome.options[0], draft)), 160);
      return;
    }

    if (step === 'confirm' && /search|yes|looks good|go ahead/i.test(text)) { void searchFromChat(); return; }
    let nextDraft = draft;
    let nextStep: ChatStep = step;
    if (step === 'route') {
      const parsed = intentParser.parse(`${initialQuery} ${text}`);
      if (!parsed.originCity || !parsed.destinationCity) { addAssistant('Please share both cities, for example “Mumbai to Delhi”.'); return; }
      nextDraft = { ...draft, originCity: parsed.originCity, destinationCity: parsed.destinationCity };
      nextStep = 'date';
    } else if (step === 'date') {
      nextDraft = { ...draft, preferredDate: parseChatDate(text) };
      nextStep = 'passengers';
    } else if (step === 'passengers') {
      const passengerCount = parsePassengerCount(text);
      if (!passengerCount) { addAssistant('How many people are travelling? Enter a number from 1 to 8.'); return; }
      nextDraft = { ...draft, passengerCount };
      nextStep = 'preference';
    } else if (step === 'preference') {
      nextDraft = applyPreference(draft, text);
      nextStep = 'confirm';
    } else {
      addAssistant('You can update the trip details on the right, then search when everything looks right.');
      return;
    }
    updateDraft(nextDraft);
    setStep(nextStep);
    window.setTimeout(() => addAssistant(chatQuestion(nextStep, nextDraft)), 180);
  };

  const searchFromChat = async () => {
    if (!draft.originCity || !draft.destinationCity) { setStep('route'); addAssistant('Which cities are you travelling between?'); return; }
    setPanel('searching');
    addAssistant(`Searching ${draft.originCity} to ${draft.destinationCity}. I’ll keep the best options short.`);
    try {
      const response = await fetch('/api/trains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
      if (!response.ok) throw new Error('Search unavailable');
      const payload = await response.json() as { outcome: SearchOutcome; source: DataSource };
      setChatOutcome(payload.outcome); setSource(payload.source); setPanel('results');
      addAssistant(payload.outcome.options.length ? `I found ${payload.outcome.options.length} useful options. The strongest match is first.` : 'I couldn’t find a direct match. Try changing the date or one of the cities.');
      track('results_viewed', { resultCount: payload.outcome.options.length, source: payload.source, mode: 'conversation' });
    } catch {
      const fallback = rankJourneys(draft);
      setChatOutcome(fallback); setSource('sample'); setPanel('results');
      addAssistant(`I found ${fallback.options.length} sample options. The strongest match is first.`);
    }
  };

  const suggestions = panel === 'results'
    ? suggestedQuestions.slice(0, 3).map((question) => ({ label: question, value: question }))
    : chatSuggestions(step);
  return <section className={`conversation-workspace ${chatOpen ? '' : 'chat-closed'} ${resizing ? 'is-resizing' : ''}`} style={{ '--chat-width': `${chatWidth}px` } as React.CSSProperties} aria-label="Conversational journey planner">
    {!chatOpen ? <button className="chat-reopen" type="button" onClick={() => setChatOpen(true)} aria-expanded="false" aria-controls="journey-chat" aria-label="Open RailEase chat" aria-describedby="chat-reopen-tooltip"><TrainFront size={18} /><span id="chat-reopen-tooltip" role="tooltip">Open chat</span></button> : null}
    {chatOpen ? <div className="chat-resizer" role="separator" aria-label="Resize chat" aria-orientation="vertical" aria-valuemin={320} aria-valuemax={680} aria-valuenow={chatWidth} tabIndex={0} onPointerDown={(event) => { event.preventDefault(); setResizing(true); }} onKeyDown={(event) => { if (event.key === 'ArrowLeft') setChatWidth((width) => Math.max(320, width - 24)); if (event.key === 'ArrowRight') setChatWidth((width) => Math.min(680, width + 24)); }}><GripVertical size={15} /></div> : null}
    <div className="conversation-pane" id="journey-chat" aria-hidden={!chatOpen}>
      <div className="conversation-heading"><span className="conversation-avatar"><TrainFront size={15} /></span><div><strong>RailEase</strong><span>Journey planner</span></div><button className="chat-collapse" type="button" onClick={() => setChatOpen(false)} aria-expanded="true" aria-controls="journey-chat" aria-label="Close chat"><PanelLeftClose size={17} /></button></div>
      <div className="conversation-thread" aria-live="polite">
        {messages.map((message) => <div className={`chat-message ${message.role}`} key={message.id}><span>{message.role === 'assistant' ? <TrainFront size={15} /> : <UserRound size={15} />}</span><p>{message.text}</p></div>)}
        <div ref={threadEnd} />
      </div>
      {panel !== 'searching' ? <div className="chat-compose">
        {suggestions.length ? <div className="chat-suggestions">{suggestions.map((item) => <button type="button" key={item.value} onClick={() => handleReply(item.value)}>{item.label}</button>)}</div> : null}
        <form onSubmit={(event) => { event.preventDefault(); handleReply(reply); }}><label className="sr-only" htmlFor="chat-reply">Reply to RailEase</label><input id="chat-reply" value={reply} onChange={(event) => setReply(event.target.value)} placeholder={step === 'confirm' ? 'Ask a question or change a detail' : 'Type your answer'} /><button type="submit" aria-label="Send reply"><Send size={18} /></button></form>
      </div> : null}
    </div>
    <aside className="journey-panel" aria-label={panel === 'results' ? 'Train search results' : 'Journey details'}>
      {panel === 'details' ? <ChatTripDetails intent={draft} pendingStep={step} onChange={updateDraft} onSearch={() => void searchFromChat()} /> : null}
      {panel === 'searching' ? <div className="panel-searching" role="status"><span className="simple-loader"><TrainFront size={23} /></span><h2>Finding trains</h2><p>{draft.originCity} → {draft.destinationCity}</p></div> : null}
      {panel === 'results' && chatOutcome ? <ConversationResults intent={draft} outcome={chatOutcome} source={source} onEdit={() => { setPanel('details'); setStep('confirm'); addAssistant('Update anything on the right, then search again.'); }} onChoose={onChoose} /> : null}
    </aside>
  </section>;
}

function ChatTripDetails({ intent, pendingStep, onChange, onSearch }: { intent: JourneyIntent; pendingStep: ChatStep; onChange: (intent: JourneyIntent) => void; onSearch: () => void }) {
  const set = <K extends keyof JourneyIntent>(key: K, value: JourneyIntent[K]) => onChange({ ...intent, [key]: value });
  return <div className="chat-trip-details"><p className="section-label">Your journey</p><div className="panel-title"><h2>Trip details</h2><span>{pendingStep === 'confirm' ? 'Ready to search' : 'Needs details'}</span></div>
    <div className="chat-detail-grid"><label>From<input list="chat-major-cities" value={intent.originCity} onChange={(event) => set('originCity', event.target.value)} /></label><label>To<input list="chat-major-cities" value={intent.destinationCity} onChange={(event) => set('destinationCity', event.target.value)} /></label><label>Date<input type="date" value={pendingStep === 'date' || pendingStep === 'route' ? '' : intent.preferredDate} onChange={(event) => set('preferredDate', event.target.value)} /></label><label>Travellers<input type="number" min="1" max="8" value={pendingStep === 'passengers' || pendingStep === 'date' || pendingStep === 'route' ? '' : intent.passengerCount} onChange={(event) => set('passengerCount', Math.max(1, Math.min(8, Number(event.target.value))))} /></label></div>
    <datalist id="chat-major-cities">{cityNames.map((city) => <option value={city} key={city} />)}</datalist>
    <div className="chat-preferences"><label><input type="checkbox" checked={intent.confirmedOnly} onChange={(event) => set('confirmedOnly', event.target.checked)} /> Confirmed seats</label><label><input type="checkbox" checked={intent.seniorTraveller} onChange={(event) => set('seniorTraveller', event.target.checked)} /> Senior traveller</label></div>
    <label className="chat-priority">Priority<select value={intent.rankingPriority} onChange={(event) => set('rankingPriority', event.target.value as JourneyIntent['rankingPriority'])}><option value="best">Best overall</option><option value="confirmation">Seat confirmation</option><option value="price">Lowest fare</option><option value="duration">Shortest time</option><option value="arrival">Arrival time</option></select></label>
    <button className="primary-button panel-search-button" type="button" onClick={onSearch} disabled={pendingStep !== 'confirm' || !intent.originCity || !intent.destinationCity}>Search trains <ArrowRight size={17} /></button>
  </div>;
}

function ConversationResults({ intent, outcome, source, onEdit, onChoose }: { intent: JourneyIntent; outcome: SearchOutcome; source: DataSource; onEdit: () => void; onChoose: (journey: JourneyOption) => void }) {
  return <div className="conversation-results"><div className="conversation-results-head"><button className="back-link" type="button" onClick={onEdit}><ArrowLeft size={15} /> Details</button><div><p className="section-label">Best options</p><h2>{intent.originCity} → {intent.destinationCity}</h2><span>{formatTravelDate(intent.preferredDate)} · {intent.passengerCount} travellers</span></div></div>
    {outcome.options.length ? <div className="journey-list">{outcome.options.map((journey, index) => <JourneyCard key={journey.id} journey={journey} index={index} onChoose={onChoose} />)}</div> : <div className="panel-empty"><Search size={25} /><h2>No direct match</h2><p>Change the date or cities and try again.</p></div>}
    {outcome.otherOptions.length ? <OtherJourneyOptions journeys={outcome.otherOptions} startIndex={outcome.options.length} onChoose={onChoose} /> : null}
    <p className="data-note">{source === 'railradar' ? 'Timetables use RailRadar data. Fares and seat status are illustrative.' : 'Sample timetables, fares and seat status.'}</p>
  </div>;
}

function getInitialChatStep(query: string, intent: JourneyIntent): ChatStep {
  if (!intent.originCity || !intent.destinationCity) return 'route';
  if (!/(today|tomorrow|next\s+\w+|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i.test(query)) return 'date';
  if (!/(\d+|one|two|three|four|five|six|seven|eight)\s+(people|travellers?|passengers?)/i.test(query)) return 'passengers';
  if (!/(confirmed|waitlist|cheap|budget|fare|fast|short|arrive|reach|senior|mother|father|comfort)/i.test(query)) return 'preference';
  return 'confirm';
}

function chatQuestion(step: ChatStep, intent: JourneyIntent) {
  if (step === 'route') return 'I can help with that. Which cities are you travelling between?';
  if (step === 'date') return `Got it — ${intent.originCity} to ${intent.destinationCity}. What date would you like to travel?`;
  if (step === 'passengers') return 'How many people are travelling?';
  if (step === 'preference') return 'What matters most: confirmed seats, lowest fare, or shortest travel time?';
  return 'I’ve put the trip together on the right. Does everything look right?';
}

function chatSuggestions(step: ChatStep) {
  if (step === 'date') return [{ label: 'Fri, 28 Aug', value: '2026-08-28' }, { label: 'Sat, 29 Aug', value: '2026-08-29' }];
  if (step === 'passengers') return [1, 2, 3, 4].map((count) => ({ label: `${count}`, value: `${count}` }));
  if (step === 'preference') return [{ label: 'Confirmed seats', value: 'Confirmed seats' }, { label: 'Lowest fare', value: 'Lowest fare' }, { label: 'Shortest time', value: 'Shortest time' }, { label: 'No preference', value: 'No preference' }];
  if (step === 'confirm') return [{ label: 'Search trains', value: 'Search trains' }, { label: 'Change details', value: 'Change details' }];
  return [];
}

function parseChatDate(value: string) {
  const iso = value.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  if (/tomorrow/i.test(value)) { const date = new Date(); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10); }
  return intentParser.parse(`Delhi to Mumbai ${value}`).preferredDate;
}

function parsePassengerCount(value: string) {
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  const match = value.toLowerCase().match(/\b([1-8]|one|two|three|four|five|six|seven|eight)\b/);
  return match ? Number(match[1]) || words[match[1]] : 0;
}

function applyPreference(intent: JourneyIntent, value: string): JourneyIntent {
  if (/confirm/i.test(value)) return { ...intent, confirmedOnly: true, rankingPriority: 'confirmation' };
  if (/fare|cheap|budget/i.test(value)) return { ...intent, rankingPriority: 'price', comfortPreference: 'budget' };
  if (/short|fast/i.test(value)) return { ...intent, rankingPriority: 'duration' };
  return { ...intent, rankingPriority: 'best' };
}

function Searching({ intent }: { intent: JourneyIntent }) {
  return <section className="searching-screen" role="status" aria-live="polite"><div className="simple-loader"><TrainFront size={24} /></div><p className="screen-kicker">{intent.originCity} → {intent.destinationCity}</p><h1>Finding suitable journeys…</h1><p>Checking nearby dates, stations and classes.</p></section>;
}

function Results({ intent, outcome, dataSource, onEdit, onChoose, onDemo }: { intent: JourneyIntent; outcome: SearchOutcome; dataSource: DataSource; onEdit: () => void; onChoose: (journey: JourneyOption) => void; onDemo: () => void }) {
  if (!outcome.options.length) return <section className="empty-state screen-shell"><Search size={32} /><p className="screen-kicker">No direct match</p><h1>Try one of these alternatives.</h1><ul>{outcome.alternatives.map((item) => <li key={item}><Check /> {item}</li>)}</ul><div><button className="secondary-button" onClick={onEdit}>Edit journey</button><button className="primary-button" onClick={onDemo}>Use demo trip</button></div></section>;
  return <section className="results-screen"><div className="results-header"><div><button type="button" className="back-link" onClick={onEdit}><ArrowLeft size={15} /> Edit</button><h1>{intent.originCity} <span>→</span> {intent.destinationCity}</h1></div><div className="journey-summary"><span><CalendarDays size={16} /> {formatTravelDate(intent.preferredDate)}</span><span><Users size={16} /> {intent.passengerCount} travellers</span>{intent.confirmedOnly ? <span><ShieldCheck size={16} /> Confirmed only</span> : null}</div></div><div className="results-layout"><div className="journey-list">{outcome.options.map((journey, index) => <JourneyCard key={journey.id} journey={journey} index={index} onChoose={onChoose} />)}{outcome.otherOptions.length ? <OtherJourneyOptions journeys={outcome.otherOptions} startIndex={outcome.options.length} onChoose={onChoose} /> : null}</div><PriorityPanel intent={intent} /></div><p className="data-note">{dataSource === 'railradar' ? 'Timetables use RailRadar data. Fares and seat status are illustrative.' : 'Sample timetables, fares and seat status.'}</p><ContextQuestions journey={outcome.options[0]} intent={intent} /></section>;
}

function OtherJourneyOptions({ journeys, startIndex, onChoose }: { journeys: JourneyOption[]; startIndex: number; onChoose: (journey: JourneyOption) => void }) {
  return <details className="other-options" open><summary>Other options <span>{journeys.length}</span></summary><div className="other-options-list">{journeys.map((journey, index) => <JourneyCard key={journey.id} journey={journey} index={startIndex + index} onChoose={onChoose} />)}</div></details>;
}

function Booking({ intent, journey, details, onChange, onBack, onContinue }: { intent: JourneyIntent; journey: JourneyOption; details: BookingDetails; onChange: (details: BookingDetails) => void; onBack: () => void; onContinue: () => void }) {
  const updatePassenger = (index: number, key: keyof PassengerDetails, value: string) => onChange({ ...details, passengers: details.passengers.map((passenger, passengerIndex) => passengerIndex === index ? { ...passenger, [key]: value } : passenger) });
  return <section className="booking-screen screen-shell">
    <CheckoutSteps current="travellers" />
    <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={15} /> Change journey</button>
    <div className="checkout-heading"><p className="screen-kicker">Review & book</p><h1>{intent.originCity} to {intent.destinationCity}</h1><p>Confirm the train and add traveller details.</p></div>
    <SelectedJourney journey={journey} intent={intent} />
    <form className="traveller-form" onSubmit={(event) => { event.preventDefault(); onContinue(); }}>
      <div className="form-section-heading"><div><p className="section-label">Travellers</p><h2>Passenger details</h2></div><span>{intent.passengerCount} {intent.passengerCount === 1 ? 'traveller' : 'travellers'}</span></div>
      <div className="passenger-list">{details.passengers.map((passenger, index) => <fieldset className="passenger-card" key={index}><legend>Traveller {index + 1}{index === 0 ? <span>Primary</span> : null}</legend><div className="passenger-grid"><label>Full name<input name={`passenger-${index + 1}-name`} autoComplete={index === 0 ? 'name' : 'off'} value={passenger.name} onChange={(event) => updatePassenger(index, 'name', event.target.value)} placeholder="Name as on ID" required /></label><label>Age<input name={`passenger-${index + 1}-age`} type="number" inputMode="numeric" min="1" max="120" value={passenger.age} onChange={(event) => updatePassenger(index, 'age', event.target.value)} placeholder="Age" required /></label><label>Gender<select name={`passenger-${index + 1}-gender`} value={passenger.gender} onChange={(event) => updatePassenger(index, 'gender', event.target.value)} required><option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label><label>Berth preference<select name={`passenger-${index + 1}-berth`} value={passenger.berth} onChange={(event) => updatePassenger(index, 'berth', event.target.value)}><option value="No preference">No preference</option><option>Lower</option><option>Middle</option><option>Upper</option><option>Side lower</option><option>Side upper</option></select></label></div></fieldset>)}</div>
      <div className="contact-card"><div><p className="section-label">Booking updates</p><h2>Contact details</h2><p>Tickets and journey alerts will be sent here.</p></div><div className="contact-grid"><label>Email<input name="email" type="email" autoComplete="email" value={details.email} onChange={(event) => onChange({ ...details, email: event.target.value })} placeholder="you@example.com" required /></label><label>Mobile number<input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={details.phone} onChange={(event) => onChange({ ...details, phone: event.target.value })} placeholder="10-digit mobile number" pattern="[0-9]{10}" required /></label></div></div>
      <div className="booking-actions"><p><ShieldCheck size={15} /> Your details stay on this device.</p><button className="primary-button" type="submit">Continue to payment <ArrowRight size={18} /></button></div>
    </form>
  </section>;
}

function SelectedJourney({ journey, intent, compact = false }: { journey: JourneyOption; intent: JourneyIntent; compact?: boolean }) {
  return <article className={`booking-ticket ${compact ? 'compact' : ''}`}><div className="ticket-head"><span>Selected journey</span><strong>{journey.trainName}</strong><small>#{journey.trainNumber}</small></div><div className="ticket-route"><div><strong>{formatClock(journey.departureDateTime)}</strong><span>{formatDateTime(journey.departureDateTime)}</span><b>{journey.departureStation.code}</b><small>{journey.departureStation.name}</small></div><div className="ticket-duration"><span><Clock3 size={14} /> {formatDuration(journey.durationMinutes)}</span><i /><em>{journey.tags.includes('overnight') ? 'Overnight' : 'Day journey'}</em></div><div><strong>{formatClock(journey.arrivalDateTime)}</strong><span>{formatDateTime(journey.arrivalDateTime)}</span><b>{journey.arrivalStation.code}</b><small>{journey.arrivalStation.name}</small></div></div><div className="ticket-meta"><span><b>{formatTravelDate(intent.preferredDate)}</b>Date</span><span><b>{journey.classOption.code}</b>{journey.classOption.name}</span><span><b>{intent.passengerCount}</b>Travellers</span><span><b>₹{journey.totalFare.toLocaleString('en-IN')}</b>Base fare</span></div></article>;
}

function CheckoutSteps({ current }: { current: 'travellers' | 'payment' | 'confirmed' }) {
  const active = current === 'travellers' ? 1 : current === 'payment' ? 2 : 3;
  return <ol className="checkout-steps" aria-label="Booking progress"><li className={active >= 1 ? 'active' : ''}><span>{active > 1 ? <Check size={13} /> : '1'}</span>Travellers</li><li className={active >= 2 ? 'active' : ''}><span>{active > 2 ? <Check size={13} /> : '2'}</span>Payment</li><li className={active >= 3 ? 'active' : ''}><span>3</span>Confirmation</li></ol>;
}

function Payment({ journey, intent, details, onBack, onPaid }: { journey: JourneyOption; intent: JourneyIntent; details: BookingDetails; onBack: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState<'upi' | 'card' | 'bank'>('upi');
  const [processing, setProcessing] = useState(false);
  const fee = intent.passengerCount * 59;
  const payable = journey.totalFare + fee;
  const pay = (event: React.FormEvent) => { event.preventDefault(); setProcessing(true); window.setTimeout(onPaid, 900); };
  return <section className="payment-screen screen-shell"><CheckoutSteps current="payment" /><button className="back-link" type="button" onClick={onBack}><ArrowLeft size={15} /> Traveller details</button><div className="checkout-heading"><p className="screen-kicker">Secure checkout</p><h1>Complete your payment</h1><p>Review the fare and choose a payment method.</p></div><div className="payment-layout"><form className="payment-card" onSubmit={pay}><fieldset className="payment-methods"><legend>Payment method</legend><label className={method === 'upi' ? 'selected' : ''}><input type="radio" name="payment-method" value="upi" checked={method === 'upi'} onChange={() => setMethod('upi')} /><Smartphone size={20} /><span><strong>UPI</strong><small>Pay using any UPI app</small></span></label><label className={method === 'card' ? 'selected' : ''}><input type="radio" name="payment-method" value="card" checked={method === 'card'} onChange={() => setMethod('card')} /><CreditCard size={20} /><span><strong>Credit or debit card</strong><small>Visa, Mastercard and RuPay</small></span></label><label className={method === 'bank' ? 'selected' : ''}><input type="radio" name="payment-method" value="bank" checked={method === 'bank'} onChange={() => setMethod('bank')} /><Landmark size={20} /><span><strong>Net banking</strong><small>Choose your bank</small></span></label></fieldset><div className="payment-fields">{method === 'upi' ? <label>UPI ID<input name="upi-id" autoComplete="off" placeholder="name@bank" pattern="[^@\s]+@[^@\s]+" required /></label> : null}{method === 'card' ? <><label className="wide">Card number<input name="card-number" inputMode="numeric" autoComplete="cc-number" placeholder="4111 1111 1111 1111" minLength={12} required /></label><label>Name on card<input name="card-name" autoComplete="cc-name" placeholder="Cardholder name" required /></label><div className="card-pair"><label>Expiry<input name="card-expiry" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" required /></label><label>CVV<input name="card-cvv" type="password" inputMode="numeric" autoComplete="cc-csc" placeholder="•••" minLength={3} maxLength={4} required /></label></div></> : null}{method === 'bank' ? <label>Bank<select name="bank" defaultValue="" required><option value="" disabled>Select your bank</option><option>HDFC Bank</option><option>ICICI Bank</option><option>State Bank of India</option><option>Axis Bank</option><option>Kotak Mahindra Bank</option></select></label> : null}</div><p className="payment-safety"><LockKeyhole size={15} /> Test checkout only. No payment information is stored or charged.</p><button className="primary-button pay-button" type="submit" disabled={processing}>{processing ? 'Processing…' : `Pay ₹${payable.toLocaleString('en-IN')}`} {!processing ? <ArrowRight size={18} /> : null}</button></form><aside className="fare-summary"><SelectedJourney journey={journey} intent={intent} compact /><div className="fare-lines"><h2>Fare summary</h2><span>Ticket fare <b>₹{journey.totalFare.toLocaleString('en-IN')}</b></span><span>Convenience fee <b>₹{fee.toLocaleString('en-IN')}</b></span><span className="fare-total">Total payable <b>₹{payable.toLocaleString('en-IN')}</b></span></div><p>Booking for {details.passengers.map((passenger) => passenger.name).filter(Boolean).join(', ')}.</p></aside></div></section>;
}

function Confirmation({ journey, intent, details, onHome }: { journey: JourneyOption; intent: JourneyIntent; details: BookingDetails; onHome: () => void }) {
  const reference = `RE${journey.trainNumber.slice(-4)}${intent.passengerCount}X`;
  return <section className="confirmation-screen screen-shell"><CheckoutSteps current="confirmed" /><div className="confirmation-mark"><TicketCheck size={36} /></div><p className="screen-kicker">Booking confirmed</p><h1>Your journey is booked.</h1><p>Trip details have been sent to {details.email}.</p><div className="confirmation-reference"><span>Booking reference</span><strong>{reference}</strong><small>Sample reference · no payment was charged</small></div><SelectedJourney journey={journey} intent={intent} /><div className="confirmation-actions"><button className="primary-button" type="button" onClick={onHome}>Plan another journey</button></div></section>;
}

const createBookingDetails = (count: number): BookingDetails => ({ passengers: Array.from({ length: count }, () => ({ name: '', age: '', gender: '', berth: 'No preference' })), email: '', phone: '' });

const formatClock = (iso: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(iso));
const formatDateTime = (iso: string) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(iso));
const formatTravelDate = (date: string) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;

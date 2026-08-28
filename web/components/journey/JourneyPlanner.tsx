'use client';

import { ArrowLeft, ArrowRight, BusFront, Check, CreditCard, GripVertical, Languages, Landmark, LockKeyhole, MapPin, Menu, PanelLeftClose, Search, Send, ShieldCheck, Smartphone, TicketCheck, TrainFront, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { indiaToday, MAX_MESSAGE_LENGTH, missingJourneyFields, type ChatReply } from '@/lib/chat/contract';
import { applyBookingReply, bookingPrompt, confirmBooking, createBookingDetails, explicitBookingConfirmation, mergeBookingDetails, NO_BOOKING_UPDATES, pickJourney, startBooking, updateBooking, type BookingDetails, type BookingFlow, type PassengerDetails } from '@/lib/chat/bookingFlow';
import { ChatBookingPanel } from './ChatBookingPanel';
import { useJourneyChat } from './useJourneyChat';
import { chatResultContext } from '@/lib/chat/results';
import { rankJourneys } from '@/lib/ranking/rankJourneys';
import type { JourneyIntent, JourneyOption, SearchOutcome } from '@/types/journey';
import { CitySelect } from './CitySelect';
import { JourneyCard } from './JourneyCard';
import { IndirectJourneyCard } from './IndirectJourneyCard';
import { RailChatIcon } from './RailChatIcon';
import { JourneyTimeline } from './JourneyTimeline';
import { TravelServices } from './TravelServices';
import { itineraryOverview, journeyDate } from '@/lib/journey/itinerary';
import { JourneyModePicker } from './JourneyModePicker';
import { hasRoadConnection, resolveRailCity } from '@/lib/data/locations';

type Stage = 'home' | 'chat' | 'booking' | 'payment' | 'confirmed';
type SearchMode = 'describe' | 'structured';
type DataSource = 'sample' | 'railradar';

export const DEMO_PROMPT = "I need to travel from Bengaluru to Jaipur next Friday for a wedding. I need to reach by 4 PM. We’re three people including my mother, and I don’t want a waitlisted ticket.";

const emptyStructured = { origin: '', destination: '', date: '', passengers: 1 };

export function JourneyPlanner() {
  const [stage, setStage] = useState<Stage>('home');
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [mode, setMode] = useState<SearchMode>('describe');
  const [query, setQuery] = useState('');
  const [structured, setStructured] = useState(emptyStructured);
  const [intent, setIntent] = useState<JourneyIntent | null>(null);
  const [selected, setSelected] = useState<JourneyOption | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [error, setError] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  useEffect(() => { track('journey_started'); }, []);
  useEffect(() => {
    let active = true;
    fetch('/api/session', { cache: 'no-store', signal: AbortSignal.timeout(10000) })
      .then(async (response) => response.ok ? await response.json() as { authenticated?: boolean } : null)
      .then((session) => { if (active) setAuthenticated(session?.authenticated === true); })
      .catch(() => {})
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, []);

  const submitAI = () => {
    if (!query.trim()) { setError('Tell us where you want to go—or use the journey example.'); return; }
    setError(''); setStage('chat'); track('intent_submitted', { mode: 'conversation' });
  };

  const submitStructured = () => {
    if (!structured.origin || !structured.destination || !structured.date || structured.date < indiaToday() || structured.origin === structured.destination || !Number.isInteger(structured.passengers) || structured.passengers < 1 || structured.passengers > 8) { setError('Choose different locations, a valid travel date and 1–8 travellers.'); return; }
    setError('');
    setIntent({ originCity: structured.origin, destinationCity: structured.destination, preferredDate: structured.date, flexibilityDays: 0, passengerCount: structured.passengers, seniorTraveller: false, confirmedOnly: false, comfortPreference: 'any', rankingPriority: 'best', journeyMode: 'train_only' });
    setStage('chat'); track('intent_submitted', { mode: 'structured' });
  };

  const choose = (journey: JourneyOption) => {
    setSelected(journey);
    setBookingDetails(createBookingDetails(intent?.passengerCount ?? 1));
    setStage('booking');
    track('journey_selected', { journeyId: journey.id });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tryDemo = () => { setMode('describe'); setQuery(DEMO_PROMPT); setError(''); document.getElementById('journey-query')?.focus(); };
  const reset = () => { setStage('home'); setIntent(null); setSelected(null); setBookingDetails(null); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const signOut = async () => {
    setSessionError('');
    try {
      const response = await fetch('/api/session', { method: 'DELETE', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Sign-out failed');
      reset(); setQuery(''); setStructured(emptyStructured); setAuthenticated(false);
    } catch { setSessionError('Unable to sign out. Please try again.'); }
  };

  return (
    <main className="min-h-screen bg-cream text-ink">
      {checkingSession ? <section className="login-screen" role="status">Opening RailEase…</section> : !authenticated ? <DemoLogin onSuccess={() => setAuthenticated(true)} /> : null}
      {authenticated ? <Header onHome={reset} onSignOut={signOut} mobileOpen={mobileNav} setMobileOpen={setMobileNav} /> : null}
      {sessionError ? <p className="form-error" role="alert">{sessionError}</p> : null}
      {authenticated ? <>
      {stage === 'home' ? <HomeSearch mode={mode} setMode={setMode} query={query} setQuery={setQuery} structured={structured} setStructured={setStructured} error={error} tryDemo={tryDemo} submitAI={submitAI} submitStructured={submitStructured} /> : null}
      {stage !== 'home' ? <div hidden={stage !== 'chat'}><ConversationWorkspace initialQuery={mode === 'describe' ? query : ''} initialIntent={mode === 'structured' ? intent : null} onIntentChange={setIntent} onChoose={choose} /></div> : null}
      {stage === 'booking' && intent && selected && bookingDetails ? <Booking intent={intent} journey={selected} details={bookingDetails} onChange={setBookingDetails} onBack={() => setStage('chat')} onContinue={() => { setStage('payment'); track('traveller_details_completed', { journeyId: selected.id }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} /> : null}
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
  const [pending, setPending] = useState(false);
  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true); setLoginError('');
    try {
      const response = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(10000) });
      const session = await response.json() as { authenticated?: boolean; error?: string };
      if (!response.ok || session.authenticated !== true) { setLoginError(typeof session.error === 'string' ? session.error : 'Unable to sign in. Please try again.'); return; }
      setPassword(''); onSuccess();
    } catch { setLoginError('Unable to sign in. Please try again.'); }
    finally { setPending(false); }
  };
  return <section className="login-screen"><div className="login-brand"><span className="brand-mark"><TrainFront size={22} /></span><strong>RailEase</strong></div><div className="login-layout"><div className="login-copy"><p>Rail journey planning</p><h1>Plan your train journey with fewer decisions.</h1><span>Compare practical options by timing, availability, comfort and fare.</span></div><form className="login-card" onSubmit={signIn}><div className="login-icon"><LockKeyhole size={21} /></div><h2>Welcome back</h2><p>Sign in to continue.</p><label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={256} /></label>{loginError ? <p className="form-error" role="alert">{loginError}</p> : null}<button className="primary-button login-submit" type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} /></button></form></div></section>;
}

function Header({ onHome, onSignOut, mobileOpen, setMobileOpen }: { onHome: () => void; onSignOut: () => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  return <header className="site-header"><button className="brand" type="button" onClick={onHome} aria-label="RailEase home"><span className="brand-mark"><TrainFront size={21} /></span><span>RailEase</span></button><nav className={mobileOpen ? 'mobile-open' : ''} aria-label="Primary navigation"><button type="button" onClick={onHome}>Plan</button><button type="button" className="language"><Languages size={17} /> EN</button><span className="demo-user"><UserRound size={15} /> Nishi Ajmera</span><button type="button" onClick={onSignOut}>Sign out</button></nav><button className="menu-button" type="button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu" aria-expanded={mobileOpen}>{mobileOpen ? <X /> : <Menu />}</button></header>;
}

type HomeProps = {
  mode: SearchMode; setMode: (mode: SearchMode) => void; query: string; setQuery: (query: string) => void;
  structured: typeof emptyStructured; setStructured: (value: typeof emptyStructured) => void; error: string; tryDemo: () => void; submitAI: () => void; submitStructured: () => void;
};

function HomeSearch({ mode, setMode, query, setQuery, structured, setStructured, error, tryDemo, submitAI, submitStructured }: HomeProps) {
  return <section className="hero-shell"><div className="hero-copy"><p className="eyebrow">Rail journey planner</p><h1>Plan the journey that works.</h1><p className="lede">Search trains directly or include connections from a nearby town.</p></div>
    <section id="planner" className="planner-card" aria-labelledby="planner-title"><div className="planner-tabs" role="tablist" aria-label="Journey search method"><button role="tab" aria-selected={mode === 'describe'} onClick={() => { setMode('describe'); track('journey_started', { mode: 'describe' }); }}>Describe trip</button><button role="tab" aria-selected={mode === 'structured'} onClick={() => { setMode('structured'); track('journey_started', { mode: 'structured' }); }}><MapPin size={16} /> Search by details</button></div>
      {mode === 'describe' ? <div className="planner-body"><div className="planner-heading"><div><p className="section-label">Your trip</p><h2 id="planner-title">Where are you going?</h2></div><button className="demo-button" type="button" onClick={tryDemo}>Use example</button></div><label className="sr-only" htmlFor="journey-query">Describe your journey</label><textarea id="journey-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Khategaon to Jaipur next Friday. Include a bus to the station." rows={4} maxLength={MAX_MESSAGE_LENGTH} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitAI(); }} />{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="planner-actions"><span /><button className="primary-button" type="button" onClick={submitAI}>Continue <ArrowRight size={18} /></button></div></div> : <StructuredSearch value={structured} onChange={setStructured} onSubmit={submitStructured} error={error} />}
    </section>
  </section>;
}

function StructuredSearch({ value, onChange, onSubmit, error }: { value: typeof emptyStructured; onChange: (value: typeof emptyStructured) => void; onSubmit: () => void; error: string }) {
  return <div className="planner-body structured-body"><div className="planner-heading"><div><p className="section-label">Journey details</p><h2 id="planner-title">Search trains</h2></div></div><div className="structured-grid"><label>From<CitySelect value={value.origin} exclude={value.destination} onChange={(origin) => onChange({ ...value, origin })} /></label><button className="swap-button" type="button" aria-label="Swap origin and destination" onClick={() => onChange({ ...value, origin: value.destination, destination: value.origin })}>⇄</button><label>To<CitySelect value={value.destination} exclude={value.origin} onChange={(destination) => onChange({ ...value, destination })} /></label><label>Date<JourneyDateInput min={indiaToday()} value={value.date} onChange={(date) => onChange({ ...value, date })} /></label><label>Travellers<input type="number" min="1" max="8" value={value.passengers} onChange={(event) => onChange({ ...value, passengers: Number(event.target.value) })} /></label></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<div className="planner-actions"><span /><button className="primary-button" type="button" onClick={onSubmit}>Continue <ArrowRight size={18} /></button></div></div>;
}

function JourneyDateInput({ value, min, onChange }: { value: string; min: string; onChange: (value: string) => void }) {
  // Native date controls can report input before committing a change event.
  const emit = (event: React.FormEvent<HTMLInputElement>) => {
    if (event.currentTarget.value !== value) onChange(event.currentTarget.value);
  };
  return <input type="date" min={min} value={value} onInput={emit} onChange={emit} />;
}

type ChatPanel = 'details' | 'searching' | 'results' | 'booking';

function ConversationWorkspace({ initialQuery, initialIntent, onIntentChange, onChoose }: { initialQuery: string; initialIntent?: JourneyIntent | null; onIntentChange: (intent: JourneyIntent) => void; onChoose: (journey: JourneyOption) => void }) {
  const chat = useJourneyChat(initialQuery, initialIntent, handleAssistantReply);
  const { draft, messages, busy, readyToSearch, addAssistant, setWorkflowContext } = chat;
  const [reply, setReply] = useState('');
  const [panel, setPanel] = useState<ChatPanel>('details');
  const [chatOutcome, setChatOutcome] = useState<SearchOutcome | null>(null);
  const [source, setSource] = useState<DataSource>('sample');
  const [chatOpen, setChatOpen] = useState(Boolean(initialQuery));
  const [chatWidth, setChatWidth] = useState(420);
  const [resizing, setResizing] = useState(false);
  const [booking, setBooking] = useState<BookingFlow | null>(null);
  const bookingRef = useRef<BookingFlow | null>(null);
  const threadEnd = useRef<HTMLDivElement | null>(null);
  const searchRevision = useRef(0);
  const setBookingState = (value: BookingFlow | null) => { bookingRef.current = value; setBooking(value); };
  const workflowPhase = booking?.phase ?? (panel === 'results' ? 'results' : 'planning');
  useEffect(() => {
    setWorkflowContext({ phase: workflowPhase, journeyId: booking?.journey.id ?? null, details: booking?.details ?? null, journeySummary: booking ? JSON.stringify({ train: booking.journey.trainName, class: booking.journey.classOption.code, departure: booking.journey.departureDateTime, arrival: booking.journey.arrivalDateTime, fare: booking.journey.totalFare, availability: booking.journey.classOption.status }) : null });
  }, [booking, workflowPhase, setWorkflowContext]);

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

  const updateDraft = (next: JourneyIntent) => { searchRevision.current += 1; chat.updateDraft(next); setBookingState(null); setPanel('details'); setChatOutcome(null); };
  const finishBooking = (value: string) => {
    const current = bookingRef.current;
    if (!current) return;
    const next = confirmBooking(current, value, `RE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);
    setBookingState(next);
    addAssistant(bookingPrompt(next));
  };
  const handleReply = (value: string) => {
    if (bookingRef.current && explicitBookingConfirmation(value) && !busy) {
      if (chat.addUser(value)) { finishBooking(value); setReply(''); }
    } else if (chat.submit(value)) setReply('');
  };

  function handleAssistantReply(next: JourneyIntent, response: ChatReply, userText: string, changed: boolean) {
    if (changed) { searchRevision.current += 1; setBookingState(null); setChatOutcome(null); setPanel('details'); }
    const action = response.action;
    if (action?.type === 'search' && response.readyToSearch) { void searchFromChat(next); return; }
    if (changed) { addAssistant(response.message); return; }
    if (action?.type === 'select') {
      if (!chatOutcome || changed) { addAssistant('Let’s search your trip first, then choose from the available journeys.'); return; }
      const journey = pickJourney(chatOutcome, action);
      if (!journey) { addAssistant('I couldn’t identify a confirmed recommendation or that class. Please choose one of the journeys on the right.'); return; }
      const flow = startBooking(journey, next.passengerCount);
      const previous = bookingRef.current;
      // Reselecting a class preserves traveller input but always requires a new review.
      const updated = updateBooking(flow, mergeBookingDetails(previous?.details ?? flow.details, response.bookingUpdates ?? NO_BOOKING_UPDATES));
      setBookingState(updated); setPanel('booking'); setChatOpen(true);
      addAssistant(`${journey.trainName} · ${journey.classOption.code}. ${bookingPrompt(updated)}`); return;
    }
    if (action?.type === 'cancel' && bookingRef.current?.phase !== 'completed') {
      setBookingState(null); setPanel(chatOutcome ? 'results' : 'details'); addAssistant('Selection cleared. You can choose another journey.'); return;
    }
    const current = bookingRef.current;
    if (current && !changed) {
      if (current.phase === 'completed') { addAssistant(bookingPrompt(current)); return; }
      const updated = applyBookingReply(current, response.bookingUpdates ?? NO_BOOKING_UPDATES, Boolean(response.needsClarification));
      const edited = JSON.stringify(updated.details) !== JSON.stringify(current.details);
      setBookingState(updated);
      if (response.needsClarification) { addAssistant(response.message); return; }
      if (action?.type === 'confirm' && !edited && current.phase === 'review') { finishBooking(userText); return; }
      addAssistant(edited || action?.type === 'confirm' ? bookingPrompt(updated) : response.message); return;
    }
    addAssistant(response.message);
  }

  const searchFromChat = async (searchDraft = draft) => {
    if (missingJourneyFields(searchDraft).length || panel === 'searching') return;
    const revision = ++searchRevision.current;
    setBookingState(null); chat.setResultContext(undefined);
    setPanel('searching');
    addAssistant(searchDraft.journeyMode === 'complete' ? `Building complete journey options from ${searchDraft.originCity} to ${searchDraft.destinationCity}.` : `Searching trains from ${resolveRailCity(searchDraft.originCity, searchDraft.originRailCity)} to ${resolveRailCity(searchDraft.destinationCity, searchDraft.destinationRailCity)}.`);
    try {
      const response = await fetch('/api/trains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000), body: JSON.stringify(searchDraft) });
      if (!response.ok) throw new Error('Search unavailable');
      const payload = await response.json() as { outcome: SearchOutcome; source: DataSource };
      if (revision !== searchRevision.current) return;
      chat.setResultContext(chatResultContext(payload.outcome, payload.source));
      setChatOutcome(payload.outcome); setSource(payload.source); setPanel('results');
      const matches = payload.outcome.options.length + payload.outcome.indirectOptions.length;
      addAssistant(matches ? `I found ${matches} options matching your details. You can compare them on the right.` : 'No exact match for these preferences. Review the alternatives and their trade-offs, or edit the details.');
      track('results_viewed', { resultCount: payload.outcome.options.length, source: payload.source, mode: 'conversation' });
    } catch {
      if (revision !== searchRevision.current) return;
      const fallback = rankJourneys(searchDraft);
      chat.setResultContext(chatResultContext(fallback, 'sample'));
      setChatOutcome(fallback); setSource('sample'); setPanel('results');
      const matches = fallback.options.length + fallback.indirectOptions.length;
      addAssistant(matches ? `I found ${matches} options matching your details.` : 'No exact match. You can review the alternatives or change your details.');
    }
  };

  const suggestions = chat.suggestions;
  return <section className={`conversation-workspace ${chatOpen ? '' : 'chat-closed'} ${resizing ? 'is-resizing' : ''}`} style={{ '--chat-width': `${chatWidth}px` } as React.CSSProperties} aria-label="Conversational journey planner">
    {!chatOpen ? <button className="chat-launcher chat-reopen" type="button" onClick={() => setChatOpen(true)} aria-expanded="false" aria-controls="journey-chat" aria-label="Open RailEase chat" aria-describedby="chat-reopen-tooltip"><RailChatIcon /><span id="chat-reopen-tooltip" role="tooltip">Open chat</span></button> : null}
    {chatOpen ? <div className="chat-resizer" role="separator" aria-label="Resize chat" aria-orientation="vertical" aria-valuemin={320} aria-valuemax={680} aria-valuenow={chatWidth} tabIndex={0} onPointerDown={(event) => { event.preventDefault(); setResizing(true); }} onKeyDown={(event) => { if (event.key === 'ArrowLeft') setChatWidth((width) => Math.max(320, width - 24)); if (event.key === 'ArrowRight') setChatWidth((width) => Math.min(680, width + 24)); }}><GripVertical size={15} /></div> : null}
    <div className="conversation-pane" id="journey-chat" aria-hidden={!chatOpen}>
      <div className="conversation-heading"><span className="conversation-avatar"><TrainFront size={15} /></span><div><strong>RailEase</strong><span>Journey planner</span></div><button className="chat-collapse" type="button" onClick={() => setChatOpen(false)} aria-expanded="true" aria-controls="journey-chat" aria-label="Close chat"><PanelLeftClose size={17} /></button></div>
      <div className="conversation-thread" aria-live="polite">
        {messages.map((message) => <div className={`chat-message ${message.role}`} key={message.id}><span>{message.role === 'assistant' ? <TrainFront size={15} /> : <UserRound size={15} />}</span><p>{message.text}</p></div>)}
        {busy ? <p className="chat-status" role="status">Planning your journey…</p> : null}
        <div ref={threadEnd} />
      </div>
      {panel !== 'searching' ? <div className="chat-compose">
        {suggestions.length ? <div className="chat-suggestions">{suggestions.map((item) => <button type="button" key={item} disabled={busy} onClick={() => handleReply(item)}>{item}</button>)}</div> : null}
        {chat.error ? <div className="chat-error" role="alert"><p>{chat.error}</p>{chat.retryable ? <button type="button" disabled={busy} onClick={chat.retry}>Try again</button> : null}</div> : null}
        <form onSubmit={(event) => { event.preventDefault(); handleReply(reply); }}><label className="sr-only" htmlFor="chat-reply">Reply to RailEase</label><input id="chat-reply" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={MAX_MESSAGE_LENGTH} disabled={busy} placeholder="Ask a question or change a detail" /><button type="submit" disabled={busy || !reply.trim()} aria-label="Send reply"><Send size={18} /></button></form>
      </div> : null}
    </div>
    <aside className="journey-panel" aria-label={panel === 'results' ? 'Train search results' : panel === 'booking' ? 'Booking review' : 'Journey details'}>
      {panel === 'details' ? <ChatTripDetails intent={draft} ready={readyToSearch && !busy} onChange={updateDraft} onSearch={() => void searchFromChat()} /> : null}
      {panel === 'searching' ? <div className="panel-searching" role="status"><span className="simple-loader"><TrainFront size={23} /></span><h2>Finding trains</h2><p>{draft.originCity} → {draft.destinationCity}</p></div> : null}
      {panel === 'results' && chatOutcome ? <fieldset className="chat-results-lock" disabled={busy} aria-busy={busy}><ConversationResults intent={draft} outcome={chatOutcome} source={source} onEdit={() => { setPanel('details'); addAssistant('Update anything on the right, then search again.'); }} onChoose={onChoose} /></fieldset> : null}
      {panel === 'booking' && booking ? <ChatBookingPanel flow={booking} intent={draft} busy={busy} onChange={(details) => { chat.invalidate(); setBookingState({ ...booking, details, phase: 'collecting', reviewKey: null }); }} onReview={() => { const next = updateBooking(booking, booking.details); setBookingState(next); addAssistant(bookingPrompt(next)); setChatOpen(true); }} onBack={() => { chat.invalidate(); setBookingState(null); setPanel('results'); addAssistant('Choose another journey, or tell me which one you prefer.'); }} /> : null}
    </aside>
  </section>;
}

function ChatTripDetails({ intent, ready, onChange, onSearch }: { intent: JourneyIntent; ready: boolean; onChange: (intent: JourneyIntent) => void; onSearch: () => void }) {
  const set = <K extends keyof JourneyIntent>(key: K, value: JourneyIntent[K]) => onChange({ ...intent, [key]: value });
  return <div className="chat-trip-details"><p className="section-label">Your journey</p><div className="panel-title"><h2>Trip details</h2><span>{missingJourneyFields(intent).length ? 'Needs details' : ready ? 'Ready to search' : 'Review details'}</span></div>
    <div className="chat-detail-grid"><label>From<CitySelect value={intent.originCity} exclude={intent.destinationCity} onChange={(city) => set('originCity', city)} /></label><label>To<CitySelect value={intent.destinationCity} exclude={intent.originCity} onChange={(city) => set('destinationCity', city)} /></label><label>Date<JourneyDateInput min={indiaToday()} value={intent.preferredDate} onChange={(date) => set('preferredDate', date)} /></label><label>Travellers<input type="number" min="1" max="8" value={intent.passengerCount || ''} onChange={(event) => set('passengerCount', event.target.value ? Number(event.target.value) : 0)} /></label></div>
    <div className="chat-preferences"><label><input type="checkbox" checked={intent.confirmedOnly} onChange={(event) => set('confirmedOnly', event.target.checked)} /> Confirmed seats</label><label><input type="checkbox" checked={intent.seniorTraveller} onChange={(event) => set('seniorTraveller', event.target.checked)} /> Senior traveller</label></div>
    <JourneyModePicker intent={intent} onChange={onChange} compact />
    <details className="chat-extra-details"><summary>Timing and preferences</summary><div className="chat-detail-grid">
      <label>Arrive before<input type="time" value={intent.arrivalBefore ?? ''} onChange={(event) => set('arrivalBefore', event.target.value || undefined)} /></label>
      <label>Arrival deadline date<JourneyDateInput min={intent.preferredDate || indiaToday()} value={intent.arrivalDate ?? ''} onChange={(date) => set('arrivalDate', date || undefined)} /></label>
      <label>Leave after<input type="time" value={intent.departureAfter ?? ''} onChange={(event) => set('departureAfter', event.target.value || undefined)} /></label>
      <label>Budget / traveller<input type="number" min="1" max="100000" placeholder="Any" value={intent.budgetMax ?? ''} onChange={(event) => set('budgetMax', event.target.value ? Number(event.target.value) : undefined)} /></label>
      <label>Date flexibility<select value={intent.flexibilityDays} onChange={(event) => set('flexibilityDays', Number(event.target.value))}><option value={0}>Exact date</option><option value={1}>±1 day</option><option value={2}>±2 days</option><option value={3}>±3 days</option></select></label>
      <label>Comfort<select value={intent.comfortPreference} onChange={(event) => set('comfortPreference', event.target.value as JourneyIntent['comfortPreference'])}><option value="any">Any class</option><option value="comfortable">Comfortable</option><option value="budget">Budget</option></select></label>
      <label>Preferred class<select value={intent.preferredClass ?? ''} onChange={(event) => set('preferredClass', event.target.value || undefined)}><option value="">Any class</option><option value="1A">1A · First AC</option><option value="2A">2A · Second AC</option><option value="3A">3A · Third AC</option><option value="3E">3E · AC Economy</option><option value="CC">CC · AC Chair Car</option><option value="SL">SL · Sleeper</option><option value="2S">2S · Second Sitting</option></select></label>
    </div></details>
    <label className="chat-priority">Priority<select value={intent.rankingPriority} onChange={(event) => set('rankingPriority', event.target.value as JourneyIntent['rankingPriority'])}><option value="best">Best overall</option><option value="confirmation">Seat confirmation</option><option value="price">Lowest fare</option><option value="duration">Shortest time</option><option value="arrival">Arrival time</option></select></label>
    <button className="primary-button panel-search-button" type="button" onClick={onSearch} disabled={!ready}>Search trains <ArrowRight size={17} /></button>
  </div>;
}

function ConversationResults({ intent, outcome, source, onEdit, onChoose }: { intent: JourneyIntent; outcome: SearchOutcome; source: DataSource; onEdit: () => void; onChoose: (journey: JourneyOption) => void }) {
  return <div className="conversation-results"><div className="conversation-results-head"><button className="back-link" type="button" onClick={onEdit}><ArrowLeft size={15} /> Details</button><div><p className="section-label">Best options</p><h2>{intent.originCity} → {intent.destinationCity}</h2><span>{formatTravelDate(intent.preferredDate)} · {intent.passengerCount} travellers</span></div></div>
    <JourneyModeNotice intent={intent} />
    {outcome.options.length ? <div className="journey-list">{outcome.options.map((journey, index) => <JourneyCard key={journey.id} journey={journey} index={index} onChoose={onChoose} />)}</div> : <div className="panel-empty"><Search size={25} /><h2>No direct match</h2><p>Change the date or cities and try again.</p></div>}
    {outcome.otherOptions.length ? <OtherJourneyOptions journeys={outcome.otherOptions} startIndex={outcome.options.length} onChoose={onChoose} /> : null}
    {outcome.indirectOptions.length ? <IndirectJourneyOptions journeys={outcome.indirectOptions} onChoose={onChoose} /> : null}
    <p className="data-note">{source === 'railradar' ? 'Timetables use RailRadar. Confirm fares and seat availability before booking.' : 'Planning estimates only. Check current schedules, fares and availability before booking.'}</p>
  </div>;
}

function needsRoadChoice(intent: JourneyIntent) {
  return hasRoadConnection(intent.originCity) || hasRoadConnection(intent.destinationCity);
}

function JourneyModeNotice({ intent }: { intent: JourneyIntent }) {
  if (!needsRoadChoice(intent)) return null;
  const originRail = resolveRailCity(intent.originCity, intent.originRailCity);
  const destinationRail = resolveRailCity(intent.destinationCity, intent.destinationRailCity);
  const railRoute = `${originRail} → ${destinationRail}`;
  return <div className={`journey-mode-notice ${intent.journeyMode === 'complete' ? 'complete' : ''}`}><span>{intent.journeyMode === 'complete' ? <BusFront size={18} /> : <TrainFront size={18} />}</span><div><strong>{intent.journeyMode === 'complete' ? 'Complete journey suggestions' : 'Train-only results'}</strong><p>{intent.journeyMode === 'complete' ? `Bus connections and transfer time are included with the ${railRoute} train.` : `Showing trains for ${railRoute}. You’ll arrange the rest of the journey.`}</p></div></div>;
}

function OtherJourneyOptions({ journeys, startIndex, onChoose }: { journeys: JourneyOption[]; startIndex: number; onChoose: (journey: JourneyOption) => void }) {
  return <details className="other-options" open><summary>Other options <span>{journeys.length}</span></summary><div className="other-options-list">{journeys.map((journey, index) => <JourneyCard key={journey.id} journey={journey} index={startIndex + index} onChoose={onChoose} isOtherOption />)}</div></details>;
}

function IndirectJourneyOptions({ journeys, onChoose }: { journeys: JourneyOption[]; onChoose: (journey: JourneyOption) => void }) {
  return <section className="indirect-options" aria-labelledby="indirect-options-title"><div className="indirect-options-heading"><div><p className="section-label">More ways to travel</p><h2 id="indirect-options-title">Journeys with one change</h2></div><span>{journeys.length} {journeys.length === 1 ? 'option' : 'options'}</span></div><p className="indirect-options-intro">Useful when direct timings or availability do not work. Each leg is shown separately.</p><div className="indirect-options-list">{journeys.map((journey) => <IndirectJourneyCard key={journey.id} journey={journey} onChoose={onChoose} />)}</div></section>;
}

function Booking({ intent, journey, details, onChange, onBack, onContinue }: { intent: JourneyIntent; journey: JourneyOption; details: BookingDetails; onChange: (details: BookingDetails) => void; onBack: () => void; onContinue: () => void }) {
  const updatePassenger = (index: number, key: keyof PassengerDetails, value: string) => onChange({ ...details, passengers: details.passengers.map((passenger, passengerIndex) => passengerIndex === index ? { ...passenger, [key]: value } : passenger) });
  return <section className="booking-screen screen-shell">
    <CheckoutSteps current="travellers" />
    <button className="back-link" type="button" onClick={onBack}><ArrowLeft size={15} /> Change journey</button>
    <div className="checkout-heading"><p className="screen-kicker">Review & book</p><h1>{intent.originCity} to {intent.destinationCity}</h1><p>Confirm the complete journey and add traveller details.</p></div>
    <SelectedJourney journey={journey} intent={intent} />
    <form className="traveller-form" onSubmit={(event) => { event.preventDefault(); onContinue(); }}>
      <div className="form-section-heading"><div><p className="section-label">Travellers</p><h2>Passenger details</h2></div><span>{intent.passengerCount} {intent.passengerCount === 1 ? 'traveller' : 'travellers'}</span></div>
      <div className="passenger-list">{details.passengers.map((passenger, index) => <fieldset className="passenger-card" key={index}><legend>Traveller {index + 1}{index === 0 ? <span>Primary</span> : null}</legend><div className="passenger-grid"><label>Full name<input name={`passenger-${index + 1}-name`} autoComplete={index === 0 ? 'name' : 'off'} value={passenger.name} onChange={(event) => updatePassenger(index, 'name', event.target.value)} placeholder="Name as on ID" required /></label><label>Age<input name={`passenger-${index + 1}-age`} type="number" inputMode="numeric" min="1" max="120" value={passenger.age} onChange={(event) => updatePassenger(index, 'age', event.target.value)} placeholder="Age" required /></label><label>Gender<select name={`passenger-${index + 1}-gender`} value={passenger.gender} onChange={(event) => updatePassenger(index, 'gender', event.target.value)} required><option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label><label>Berth preference<select name={`passenger-${index + 1}-berth`} value={passenger.berth} onChange={(event) => updatePassenger(index, 'berth', event.target.value)}><option value="No preference">No preference</option><option>Lower</option><option>Middle</option><option>Upper</option><option>Side lower</option><option>Side upper</option></select></label></div></fieldset>)}</div>
      <div className="contact-card"><div><p className="section-label">Booking updates</p><h2>Contact details</h2><p>Contact details for your journey.</p></div><div className="contact-grid"><label>Email<input name="email" type="email" autoComplete="email" value={details.email} onChange={(event) => onChange({ ...details, email: event.target.value })} placeholder="you@example.com" required /></label><label>Mobile number<input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={details.phone} onChange={(event) => onChange({ ...details, phone: event.target.value })} placeholder="10-digit mobile number" pattern="[0-9]{10}" required /></label></div></div>
      <div className="booking-actions"><p><ShieldCheck size={15} /> Your details stay on this device.</p><button className="primary-button" type="submit">Review payment options <ArrowRight size={18} /></button></div>
    </form>
  </section>;
}

function SelectedJourney({ journey, intent, compact = false }: { journey: JourneyOption; intent: JourneyIntent; compact?: boolean }) {
  const trip = itineraryOverview(journey);
  return <article className={`booking-ticket compact-booking-ticket ${compact ? 'compact' : ''}`}>
    <div className="ticket-head"><span>Selected journey</span><strong>{trip.origin} to {trip.destination}</strong><small>{trip.segments.map(segment => segment.mode === 'bus' ? 'Bus' : 'Train').join(' + ')}</small></div>
    <JourneyTimeline journey={journey} expanded={!compact} />
    <div className="ticket-meta"><span><b>{journeyDate(trip.departure)}</b>Start date</span><span><b>{journey.classOption.code}</b>{journey.classOption.name}</span><span><b>{intent.passengerCount}</b>Travellers</span><span><b>₹{journey.totalFare.toLocaleString('en-IN')}</b>{journey.roadLegs?.length ? 'Complete fare' : 'Train fare'}</span></div>
  </article>;
}

function CheckoutSteps({ current }: { current: 'travellers' | 'payment' | 'confirmed' }) {
  const active = current === 'travellers' ? 1 : current === 'payment' ? 2 : 3;
  return <ol className="checkout-steps" aria-label="Booking progress"><li className={active >= 1 ? 'active' : ''}><span>{active > 1 ? <Check size={13} /> : '1'}</span>Travellers</li><li className={active >= 2 ? 'active' : ''}><span>{active > 2 ? <Check size={13} /> : '2'}</span>Payment</li><li className={active >= 3 ? 'active' : ''}><span>3</span>Summary</li></ol>;
}

function Payment({ journey, intent, details, onBack, onPaid }: { journey: JourneyOption; intent: JourneyIntent; details: BookingDetails; onBack: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState<'upi' | 'card' | 'bank'>('upi');
  const [processing, setProcessing] = useState(false);
  const fee = intent.passengerCount * 59;
  const payable = journey.totalFare + fee;
  const pay = (event: React.FormEvent) => { event.preventDefault(); setProcessing(true); window.setTimeout(onPaid, 900); };
  return <section className="payment-screen screen-shell"><CheckoutSteps current="payment" /><button className="back-link" type="button" onClick={onBack}><ArrowLeft size={15} /> Traveller details</button><div className="checkout-heading"><p className="screen-kicker">Payment preferences</p><h1>Review your payment options</h1><p>Choose how you would like to pay when you book.</p></div><div className="payment-layout"><form className="payment-card" onSubmit={pay}><fieldset className="payment-methods"><legend>Payment method</legend><label className={method === 'upi' ? 'selected' : ''}><input type="radio" name="payment-method" value="upi" checked={method === 'upi'} onChange={() => setMethod('upi')} /><Smartphone size={20} /><span><strong>UPI</strong><small>Pay using any UPI app</small></span></label><label className={method === 'card' ? 'selected' : ''}><input type="radio" name="payment-method" value="card" checked={method === 'card'} onChange={() => setMethod('card')} /><CreditCard size={20} /><span><strong>Credit or debit card</strong><small>Visa, Mastercard and RuPay</small></span></label><label className={method === 'bank' ? 'selected' : ''}><input type="radio" name="payment-method" value="bank" checked={method === 'bank'} onChange={() => setMethod('bank')} /><Landmark size={20} /><span><strong>Net banking</strong><small>Choose your bank</small></span></label></fieldset><div className="payment-fields">{method === 'upi' ? <label>UPI ID<input name="upi-id" autoComplete="off" placeholder="name@bank" pattern="[^@\s]+@[^@\s]+" required /></label> : null}{method === 'card' ? <><label className="wide">Card number<input name="card-number" inputMode="numeric" autoComplete="cc-number" placeholder="4111 1111 1111 1111" minLength={12} required /></label><label>Name on card<input name="card-name" autoComplete="cc-name" placeholder="Cardholder name" required /></label><div className="card-pair"><label>Expiry<input name="card-expiry" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" required /></label><label>CVV<input name="card-cvv" type="password" inputMode="numeric" autoComplete="cc-csc" placeholder="•••" minLength={3} maxLength={4} required /></label></div></> : null}{method === 'bank' ? <label>Bank<select name="bank" defaultValue="" required><option value="" disabled>Select your bank</option><option>HDFC Bank</option><option>ICICI Bank</option><option>State Bank of India</option><option>Axis Bank</option><option>Kotak Mahindra Bank</option></select></label> : null}</div><p className="payment-safety"><LockKeyhole size={15} /> Payment details stay on this device. Complete payment with your booking provider.</p><button className="primary-button pay-button" type="submit" disabled={processing}>{processing ? 'Preparing journey…' : 'Review journey'} {!processing ? <ArrowRight size={18} /> : null}</button></form><aside className="fare-summary"><SelectedJourney journey={journey} intent={intent} compact /><div className="fare-lines"><h2>Fare summary</h2><span>{journey.roadLegs?.length ? 'Journey fare' : 'Train fare'} <b>₹{journey.totalFare.toLocaleString('en-IN')}</b></span><span>Convenience fee <b>₹{fee.toLocaleString('en-IN')}</b></span><span className="fare-total">Estimated total <b>₹{payable.toLocaleString('en-IN')}</b></span></div><p>Booking for {details.passengers.map((passenger) => passenger.name).filter(Boolean).join(', ')}.</p></aside></div></section>;
}

function Confirmation({ journey, intent, details, onHome }: { journey: JourneyOption; intent: JourneyIntent; details: BookingDetails; onHome: () => void }) {
  const reference = `RE${journey.trainNumber.slice(-4)}${intent.passengerCount}X`;
  return <section className="confirmation-screen screen-shell"><CheckoutSteps current="confirmed" /><div className="confirmation-mark"><TicketCheck size={36} /></div><p className="screen-kicker">Journey summary</p><h1>Your journey is ready.</h1><p>Contact: {details.email} · {details.phone}</p><div className="confirmation-reference"><span>Journey reference</span><strong>{reference}</strong><small>Not a travel ticket · Confirm booking with the provider</small></div><SelectedJourney journey={journey} intent={intent} /><TravelServices journey={journey} /><div className="confirmation-actions"><button className="primary-button" type="button" onClick={onHome}>Plan another journey</button></div></section>;
}

const formatTravelDate = (date: string) => new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

'use client';

import { useEffect, useRef, useState } from 'react';
import { applyIntentPatch, boundedHistory, emptyJourneyDraft, MAX_MESSAGE_LENGTH, missingJourneyFields, type ChatMessage, type ChatReply, type ChatRequest } from '@/lib/chat/contract';
import type { JourneyIntent } from '@/types/journey';

const message = (role: ChatMessage['role'], text: string): ChatMessage => ({ id: crypto.randomUUID(), role, text });
class ChatRequestError extends Error {}

export function useJourneyChat(initialQuery: string, initialIntent?: JourneyIntent | null) {
  const [draft, setDraft] = useState<JourneyIntent>(() => initialIntent ?? emptyJourneyDraft());
  const [messages, setMessages] = useState<ChatMessage[]>(() => initialQuery ? [message('user', initialQuery)] : [message('assistant', 'Review your trip details, or ask me to help plan the journey.')]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [busy, setBusy] = useState(Boolean(initialQuery));
  const [error, setError] = useState('');
  const [retryable, setRetryable] = useState(false);
  const [needsClarification, setNeedsClarification] = useState(false);
  const conversationId = useRef('');
  const version = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const failedRequest = useRef<ChatRequest | null>(null);
  const initial = useRef({ initialQuery, draft, messages });
  const draftRef = useRef(draft);
  const messagesRef = useRef(messages);
  const turns = useRef(0);
  const busyRef = useRef(false);
  const resultContext = useRef<string | undefined>(undefined);

  const addAssistant = (text: string) => {
    const next = [...messagesRef.current, message('assistant', text)];
    messagesRef.current = next;
    setMessages(next);
  };

  const sendRequest = async (request: ChatRequest) => {
    const revision = ++version.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    busyRef.current = true; setBusy(true); setError(''); setRetryable(false);
    failedRequest.current = request;
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.any([abort.signal, AbortSignal.timeout(35000)]), body: JSON.stringify(request) });
      const payload = await response.json() as ChatReply & { error?: string; code?: string };
      if (!response.ok) throw new ChatRequestError(payload.error ?? 'Chat is unavailable. Please try again.');
      if (revision !== version.current) return;
      const next = applyIntentPatch(draftRef.current, payload.patch);
      if (JSON.stringify(next) !== JSON.stringify(draftRef.current)) {
        draftRef.current = next; setDraft(next); resultContext.current = undefined;
      }
      addAssistant(payload.message); setSuggestions(payload.suggestions);
      setNeedsClarification(Boolean(payload.needsClarification));
      failedRequest.current = null;
    } catch (failure) {
      if (abort.signal.aborted || revision !== version.current) return;
      setError(failure instanceof ChatRequestError ? failure.message : 'Chat is temporarily unavailable. Please try again or use trip details.');
      setRetryable(true);
    } finally {
      if (revision === version.current) { busyRef.current = false; setBusy(false); }
    }
  };
  const sendRef = useRef(sendRequest);
  useEffect(() => { sendRef.current = sendRequest; });

  useEffect(() => {
    conversationId.current ||= crypto.randomUUID();
    // Defer one tick so Strict Mode's setup/cleanup does not issue two calls.
    const timer = window.setTimeout(() => {
      if (!initial.current.initialQuery) return;
      turns.current += 1;
      void sendRef.current({ conversationId: conversationId.current, messages: boundedHistory(initial.current.messages), draft: initial.current.draft });
    }, 0);
    return () => { window.clearTimeout(timer); controller.current?.abort(); };
  }, []);

  const submit = (text: string) => {
    if (busyRef.current || !text.trim()) return false;
    if (text.length > MAX_MESSAGE_LENGTH) { setError('Please keep your message under 2,000 characters.'); return false; }
    if (turns.current >= 40) { setError('Please start a new trip to continue chatting, or finish using trip details.'); return false; }
    turns.current += 1;
    const next = [...messagesRef.current, message('user', text.trim())];
    messagesRef.current = next; setMessages(next);
    void sendRequest({ conversationId: conversationId.current, messages: boundedHistory(next), draft: draftRef.current, resultContext: resultContext.current });
    return true;
  };

  const updateDraft = (next: JourneyIntent) => {
    // Manual edits are authoritative; late responses cannot undo them.
    version.current += 1; controller.current?.abort(); busyRef.current = false;
    resultContext.current = undefined;
    setNeedsClarification(false);
    const changed = applyIntentPatch(next, {});
    draftRef.current = changed; setDraft(changed); setBusy(false); setError(''); setRetryable(false); setSuggestions([]); failedRequest.current = null;
  };

  const retry = () => { if (!busyRef.current && failedRequest.current) void sendRequest(failedRequest.current); };
  const setResultContext = (context: string) => { resultContext.current = context; };
  return { draft, messages, suggestions, busy, error, retryable, retry, submit, updateDraft, addAssistant, setResultContext, readyToSearch: !needsClarification && missingJourneyFields(draft).length === 0 };
}

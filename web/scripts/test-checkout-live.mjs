// Opt-in: six bounded Gemini calls. Run with Node --env-file=.env.local
// --experimental-strip-types. Creates an operator-signed test session, never logs it.
import assert from 'node:assert/strict';
import { createSession, sessionCookie } from '../lib/auth/session.ts';

const origin = process.env.RAILEASE_TEST_ORIGIN || 'http://localhost:3000';
assert.ok(['http://localhost:3000', 'https://railease-journey-planner.nishiajmera21.chatgpt.site'].includes(origin));
const cookie = sessionCookie(origin, await createSession(origin, process.env)).split(';')[0];
const headers = { 'Content-Type': 'application/json', origin, cookie };
let draft = { originCity: '', destinationCity: '', preferredDate: '', passengerCount: 0, flexibilityDays: 0, seniorTraveller: false, confirmedOnly: false, comfortPreference: 'any', rankingPriority: 'best' };
let workflow = { phase: 'planning', journeyId: null, details: null, journeySummary: null };
let resultContext;
const messages = [];
const conversationId = `checkout-live-${Date.now()}`;
async function turn(text) {
  messages.push({ role: 'user', text });
  const response = await fetch(`${origin}/api/chat`, { method: 'POST', headers, signal: AbortSignal.timeout(35000), body: JSON.stringify({ conversationId, messages, draft, workflow, resultContext }) });
  const reply = await response.json();
  assert.equal(response.status, 200, `${response.status}: ${reply.code}`);
  for (const [key, value] of Object.entries(reply.patch)) { if (value === null) delete draft[key]; else draft[key] = value; }
  messages.push({ role: 'assistant', text: reply.message });
  console.log(JSON.stringify({ turn: messages.length / 2, action: reply.action.type, ready: reply.readyToSearch, passed: true }));
  return reply;
}
let reply = await turn('Mumbai to Pune on 10 September 2026 for two people. Train only.');
assert.equal(reply.action.type, 'none'); assert.equal(reply.readyToSearch, true);
assert.equal(draft.passengerCount, 2);
reply = await turn('go ahead and serach');
assert.equal(reply.action.type, 'search');
const trains = await fetch(`${origin}/api/trains`, { method: 'POST', headers, body: JSON.stringify(draft) });
assert.equal(trains.status, 200);
const { outcome } = await trains.json();
const selected = outcome.options.find(item => item.classOption.status === 'CONFIRMED');
assert.ok(selected);
resultContext = JSON.stringify({ options: [{ id: selected.id, recommended: true, train: selected.trainName, class: selected.classOption.code, totalFare: selected.totalFare, availability: selected.classOption.status }] });
workflow = { ...workflow, phase: 'results' };
messages.push({ role: 'assistant', text: 'Results are on the right. Which journey would you like?' });
reply = await turn('Pick the recommended journey and book it.');
assert.equal(reply.action.type, 'select'); assert.ok(['recommended', selected.id].includes(reply.action.journeyId));
workflow = { phase: 'collecting', journeyId: selected.id, journeySummary: resultContext, details: { passengers: Array.from({ length: 2 }, () => ({ name: '', age: '', gender: '', berth: 'No preference' })), email: '', phone: '' } };
messages.push({ role: 'assistant', text: 'Please share traveller 1’s full name, age and gender.' });
reply = await turn('Traveller 1 is Asha Test, age 32, female, lower berth. Traveller 2 is Ravi Test, age 34, male, no berth preference.');
assert.deepEqual(reply.patch, {});
assert.equal(reply.bookingUpdates.passengers.length, 2);
for (const update of reply.bookingUpdates.passengers) {
  const { index, ...fields } = update;
  for (const [key, value] of Object.entries(fields)) if (value !== null) workflow.details.passengers[index - 1][key] = value;
}
assert.equal(workflow.details.passengers[0].name, 'Asha Test');
assert.equal(workflow.details.passengers[0].age, '32');
assert.equal(workflow.details.passengers[1].age, '34');
messages.push({ role: 'assistant', text: 'What email and Indian mobile number should we use for booking updates?' });
reply = await turn('Email travel@example.test and phone 9000000000.');
assert.equal(reply.bookingUpdates.email, 'travel@example.test');
assert.equal(reply.bookingUpdates.phone.replace(/\s/g, ''), '9000000000');
workflow.details.email = reply.bookingUpdates.email; workflow.details.phone = reply.bookingUpdates.phone;
workflow.phase = 'review';
messages.push({ role: 'assistant', text: 'Review the final details on the right. Reply Confirm booking to finish, or tell me what to change.' });
reply = await turn('Do not book yet. Change traveller 2 age to 35.');
assert.equal(reply.action.type, 'none');
assert.equal(reply.bookingUpdates.passengers.find(item => item.index === 2)?.age, '35');
assert.deepEqual(reply.patch, {});
console.log(JSON.stringify({ passed: 'Consent-driven search, selection, two-traveller collection, contacts and pre-confirmation correction' }));

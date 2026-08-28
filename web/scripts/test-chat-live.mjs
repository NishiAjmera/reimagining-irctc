// Opt-in, bounded live regression suite. Uses the local app, never reads/logs keys.
import assert from 'node:assert/strict';

const origin = 'http://localhost:3000';
const base = { originCity: '', destinationCity: '', preferredDate: '', passengerCount: 0, flexibilityDays: 0, seniorTraveller: false, confirmedOnly: false, comfortPreference: 'any', rankingPriority: 'best' };
let draft = { ...base };
const messages = [];
const conversationId = `live-regression-${Date.now()}`;
async function turn(text, check, duplicate = false) {
  messages.push({ role: 'user', text });
  const body = JSON.stringify({ conversationId, messages: messages.slice(-16), draft });
  const send = async () => {
    const response = await fetch(`${origin}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body });
    const result = await response.json();
    assert.equal(response.status, 200, `${response.status}: ${result.error}`);
    return result;
  };
  const replies = duplicate ? await Promise.all([send(), send()]) : [await send()];
  if (duplicate) assert.deepEqual(replies[0], replies[1], 'Duplicate responses differ');
  const reply = replies[0];
  for (const [field, value] of Object.entries(reply.patch)) {
    if (value === null) { delete draft[field]; if (field in base) draft[field] = base[field]; }
    else draft[field] = value;
  }
  messages.push({ role: 'assistant', text: reply.message });
  check(reply);
  console.log(JSON.stringify({ pass: text, draft, message: reply.message, duplicate }));
}

await turn('Khategaon to Mandawa on 2026-09-10 for 2 adults. No waitlist.', reply => {
  assert.equal(draft.originCity, 'Khategaon'); assert.equal(draft.destinationCity, 'Mandawa');
  assert.equal(draft.confirmedOnly, true); assert.equal(draft.passengerCount, 2);
  assert.equal(reply.readyToSearch, false); assert.ok(reply.missingFields.includes('journeyMode'));
});
await turn('Include bus connections at both ends. Budget 2000 rupees per person.', reply => {
  assert.equal(draft.journeyMode, 'complete'); assert.equal(draft.budgetMax, 2000); assert.equal(reply.readyToSearch, true);
}, true);
await turn('Actually 3 travellers, and train only; I will arrange the buses. Leave no earlier than 8 pm. I prefer second AC.', reply => {
  assert.equal(draft.passengerCount, 3); assert.equal(draft.journeyMode, 'train_only'); assert.equal(draft.departureAfter, '20:00');
  assert.equal(draft.preferredClass, '2A'); assert.equal(draft.budgetMax, 2000); assert.equal(reply.readyToSearch, true);
});
draft = { ...draft, destinationCity: 'Delhi', preferredDate: '2026-09-12', confirmedOnly: false };
const manualState = JSON.stringify(draft);
await turn('What does RAC mean? Do not change my trip details.', reply => {
  assert.equal(JSON.stringify(draft), manualState); assert.deepEqual(reply.patch, {});
});
await turn('Budget does not matter. Waitlist is fine. Any class and any departure time are okay.', () => {
  assert.equal(draft.budgetMax, undefined); assert.equal(draft.confirmedOnly, false); assert.equal(draft.preferredClass, undefined); assert.equal(draft.departureAfter, undefined);
});
await turn('Change the route to Mumbai to Pune tomorrow for one traveller. Confirmed only, budget 1000 rupees per person.', reply => {
  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 86400000));
  assert.equal(draft.originCity, 'Mumbai'); assert.equal(draft.destinationCity, 'Pune'); assert.equal(draft.preferredDate, tomorrow);
  assert.equal(draft.passengerCount, 1); assert.equal(draft.budgetMax, 1000); assert.equal(draft.confirmedOnly, true); assert.equal(reply.readyToSearch, true);
});
const response = await fetch(`${origin}/api/trains`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
assert.equal(response.status, 200);
const { outcome } = await response.json();
for (const option of [...outcome.options, ...outcome.indirectOptions]) {
  assert.equal(option.departureStation.city, 'Mumbai'); assert.equal(option.arrivalStation.city, 'Pune');
  assert.equal(option.classOption.status, 'CONFIRMED'); assert.ok(option.totalFare <= 1000);
}
console.log(JSON.stringify({ pass: 'Captured trip passed unchanged to search; matching results respect route, fare and availability', matches: outcome.options.length + outcome.indirectOptions.length, alternatives: outcome.otherOptions.length }));

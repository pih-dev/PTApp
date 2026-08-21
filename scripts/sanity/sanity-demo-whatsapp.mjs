#!/usr/bin/env node
// sanity-demo-whatsapp — DEMO MODE MUST NOT MESSAGE A REAL HUMAN.
//
// Why this gate exists (2026-08-21): a closed-test tester opened the app on the
// DEMO dataset, tapped WhatsApp on the invented clients, and two or three of the
// numbers turned out to be REAL PEOPLE'S LINES. The demo phones used live Lebanese
// mobile prefixes (70/71/76/03) with plausible bodies, so "invented" meant invented
// by us, not unassigned by the carrier. Every tester, every store reviewer and every
// screenshot run shares that one dataset, so the blast radius was everybody.
//
// The fix is wa.me with NO phone number — WhatsApp's documented "share this text"
// form. WhatsApp opens, the composed message is fully visible, and the user picks a
// recipient. The feature demos BETTER than it would with a fixed number, nobody is
// contacted unless the tester deliberately chooses them, and no real person's number
// is hardcoded into a repo that is PUBLIC.
//
// This is the BEHAVIOURAL half — it runs the real openWhatsApp under a fake DOM.
// The structural half (one wa.me call site, no second copy of the token strings)
// lives in sanity-backend-split.mjs. Static shape and runtime behaviour are two
// different claims; the source has looked right before while the branch was wrong.

const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  key: i => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
let opened = null;
globalThis.window = { open: (url) => { opened = url; } };

const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { openWhatsApp, TOKEN_KEY, DEMO_TOKEN } = await import(utilsUrl);

let failures = 0;
const assert = (ok, label) => {
  console.log(`  ${ok ? '✓' : '✗'} ${label}${ok ? '' : ` → ${opened}`}`);
  if (!ok) failures++;
};

const client = { name: 'Sami Haddad', nickname: 'Sami', phone: '+96170000001' };
const MSG = 'Hi Sami! Your session is booked.';

console.log('\n[demo] the reviewer / tester path');
store.clear();
localStorage.setItem(TOKEN_KEY, DEMO_TOKEN);
openWhatsApp(client, MSG);
assert(!/wa\.me\/\d/.test(opened), '🔴 no phone number is addressed at all');
assert(!/96170000001/.test(opened), '🔴 the demo client\'s number appears nowhere in the URL');
assert(/text=Hi%20Sami/.test(opened), 'the message still composes — the feature is demonstrated, not disabled');

console.log('\n[real] the PT\'s actual path is untouched');
store.clear();
localStorage.setItem(TOKEN_KEY, 'ghp_arealtokenwouldlooklikethis');
openWhatsApp(client, MSG);
assert(/wa\.me\/96170000001\?text=/.test(opened), 'a signed-in PT still messages the client directly');

// The gate must not depend on a token existing: an identity-only session (Phase 3)
// has no PAT, and its WhatsApp must still address the client.
store.clear();
openWhatsApp(client, MSG);
assert(/wa\.me\/96170000001\?text=/.test(opened), 'no token at all still addresses the client (identity-only sessions)');

console.log(failures
  ? `\n✗ ${failures} assertion(s) FAILED — DO NOT DEPLOY.`
  : '\n✓ demo mode messages nobody; the real path is unchanged.');
process.exit(failures ? 1 : 0);

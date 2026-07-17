// Sanity: suggestBookingTime — booking-form slot suggestion (v2.14.1).
// Rule (spec 2026-07-17): first free slot walking forward from 08:15;
// "free" = start-time not covered by any non-cancelled session's span
// (duration-aware via getOccupiedSlots); the NEW session's own duration is
// deliberately NOT checked (Elie's choice — any free start time qualifies).
// Run: node scripts/sanity/sanity-suggest-time.mjs
const utilsUrl = new URL('../../src/utils.js', import.meta.url).href;
const { suggestBookingTime, TIMES } = await import(utilsUrl);

function assert(cond, msg) {
  if (!cond) { console.error('✗', msg); process.exit(1); }
  console.log('✓', msg);
}

const D = '2026-07-20';
const clients = [{ id: 'c1', name: 'Test Client' }];
const mk = (time, duration = 45, status = 'scheduled', date = D) =>
  ({ id: `s-${date}-${time}`, clientId: 'c1', date, time, duration, status });

// Empty day → 08:15
assert(suggestBookingTime([], clients, D) === '08:15', 'empty day → 08:15');

// 08:15–09:00 booked → 09:00 (session END slot is free; duration-aware skip)
assert(suggestBookingTime([mk('08:15')], clients, D) === '09:00',
  '08:15 x45min booked → 09:00');

// Gap is chosen over "after last": 08:15–09:00 and 10:00–10:45 → 09:00
assert(suggestBookingTime([mk('08:15'), mk('10:00')], clients, D) === '09:00',
  'gap day → 09:00 (first gap, not 10:45)');

// Short gap still qualifies (no duration-fit check): 08:15–09:00 and 09:30 → 09:00
assert(suggestBookingTime([mk('08:15'), mk('09:30')], clients, D) === '09:00',
  '30min gap → 09:00 even though default duration is 45');

// Cancelled sessions don't block: cancelled 08:15 → 08:15
assert(suggestBookingTime([mk('08:15', 45, 'cancelled')], clients, D) === '08:15',
  'cancelled at 08:15 does not block');

// Other days don't block: session on another date → 08:15
assert(suggestBookingTime([mk('08:15', 45, 'scheduled', '2026-07-21')], clients, D) === '08:15',
  'other-date session does not block');

// Contiguous 08:15 → past 22:45 → falls back to early morning (05:00)
const startIdx = TIMES.indexOf('08:15');
const fullPM = TIMES.slice(startIdx).map(tm => mk(tm, 15));
assert(suggestBookingTime(fullPM, clients, D) === '05:00',
  'afternoon full → early-morning fallback 05:00');

// Entire day full → 08:15 (grid shows fully occupied; PT picks manually)
const fullDay = TIMES.map(tm => mk(tm, 15));
assert(suggestBookingTime(fullDay, clients, D) === '08:15',
  'whole day full → 08:15 fallback');

console.log('\nAll suggestBookingTime checks passed.');

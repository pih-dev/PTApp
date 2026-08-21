// ONE deterministic serializer, shared by the mirror and its diff gate.
//
// 🔴 WHY THIS IS A FILE AND NOT TWO INLINE HELPERS:
//    `data jsonb` does not preserve key order or whitespace, so "the same JSON"
//    and "the same bytes" are different claims and every comparison between
//    GitHub and Postgres has to go through the SAME normaliser. Two copies
//    would eventually disagree, and the failure mode is a gate that reports
//    green while a record is missing.
//
// 🔴 AND WHY IT IS HAND-ROLLED:
//    The first version was `JSON.stringify(o, Object.keys(o).sort())`, which
//    reads as "stringify with sorted keys" and is not. An array in the second
//    argument is a replacer ALLOWLIST applied at EVERY depth, so it kept only
//    the top-level key names and discarded every nested field — it compared a
//    173 KB blob against a 2,092-character skeleton and printed
//    "byte-identical". A gate that cannot fail is worse than no gate, because
//    it gets quoted as evidence.

export const normalize = (v) => {
  if (Array.isArray(v)) return `[${v.map(normalize).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${normalize(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
};

// 🔴 THE BACKSTOP, AND IT MUST BE PROPORTIONAL — NOT A FIXED FLOOR.
//    The first version of this compared against a hardcoded 100 KB, which only
//    catches TOTAL collapse. That is the weaker half of the problem: a
//    normaliser defect collapses BOTH sides identically, so the equality check
//    is green, and `counts()` reads the raw objects rather than the normalised
//    string, so that is green too. A bug that dropped every nested
//    `packages[]` and `blocks[]` would leave ~120 KB, clear a 100 KB floor, and
//    print "byte-identical" while package history quietly stopped being
//    mirrored. `normalize` only reorders keys and strips insignificant
//    whitespace, so its output must stay within a few percent of the source —
//    which is a claim that scales, and which a second, smaller coach does not
//    falsely trip.
export const assertRealSize = (str, expectedBytes, label = 'blob') => {
  if (!expectedBytes) return;
  if (str.length >= expectedBytes * 0.9) return;
  throw new Error(
    `Normalised ${label} is ${str.length} chars for ${expectedBytes} bytes of source ` +
    `(${Math.round(100 * str.length / expectedBytes)}%) — the normaliser is dropping content, ` +
    `which is a different emergency from the data being gone.`);
};

// 🔴 DERIVED, never a hardcoded key list. This is the `mergeData` trap in
//    CLAUDE.md wearing a different hat: an explicit list silently ignores a
//    collection added in a later version, and the per-collection count check
//    and the "only in GitHub" diagnostic would both go blind to it on the day
//    it shipped. Union of both sides, so a collection present in only one is
//    itself visible as a mismatch.
export const collectionsOf = (...objs) => {
  const keys = new Set();
  for (const o of objs) for (const [k, v] of Object.entries(o || {})) if (Array.isArray(v)) keys.add(k);
  return [...keys].sort();
};

export const counts = (o, keys) => Object.fromEntries(keys.map(k => [k, o?.[k]?.length ?? 0]));

// The git blob sha1 of a file's contents — the same value the GitHub Contents
// API reports as `sha`. Length equality is NOT content equality: a phone
// pushing between the metadata read and the body read yields a different
// revision that can be exactly as long (a status flip, one changed digit), and
// the archive would then carry bytes nobody can identify. This turns the
// provenance in the log line into something that was actually checked.
export const gitBlobSha = async (body) => {
  const { createHash } = await import('node:crypto');
  const buf = Buffer.from(body, 'utf8');
  return createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
};

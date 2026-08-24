// ─── make-suite2-page.mjs — the audition page ────────────────────────────────
//
// One self-contained HTML page holding all seven pieces, so Pierre can play
// them one after another and pick, on his phone, without downloading anything.
//
// The audio is embedded as base64 (the Artifact CSP blocks every external host,
// so a <source src="..."> to a file would silently fail) at 112 kbps, which
// keeps the whole page around 8 MB against a 16 MB ceiling.
//
// The per-piece surround diagram is NOT decoration: the dot sizes are the
// MEASURED per-channel RMS of that piece's rendered 7.1 file, read back out of
// the wav. So the page shows at a glance that `lantern` barely touches the
// rears and `harbour` wraps right around — which is the thing you actually
// want to know when choosing between them on a surround system.
//
// Run: node scripts/make-suite2-page.mjs   (then publish the printed path)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as O from './lib/orchestra.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = 'C:/projects/_archive/PTApp/branding/2026-08-23-suite2';
const TMP = join(HERE, '..', 'tmp', 'suite2-page');
const OUT = process.env.PAGE_OUT || join(TMP, 'suite.html');
mkdirSync(TMP, { recursive: true });

// The running order is a listening order, not the alphabet: open wide, drop to
// quiet, pick up, hit hardest, then the two duets, then land on the piano.
const ORDER = ['ridge', 'lantern', 'harbour', 'drive', 'weave', 'boulevard', 'ivory'];

// ── read each rendered 7.1 file back and measure it ─────────────────────────
const CH = ['FL', 'FR', 'C', 'LFE', 'SL', 'SR', 'BL', 'BR'];
function measure(path) {
  const b = readFileSync(path);
  let p = 12, nc = 0, sr = 44100, bits = 24;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { nc = b.readUInt16LE(p + 10); sr = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); }
    if (id === 'data') {
      const bps = bits / 8, blk = nc * bps, N = Math.floor(sz / blk), base = p + 8;
      const acc = new Float64Array(nc);
      for (let i = 0; i < N; i++) {
        for (let c = 0; c < nc; c++) {
          const o = base + i * blk + c * bps;
          let v = b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
          if (v & 0x800000) v -= 0x1000000;
          v /= 8388607;
          acc[c] += v * v;
        }
      }
      return { db: Array.from(acc, (s) => 20 * Math.log10(Math.sqrt(s / N) || 1e-9)), secs: N / sr };
    }
    p += 8 + sz + (sz % 2);
  }
  throw new Error(`${path}: no data chunk`);
}

// ── the programme notes ─────────────────────────────────────────────────────
const NOTES = {
  ridge: {
    lead: 'Flute', key: 'D dorian', tempo: 84,
    line: 'Wide and unhurried, like standing somewhere high with a long view.',
    why: 'Dorian rather than plain minor for one note — the B natural in the G chord. That single major chord inside a minor key is what stops it sounding sad and makes it sound like open air.',
    form: 'Guitar and bass alone · flute states the hook · strings arrive · a bridge a register up · everything, with the only cymbal in the piece · one long D left to decay.',
  },
  lantern: {
    lead: 'Flute', key: 'A minor', tempo: 66,
    line: 'The quiet one. A small warm room at night, everything close.',
    why: 'A quiet flute is not just a softer flute — it is an airier one. The breath is turned up while the level comes down, which is what makes it sound near you rather than far away.',
    form: 'Guitar alone · flute barely above it · bass and one shaker · strings, and the flute lifts · it all falls away quieter than it began.',
  },
  harbour: {
    lead: 'Nylon guitar', key: 'E minor', tempo: 100,
    line: 'The sunniest one. Two guitars, brushes, a walking bass.',
    why: 'The hook lands on the offbeats, not the beat. That is where a foot-tap comes from — written on the beat it would be correct and inert.',
    form: 'Strum alone · lead states the hook · bass and brushes · a bridge up a register · everything, strings underneath · one last ringing chord.',
  },
  drive: {
    lead: 'Steel guitar', key: 'A mixolydian', tempo: 118,
    line: 'The loud one. A riff, a full kit, and a break that resets it.',
    why: 'Most of the riff is palm-muted dead notes and only the accents ring. That contrast is the groove — every note sustaining would just be a chord.',
    form: 'Kick and bass · the riff · full band · the answer higher up the neck · two bars of guitar alone · everything back, harder · a hard stop on a downbeat.',
  },
  weave: {
    lead: 'Flute and guitar', key: 'G major', tempo: 96,
    line: 'The duet. They take turns for most of it, then finally play together.',
    why: 'The two never sound the same notes at the same time until the last eight bars. That restraint is the piece — taking turns is what makes playing together an event.',
    form: 'Guitar asks · flute answers a third up · they swap · they trade two-bar phrases · together at last, flute a sixth above the guitar.',
  },
  boulevard: {
    lead: 'Guitar, and a sax', key: 'G minor', tempo: 92,
    line: 'Late night. A jazz box, a walking bass, and a saxophone that shows up twice.',
    why: 'You asked for the sax used sparingly, so it is a guest: it plays seven bars out of twenty-two and is silent for the rest. An instrument that never stops has no entrances.',
    form: 'Comping and the walk · guitar states it · the ride joins · the sax arrives and takes the tune · new changes, no sax · the sax takes it out.',
  },
  ivory: {
    lead: 'Piano', key: 'C minor', tempo: 92,
    line: 'Solo piano — one four-bar hook, stated four ways.',
    why: 'The pedal lifts at every bar line, so each note is cut at the chord change instead of ringing into the next one. That one detail is the difference between pedalled piano and mud.',
    form: 'Left hand alone · the hook bare · doubled at the octave · a bridge · everything, with the low octave it has been holding back · the last chord in the hall.',
  },
};

// ── build ───────────────────────────────────────────────────────────────────
const pieces = [];
for (const name of ORDER) {
  const wav = join(HERE, '..', 'tmp', 'suite2', `${name}-71.wav`);
  const m = measure(wav);
  const mp3 = join(TMP, `${name}.m4a`);
  execFileSync(O.FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error',
    '-i', join(SRC, `SpotSet-${name}.m4a`), '-c:a', 'aac', '-b:a', '112k', mp3], { stdio: 'pipe' });
  const b64 = readFileSync(mp3).toString('base64');
  pieces.push({ name, ...NOTES[name], db: m.db, secs: m.secs, b64, kb: Math.round(statSync(mp3).size / 1024) });
  console.log(`${name}: ${Math.round(statSync(mp3).size / 1024)} KB`);
}

// Speaker positions for the surround glyph, in the real 7.1 azimuths.
const SPK = [
  ['FL', -30], ['FR', 30], ['C', 0], ['LFE', null],
  ['SL', -90], ['SR', 90], ['BL', -150], ['BR', 150],
];
function field(db) {
  // Map each channel's dB onto a dot radius. The loudest channel in THIS piece
  // is the reference, so the glyph reads as BALANCE, not as absolute level.
  //
  // Geometry: the listener faces up the page, so azimuth 0 is the TOP.
  // In SVG x runs right and y runs DOWN, which makes front negative y:
  //   x = R·sin(az)   y = -R·cos(az)
  // The first version used cos for x and forgot the sign, which put the
  // front-left speaker on the right-hand side — a diagram that is confidently
  // mirrored is worse than no diagram.
  const top = Math.max(...db);
  const dots = SPK.map(([, az], i) => {
    const rel = db[i] - top;                       // 0 down to about -40
    const u = Math.max(0, Math.min(1, (rel + 34) / 34));
    if (az === null) {
      return `<circle cx="0" cy="13" r="${(1.4 + u * 3.2).toFixed(2)}" class="lfe"/>`;
    }
    const rad = az * Math.PI / 180;
    const R = Math.abs(az) >= 120 ? 34 : Math.abs(az) >= 60 ? 35 : 31;
    const x = (R * Math.sin(rad)).toFixed(1);
    const y = (-R * Math.cos(rad)).toFixed(1);
    const r = 1.6 + u * 4.4;
    return `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" style="opacity:${(0.30 + u * 0.70).toFixed(2)}"/>`;
  }).join('');
  return `<svg viewBox="-44 -44 88 88" aria-hidden="true"><circle class="head" cx="0" cy="0" r="3.2"/>${dots}</svg>`;
}

const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const rows = pieces.map((p, i) => `
<article class="strip" data-i="${i}">
  <div class="head-row">
    <button class="play" type="button" aria-label="Play ${p.name}" data-i="${i}">
      <svg class="ico-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>
      <svg class="ico-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5h3.2v13H8zm4.8 0H16v13h-3.2z"/></svg>
    </button>
    <div class="ident">
      <h2>${p.name}</h2>
      <p class="line">${p.line}</p>
    </div>
    <dl class="spec">
      <div><dt>lead</dt><dd>${p.lead}</dd></div>
      <div><dt>key</dt><dd>${p.key}</dd></div>
      <div><dt>tempo</dt><dd>${p.tempo}<span class="u">bpm</span></dd></div>
      <div><dt>length</dt><dd class="num">${mmss(p.secs)}</dd></div>
    </dl>
    <div class="fieldwrap" title="Measured channel balance: ${SPK.map(([k], j) => `${k} ${p.db[j].toFixed(0)}`).join(', ')} dB">
      ${field(p.db)}
    </div>
  </div>
  <div class="rail"><span class="fill"></span></div>
  <div class="notes">
    <p class="why">${p.why}</p>
    <p class="form"><span class="lbl">Form</span> ${p.form}</p>
  </div>
  <audio preload="none" src="data:audio/mp4;base64,${p.b64}"></audio>
</article>`).join('');

const html = `<title>The Acoustic Suite</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --ground:#EEF1F3; --surface:#FFFFFF; --sunk:#E4E9ED;
  --ink:#0D1519; --ink-2:#3D4C56; --muted:#6C7B86;
  --line:#D6DDE2; --line-2:#C3CCD3;
  --accent:#0E86B4; --accent-soft:#35B7E8;
  --shadow:0 1px 2px rgba(13,21,25,.05),0 8px 24px -16px rgba(13,21,25,.28);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --ground:#080D11; --surface:#111A20; --sunk:#0C1418;
    --ink:#E9EFF3; --ink-2:#AEBDC7; --muted:#7A8894;
    --line:#1E2B33; --line-2:#2A3A44;
    --accent:#35B7E8; --accent-soft:#7FD4F2;
    --shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -18px rgba(0,0,0,.9);
  }
}
:root[data-theme="dark"]{
  --ground:#080D11; --surface:#111A20; --sunk:#0C1418;
  --ink:#E9EFF3; --ink-2:#AEBDC7; --muted:#7A8894;
  --line:#1E2B33; --line-2:#2A3A44;
  --accent:#35B7E8; --accent-soft:#7FD4F2;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 10px 30px -18px rgba(0,0,0,.9);
}

*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font:400 16px/1.6 "Public Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:860px;margin:0 auto;padding:clamp(28px,6vw,64px) clamp(16px,4vw,32px) 80px}

/* ── masthead ─────────────────────────────────────────────────────────── */
header{border-bottom:1px solid var(--line);padding-bottom:28px;margin-bottom:8px}
.eyebrow{
  font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--muted);margin:0 0 14px;
}
h1{
  font-family:"Fraunces","Iowan Old Style",Georgia,serif;
  font-weight:600;font-size:clamp(34px,7vw,52px);line-height:1.04;letter-spacing:-.015em;
  margin:0 0 18px;text-wrap:balance;
}
.stand{font-size:clamp(16px,2.2vw,18px);color:var(--ink-2);margin:0 0 16px;max-width:62ch}
.stand strong{color:var(--ink);font-weight:600}

/* ── a piece ──────────────────────────────────────────────────────────── */
.strip{
  border-bottom:1px solid var(--line);
  padding:22px 0 20px;
}
.head-row{display:flex;align-items:flex-start;gap:clamp(12px,2.5vw,18px)}

.play{
  flex:0 0 auto;width:46px;height:46px;border-radius:50%;
  border:1px solid var(--line-2);background:var(--surface);color:var(--ink);
  display:grid;place-items:center;cursor:pointer;padding:0;
  transition:background .16s ease,border-color .16s ease,color .16s ease,transform .12s ease;
}
.play:hover{border-color:var(--accent);color:var(--accent)}
.play:active{transform:scale(.94)}
.play:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.play svg{width:24px;height:24px;fill:currentColor}
.ico-pause{display:none}
.strip.playing .play{background:var(--accent);border-color:var(--accent);color:var(--ground)}
.strip.playing .ico-play{display:none}
.strip.playing .ico-pause{display:block}

.ident{flex:1 1 auto;min-width:0}
h2{
  font-family:"Fraunces","Iowan Old Style",Georgia,serif;
  font-weight:600;font-size:26px;line-height:1.1;letter-spacing:-.01em;margin:2px 0 4px;
}
.strip.playing h2{color:var(--accent)}
.line{margin:0;color:var(--ink-2);font-size:15px;line-height:1.45;max-width:44ch}

.spec{
  flex:0 0 auto;margin:2px 0 0;display:grid;grid-template-columns:auto auto;
  gap:2px 16px;align-content:start;
}
.spec div{display:flex;gap:7px;align-items:baseline;white-space:nowrap}
.spec dt{
  font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--muted);
}
.spec dd{margin:0;font-size:13.5px;color:var(--ink-2);font-weight:500}
.spec .u{font-size:10.5px;color:var(--muted);margin-left:2px}
.spec .num{font-family:"IBM Plex Mono",ui-monospace,monospace;font-variant-numeric:tabular-nums}

/* the measured surround field — dot size IS the channel's RMS */
.fieldwrap{flex:0 0 auto;width:62px;height:62px;margin-top:-2px}
.fieldwrap svg{width:100%;height:100%;display:block}
.fieldwrap circle{fill:var(--ink-2)}
.fieldwrap .head{fill:none;stroke:var(--line-2);stroke-width:1}
.fieldwrap .lfe{fill:var(--muted);opacity:.5}
.strip.playing .fieldwrap circle{fill:var(--accent)}
.strip.playing .fieldwrap .head{stroke:var(--accent-soft);opacity:.5}

.rail{
  height:2px;background:var(--sunk);border-radius:2px;overflow:hidden;
  margin:16px 0 0;
}
.fill{display:block;height:100%;width:0;background:var(--accent);transition:width .18s linear}

.notes{margin:14px 0 0;padding-left:calc(46px + clamp(12px,2.5vw,18px))}
.why{margin:0 0 7px;color:var(--ink-2);font-size:14.5px;line-height:1.55;max-width:62ch}
.form{
  margin:0;color:var(--muted);font-size:13px;line-height:1.55;max-width:64ch;
}
.form .lbl{
  font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;letter-spacing:.1em;
  text-transform:uppercase;margin-right:7px;
}

/* ── the formats ──────────────────────────────────────────────────────── */
footer{margin-top:46px}
h3{
  font-family:"Fraunces","Iowan Old Style",Georgia,serif;font-weight:600;
  font-size:22px;margin:0 0 8px;letter-spacing:-.01em;
}
.tablewrap{overflow-x:auto;margin:18px 0 0;border:1px solid var(--line);border-radius:4px;background:var(--surface)}
table{border-collapse:collapse;width:100%;min-width:520px;font-size:13.5px}
th,td{text-align:left;padding:9px 14px;border-bottom:1px solid var(--line)}
tr:last-child td{border-bottom:0}
th{
  font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--muted);font-weight:500;background:var(--sunk);
}
td:first-child{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px;color:var(--ink)}
td{color:var(--ink-2)}
.note{margin:20px 0 0;font-size:14px;color:var(--ink-2);line-height:1.6;max-width:64ch}
.note strong{color:var(--ink);font-weight:600}
.path{
  font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:12px;color:var(--muted);
  margin:22px 0 0;word-break:break-all;
}

@media (max-width:720px){
  .head-row{flex-wrap:wrap}
  .spec{order:3;width:100%;grid-template-columns:repeat(4,auto);justify-content:start;gap:2px 18px;margin-top:12px}
  .fieldwrap{width:52px;height:52px}
  .notes{padding-left:0;margin-top:16px}
  h2{font-size:23px}
}
@media (prefers-reduced-motion:reduce){
  *{transition-duration:.01ms !important}
}
</style>

<div class="wrap">
<header>
  <p class="eyebrow">SpotSet · seven pieces · 2026-08-24</p>
  <h1>The acoustic suite</h1>
  <p class="stand">Seven compositions on a new instrument engine. The last set was built from sine and saw oscillators, which is <strong>why</strong> it sounded synthesized — a real instrument is noise, inharmonicity, a body and a room, and an oscillator has none of the four. These have all four: breath and a tongued attack on the flute, a plucked string with a body behind it, a piano with two strings per note beating against each other, a reed shaped by formants, and a real hall around all of it.</p>
  <p class="stand">Play them in this order if you can — it opens wide, drops to quiet, picks up, hits hardest, and lands on the piano. They are loudness-matched, so you should not need the volume between tracks.</p>
</header>

${rows}

<footer>
  <h3>What each one ships as</h3>
  <p class="note">Four files per piece, twenty-eight in all, sitting in the archive folder below.</p>
  <div class="tablewrap">
    <table>
      <thead><tr><th>file</th><th>codec</th><th>ch</th><th>for</th></tr></thead>
      <tbody>
        <tr><td>SpotSet-&lt;name&gt;.m4a</td><td>AAC 256k</td><td>2</td><td>Phone, PC, the app</td></tr>
        <tr><td>…-DolbyDigital-5.1.mp4</td><td>AC-3 640k</td><td>6</td><td>Any soundbar — lights <em>Dolby Digital</em></td></tr>
        <tr><td>…-DolbyDigitalPlus-5.1.mp4</td><td>E-AC-3 448k</td><td>6</td><td>Better again — lights <em>Dolby Digital Plus</em></td></tr>
        <tr><td>…-7.1.mp4</td><td>AAC 512k</td><td>8</td><td>True eight-channel 7.1</td></tr>
      </tbody>
    </table>
  </div>
  <p class="note"><strong>On Atmos, honestly.</strong> You asked for 5.1 or Atmos 7.1. The 5.1 files are real Dolby and your soundbar will say so. The 7.1 file is real 7.1 — eight discrete channels — but it cannot carry a Dolby badge: ffmpeg's AC-3, E-AC-3 and TrueHD encoders all stop at 5.1, and Atmos itself needs object metadata that only Dolby's own licensed encoder produces. So you get genuine 7.1, just not a lit-up Atmos lamp. I would rather tell you that than name a file something it isn't.</p>
  <p class="note">The circle beside each piece is its <strong>measured</strong> channel balance, read back out of the rendered 7.1 file — you are looking down on the listening position, dot size is how much that speaker is carrying. It is worth a glance: <em>lantern</em> barely touches the rears, <em>harbour</em> wraps right around you.</p>
  <p class="path">_archive/PTApp/branding/2026-08-23-suite2/</p>
</footer>
</div>

<script>
(function(){
  var strips = Array.prototype.slice.call(document.querySelectorAll('.strip'));
  var current = null;

  function stop(strip){
    if(!strip) return;
    var a = strip.querySelector('audio');
    a.pause();
    strip.classList.remove('playing');
    strip.querySelector('.play').setAttribute('aria-label','Play ' + strip.querySelector('h2').textContent);
  }

  strips.forEach(function(strip){
    var audio = strip.querySelector('audio');
    var fill  = strip.querySelector('.fill');
    var btn   = strip.querySelector('.play');

    btn.addEventListener('click', function(){
      if(strip.classList.contains('playing')){ stop(strip); current = null; return; }
      if(current && current !== strip){ stop(current); }
      current = strip;
      strip.classList.add('playing');
      btn.setAttribute('aria-label','Pause ' + strip.querySelector('h2').textContent);
      audio.play().catch(function(){
        // autoplay policy or a decode failure — fall back to a resting state
        // rather than leaving the button lit with nothing playing
        stop(strip); current = null;
      });
    });

    audio.addEventListener('timeupdate', function(){
      if(!audio.duration) return;
      fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
    });
    audio.addEventListener('ended', function(){
      fill.style.width = '0%';
      stop(strip);
      // roll into the next piece, so the running order plays as a sequence
      var i = strips.indexOf(strip);
      var next = strips[i + 1];
      if(next){ current = next; next.querySelector('.play').click(); }
      else { current = null; }
    });
    strip.querySelector('.rail').addEventListener('click', function(e){
      if(!audio.duration) return;
      var r = this.getBoundingClientRect();
      audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * audio.duration;
    });
  });
})();
</script>`;

writeFileSync(OUT, html);
const mb = (statSync(OUT).size / 1048576).toFixed(1);
console.log(`\npage: ${OUT}  (${mb} MB)`);
if (statSync(OUT).size > 15 * 1048576) console.log('⚠️  close to the 16 MB artifact ceiling — drop the audition bitrate');

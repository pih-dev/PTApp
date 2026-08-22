// ─── Android launcher icons from the pair mark (v2.28.1) ─────────────────────
//
// The v2.27 icon pass covered the PWA (manifest + apple-touch) and the store
// uploads, but the NATIVE launcher icons live in android res/mipmap-* and were
// still the v2.15 placeholder — caught when the v2.28 APK went out for
// sideloading. This script renders them all from the same flattened SVGs
// `logo-candidates.mjs --export` writes to tmp/ (run that FIRST), and points
// the adaptive background at the midnight ground instead of the retired
// generated blue.
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const RES = 'android/app/src/main/res';
const legacy = readFileSync('tmp/icon-512.svg');    // rounded square on ground
const fg = readFileSync('tmp/icon-fg-512.svg');     // transparent, mark in the 66% zone

const LEGACY = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FG = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

for (const [d, px] of Object.entries(LEGACY)) {
  const png = await sharp(legacy, { density: 300 }).resize(px, px).png().toBuffer();
  writeFileSync(`${RES}/mipmap-${d}/ic_launcher.png`, png);
  writeFileSync(`${RES}/mipmap-${d}/ic_launcher_round.png`, png); // launchers mask it themselves
  console.log(`mipmap-${d}: ic_launcher(+round) ${px}px`);
}
for (const [d, px] of Object.entries(FG)) {
  const png = await sharp(fg, { density: 300 }).resize(px, px).png().toBuffer();
  writeFileSync(`${RES}/mipmap-${d}/ic_launcher_foreground.png`, png);
  console.log(`mipmap-${d}: foreground ${px}px`);
}
// Adaptive background: the midnight ground, never #2563EB (the retired blue).
writeFileSync(`${RES}/values/ic_launcher_background.xml`,
`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0A1524</color>
</resources>
`);
console.log('ic_launcher_background -> #0A1524');

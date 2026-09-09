#!/usr/bin/env node
/**
 * dasha-margin.mjs — how much of a Vimśottarī daśā date is real?
 *
 * WHY THIS EXISTS. A reading stated a counterparty's level-3 pratyantar as opening on an exact
 * date, labelled "calculator-exact", and a governance workspace built a deadline on it. Swept
 * across that subject's admissible birth window the same boundary ranged over more than a year.
 * The calculator was never wrong: it answered exactly the question it was asked, about a birth
 * minute nobody has. "Exact" described the arithmetic, not the fact.
 *
 * ═══ THE ARITHMETIC FACT THIS TOOL IS BUILT ON, AND THE ONE ITS FIRST VERSION MISSED ═══
 *
 * Vimśottarī is anchored by the Moon's position in its nakshatra at birth. Move the birth time
 * and that anchor slides — and because every period in the tree is a FIXED fraction of the same
 * 120-year cycle measured from that anchor, EVERY boundary in the whole tree shifts by the
 * IDENTICAL number of days. Verified: a +10-minute shift moves the mahādaśā starts, the
 * antardaśā starts and the prāṇa starts all by -44.2232 days, to six decimal places.
 *
 * Two consequences, and the first version of this tool got both wrong:
 *
 *   1. THE ABSOLUTE SPREAD IS THE SAME AT EVERY LEVEL. It is not a fact about a pratyantar; it
 *      is the subject's birth-time uncertainty restated in days. A tool that gates on it alone
 *      returns a byte-identical verdict for a 3-day prāṇa and a 20-year mahādaśā — which is
 *      `rules/destiny-advisory.md` §3a's "failure to discriminate", not robustness.
 *   2. "LEVEL 3 IS THE DANGEROUS ONE" IS THE WRONG EXPLANATION of a real observation. Deep
 *      levels are not shifted harder — they are SHORTER, so the same shift swamps them. That is
 *      why the damage shows up at level 3 in practice, and stating it the other way put a false
 *      mechanism into a MUST rule.
 *
 * So this reports TWO numbers, because there are two different questions:
 *
 *   · CAN I QUOTE THE BOUNDARY AS A DATE?  → the absolute spread, in days. Level-invariant.
 *   · CAN I IDENTIFY THE PERIOD AT ALL?    → spread ÷ period length. This IS level-dependent,
 *                                            and it is what makes a prāṇa claim collapse while
 *                                            a mahādaśā claim survives the same uncertainty.
 *   The per-level lord-stability table answers the second question directly and independently.
 *
 * THE ADMISSIBLE WINDOW is set by the PROVENANCE of the recorded time, never by the daśā level:
 *   · cert         — clock-read to the minute            → ±1 min
 *   · rounded      — a recorded 5-minute value (:05,:25) → ±2.5 min
 *   · recollection — ":00"/":30", "about two o'clock"    → the whole admissible hour-pillar
 *                    window, which this tool will NOT guess: pass --from/--to.
 * A ":00" is the archetypal recollection, so it is NEVER auto-inferred as a 5-minute rounding —
 * the first version did exactly that and returned "quotable as a season" for the very subject
 * whose true window is 94 minutes and whose real answer is "not quotable at all". It failed open
 * on the case that motivated it.
 *
 * USAGE
 *   node .claude/calc/dasha-margin.mjs --date YYYY-MM-DD --time HH:MM --tz <hours> \
 *        [--window <min> | --from HH:MM --to HH:MM] [--provenance cert|rounded|recollection] \
 *        [--level 1..5] [--at YYYY-MM-DD]
 *
 *   --from/--to  the admissible window as real clock times. Use this whenever the window is
 *                ASYMMETRIC about the recorded time (an hour-pillar window usually is); --window
 *                can only express a symmetric one and silently mis-centres otherwise.
 *   --at         the date whose running period is examined (default 2026-01-01)
 *
 * NO BIRTHPLACE ARGUMENT, DELIBERATELY. Vimśottarī is driven by the Moon's sidereal longitude,
 * which is geocentric and independent of the observer's latitude and longitude. Only the LAGNA
 * needs a place, and this tool never touches it. An earlier version accepted --lon/--lat and
 * defaulted them to the author's own birth coordinates — misleading, and a privacy leak the
 * promote scan correctly refuses. The birth TIMEZONE does matter and is required.
 *
 * FRAMEWORK-SAFE: takes every subject datum on the command line and ships none.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const v = require("./vedic.js");
const astro = require("./astro.js");

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };

const dateStr = arg("date"), timeStr = arg("time");
const USAGE = "usage: dasha-margin.mjs --date YYYY-MM-DD --time HH:MM --tz <hours> [--window <min> | --from HH:MM --to HH:MM] [--provenance cert|rounded|recollection] [--level 1..5] [--at YYYY-MM-DD]";
if (!dateStr || !timeStr) { console.error(USAGE); process.exit(2); }

const [Y, M, D] = dateStr.split("-").map(Number);
const [HH, MM] = timeStr.split(":").map(Number);
const tz = Number(arg("tz", 8));
const level = Number(arg("level", 3));
const at = arg("at");
const mins = (s) => { const [h, m] = s.split(":").map(Number); return h * 60 + m; };
const REC = HH * 60 + MM;

// ── The admissible window ────────────────────────────────────────────────────────────────────
// Explicit --from/--to wins (and may be asymmetric). Otherwise --window, otherwise --provenance,
// otherwise inference — which REFUSES on a recollection-shaped time rather than guessing small.
let lo, hi, windowNote;
const fromArg = arg("from"), toArg = arg("to"), provArg = arg("provenance"), winArg = arg("window");
if (fromArg && toArg) {
  lo = mins(fromArg); hi = mins(toArg);
  windowNote = `explicit ${fromArg}–${toArg} (${hi - lo} min${lo + hi !== 2 * REC ? ", ASYMMETRIC about the recorded time" : ""})`;
} else if (winArg != null) {
  const w = Number(winArg); lo = REC - w / 2; hi = REC + w / 2;
  windowNote = `±${w / 2} min (${w} min total, symmetric — stated)`;
} else {
  const prov = provArg || (MM % 30 === 0 ? "recollection" : MM % 5 === 0 ? "rounded" : "cert");
  if (prov === "recollection") {
    console.error(`REFUSING TO GUESS. The recorded time ${timeStr} ends in :00 or :30, which is the shape of a`);
    console.error(`recollection ("about ${HH} o'clock"), not a reading. Its admissible window is the whole hour-`);
    console.error(`pillar window and this tool will not invent one. Pass --from/--to (preferred — such a window`);
    console.error(`is usually asymmetric), or --window <minutes>, or --provenance cert|rounded to override.`);
    process.exit(3);
  }
  const w = prov === "cert" ? 2 : 5;
  lo = REC - w / 2; hi = REC + w / 2;
  windowNote = `±${w / 2} min (inferred: ${prov === "cert" ? "minute is not a round number → read to the minute" : "minute ends in 5 → a 5-minute rounding"})`;
}
const widthMin = hi - lo;
const STEP = Math.max(0.25, widthMin / 40);
const samples = []; for (let t = lo; t <= hi + 1e-9; t += STEP) samples.push(t);

function treeAt(totalMin) {
  const hour = Math.floor(totalMin / 60), minute = totalMin - hour * 60;
  // lon/lat are irrelevant to the Moon's geocentric longitude, which is all Vimśottarī needs.
  const c = v.compute({ y: Y, m: M, d: D, hour, minute, tz, lon: 0, lat: 0 });
  return v.vimshottari(c.grahas.Moon.sidereal, astro.julianDayUT(Y, M, D, hour, minute, tz), 5);
}
const pathAt = (tree, jd) => { const out = []; let l = tree; while (l) { const n = l.find((x) => jd >= x.startJD && jd < x.endJD); if (!n) break; out.push(n); l = n.sub; } return out; };

const nowJD = at ? astro.julianDayUT(...at.split("-").map(Number), 12, 0, tz)
                 : astro.julianDayUT(2026, 1, 1, 12, 0, tz);

console.log(`Vimśottarī margin — birth ${dateStr} ${timeStr} tz${tz >= 0 ? "+" : ""}${tz}  (place-independent: the Moon's longitude is geocentric)`);
console.log(`Admissible window: ${windowNote}`);
console.log(`Reference date: ${at || "2026-01-01"}\n`);

// ── Question 1: which lord is running? (level-dependent, and the honest discriminator) ────────
const lords = [new Set(), new Set(), new Set(), new Set(), new Set()];
for (const t of samples) { const p = pathAt(treeAt(t), nowJD); for (let L = 0; L < 5; L++) if (p[L]) lords[L].add(p[L].lord); }
const NAMES = ["MD (1)", "AD (2)", "PD (3)", "sūkṣma (4)", "prāṇa (5)"];
console.log("WHICH PERIOD is running at the reference date:");
for (let L = 0; L < 5; L++) {
  const s = lords[L];
  console.log(`  ${NAMES[L].padEnd(12)} ${(s.size === 1 ? "INVARIANT" : `⚠ ${s.size} VALUES`).padEnd(12)} {${[...s].join(", ")}}`);
}

// ── Question 2: when does it start? (absolute spread — LEVEL-INVARIANT by construction) ───────
const centre = pathAt(treeAt((lo + hi) / 2), nowJD);
const named = centre.slice(0, level).map((n) => n.lord);
let minS = Infinity, maxS = -Infinity, missing = 0, periodLen = null;
const rows = [];
for (const t of samples) {
  let l = treeAt(t), node = null;
  for (const lord of named) { node = l && l.find((x) => x.lord === lord); if (!node) break; l = node.sub; }
  if (!node) { missing++; continue; }
  minS = Math.min(minS, node.startJD); maxS = Math.max(maxS, node.startJD);
  if (periodLen === null) periodLen = node.endJD - node.startJD;
  rows.push({ t, start: v.jdToDateStr(node.startJD), end: v.jdToDateStr(node.endJD) });
}

if (!rows.length) {
  console.log(`\n⚠ the named period ${named.join("/")} does not exist in any sampled branch — nothing to measure.`);
  process.exit(0);
}
const spread = maxS - minS;
const ratio = spread / periodLen;
console.log(`\nWHEN ${named.join("/")} (level ${level}) STARTS:`);
console.log(`  boundary spread ${spread.toFixed(1)} days   —   ${v.jdToDateStr(minS)} … ${v.jdToDateStr(maxS)}`);
console.log(`  ⚠ this number is the SAME AT EVERY LEVEL: it is the birth-time uncertainty in days,`);
console.log(`    not a fact about a level-${level} period. Every boundary in the tree shifts together.`);
console.log(`  period length ${periodLen.toFixed(1)} days  →  spread/period = ${(ratio * 100).toFixed(0)}%  ← THIS is level-dependent`);
if (missing) console.log(`  ⚠ ${missing}/${samples.length} sampled branches do not contain ${named.join("/")} — the spread above is over the rest, so it UNDERSTATES the true range.`);

// Two verdicts, because there are two questions. Thresholds are a CHOSEN scale, stated here.
const dateVerdict = spread <= 3 ? "quotable as a DATE" : spread <= 21 ? "quotable as a ~2-WEEK WINDOW, never a date"
  : spread <= 90 ? "quotable as a SEASON at best" : "NOT QUOTABLE as any date — report the distribution or drop it";
const idVerdict = ratio <= 0.1 ? "the period is firmly identified" : ratio <= 0.5 ? "identified, but its edges are soft"
  : ratio <= 1 ? "⚠ barely identified — the uncertainty is a large part of the period" : "⛔ NOT IDENTIFIED — the uncertainty exceeds the period itself";
console.log(`\n  → BOUNDARY: ${dateVerdict}`);
console.log(`  → PERIOD:   ${idVerdict}`);
console.log(`  (thresholds 3d/21d/90d and 10%/50%/100% are a CHOSEN scale, not a derived one)`);

console.log("\n  sample:");
for (const r of rows.filter((_, i) => i % Math.max(1, Math.floor(rows.length / 8)) === 0)) {
  const off = r.t - REC;
  console.log(`    ${off >= 0 ? "+" : ""}${off.toFixed(1)}m  ${r.start} → ${r.end}`);
}

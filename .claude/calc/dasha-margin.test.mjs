#!/usr/bin/env node
/**
 * dasha-margin.test.mjs — the tool that decides whether a daśā date may be quoted at all.
 *
 * WHY THIS SUITE EXISTS. A level-3 pratyantar boundary was quoted as an exact date, labelled
 * "calculator-exact", and a governance deadline was built on it. Across that subject's
 * admissible birth window the boundary moved more than a year. The tool makes the check one
 * command; this suite exists so the tool cannot rot into a green box that always says "fine" —
 * a failure mode it has already had twice:
 *
 *   · v1 gated on the raw day-spread alone, which is IDENTICAL at every daśā level, so a 3-day
 *     prāṇa and a 20-year mahādaśā got the same verdict and `--level` was inert.
 *   · v1's rewrite dropped the cross-check against `vedic.js`, leaving every assertion grepping
 *     the tool's own stdout — able to catch an inconsistent number, never a wrong one.
 *
 * So this suite (a) re-derives from the engine independently, and (b) pins the arithmetic fact
 * the design rests on. FIXTURES ARE SYNTHETIC: the motivating cases were real birth records, and
 * using them would make this suite personal and leave the framework shipping the tool untested.
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const v = require("./vedic.js");
const astro = require("./astro.js");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.join(HERE, "dasha-margin.mjs");

let pass = 0, fail = 0;
const ok = (n, c, g = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "\n      " + g}`); c ? pass++ : fail++; };
const run = (args) => execFileSync("node", [TOOL, ...args], { encoding: "utf8" });
const runFail = (args) => { try { execFileSync("node", [TOOL, ...args], { encoding: "utf8", stdio: "pipe" }); return null; } catch (e) { return e; } };
const spread = (o) => { const m = o.match(/boundary spread ([\d.]+) days/); return m ? Number(m[1]) : null; };
const ratio = (o) => { const m = o.match(/spread\/period = (\d+)%/); return m ? Number(m[1]) : null; };

// One constructed subject. 09:23 is not a round number → read to the minute.
const SUBJ = ["--date", "1980-06-15", "--time", "09:23", "--tz", "0", "--at", "2026-06-01"];

/* ── 1. THE ARITHMETIC FACT the whole design rests on, re-derived from vedic.js ──
 * Every boundary in the tree shifts by the SAME amount when birth time moves, because the whole
 * sequence is anchored by the Moon's nakshatra fraction and each period is a fixed proportion of
 * one cycle. If this ever stops being true, the tool's two-number design is unnecessary — and if
 * it is true, gating on the raw spread alone can never be level-sensitive. */
{
  const tree = (offMin) => {
    const total = 9 * 60 + 23 + offMin;
    const hour = Math.floor(total / 60), minute = total - hour * 60;
    const c = v.compute({ y: 1980, m: 6, d: 15, hour, minute, tz: 0, lon: 0, lat: 0 });
    return v.vimshottari(c.grahas.Moon.sidereal, astro.julianDayUT(1980, 6, 15, hour, minute, 0), 5);
  };
  const a = tree(0), b = tree(10);
  const deltas = [];
  for (let i = 0; i < 9; i++) deltas.push(b[i].startJD - a[i].startJD);              // MD
  for (let i = 0; i < 9; i++) deltas.push(b[0].sub[i].startJD - a[0].sub[i].startJD); // AD
  for (let i = 0; i < 9; i++) deltas.push(b[0].sub[3].sub[i].startJD - a[0].sub[3].sub[i].startJD); // PD
  for (let i = 0; i < 5; i++) deltas.push(b[0].sub[3].sub[2].sub[1].sub[i].startJD - a[0].sub[3].sub[2].sub[1].sub[i].startJD); // prāṇa
  const range = Math.max(...deltas) - Math.min(...deltas);
  ok("every boundary in the tree shifts by the SAME amount (MD…prāṇa)", range < 1e-6, `range ${range}`);
  ok("…and that shift is large for ten minutes of birth time", Math.abs(deltas[0]) > 10, `${deltas[0].toFixed(2)}d`);
}

/* ── 2. Cross-check: the tool's numbers must match a direct vimshottari sweep ──
 * The assertion the previous rewrite deleted. Without it the suite is self-referential. */
{
  const pd = (offMin) => {
    const total = 9 * 60 + 23 + offMin;
    const hour = Math.floor(total / 60), minute = total - hour * 60;
    const c = v.compute({ y: 1980, m: 6, d: 15, hour, minute, tz: 0, lon: 0, lat: 0 });
    const t = v.vimshottari(c.grahas.Moon.sidereal, astro.julianDayUT(1980, 6, 15, hour, minute, 0), 5);
    const md = t.find((n) => n.lord === "Venus");
    const ad = md.sub.find((n) => n.lord === "Venus");
    return ad.sub.find((n) => n.lord === "Jupiter");
  };
  const lo = pd(-1), hi = pd(+1);
  const direct = Math.abs(lo.startJD - hi.startJD);
  const out = run(SUBJ);
  ok("tool's spread matches a direct vedic.js sweep", Math.abs(spread(out) - direct) < 0.2, `tool=${spread(out)} direct=${direct.toFixed(1)}`);
  const directRatio = direct / (pd(0).endJD - pd(0).startJD);
  ok("tool's spread/period ratio matches the engine too", Math.abs(ratio(out) - directRatio * 100) < 1.5, `tool=${ratio(out)}% direct=${(directRatio * 100).toFixed(1)}%`);
}

/* ── 3. --level must be LIVE. The raw spread is level-invariant, so the ratio carries it. ── */
{
  const outs = [1, 3, 5].map((L) => run([...SUBJ, "--window", "94", "--level", String(L)]));
  const spreads = outs.map(spread), ratios = outs.map(ratio);
  ok("raw spread is identical at levels 1/3/5 (the invariance the tool must not gate on)",
    Math.abs(spreads[0] - spreads[2]) < 0.2 && Math.abs(spreads[0] - spreads[1]) < 0.2, spreads.join(" · "));
  ok("spread/period ratio is STRICTLY increasing with level", ratios[0] < ratios[1] && ratios[1] < ratios[2], ratios.join(" · "));
  ok("a mahādaśā survives a window that destroys a prāṇa",
    /firmly identified/.test(outs[0]) && /NOT IDENTIFIED/.test(outs[2]), `L1 vs L5`);
  ok("the output warns that the raw spread is level-invariant",
    outs[1].includes("SAME AT EVERY LEVEL"), outs[1].slice(0, 400));
}

/* ── 4. Provenance: it must FAIL CLOSED on a recollection-shaped time ──
 * v1 inferred ±2.5 min from ":00" and upgraded the verdict two rungs on the exact subject whose
 * real window is 94 minutes. A gate that guesses small on its own motivating case is worse than
 * no gate. */
{
  const refused = runFail(["--date", "1980-06-15", "--time", "09:00", "--tz", "0", "--at", "2026-06-01"]);
  ok(":00 REFUSES to infer a window", refused !== null && refused.status === 3, refused ? `exit ${refused.status}` : "did not refuse");
  ok("…and says what to pass instead", refused && /--from\/--to/.test(String(refused.stderr)), refused && String(refused.stderr).slice(0, 200));
  ok(":30 refuses too", runFail(["--date", "1980-06-15", "--time", "09:30", "--tz", "0"]) !== null);
  ok("an explicit --provenance overrides the refusal", run(["--date", "1980-06-15", "--time", "09:00", "--tz", "0", "--provenance", "cert", "--at", "2026-06-01"]).includes("±1 min"));
  ok("a :05 minute is inferred as a 5-minute ROUNDING", run(["--date", "1980-06-15", "--time", "09:25", "--tz", "0", "--at", "2026-06-01"]).includes("±2.5 min"));
  ok("a non-round minute is read to the minute", run(SUBJ).includes("±1 min"));
}

/* ── 5. Asymmetric windows must be expressible — an hour-pillar window usually is ──
 * --window can only centre on the recorded time; using it for an asymmetric window silently
 * mis-centres and produced two different published figures for one quantity. */
{
  const asym = run(["--date", "1980-06-15", "--time", "09:23", "--tz", "0", "--from", "08:50", "--to", "09:59", "--at", "2026-06-01"]);
  ok("--from/--to is accepted and reported", /explicit 08:50–09:59/.test(asym), asym.slice(0, 300));
  ok("…and flagged as ASYMMETRIC about the recorded time", asym.includes("ASYMMETRIC"), asym.slice(0, 300));
  const sym = run([...SUBJ, "--window", "69"]);
  // ⚠ The shift is LINEAR in birth time, so the spread depends only on the window's WIDTH —
  // mis-centring moves the date RANGE, not the spread. That is precisely why a mis-centred
  // window is dangerous: it reports a plausible spread over the wrong dates, and two published
  // figures for one quantity disagreed on the range while both looked defensible.
  ok("equal-width windows give the same SPREAD regardless of centring",
    Math.abs(spread(asym) - spread(sym)) < 0.5, `asym=${spread(asym)} sym=${spread(sym)}`);
  const range = (o) => { const m = o.match(/—\s+(\d{4}-\d{2}-\d{2}) … (\d{4}-\d{2}-\d{2})/); return m ? `${m[1]}…${m[2]}` : null; };
  ok("…but a DIFFERENT date range, which is the error mis-centring actually causes",
    range(asym) !== null && range(asym) !== range(sym), `asym=${range(asym)} sym=${range(sym)}`);
}

/* ── 6. Monotonicity, and the verdict ladder ── */
{
  const rank = (s) => s.includes("NOT QUOTABLE") ? 3 : s.includes("SEASON") ? 2 : s.includes("never a date") ? 1 : 0;
  const widths = [2, 10, 60, 94];
  const ranks = widths.map((w) => rank(run([...SUBJ, "--window", String(w)])));
  ok("boundary verdict is monotone in window width", ranks.every((r, i) => i === 0 || r >= ranks[i - 1]), `${widths} → ${ranks}`);
  ok("the narrowest window is quotable and the widest is not", ranks[0] < ranks[ranks.length - 1], `ranks ${ranks}`);
  ok("the chosen-scale caveat is in the OUTPUT, not only in the registry",
    run(SUBJ).includes("CHOSEN scale"), run(SUBJ).slice(-400));
}

/* ── 7. WHICH lord vs WHEN it changes — different questions, different stabilities ── */
{
  const wide = run([...SUBJ, "--window", "94", "--level", "1"]);
  ok("level-1 LORD is invariant across a 94-minute window", /MD \(1\)\s+INVARIANT/.test(wide), wide.slice(0, 400));
  ok("…and yet its BOUNDARY moves far — the two must never be conflated", spread(wide) > 100, `spread=${spread(wide)}d`);
  ok("deep levels are reported as multi-valued on a wide window", /prāṇa \(5\)\s+⚠/.test(wide), wide.slice(0, 500));
}

/* ── 8. Place independence — established by passing a DIFFERENT place, not the one in use ── */
{
  // An arbitrary antipodal-ish place. ⚠ Deliberately NOT any real subject's coordinates: an
  // earlier version used the repo owner's own longitude here and the promote scan refused the
  // file, correctly — a test fixture is still a place a personal datum can hide.
  const base = run(SUBJ);
  const elsewhere = run([...SUBJ, "--lon", "-58.4", "--lat", "-34.6"]);
  ok("a far-away place changes nothing (result is genuinely place-independent)",
    spread(base) === spread(elsewhere), `${spread(base)} vs ${spread(elsewhere)}`);
  ok("the header says so, so a reader does not go looking for the argument", base.includes("place-independent"));
}

/* ── 9. Refuses to guess a missing time at all ── */
ok("missing --time exits non-zero rather than assuming a time", runFail(["--date", "1980-06-15"]) !== null);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

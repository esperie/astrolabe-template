// vedic.test.mjs — independent validation of the Layer-1 ephemeris (vedic.js).
// Oracle: JPL Horizons REST API (https://ssd.jpl.nasa.gov/api/horizons.api),
// geocentric observer @399, QUANTITIES=31 (observer ecliptic of-date lon/lat = apparent,
// includes light-time + aberration + nutation), ANG_FORMAT=DEG, fetched 2026-06-22.
//   Instant A: 2000-01-01 12:00 TT  (TIME_TYPE=TT)
//   Instant B: 2026-01-01 00:00 UT  (TIME_TYPE=UT)
// Values below are the exact ObsEcLon (deg) returned by Horizons, hard-coded as oracle.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const V = require("./vedic.js");
const astro = require("./astro.js");

// J2000.0 = 2000-01-01 12:00 TT exactly:
const JD_2000_TT = 2451545.0;
// 2026-01-01 00:00 UT → TT JD. ΔT(2026) from astro.deltaTSeconds.
const JD_2026_UT = astro.gregorianToJDN(2026, 1, 1) - 0.5; // 00:00 UT
const JD_2026_TT = JD_2026_UT + astro.deltaTSeconds(2026) / 86400;

// A 3rd, independent instant (not used while tuning) — 2010-07-04 06:00 UT:
const JD_2010_UT = astro.gregorianToJDN(2010, 7, 4) - 0.5 + 6 / 24;
const JD_2010_TT = JD_2010_UT + astro.deltaTSeconds(2010) / 86400;

// Oracle apparent ecliptic longitudes (deg), from Horizons (ObsEcLon, QUANTITIES=31):
const ORACLE = {
  "2000": {
    sun: 280.3681519,
    moon: 223.3148557,
    mercury: 271.8881138,
    venus: 241.5648812,
    mars: 327.9627159,
    jupiter: 25.2530382,
    saturn: 40.3956514,
  },
  "2026": {
    sun: 280.5685772,
    moon: 66.7156363,
    mercury: 268.6516112,
    venus: 279.2064734,
    mars: 282.6881475,
    jupiter: 111.3575894,
    saturn: 356.1672313,
  },
  "2010": {
    sun: 102.1775938,
    moon: 8.1700595,
    mercury: 109.0348406,
    venus: 142.9552963,
    mars: 164.7856915,
    jupiter: 2.8049685,
    saturn: 178.8209364,
  },
};
// Oracle Moon apparent ecliptic latitude (ObsEcLat) for a sign/scale guard:
const MOON_LAT_ORACLE = { "2000": 5.1708744, "2026": 5.0490966, "2010": 5.2763070 };

let pass = 0,
  fail = 0;
const flags = [];
function arcmin(deltaDeg) {
  // smallest signed angular separation, in arcminutes
  let d = ((deltaDeg + 180) % 360 + 360) % 360 - 180;
  return Math.abs(d) * 60;
}
function check(name, got, want, tolArcmin) {
  const err = arcmin(got - want);
  const ok = err <= tolArcmin;
  (ok ? pass++ : fail++) ;
  const tag = ok ? "PASS" : "FAIL";
  const line = `  [${tag}] ${name}: got ${got.toFixed(5)}°  oracle ${want.toFixed(5)}°  err ${err.toFixed(3)}′ (tol ${tolArcmin}′)`;
  console.log(line);
  if (!ok) flags.push(line.trim());
  return err;
}

const planets = ["mercury", "venus", "mars", "jupiter", "saturn"];

for (const [era, jde] of [["2000", JD_2000_TT], ["2026", JD_2026_TT], ["2010", JD_2010_TT]]) {
  console.log(`\n── ${era} (jdeTT=${jde.toFixed(6)}) ──`);
  const o = ORACLE[era];
  check(`Sun ${era}`, V.geocentricApparentLongitude("sun", jde), o.sun, 1.0);
  check(`Moon ${era}`, V.moonLongitude(jde).lon, o.moon, 0.3);
  for (const p of planets) {
    check(`${p} ${era}`, V.geocentricApparentLongitude(p, jde), o[p], 1.0);
  }
  // Moon latitude sign + scale guard (tol 0.5′):
  const blat = V.moonLongitude(jde).lat;
  check(`Moon-lat ${era}`, blat, MOON_LAT_ORACLE[era], 0.5);
}

// ── Ayanamsa anchors ──
console.log("\n── Ayanamsa ──");
const ay2000 = V.lahiriAyanamsa(JD_2000_TT);
{
  const ok = Math.abs(ay2000 - 23.853) <= 0.001;
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] Lahiri(J2000) = ${ay2000.toFixed(6)}° (≈23.853 ±0.001)`);
  if (!ok) flags.push(`Lahiri(J2000)=${ay2000}`);
}
const ay2026 = V.lahiriAyanamsa(JD_2026_TT);
{
  const ok = ay2026 >= 24.1 && ay2026 <= 24.25;
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] Lahiri(2026) = ${ay2026.toFixed(6)}° ∈ [24.10,24.25]`);
  if (!ok) flags.push(`Lahiri(2026)=${ay2026}`);
}

// ── Invariants ──
console.log("\n── Invariants ──");
{
  const rahu = V.meanNode(JD_2026_TT);
  const ketu = ((rahu + 180) % 360 + 360) % 360;
  const ok = Math.abs((((ketu - rahu) % 360) + 360) % 360 - 180) < 1e-9;
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] Ketu = Rahu+180 (rahu ${rahu.toFixed(4)}°, ketu ${ketu.toFixed(4)}°)`);
  if (!ok) flags.push("Ketu!=Rahu+180");
}
{
  // longitudes in [0,360)
  const vals = [
    V.geocentricApparentLongitude("sun", JD_2026_TT),
    V.moonLongitude(JD_2026_TT).lon,
    V.meanNode(JD_2026_TT),
    V.gmst(JD_2026_UT),
    V.ascendantTropical(120, 1.3, 23.44),
  ];
  const ok = vals.every((x) => x >= 0 && x < 360);
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] all longitudes ∈ [0,360): ${vals.map((x) => x.toFixed(3)).join(", ")}`);
  if (!ok) flags.push("range");
}

{
  // obliquity at J2000 = 23.4392911° (IAU/Meeus)
  const eps = V.obliquity(JD_2000_TT);
  const ok = Math.abs(eps - 23.4392911) < 1e-4;
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] obliquity(J2000) = ${eps.toFixed(6)}° (≈23.4392911)`);
  if (!ok) flags.push(`obliquity=${eps}`);
}
{
  // Ascendant identity: at the equator (φ=0), ASC leads LST by 90° at cardinal LST.
  const eps = V.obliquity(JD_2000_TT);
  const cases = [[0, 90], [90, 180], [180, 270], [270, 0]];
  let ok = true;
  for (const [lstv, want] of cases) {
    const a = V.ascendantTropical(lstv, 0, eps);
    if (arcmin(a - want) > 0.01) ok = false;
  }
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] ascendant equator identity (ASC = LST+90 at φ=0)`);
  if (!ok) flags.push("ascendant identity");
}

console.log(`\n==== vedic L1: ${pass} passed, ${fail} failed ====`);

/* ═══════════════════════════════════════════════════════════════════════════════════
 * LAYER 2 / LAYER 3 validation — against the live Jagannatha Hora oracle (Lahiri).
 * Oracle source: /tmp/vedic-oracle.md, read live from jagannathahora.com 2026-06-22.
 * Input: 14 Dec 1979, 15:05 CLOCK, Singapore lat 1.28967 lon 103.850 tz +7.5, male.
 * Vedic convention: RAW CLOCK → UT (no true-solar hour adjustment).
 * ═════════════════════════════════════════════════════════════════════════════════ */

function eq(name, got, want) {
  const ok = got === want;
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}: ${ok ? got : `got ${got} · want ${want}`}`);
  if (!ok) flags.push(`${name}: got ${got} want ${want}`);
}

const BIRTH = { y: 1979, m: 12, d: 14, hour: 15, minute: 5, tz: 7.5, lat: 1.28967, lon: 103.85 };
const chart = V.compute(BIRTH);

// Oracle: [absSidLon, rasi, nakshatra, pada, navamsaD9]
const ORACLE_V = {
  Lagna: [8.867, "Aries", "Ashwini", 3, "Gemini"],
  Sun: [238.133, "Scorpio", "Jyeshtha", 4, "Pisces"],
  Moon: [177.95, "Virgo", "Chitra", 2, "Virgo"],
  Mars: [135.967, "Leo", "Purva Phalguni", 1, "Leo"],
  Mercury: [218.683, "Scorpio", "Anuradha", 2, "Virgo"],
  Jupiter: [136.417, "Leo", "Purva Phalguni", 1, "Leo"],
  Venus: [265.95, "Sagittarius", "Purva Ashadha", 4, "Scorpio"],
  Saturn: [152.933, "Virgo", "Uttara Phalguni", 2, "Capricorn"],
  Rahu: [128.667, "Leo", "Magha", 3, "Gemini"],
  Ketu: [308.667, "Aquarius", "Shatabhisha", 1, "Sagittarius"],
};

console.log("\n── L2 placement: rasi / nakshatra / pada / navamsa(D9) (EXACT) ──");
for (const key of Object.keys(ORACLE_V)) {
  const [, rasi, nak, pada, d9] = ORACLE_V[key];
  const g = key === "Lagna" ? chart.lagna : chart.grahas[key];
  eq(`${key} rasi`, g.rasi.name, rasi);
  eq(`${key} nakshatra`, g.nakshatra.name, nak);
  eq(`${key} pada`, g.nakshatra.pada, pada);
  eq(`${key} navamsa(D9)`, g.navamsa.name, d9);
}

console.log("\n── L2 sidereal longitude vs oracle absolute degrees ──");
// Tolerance: 6′ for the planets/Lagna (jointly tests VSOP/ELP ephemeris + Lahiri ayanamsa).
// Rahu/Ketu now use the TRUE (osculating) node — JHora's default — so they are held to a
// tight ephemeris tolerance (5′). Computed true Rahu = 128.678° vs oracle 128.667°,
// residual ~0.7′ (truncated-ELP + Lahiri model), NOT the ~36′ mean−true offset the old
// mean-node default carried. The mean-node fallback is tested separately below.
for (const key of Object.keys(ORACLE_V)) {
  const [absLon] = ORACLE_V[key];
  const g = key === "Lagna" ? chart.lagna : chart.grahas[key];
  const tol = key === "Rahu" || key === "Ketu" ? 5 : 6;
  check(`${key} sidLon`, g.sidereal, absLon, tol);
}

console.log("\n── True vs mean node: default is TRUE; opts.meanNode falls back ──");
{
  // Default Rahu = TRUE node within 5′ of the JHora oracle (Leo, Magha, pada 3).
  check("default Rahu = TRUE node (oracle 128.667°)", chart.grahas.Rahu.sidereal, 128.667, 5);
  eq("default Rahu rasi", chart.grahas.Rahu.rasi.name, "Leo");
  eq("default Rahu nakshatra", chart.grahas.Rahu.nakshatra.name, "Magha");
  eq("default Rahu pada", chart.grahas.Rahu.nakshatra.pada, 3);
  // Ketu = Rahu + 180 EXACT.
  const d = ((chart.grahas.Ketu.sidereal - chart.grahas.Rahu.sidereal) % 360 + 360) % 360;
  const okK = Math.abs(d - 180) < 1e-9;
  (okK ? pass++ : fail++);
  console.log(`  [${okK ? "PASS" : "FAIL"}] Ketu = Rahu+180 EXACT (Δ=${(d - 180).toExponential(2)})`);
  if (!okK) flags.push("Ketu!=Rahu+180 (true-node default)");
}
{
  // opts.meanNode === true → the OLD mean-node value (~129.26° sidereal), unchanged.
  const chartMean = V.compute(BIRTH, { meanNode: true });
  check("opts.meanNode Rahu = MEAN node (~129.261°)", chartMean.grahas.Rahu.sidereal, 129.26143, 0.1);
  // The mean-node Rahu must be ~36′ from the true-node oracle (the documented offset).
  const offset = arcmin(chartMean.grahas.Rahu.sidereal - 128.667);
  const okOff = offset > 30 && offset < 42;
  (okOff ? pass++ : fail++);
  console.log(`  [${okOff ? "PASS" : "FAIL"}] mean−true node offset = ${offset.toFixed(2)}′ (30–42′ band)`);
  if (!okOff) flags.push(`mean-true offset ${offset.toFixed(2)}′`);
  // Vimshottari is Moon-driven, so the dasha tree must be IDENTICAL with either node mode.
  const okDasha = JSON.stringify(chartMean.dasha) === JSON.stringify(chart.dasha);
  (okDasha ? pass++ : fail++);
  console.log(`  [${okDasha ? "PASS" : "FAIL"}] Vimshottari unchanged by node mode (Moon-driven)`);
  if (!okDasha) flags.push("dasha changed with node mode");
}
{
  // trueNode() directly (tropical of-date) → sidereal must match the chart's Rahu.
  const tnTrop = V.trueNode(chart.jdeTT);
  const tnSid = ((tnTrop - chart.ayanamsa) % 360 + 360) % 360;
  const ok = arcmin(tnSid - chart.grahas.Rahu.sidereal) < 1e-6;
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] trueNode()→sidereal ≡ chart Rahu (${tnSid.toFixed(5)}°)`);
  if (!ok) flags.push("trueNode != chart Rahu");
}
{
  // Differentiation STEP-SIZE sensitivity: δ ∈ [0.005, 0.1] day must agree to <0.05′.
  // (Guards against under/over-smoothing the central difference.)
  const deltas = [0.005, 0.01, 0.02, 0.05, 0.1];
  const vals = deltas.map((d) => V.trueNode(chart.jdeTT, d));
  let maxSpread = 0;
  for (const v of vals) maxSpread = Math.max(maxSpread, arcmin(v - vals[0]));
  const ok = maxSpread < 0.05;
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] trueNode δ-sensitivity ${deltas.join("/")}d → spread ${maxSpread.toFixed(4)}′ (<0.05′)`);
  if (!ok) flags.push(`δ-sensitivity ${maxSpread.toFixed(4)}′`);
}
{
  // True node OSCILLATES about the mean node with amplitude ~1.5° (period ~173d). Across a
  // broad date range |true − mean| must stay bounded (<1.9°) and never blow up.
  let maxAbs = 0;
  for (let yr = 1960; yr <= 2040; yr += 1) {
    const jd = astro.gregorianToJDN(yr, 6, 1) + 0.5;
    let dd = ((V.trueNode(jd) - V.meanNode(jd) + 180) % 360 + 360) % 360 - 180;
    maxAbs = Math.max(maxAbs, Math.abs(dd));
  }
  const ok = maxAbs < 1.9;
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] max |true−mean| over 1960–2040 = ${maxAbs.toFixed(4)}° (<1.9°, osc. amplitude)`);
  if (!ok) flags.push(`true-mean spread ${maxAbs.toFixed(4)}°`);
}
{
  // Finite & in-range at boundary dates (far from the fit centre).
  let ok = true;
  for (const [y, m, dd] of [[1, 1, 1], [3000, 1, 1]]) {
    const jd = astro.gregorianToJDN(y, m, dd) + 0.5;
    const tn = V.trueNode(jd);
    if (!Number.isFinite(tn) || tn < 0 || tn >= 360) ok = false;
  }
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] trueNode finite & ∈[0,360) at year 1 and 3000`);
  if (!ok) flags.push("trueNode boundary range");
}

console.log("\n── Ayanamsa: implied (from Sun) vs computed Lahiri ──");
{
  const implied = chart.grahas.Sun.tropical - ORACLE_V.Sun[0]; // tropical − oracle sidereal
  const err = arcmin(implied - chart.ayanamsa);
  const ok = err <= 3; // a few arcmin
  (ok ? pass++ : fail++);
  console.log(
    `  [${ok ? "PASS" : "FAIL"}] implied ayan ${implied.toFixed(5)}° vs computed ${chart.ayanamsa.toFixed(5)}° (Δ ${err.toFixed(3)}′, ≤3′)`
  );
  if (!ok) flags.push(`ayanamsa implied vs computed Δ${err}′`);
  console.log(`         (1979 Lahiri ≈ 23.573°; both agree to <1′)`);
}

console.log("\n── L2 invariants: Ketu=Rahu+180, D9(Moon) consistency, karakas ──");
{
  // Ketu = Rahu + 180 EXACT (sidereal).
  const d = ((chart.grahas.Ketu.sidereal - chart.grahas.Rahu.sidereal) % 360 + 360) % 360;
  const ok = Math.abs(d - 180) < 1e-9;
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] Ketu = Rahu+180 sidereal (Δ=${(d - 180).toExponential(2)})`);
  if (!ok) flags.push("Ketu!=Rahu+180 sidereal");
}
{
  // D9 of Moon derived directly from navamsaOf must equal the chart's stored navamsa
  // and the oracle (Virgo) — independent recomputation guard.
  const reNav = V.navamsaOf(chart.grahas.Moon.sidereal).name;
  eq("D9(Moon) recompute = chart", reNav, chart.grahas.Moon.navamsa.name);
  eq("D9(Moon) = oracle Virgo", reNav, "Virgo");
}
{
  // Karakas: AK Sun, AmK Moon, BK Venus, MK Rahu, PiK Jupiter, PuK Mars, GK Mercury, DK Saturn.
  const want = { AK: "Sun", AmK: "Moon", BK: "Venus", MK: "Rahu", PiK: "Jupiter", PuK: "Mars", GK: "Mercury", DK: "Saturn" };
  for (const k of Object.keys(want)) eq(`karaka ${k}`, chart.karakas[k], want[k]);
}
{
  // Rahu-reverse karaka rule guard: Rahu's karaka score uses (30 − degInSign).
  // Construct a case where forward vs reverse flips the ranking.
  const fakeForward = V.charaKarakas([
    { name: "Sun", degInSign: 20 },
    { name: "Rahu", degInSign: 25 }, // forward 25 would beat Sun; reverse 5 must not
  ]);
  eq("Rahu-reverse: AK is Sun not Rahu", fakeForward.AK, "Sun");
}

console.log("\n── L3 Vimshottari: starting lord, MD boundary dates, current period ──");
{
  // Birth MD = Mars (Moon in Chitra → lord Mars).
  eq("birth MD lord", chart.dasha[0].lord, "Mars");
}
{
  // MD boundary dates within ~2 days of oracle (00:00 UT of the stated calendar date).
  const oracleMD = [
    ["Mars", 1977, 7, 9], ["Rahu", 1984, 7, 9], ["Jupiter", 2002, 7, 9],
    ["Saturn", 2018, 7, 10], ["Mercury", 2037, 7, 9], ["Ketu", 2054, 7, 10],
    ["Venus", 2061, 7, 10], ["Sun", 2081, 7, 10], ["Moon", 2087, 7, 10],
  ];
  for (let i = 0; i < oracleMD.length; i++) {
    const [lord, yy, mm, dd] = oracleMD[i];
    const node = chart.dasha[i];
    const oJD = astro.julianDayUT(yy, mm, dd, 0, 0, 0);
    const errDays = Math.abs(node.startJD - oJD);
    const ok = node.lord === lord && errDays <= 2.0;
    (ok ? pass++ : fail++);
    console.log(
      `  [${ok ? "PASS" : "FAIL"}] MD ${lord.padEnd(8)} start ${V.jdToDateStr(node.startJD)} vs oracle ${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")} (Δ ${errDays.toFixed(2)}d, ≤2d)`
    );
    if (!ok) flags.push(`MD ${lord} Δ${errDays.toFixed(2)}d / lord ${node.lord}`);
  }
}
{
  // Current (2026-06-22) MD/AD = Saturn / Venus (and PD Rahu per oracle).
  const nowJD = astro.julianDayUT(2026, 6, 22, 12, 0, 0);
  const path = V.dashaAt(chart.dasha, nowJD);
  eq("current MD (2026-06-22)", path[0], "Saturn");
  eq("current AD (2026-06-22)", path[1], "Venus");
  eq("current PD (2026-06-22)", path[2], "Rahu");
}
{
  // AD (antardasha) sequence under Saturn MD must begin with Saturn and cycle in
  // Vimshottari order: Sat, Merc, Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter.
  const satMD = chart.dasha.find((m) => m.lord === "Saturn");
  eq("Saturn AD order", satMD.sub.map((a) => a.lord).join(","),
    "Saturn,Mercury,Ketu,Venus,Sun,Moon,Mars,Rahu,Jupiter");
  // Oracle: Saturn AD Venus runs Apr 30 2025 → Jun 30 2028; Venus/Rahu PD Jun 19 → Dec 9 2026.
  const venusAD = satMD.sub.find((a) => a.lord === "Venus");
  const venusErr = Math.abs(venusAD.startJD - astro.julianDayUT(2025, 4, 30, 0, 0, 0));
  const okVen = venusErr <= 2.0;
  (okVen ? pass++ : fail++);
  console.log(`  [${okVen ? "PASS" : "FAIL"}] Saturn/Venus AD start ${V.jdToDateStr(venusAD.startJD)} vs oracle 2025-04-30 (Δ ${venusErr.toFixed(2)}d)`);
  if (!okVen) flags.push(`Venus AD Δ${venusErr.toFixed(2)}d`);
  const rahuPD = venusAD.sub.find((p) => p.lord === "Rahu");
  const pdErr = Math.abs(rahuPD.startJD - astro.julianDayUT(2026, 6, 19, 0, 0, 0));
  const okPD = pdErr <= 3.0;
  (okPD ? pass++ : fail++);
  console.log(`  [${okPD ? "PASS" : "FAIL"}] Saturn/Venus/Rahu PD start ${V.jdToDateStr(rahuPD.startJD)} vs oracle 2026-06-19 (Δ ${pdErr.toFixed(2)}d)`);
  if (!okPD) flags.push(`Rahu PD Δ${pdErr.toFixed(2)}d`);
  // Sub-period conservation: AD lengths sum to the MD length (no drift/gap).
  const adSum = satMD.sub.reduce((s, a) => s + (a.endJD - a.startJD), 0);
  const okSum = Math.abs(adSum - (satMD.endJD - satMD.startJD)) < 1e-6;
  (okSum ? pass++ : fail++);
  console.log(`  [${okSum ? "PASS" : "FAIL"}] Saturn AD lengths sum to MD length`);
  if (!okSum) flags.push("AD sum != MD");
}
{
  // Dasha balance DIRECTION guard: the starting MD must START BEFORE birth (virtual)
  // and END AFTER birth — i.e. the balance is the REMAINING fraction, not elapsed.
  const md0 = chart.dasha[0];
  const ok = md0.startJD < chart.jdUT && md0.endJD > chart.jdUT;
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] balance direction: MD0 brackets birth (start<birth<end)`);
  if (!ok) flags.push("dasha balance direction");
}
{
  // VIMS year-day constant + total = 120 years sanity.
  const total = V.VIMS_SEQ.reduce((s, [, y]) => s + y, 0);
  eq("Vimshottari total = 120y", total, 120);
  const okc = Math.abs(V.VIMS_YEAR_DAYS - 365.2425) < 1e-9;
  (okc ? pass++ : fail++);
  console.log(`  [${okc ? "PASS" : "FAIL"}] VIMS_YEAR_DAYS = ${V.VIMS_YEAR_DAYS}`);
  if (!okc) flags.push("VIMS_YEAR_DAYS");
}

console.log("\n── L2 varga (divisional) self-consistency ──");
{
  // vargaOf(.,9) MUST equal navamsaOf for every graha (two code paths, one answer).
  let ok = true;
  for (const key of Object.keys(chart.grahas)) {
    const s = chart.grahas[key].sidereal;
    if (V.vargaOf(s, 9).name !== V.navamsaOf(s).name) ok = false;
  }
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] vargaOf(·,9) ≡ navamsaOf for all grahas`);
  if (!ok) flags.push("vargaOf(9)!=navamsaOf");
}
{
  // D1 (rasi) MUST equal rashiOf for all grahas.
  let ok = true;
  for (const key of Object.keys(chart.grahas)) {
    const s = chart.grahas[key].sidereal;
    if (V.vargaOf(s, 1).name !== V.rashiOf(s).name) ok = false;
  }
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] vargaOf(·,1) ≡ rashiOf for all grahas`);
  if (!ok) flags.push("vargaOf(1)!=rashiOf");
}
{
  // Standard divisional set returns a valid sign for each (smoke + range guard).
  let ok = true;
  for (const D of [1, 2, 3, 9, 10, 12, 30, 60]) {
    const r = V.vargaOf(chart.grahas.Sun.sidereal, D);
    if (!(r.index >= 0 && r.index < 12 && typeof r.name === "string")) ok = false;
  }
  (ok ? pass++ : fail++);
  console.log(`  [${ok ? "PASS" : "FAIL"}] vargaOf covers D1,D2,D3,D9,D10,D12,D30,D60`);
  if (!ok) flags.push("varga set");
}
{
  // Nakshatra/pada BOUNDARY case: exactly on a pada edge (Ashwini pada 2 starts at 3°20′).
  eq("pada boundary @3°20'01\" = pada2", V.nakshatraOf(3 + 20 / 60 + 1 / 3600).pada, 2);
  eq("pada boundary @3°19'59\" = pada1", V.nakshatraOf(3 + 19 / 60 + 59 / 3600).pada, 1);
  // Nakshatra boundary: 13°20' is the start of Bharani (index 1).
  eq("nak boundary @13°20'01\" = Bharani", V.nakshatraOf(13 + 20 / 60 + 1 / 3600).name, "Bharani");
  // Navamsa element rule: 0° Aries (movable) → Aries; 0° Taurus (fixed) → Capricorn (9th);
  // 0° Gemini (dual) → Libra (5th).
  eq("D9 element: 0°Aries(movable)", V.navamsaOf(0).name, "Aries");
  eq("D9 element: 0°Taurus(fixed)", V.navamsaOf(30).name, "Capricorn");
  eq("D9 element: 0°Gemini(dual)", V.navamsaOf(60).name, "Libra");
  // Classical navamsa element property across ALL 12 signs: the 0° navamsa start is
  // Aries for fire signs, Capricorn for earth, Libra for air, Cancer for water.
  // (This is the element-based formulation equivalent to the movable/fixed/dual rule.)
  const navStart = { 0: "Aries", 4: "Aries", 8: "Aries", 1: "Capricorn", 5: "Capricorn", 9: "Capricorn", 2: "Libra", 6: "Libra", 10: "Libra", 3: "Cancer", 7: "Cancer", 11: "Cancer" };
  let navAllOK = true;
  for (let s = 0; s < 12; s++) if (V.navamsaOf(s * 30 + 1e-6).name !== navStart[s]) navAllOK = false;
  (navAllOK ? pass++ : fail++);
  console.log(`  [${navAllOK ? "PASS" : "FAIL"}] D9 element property all 12 signs (fire→Ar, earth→Cp, air→Li, water→Cn)`);
  if (!navAllOK) flags.push("D9 element all-signs");
  // Robustness: negative / >360 sidereal longitudes wrap correctly.
  eq("wrap: rashiOf(370) = Aries", V.rashiOf(370).name, "Aries");
  eq("wrap: nakshatraOf(-1) index", V.nakshatraOf(-1).index, 26);
}

/* ═══════════════════ Pakṣa bala / tithi / phase (V.paksaBala) ═══════════════════
 * Independently checkable: the elongation is a difference of two already-oracle-validated
 * longitudes, and the BPHS arithmetic (reducedArc/3; 60 − that) is exact. The reference
 * chart is 1972-12-24 03:06 tz+7:30 lon 103.85 — the chart whose Moon-strength claim a
 * reading had to correct BY HAND, which is why this function now exists. Its two Moon
 * classification rules DISAGREE on that chart (44.59 vs 15.41), so the fork is tested,
 * not resolved.
 */
console.log("\n── Pakṣa bala / tithi / lunar phase ──");
const nearv = (name, got, want, tol) => {
  const ok = Math.abs(got - want) <= tol;
  (ok ? pass++ : fail++);
  const line = `  [${ok ? "PASS" : "FAIL"}] ${name}: got ${got.toFixed(4)} want ${want} (±${tol})`;
  console.log(line);
  if (!ok) flags.push(line.trim());
};

const CHEER = { y: 1972, m: 12, d: 24, hour: 3, minute: 6, tz: 7.5, lat: 1.28967, lon: 103.85 };
const cheerChart = V.compute(CHEER);
{
  const p = cheerChart.paksaBala;
  nearv("1972-12-24 elongation = 226.24°", p.elongation, 226.24, 0.01);
  nearv("1972-12-24 reduced arc = 133.76°", p.reducedArc, 133.76, 0.01);
  nearv("1972-12-24 BENEFIC branch = 44.59/60", p.benefic.virupas, 44.5861, 0.005);
  nearv("1972-12-24 MALEFIC branch = 15.41/60", p.malefic.virupas, 15.4139, 0.005);
  nearv("1972-12-24 illuminated fraction ≈ 84.6%", p.illuminatedFraction * 100, 84.6, 0.3);
  eq("1972-12-24 pakṣa = krishna (waning)", p.paksa, "krishna");
  eq("1972-12-24 tithi index 19", p.tithi.index, 19);
  eq("1972-12-24 tithi = kṛṣṇa Chaturthi", `${p.tithi.paksa} ${p.tithi.name} ${p.tithi.numberInPaksa}`, "krishna Chaturthi 4");
  // THE CONVENTION FORK — the two classical Moon rules give OPPOSITE branches here.
  eq("Moon branch byPaksa = malefic (kṛṣṇa)", p.moonBranch.byPaksa, "malefic");
  eq("Moon branch byIllumination = benefic (84.6% lit)", p.moonBranch.byIllumination, "benefic");
  const forked = p.moonBranch.byPaksa !== p.moonBranch.byIllumination;
  (forked ? pass++ : fail++);
  console.log(`  [${forked ? "PASS" : "FAIL"}] the two Moon conventions DISAGREE on this chart (44.59 vs 15.41) — returned unresolved`);
  if (!forked) flags.push("paksa convention fork not exposed");
  nearv("moonDoubled.benefic = 2× benefic", p.moonDoubled.benefic, 89.1723, 0.01);
  eq("illumination method is distance-corrected in compute()", p.illuminationMethod.includes("48.3"), true);
}
{
  // Owner's canon chart — same function, an independent phase (25% lit, kṛṣṇa Dashami).
  const p = chart.paksaBala;
  nearv("canon chart elongation = 299.84°", p.elongation, 299.8376, 0.01);
  nearv("canon chart reduced arc = 60.16°", p.reducedArc, 60.1624, 0.01);
  nearv("canon chart BENEFIC branch = 20.05/60", p.benefic.virupas, 20.0541, 0.005);
  nearv("canon chart MALEFIC branch = 39.95/60", p.malefic.virupas, 39.9459, 0.005);
  nearv("canon chart illuminated fraction ≈ 25.2%", p.illuminatedFraction * 100, 25.2, 0.3);
  eq("canon chart tithi = kṛṣṇa Dashami (25)", `${p.tithi.index} ${p.tithi.paksa} ${p.tithi.name}`, "25 krishna Dashami");
  // Here the two Moon rules AGREE (waning AND less than half lit) — no fork.
  eq("canon chart both Moon rules = malefic", `${p.moonBranch.byPaksa}/${p.moonBranch.byIllumination}`, "malefic/malefic");
}
{
  // Structural invariants of the BPHS formula.
  const sum = chart.paksaBala.benefic.virupas + chart.paksaBala.malefic.virupas;
  nearv("benefic + malefic = 60 virūpas exactly", sum, 60, 1e-12);
  nearv("rupas = virupas/60", chart.paksaBala.benefic.rupas * 60, chart.paksaBala.benefic.virupas, 1e-12);
  // Ayanāṃśa invariance: tropical inputs must give the IDENTICAL result (it is a difference).
  const trop = V.paksaBala(chart.grahas.Sun.tropical, chart.grahas.Moon.tropical, chart.jdeTT);
  nearv("tropical inputs ≡ sidereal inputs (ayanāṃśa-invariant)", trop.elongation, chart.paksaBala.elongation, 1e-12);
  nearv("… and the same benefic bala", trop.benefic.virupas, chart.paksaBala.benefic.virupas, 1e-12);
  // Reduced-arc symmetry: ψ and 360−ψ carry the same bala.
  nearv("symmetry: ψ=100° ≡ ψ=260°", V.paksaBala(0, 100).benefic.virupas, V.paksaBala(0, 260).benefic.virupas, 1e-12);
}
{
  // Phase boundaries.
  const newMoon = V.paksaBala(0, 0);
  eq("new Moon: benefic 0 / malefic 60", `${newMoon.benefic.virupas}/${newMoon.malefic.virupas}`, "0/60");
  eq("new Moon tithi = śukla Pratipada (1)", `${newMoon.tithi.index} ${newMoon.paksa}`, "1 shukla");
  nearv("new Moon illumination = 0%", newMoon.illuminatedFraction, 0, 1e-12);
  const full = V.paksaBala(0, 179.9);
  nearv("near-full: benefic ≈ 59.97", full.benefic.virupas, 59.9667, 0.001);
  eq("179.9° tithi = Purnima (15), śukla", `${full.tithi.index} ${full.tithi.name} ${full.paksa}`, "15 Purnima shukla");
  const justPast = V.paksaBala(0, 180.1);
  eq("180.1° tithi = kṛṣṇa Pratipada (16)", `${justPast.tithi.index} ${justPast.tithi.name} ${justPast.paksa}`, "16 Pratipada krishna");
  nearv("180.1° benefic ≈ 59.97 (arc reduced)", justPast.benefic.virupas, 59.9667, 0.001);
  const amavasya = V.paksaBala(0, 359.9);
  eq("359.9° tithi = Amavasya (30)", `${amavasya.tithi.index} ${amavasya.tithi.name}`, "30 Amavasya");
  const quarter = V.paksaBala(0, 90);
  eq("quarter Moon: benefic = malefic = 30", `${quarter.benefic.virupas}/${quarter.malefic.virupas}`, "30/30");
  nearv("quarter Moon illumination = 50%", quarter.illuminatedFraction, 0.5, 1e-12);
  // jdeTT omitted → documented fallback, still within 0.2pp of the distance-corrected value.
  eq("no jdeTT → fallback illumination method named", V.paksaBala(0, 90).illuminationMethod.includes("elongation only"), true);
  const noJde = V.paksaBala(cheerChart.grahas.Sun.sidereal, cheerChart.grahas.Moon.sidereal);
  nearv("fallback illumination within 0.2pp of Meeus 48.3", noJde.illuminatedFraction * 100, cheerChart.paksaBala.illuminatedFraction * 100, 0.2);
}

/* ═══════════ Pañcāṅga limbs 3–5: tithi · yoga · karaṇa (added 2026-09-07) ═══════════
 * WHY: the engine could compute vāra and the Moon's nakshatra but NOT tithi/yoga/karaṇa
 * as first-class values, so a muhūrta screen could only run three of the five limbs —
 * and a review caught exactly that being reported as "the pañcāṅga favours X". Boundary
 * cases are asserted at the 6°/12°/13°20′ edges, where an off-by-one lives.
 */
{
  // --- tithi: boundaries and the pakṣa flip ---
  eq("tithi 0° = śukla Pratipada (1)", `${V.tithiOf(0, 0).index} ${V.tithiOf(0, 0).name} ${V.tithiOf(0, 0).paksa}`, "1 Pratipada shukla");
  eq("tithi 11.99° still Pratipada", V.tithiOf(0, 11.99).index, 1);
  eq("tithi 12.0° → Dvitiya (2)", `${V.tithiOf(0, 12).index} ${V.tithiOf(0, 12).name}`, "2 Dvitiya");
  eq("tithi 179.9° = Purnima (15) śukla", `${V.tithiOf(0, 179.9).index} ${V.tithiOf(0, 179.9).name} ${V.tithiOf(0, 179.9).paksa}`, "15 Purnima shukla");
  eq("tithi 180.1° = kṛṣṇa Pratipada (16)", `${V.tithiOf(0, 180.1).index} ${V.tithiOf(0, 180.1).name} ${V.tithiOf(0, 180.1).paksa}`, "16 Pratipada krishna");
  eq("tithi 359.9° = Amavasya (30)", `${V.tithiOf(0, 359.9).index} ${V.tithiOf(0, 359.9).name}`, "30 Amavasya");
  eq("riktā flagged on the 4th", V.tithiOf(0, 3 * 12 + 1).rikta, true);
  eq("riktā flagged on the 14th", V.tithiOf(0, 13 * 12 + 1).rikta, true);
  eq("riktā NOT flagged on the 8th", V.tithiOf(0, 7 * 12 + 1).rikta, false);
  // ayanāṃśa-invariance: a difference, so shifting both longitudes cannot change it
  eq("tithi is ayanāṃśa-invariant", V.tithiOf(0, 94.46).index, V.tithiOf(24.227, 94.46 + 24.227).index);
  // SINGLE-OWNER CHECK: paksaBala must agree with tithiOf, because it now calls it.
  for (const psi of [0, 11.99, 12, 95, 179.9, 180.1, 250, 359.9]) {
    eq(`paksaBala tithi == tithiOf at ψ=${psi}`,
      `${V.paksaBala(0, psi).tithi.index} ${V.paksaBala(0, psi).tithi.name}`,
      `${V.tithiOf(0, psi).index} ${V.tithiOf(0, psi).name}`);
  }

  // --- yoga: 27 spans of 13°20′ over the SUM, so it is NOT ayanāṃśa-invariant ---
  eq("yoga at sum 0° = Vishkambha (1)", `${V.yogaOf(0, 0).index} ${V.yogaOf(0, 0).name}`, "1 Vishkambha");
  eq("yoga at sum 13.32° still Vishkambha", V.yogaOf(0, 13.32).index, 1);
  eq("yoga at sum 13.34° → Priti (2)", `${V.yogaOf(0, 13.34).index} ${V.yogaOf(0, 13.34).name}`, "2 Priti");
  eq("yoga at sum 359.9° = Vaidhriti (27)", `${V.yogaOf(0, 359.9).index} ${V.yogaOf(0, 359.9).name}`, "27 Vaidhriti");
  eq("Vishkambha marked inauspicious", V.yogaOf(0, 0).auspicious, false);
  eq("Vaidhriti marked inauspicious", V.yogaOf(0, 359.9).auspicious, false);
  eq("Priti marked auspicious", V.yogaOf(0, 13.34).auspicious, true);
  eq("yoga DEPENDS on ayanāṃśa (a sum, not a difference)",
    V.yogaOf(0, 0).index !== V.yogaOf(24.227, 24.227).index, true);

  // --- karaṇa: 60 half-tithis, 4 fixed + 7 movable × 8 ---
  eq("karaṇa 0 = Kimstughna (fixed)", `${V.karanaOf(0, 1).name} ${V.karanaOf(0, 1).fixed}`, "Kimstughna true");
  eq("karaṇa 1 = Bava", V.karanaOf(0, 6.1).name, "Bava");
  eq("karaṇa 7 = Vishti (the avoided one)", `${V.karanaOf(0, 7 * 6 + 0.1).name} ${V.karanaOf(0, 7 * 6 + 0.1).avoid}`, "Vishti true");
  eq("karaṇa 8 wraps to Bava", V.karanaOf(0, 8 * 6 + 0.1).name, "Bava");
  eq("karaṇa 57 = Shakuni (fixed)", `${V.karanaOf(0, 57 * 6 + 0.1).name} ${V.karanaOf(0, 57 * 6 + 0.1).fixed}`, "Shakuni true");
  eq("karaṇa 58 = Chatushpada (fixed)", V.karanaOf(0, 58 * 6 + 0.1).name, "Chatushpada");
  eq("karaṇa 59 = Naga (fixed)", V.karanaOf(0, 59 * 6 + 0.1).name, "Naga");
  eq("only 4 fixed karaṇas exist in a full cycle",
    Array.from({ length: 60 }, (_, n) => V.karanaOf(0, n * 6 + 0.1).fixed).filter(Boolean).length, 4);
  eq("Vishti appears exactly 8 times in a cycle",
    Array.from({ length: 60 }, (_, n) => V.karanaOf(0, n * 6 + 0.1).name).filter((x) => x === "Vishti").length, 8);
  eq("karaṇa is ayanāṃśa-invariant", V.karanaOf(0, 246.75).name, V.karanaOf(24.227, 246.75 + 24.227).name);
  // karaṇa is the half-tithi: the relationship must hold at EVERY elongation, not one point.
  // (An earlier version hardcoded [9,10] at a single ψ, which asserts a value, not a rule.)
  {
    const bad = [];
    for (let psi = 0.5; psi < 360; psi += 1.7) {
      const t = V.tithiOf(0, psi).index, k = V.karanaOf(0, psi).index;
      if (k !== 2 * t - 1 && k !== 2 * t) bad.push(`ψ=${psi.toFixed(1)} tithi=${t} karana=${k}`);
    }
    eq("karaṇa index is 2×tithi−1 or 2×tithi at every elongation", bad.length, 0);
  }

  /* ── The live values the 2026-09-07 date analysis actually used ──
   * Pins the hand-typed YOGAS / KARANA_MOVABLE arrays at the indices that carried a real
   * decision. Without these, a transposed name deep in either table changes a recommendation
   * and no test notices — the arrays are 27 and 7 entries long and only their edges were
   * covered. Sun/Moon sidereal longitudes are from vedic.compute at 10:00 SGT. */
  {
    const at = (y, m, d) => {
      const jdUT = astro.julianDayUT(y, m, d, 10, 0, 8);
      const jde = astro.utToTT(jdUT, y);
      const ayan = V.lahiriAyanamsa(jde);
      return {
        sun: V.toSidereal(V.geocentricApparentLongitude("sun", jde), ayan),
        moon: V.toSidereal(V.moonLongitude(jde).lon, ayan),
      };
    };
    const a = at(2026, 10, 19), b = at(2026, 10, 31);
    eq("2026-10-19 pañcāṅga = Śukla Aṣṭamī · Dhriti · Bava",
      `${V.tithiOf(a.sun, a.moon).name} ${V.yogaOf(a.sun, a.moon).name} ${V.karanaOf(a.sun, a.moon).name}`,
      "Ashtami Dhriti Bava");
    eq("2026-10-31 pañcāṅga = Kṛṣṇa Ṣaṣṭhī · Siddha · Vaṇija",
      `${V.tithiOf(b.sun, b.moon).name} ${V.yogaOf(b.sun, b.moon).name} ${V.karanaOf(b.sun, b.moon).name}`,
      "Shashthi Siddha Vanija");
    eq("…and both yogas are on the auspicious side (the finding that made them non-discriminating)",
      V.yogaOf(a.sun, a.moon).auspicious && V.yogaOf(b.sun, b.moon).auspicious, true);
    // The 31st turns Vishti during the evening — the one hard prohibition, and a point-sample misses it.
    const eve = at(2026, 10, 31); // 10:00 → Vaṇija
    const late = (() => {
      const jdUT = astro.julianDayUT(2026, 10, 31, 20, 0, 8);
      const jde = astro.utToTT(jdUT, 2026);
      const ayan = V.lahiriAyanamsa(jde);
      return { sun: V.toSidereal(V.geocentricApparentLongitude("sun", jde), ayan), moon: V.toSidereal(V.moonLongitude(jde).lon, ayan) };
    })();
    eq("2026-10-31 is Vaṇija at 10:00 but VISHTI by 20:00 — a karaṇa is not a day fact",
      `${V.karanaOf(eve.sun, eve.moon).name}→${V.karanaOf(late.sun, late.moon).name}`, "Vanija→Vishti");
  }
}

console.log(`\n==== vedic (L1+L2+L3): ${pass} passed, ${fail} failed ====`);
if (flags.length) {
  console.log("FLAGS:");
  for (const f of flags) console.log("  - " + f);
}
process.exit(fail ? 1 : 0);

"use strict";
/**
 * vedic.js — Layer 1 (ephemeris core) of a deterministic, dependency-free Jyotish
 * calculator. No npm deps; reuses ./astro for julianDay/ΔT/mod360/D2R primitives.
 *
 * DATA PROVENANCE
 *   Planetary positions use truncated VSOP87D series (heliocentric, ecliptic & equinox
 *   of date) from CDS VizieR catalogue VI/81 (Bretagnon & Francou 1988), files
 *   VSOP87D.{ear,mer,ven,mar,jup,sat} fetched from
 *   https://cdsarc.cds.unistra.fr/ftp/VI/81/ and amplitude-truncated by vsop87-gen.mjs
 *   into vsop87-data.js (see its header for term counts). NO coefficient is
 *   hand-transcribed; every term traces to the fetched source file.
 *
 *   Moon longitude/latitude use the truncated ELP2000-82b series as published in
 *   Meeus, "Astronomical Algorithms" (2nd ed.) ch.47 Tables 47.A / 47.B — the periodic
 *   term tables embedded below. Nutation (ch.22), obliquity (ch.22), mean node, GMST
 *   (ch.12), and Lahiri ayanamsa coefficients are the standard published formulae.
 *
 * ANGLE / TIME CONVENTIONS
 *   - All "jdeTT" arguments are TT (≈TDB) Julian Days. UT inputs (gmst/lst) are UT JD.
 *   - VSOP T is Julian millennia from J2000 TT: T = (jdeTT − 2451545.0) / 365250.
 *   - Meeus T is Julian centuries from J2000 TT: T = (jdeTT − 2451545.0) / 36525.
 *   - Returned longitudes are tropical (of-date) unless a sidereal/ayanamsa step is
 *     applied by a higher layer.
 */
const astro = require("./astro");
const VSOP = require("./vsop87-data.js");

const D2R = astro.D2R;
const R2D = 180 / Math.PI;
const mod360 = astro.mod360;
const ARCSEC = 1 / 3600;

/* ─────────────────────────── VSOP87D evaluation ─────────────────────────── */

/**
 * Heliocentric ecliptic-of-date {L,B,R} for a body, from truncated VSOP87D.
 * @param {string} body  earth|mercury|venus|mars|jupiter|saturn
 * @param {number} jdeTT TT Julian Day
 * @returns {{L:number,B:number,R:number}} L,B in radians (L in [0,2π)), R in AU
 */
function vsop87(body, jdeTT) {
  const tbl = VSOP[body];
  if (!tbl) throw new Error(`vsop87: unknown body '${body}'`);
  const T = (jdeTT - 2451545.0) / 365250; // Julian millennia from J2000
  const out = {};
  const VAR = { L: 1, B: 2, R: 3 };
  for (const key of ["L", "B", "R"]) {
    const series = tbl[VAR[key]];
    let total = 0;
    for (const p of Object.keys(series)) {
      let s = 0;
      const terms = series[p];
      for (let i = 0; i < terms.length; i++) {
        const t = terms[i];
        s += t[0] * Math.cos(t[1] + t[2] * T);
      }
      total += s * Math.pow(T, +p);
    }
    out[key] = total;
  }
  out.L = ((out.L % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return out;
}

/** Rectangular heliocentric ecliptic-of-date coords (AU) of a body at jdeTT. */
function heliocentricXYZ(body, jdeTT) {
  const { L, B, R } = vsop87(body, jdeTT);
  const cb = Math.cos(B);
  return { x: R * cb * Math.cos(L), y: R * cb * Math.sin(L), z: R * Math.sin(B) };
}

/* ─────────────────────────── Nutation & obliquity ───────────────────────── */

/**
 * Nutation in longitude Δψ (degrees). Meeus ch.22 truncated (leading terms,
 * coefficients in 0.0001″). Accuracy ~0.5″, ample for Jyotish.
 */
function nutationLongitude(jdeTT) {
  const T = (jdeTT - 2451545.0) / 36525;
  const D = (297.85036 + 445267.11148 * T - 0.0019142 * T * T) * D2R;
  const M = (357.52772 + 35999.05034 * T - 0.0001603 * T * T) * D2R;
  const Mp = (134.96298 + 477198.867398 * T + 0.0086972 * T * T) * D2R;
  const F = (93.27191 + 483202.017538 * T - 0.0036825 * T * T) * D2R;
  const Om = (125.04452 - 1934.136261 * T + 0.0020708 * T * T) * D2R;
  // [d, m, mp, f, om, sinCoeff(0.0001"), sinCoeffT(0.0001"/cy)]
  const terms = [
    [0, 0, 0, 0, 1, -171996, -174.2],
    [-2, 0, 0, 2, 2, -13187, -1.6],
    [0, 0, 0, 2, 2, -2274, -0.2],
    [0, 0, 0, 0, 2, 2062, 0.2],
    [0, 1, 0, 0, 0, 1426, -3.4],
    [0, 0, 1, 0, 0, 712, 0.1],
    [-2, 1, 0, 2, 2, -517, 1.2],
    [0, 0, 0, 2, 1, -386, -0.4],
    [0, 0, 1, 2, 2, -301, 0],
    [-2, -1, 0, 2, 2, 217, -0.5],
    [-2, 0, 1, 0, 0, -158, 0],
    [-2, 0, 0, 2, 1, 129, 0.1],
    [0, 0, -1, 2, 2, 123, 0],
    [2, 0, 0, 0, 0, 63, 0],
    [0, 0, 1, 0, 1, 63, 0.1],
    [2, 0, -1, 2, 2, -59, 0],
    [0, 0, -1, 0, 1, -58, -0.1],
    [0, 0, 1, 2, 1, -51, 0],
    [-2, 0, 2, 0, 0, 48, 0],
    [0, 0, -2, 2, 1, 46, 0],
    [2, 0, 0, 2, 2, -38, 0],
    [0, 0, 2, 2, 2, -31, 0],
    [0, 0, 2, 0, 0, 29, 0],
    [-2, 0, 1, 2, 2, 29, 0],
    [0, 0, 0, 2, 0, 26, 0],
    [-2, 0, 0, 2, 0, -22, 0],
    [0, 0, -1, 2, 1, 21, 0],
    [0, 2, 0, 0, 0, 17, -0.1],
    [2, 0, -1, 0, 1, 16, 0],
    [-2, 2, 0, 2, 2, -16, 0.1],
    [0, 1, 0, 0, 1, -15, 0],
    [-2, 0, 1, 0, 1, -13, 0],
    [0, -1, 0, 0, 1, -12, 0],
    [0, 0, 2, -2, 0, 11, 0],
    [2, 0, -1, 2, 1, -10, 0],
    [2, 0, 1, 2, 2, -8, 0],
    [0, 1, 0, 2, 2, 7, 0],
    [-2, 1, 1, 0, 0, -7, 0],
    [0, -1, 0, 2, 2, -7, 0],
    [2, 0, 0, 2, 1, -7, 0],
    [2, 0, 1, 0, 0, 6, 0],
    [-2, 0, 2, 2, 2, 6, 0],
    [-2, 0, 1, 2, 1, 6, 0],
    [2, 0, -2, 0, 1, -6, 0],
    [2, 0, 0, 0, 1, -6, 0],
    [0, -1, 1, 0, 0, 5, 0],
    [-2, -1, 0, 2, 1, -5, 0],
    [-2, 0, 0, 0, 1, -5, 0],
    [0, 0, 2, 2, 1, -5, 0],
  ];
  let dpsi = 0; // in 0.0001"
  for (const [d, m, mp, f, om, c0, c1] of terms) {
    const arg = d * D + m * M + mp * Mp + f * F + om * Om;
    dpsi += (c0 + c1 * T) * Math.sin(arg);
  }
  return (dpsi * 0.0001) / 3600; // → degrees
}

/** Mean obliquity of the ecliptic ε₀ (degrees). Meeus ch.22 eq.22.2 (Laskar). */
function obliquity(jdeTT) {
  const T = (jdeTT - 2451545.0) / 36525; // Julian centuries from J2000
  const u = T / 100; // Meeus eq.22.3 uses u = T/100 (valid |u| ≤ 1, i.e. ±10000 yr)
  const eps0 =
    23 +
    26 / 60 +
    21.448 / 3600 +
    (-4680.93 * u -
      1.55 * u ** 2 +
      1999.25 * u ** 3 -
      51.38 * u ** 4 -
      249.67 * u ** 5 -
      39.05 * u ** 6 +
      7.12 * u ** 7 +
      27.87 * u ** 8 +
      5.79 * u ** 9 +
      2.45 * u ** 10) /
      3600;
  return eps0; // mean; add nutation in obliquity for true ε if needed
}

/* ─────────────────────── Geocentric apparent longitude ──────────────────── */

const KAPPA = 20.49552 * ARCSEC; // constant of aberration (degrees)
const C_AUPERDAY = 173.1446326847; // speed of light, AU/day

/**
 * Tropical apparent geocentric ecliptic longitude (degrees, [0,360)) of a graha.
 * body ∈ {sun, mercury, venus, mars, jupiter, saturn}. (Moon: use moonLongitude.)
 *
 * Method (Meeus ch.25/33): geometric geocentric vector = planet_helio − earth_helio,
 * with light-time iterated (planet evaluated at jde − τ), then corrected for annual
 * aberration and nutation Δψ. Sun is treated as Earth-heliocentric + 180°.
 */
function geocentricApparentLongitude(body, jdeTT) {
  const earth = heliocentricXYZ("earth", jdeTT);

  if (body === "sun") {
    // Sun's geocentric position = −(Earth heliocentric vector), at the SAME instant
    // (no separate light-time displacement: for the Sun, light-time aberration is the
    // single −κ longitude shift below — applying both would double-count). Meeus ch.25.
    const Rearth = vsop87("earth", jdeTT).R;
    let lon = Math.atan2(-earth.y, -earth.x) * R2D;
    lon += nutationLongitude(jdeTT); // nutation in longitude
    lon -= KAPPA / Rearth; // annual aberration: Sun appears 20.4898″/R behind geometric
    return mod360(lon);
  }

  // light-time iteration (×2 as specified; converges to <1e-9 AU)
  let tau = 0;
  let px, py, pz;
  for (let i = 0; i < 3; i++) {
    const p = heliocentricXYZ(body, jdeTT - tau);
    px = p.x - earth.x;
    py = p.y - earth.y;
    pz = p.z - earth.z;
    const dist = Math.sqrt(px * px + py * py + pz * pz);
    tau = dist / C_AUPERDAY;
  }
  let lon = Math.atan2(py, px) * R2D;

  // Annual aberration via the Sun's geometric longitude (Meeus eq.23.2/25):
  // Δλ = −κ·cos(⊙−λ)/cosβ ; here applied to longitude with β small for planets.
  const lat = Math.atan2(pz, Math.sqrt(px * px + py * py));
  const sunLon = Math.atan2(-earth.y, -earth.x) * R2D; // geometric Sun longitude
  const e = 0.016708634 - 0.000042037 * ((jdeTT - 2451545.0) / 36525);
  const pir =
    (102.93735 + 1.71946 * ((jdeTT - 2451545.0) / 36525)) * D2R; // longitude of perihelion ϖ
  const lamR = lon * D2R;
  const dLam =
    (-KAPPA * Math.cos((sunLon * D2R) - lamR) +
      e * KAPPA * Math.cos(pir - lamR)) /
    Math.cos(lat);
  lon += dLam;

  lon += nutationLongitude(jdeTT); // nutation in longitude
  return mod360(lon);
}

/* ───────────────────────────── Moon (ELP2000-82b) ───────────────────────── */

// Meeus Table 47.A (longitude Σl, 0.000001°) and 47.D distance (omitted) — argument
// multiples [D, M, M', F], then coefficient for Σl. Table 47.B for latitude Σb.
// Coefficients transcribed from Meeus AA 2nd ed.; sign/structure verified against the
// ch.47 worked example (1992 Apr 12) in vedic.test.mjs.
const MOON_LON = [
  // D, M, Mp, F, Σl
  [0, 0, 1, 0, 6288774],
  [2, 0, -1, 0, 1274027],
  [2, 0, 0, 0, 658314],
  [0, 0, 2, 0, 213618],
  [0, 1, 0, 0, -185116],
  [0, 0, 0, 2, -114332],
  [2, 0, -2, 0, 58793],
  [2, -1, -1, 0, 57066],
  [2, 0, 1, 0, 53322],
  [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923],
  [1, 0, 0, 0, -34720],
  [0, 1, 1, 0, -30383],
  [2, 0, 0, -2, 15327],
  [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980],
  [4, 0, -1, 0, 10675],
  [0, 0, 3, 0, 10034],
  [4, 0, -2, 0, 8548],
  [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766],
  [1, 0, -1, 0, -5163],
  [1, 1, 0, 0, 4987],
  [2, -1, 1, 0, 4036],
  [2, 0, 2, 0, 3994],
  [4, 0, 0, 0, 3861],
  [2, 0, -3, 0, 3665],
  [0, 1, -2, 0, -2689],
  [2, 0, -1, 2, -2602],
  [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348],
  [2, -2, 0, 0, 2236],
  [0, 1, 2, 0, -2120],
  [0, 2, 0, 0, -2069],
  [2, -2, -1, 0, 2048],
  [2, 0, 1, -2, -1773],
  [2, 0, 0, 2, -1595],
  [4, -1, -1, 0, 1215],
  [0, 0, 2, 2, -1110],
  [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810],
  [4, -1, -2, 0, 759],
  [0, 2, -1, 0, -713],
  [2, 2, -1, 0, -700],
  [2, 1, -2, 0, 691],
  [2, -1, 0, -2, 596],
  [4, 0, 1, 0, 549],
  [0, 0, 4, 0, 537],
  [4, -1, 0, 0, 520],
  [1, 0, -2, 0, -487],
  [2, 1, 0, -2, -399],
  [0, 0, 2, -2, -381],
  [1, 1, 1, 0, 351],
  [3, 0, -2, 0, -340],
  [4, 0, -3, 0, 330],
  [2, -1, 2, 0, 327],
  [0, 2, 1, 0, -323],
  [1, 1, -1, 0, 299],
  [2, 0, 3, 0, 294],
];
// Meeus Table 47.A distance column (Σr, unit 0.001 km), argument multiples [D, M, M', F].
// Used only by trueNode() for the orbital-angular-momentum vector. (Radial distance does
// not change the node-LINE direction when applied consistently across the ±δ samples, but
// using the real Σr makes h = r × v a genuine angular-momentum vector — the honest form.)
const MOON_DIST = [
  // D, M, Mp, F, Σr
  [0, 0, 1, 0, -20905355],
  [2, 0, -1, 0, -3699111],
  [2, 0, 0, 0, -2955968],
  [0, 0, 2, 0, -569925],
  [0, 1, 0, 0, 48888],
  [0, 0, 0, 2, -3149],
  [2, 0, -2, 0, 246158],
  [2, -1, -1, 0, -152138],
  [2, 0, 1, 0, -170733],
  [2, -1, 0, 0, -204586],
  [0, 1, -1, 0, -129620],
  [1, 0, 0, 0, 108743],
  [0, 1, 1, 0, 104755],
  [2, 0, 0, -2, 10321],
  [0, 0, 1, -2, 79661],
  [4, 0, -1, 0, -34782],
  [0, 0, 3, 0, -23210],
  [4, 0, -2, 0, -21636],
  [2, 1, -1, 0, 24208],
  [2, 1, 0, 0, 30824],
  [1, 0, -1, 0, -8379],
  [1, 1, 0, 0, -16675],
  [2, -1, 1, 0, -12831],
  [2, 0, 2, 0, -10445],
  [4, 0, 0, 0, -11650],
  [2, 0, -3, 0, 14403],
  [0, 1, -2, 0, -7003],
  [2, -1, -2, 0, 10056],
  [1, 0, 1, 0, 6322],
  [2, -2, 0, 0, -9884],
  [0, 1, 2, 0, 5751],
  [2, -2, -1, 0, -4950],
  [2, 0, 1, -2, 4130],
  [4, -1, -1, 0, -3958],
  [3, 0, -1, 0, 3258],
  [2, 1, 1, 0, 2616],
  [4, -1, -2, 0, -1897],
  [0, 2, -1, 0, -2117],
  [2, 2, -1, 0, 2354],
  [2, -1, 0, -2, -1423],
  [4, 0, 1, 0, -1117],
  [0, 0, 4, 0, -1571],
  [4, -1, 0, 0, -1739],
  [1, 0, -2, 0, -4421],
  [0, 0, 2, -2, 1165],
  [2, 0, 3, 0, 8752],
];
const MOON_LAT = [
  // D, M, Mp, F, Σb
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749],
  [0, 1, -1, 1, -1565],
  [1, 0, 0, 1, -1491],
  [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344],
  [1, 0, 0, -1, -1335],
  [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021],
  [4, 0, -1, 1, 833],
  [0, 0, 1, -3, 777],
  [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607],
  [2, 0, 2, -1, 596],
  [2, -1, 1, -1, 491],
  [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439],
  [2, 0, 2, 1, 422],
  [2, 0, -3, -1, 421],
  [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351],
  [4, 0, 0, 1, 331],
  [2, -1, 1, 1, 315],
  [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283],
  [2, 1, 1, -1, -229],
  [1, 1, 0, -1, 223],
  [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220],
  [2, 1, -1, -1, -220],
  [1, 0, 1, 1, -185],
  [2, -1, -2, -1, 181],
  [0, 1, 2, 1, -177],
  [4, 0, -2, -1, 176],
  [4, -1, -1, -1, 166],
  [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132],
  [1, 0, -1, -1, -119],
  [4, -1, 0, -1, 115],
  [2, -2, 0, 1, 107],
];

/**
 * Apparent geocentric Moon {lon, lat} in degrees (lon ∈ [0,360)). ELP2000-82b
 * truncated per Meeus ch.47. Includes the additive A1/A2/A3 perturbations, the E
 * eccentricity factor on M-dependent terms, and nutation Δψ in longitude.
 * Target accuracy ~10″.
 */
function moonLongitude(jdeTT) {
  const T = (jdeTT - 2451545.0) / 36525;
  const Lp =
    218.3164477 +
    481267.88123421 * T -
    0.0015786 * T * T +
    (T * T * T) / 538841 -
    (T * T * T * T) / 65194000; // mean longitude
  const D =
    297.8501921 +
    445267.1114034 * T -
    0.0018819 * T * T +
    (T * T * T) / 545868 -
    (T * T * T * T) / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T * T * T) / 24490000;
  const Mp =
    134.9633964 +
    477198.8675055 * T +
    0.0087414 * T * T +
    (T * T * T) / 69699 -
    (T * T * T * T) / 14712000;
  const F =
    93.272095 +
    483202.0175233 * T -
    0.0036539 * T * T -
    (T * T * T) / 3526000 +
    (T * T * T * T) / 863310000;
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const A3 = 313.45 + 481266.484 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  const r = D2R;
  let sumL = 0;
  for (const [cD, cM, cMp, cF, coef] of MOON_LON) {
    const arg = (cD * D + cM * M + cMp * Mp + cF * F) * r;
    let e = 1;
    if (cM === 1 || cM === -1) e = E;
    else if (cM === 2 || cM === -2) e = E * E;
    sumL += coef * e * Math.sin(arg);
  }
  // additive terms (Meeus eq. after Table 47.A)
  sumL += 3958 * Math.sin(A1 * r);
  sumL += 1962 * Math.sin((Lp - F) * r);
  sumL += 318 * Math.sin(A2 * r);

  let sumB = 0;
  for (const [cD, cM, cMp, cF, coef] of MOON_LAT) {
    const arg = (cD * D + cM * M + cMp * Mp + cF * F) * r;
    let e = 1;
    if (cM === 1 || cM === -1) e = E;
    else if (cM === 2 || cM === -2) e = E * E;
    sumB += coef * e * Math.sin(arg);
  }
  sumB += -2235 * Math.sin(Lp * r);
  sumB += 382 * Math.sin(A3 * r);
  sumB += 175 * Math.sin((A1 - F) * r);
  sumB += 175 * Math.sin((A1 + F) * r);
  sumB += 127 * Math.sin((Lp - Mp) * r);
  sumB += -115 * Math.sin((Lp + Mp) * r);

  const lon = mod360(Lp + sumL / 1000000 + nutationLongitude(jdeTT));
  const lat = sumB / 1000000;
  return { lon, lat };
}

/* ─────────────────────────── Lunar node & ayanamsa ──────────────────────── */

/** Rahu — mean ascending lunar node Ω (degrees, [0,360)). Meeus ch.47. */
function meanNode(jdeTT) {
  const T = (jdeTT - 2451545.0) / 36525;
  const Om =
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    (T * T * T) / 467441 -
    (T * T * T * T) / 60616000;
  return mod360(Om);
}

/**
 * Earth–Moon distance (km). ELP2000-82b truncated per Meeus ch.47 Table 47.A distance
 * column: r = 385000.56 km + Σr/1000. The E eccentricity factor applies to M-dependent
 * terms exactly as for Σl/Σb. Used only by trueNode().
 */
function moonDistance(jdeTT) {
  const T = (jdeTT - 2451545.0) / 36525;
  const D =
    297.8501921 +
    445267.1114034 * T -
    0.0018819 * T * T +
    (T * T * T) / 545868 -
    (T * T * T * T) / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T * T * T) / 24490000;
  const Mp =
    134.9633964 +
    477198.8675055 * T +
    0.0087414 * T * T +
    (T * T * T) / 69699 -
    (T * T * T * T) / 14712000;
  const F =
    93.272095 +
    483202.0175233 * T -
    0.0036539 * T * T -
    (T * T * T) / 3526000 +
    (T * T * T * T) / 863310000;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const r = D2R;
  let sumR = 0;
  for (const [cD, cM, cMp, cF, coef] of MOON_DIST) {
    const arg = (cD * D + cM * M + cMp * Mp + cF * F) * r;
    let e = 1;
    if (cM === 1 || cM === -1) e = E;
    else if (cM === 2 || cM === -2) e = E * E;
    sumR += coef * e * Math.cos(arg);
  }
  return 385000.56 + sumR / 1000;
}

/** Geocentric ecliptic-of-date rectangular Moon vector (km) from {lon,lat,dist}. */
function moonVectorEcliptic(jdeTT) {
  const { lon, lat } = moonLongitude(jdeTT);
  const dist = moonDistance(jdeTT);
  const lo = lon * D2R;
  const la = lat * D2R;
  const cb = Math.cos(la);
  return { x: dist * cb * Math.cos(lo), y: dist * cb * Math.sin(lo), z: dist * Math.sin(la) };
}

/**
 * Rahu — TRUE (osculating) ascending lunar node Ω (degrees, [0,360)), tropical of-date,
 * to match Jagannatha Hora's default. Method: form the Moon's instantaneous orbital
 * angular-momentum vector h = r × v (r geocentric ecliptic position, v its time
 * derivative by central difference over ±δ days). The ascending-node line is where the
 * orbital plane crosses the ecliptic going north; that line is perpendicular to BOTH the
 * ecliptic pole (ẑ) and h, i.e. along ẑ × h = (−h_y, h_x, 0). Its longitude is therefore
 *   Ω = atan2(h_x, −h_y).
 * The node-line direction is independent of the radial scale of r, so this reduces to the
 * orbital-plane orientation set by the Moon's (lon,lat) — distance is included only to
 * make h a true angular-momentum vector. Returned tropical of-date, consistent with
 * meanNode() (both feed toSidereal in compute()).
 *
 * Validated against JHora (true node, Lahiri) to ~0.7′; δ in [0.005,0.1] day changes the
 * result by <0.01′ (see trueNode step-size test). Default δ = 0.05 day.
 * @param {number} jdeTT  TT Julian Day
 * @param {number} [delta=0.05]  central-difference half-step (days)
 */
function trueNode(jdeTT, delta = 0.05) {
  const rm = moonVectorEcliptic(jdeTT - delta);
  const rp = moonVectorEcliptic(jdeTT + delta);
  const r0 = moonVectorEcliptic(jdeTT);
  const vx = (rp.x - rm.x) / (2 * delta);
  const vy = (rp.y - rm.y) / (2 * delta);
  const vz = (rp.z - rm.z) / (2 * delta);
  // h = r × v
  const hx = r0.y * vz - r0.z * vy;
  const hy = r0.z * vx - r0.x * vz;
  // hz unused: the node longitude depends only on h's projection onto the ecliptic plane.
  // Ascending node along ẑ × h = (−h_y, h_x): Ω = atan2(h_x, −h_y).
  return mod360(Math.atan2(hx, -hy) * R2D);
}

/** Lahiri (Chitrapaksha) ayanamsa (degrees). Linear + T² model anchored at J2000. */
function lahiriAyanamsa(jdeTT) {
  const T = (jdeTT - 2451545.0) / 36525;
  return 23.853222 + 1.396042 * T + 0.0003086 * T * T;
}

/* ─────────────────────────── Sidereal time & ascendant ──────────────────── */

/** Greenwich mean sidereal time (degrees, [0,360)) at UT Julian Day jdUT. Meeus eq.12.4. */
function gmst(jdUT) {
  const T = (jdUT - 2451545.0) / 36525;
  const theta =
    280.46061837 +
    360.98564736629 * (jdUT - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  return mod360(theta);
}

/** Local apparent... here local *mean* sidereal time (degrees) at UT JD and east longitude. */
function lst(jdUT, lonEastDeg) {
  return mod360(gmst(jdUT) + lonEastDeg);
}

/**
 * Tropical ascendant (degrees, [0,360)) from local sidereal time θ (deg), geographic
 * latitude φ (deg), and obliquity ε (deg).
 *   asc = atan2( cosθ , −(sinθ·cosε + tanφ·sinε) )
 */
function ascendantTropical(lstDeg, latDeg, epsDeg) {
  const th = lstDeg * D2R;
  const eps = epsDeg * D2R;
  const phi = latDeg * D2R;
  const asc = Math.atan2(
    Math.cos(th),
    -(Math.sin(th) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))
  );
  return mod360(asc * R2D);
}

/* ═══════════════════════════════ LAYER 2 — placement ═════════════════════════════ */

/** Tropical → sidereal longitude (deg, [0,360)) for ayanamsa `ayan` (deg). */
function toSidereal(lonTrop, ayan) {
  return mod360(lonTrop - ayan);
}

const RASIS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/** Rasi (sign) of a sidereal longitude → {index 0..11, name, degInSign}. */
function rashiOf(lonSid) {
  const l = mod360(lonSid);
  const index = Math.floor(l / 30);
  return { index, name: RASIS[index], degInSign: l - index * 30 };
}

// 27 nakshatras, each 13°20′ = 13.333…°. Vimshottari lords cycle Ketu…Mercury.
const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];
// Vimshottari dasha lord order (120-year cycle). Nakshatra n → lord NAK_LORDS[n%9].
const NAK_LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const NAK_SPAN = 360 / 27; // 13.3333°

/**
 * Nakshatra of a sidereal longitude → {index 0..26, name, lord, pada 1..4, fracPassed}.
 * fracPassed is the fraction of the nakshatra already traversed (0..1) — used for the
 * Vimshottari balance of the first dasha.
 */
function nakshatraOf(lonSid) {
  const l = mod360(lonSid);
  const index = Math.floor(l / NAK_SPAN);
  const within = l - index * NAK_SPAN; // deg into this nakshatra
  const pada = Math.floor(within / (NAK_SPAN / 4)) + 1; // 1..4 (each pada 3°20′)
  return {
    index,
    name: NAKSHATRAS[index],
    lord: NAK_LORDS[index % 9],
    pada,
    fracPassed: within / NAK_SPAN,
  };
}

/**
 * Navamsa (D9) sign of a sidereal longitude. Element-based counting start:
 *   movable (chara: Ar,Cn,Li,Cp) → navamsa count starts from the SAME sign;
 *   fixed   (sthira: Ta,Le,Sc,Aq) → starts from the 9th sign from it;
 *   dual    (dwiswa: Ge,Vi,Sg,Pi) → starts from the 5th sign from it.
 * Each sign holds 9 navamsas of 3°20′. Returns {index,name}.
 */
function navamsaOf(lonSid) {
  const l = mod360(lonSid);
  const sign = Math.floor(l / 30); // 0..11
  const navWithin = Math.floor((l - sign * 30) / (30 / 9)); // 0..8
  const mod = sign % 3; // 0 movable, 1 fixed, 2 dual
  let start;
  if (mod === 0) start = sign; // movable → same sign
  else if (mod === 1) start = (sign + 8) % 12; // fixed → 9th sign (sign+8)
  else start = (sign + 4) % 12; // dual → 5th sign (sign+4)
  const index = (start + navWithin) % 12;
  return { index, name: RASIS[index] };
}

/**
 * General varga (divisional chart) sign of a sidereal longitude for divisor D.
 * Returns {index,name}. Implements the classical (Parashari) schemes:
 *   D1  rasi.
 *   D2  hora — Sun's hora (Leo) for first 15° of odd signs / last 15° of even;
 *       Moon's hora (Cancer) otherwise (BPHS).
 *   D3  drekkana — 1st part = same sign, 2nd = 5th, 3rd = 9th.
 *   D9  navamsa (element-based, == navamsaOf).
 *   D10 dasamsa — odd sign: from same; even sign: from 9th.
 *   D12 dwadasamsa — counts from the sign itself.
 *   D30 trimsamsa — Parashari unequal scheme (Mars5/Sat5/Jup8/Merc7/Venus5),
 *       odd vs even sign rulers.
 *   D60 shashtiamsa — 0.5° parts counted from the sign itself.
 *   General even-division (D4,D5,D6,D7,D8,D16,D20,D24,D27,D40,D45 …): the part is
 *       a 30/D segment counted from the sign itself (documented general fallback;
 *       the classical odd/even start-rules vary by source for these).
 */
function vargaOf(lonSid, D) {
  const l = mod360(lonSid);
  const sign = Math.floor(l / 30);
  const deg = l - sign * 30; // 0..30
  const odd = sign % 2 === 0; // Aries(0) is the "odd" (1st) sign in 1-based parlance
  const mk = (i) => ({ index: ((i % 12) + 12) % 12, name: RASIS[((i % 12) + 12) % 12] });

  switch (D) {
    case 1:
      return mk(sign);
    case 2: {
      // Hora: Leo (Sun) or Cancer (Moon). BPHS: odd sign 0–15 → Sun(Leo), 15–30 → Moon(Cancer);
      // even sign 0–15 → Moon, 15–30 → Sun.
      const firstHalf = deg < 15;
      const sunHora = odd ? firstHalf : !firstHalf;
      return mk(sunHora ? 4 /*Leo*/ : 3 /*Cancer*/);
    }
    case 3: {
      const part = Math.floor(deg / 10); // 0,1,2
      return mk(sign + [0, 4, 8][part]); // same, 5th, 9th
    }
    case 9:
      return navamsaOf(l);
    case 10: {
      const part = Math.floor(deg / 3); // 0..9
      const start = odd ? sign : (sign + 8) % 12; // odd→same, even→9th
      return mk(start + part);
    }
    case 12: {
      const part = Math.floor(deg / 2.5); // 0..11
      return mk(sign + part); // count from the sign itself
    }
    case 30: {
      // Parashari trimsamsa — unequal segments, ruler-based target sign.
      // Odd sign: Mars 0-5(Aries), Sat 5-10(Aquarius), Jup 10-18(Sagittarius),
      // Merc 18-25(Gemini), Venus 25-30(Libra). Even sign reverses ruler order:
      // Venus 0-5(Taurus), Merc 5-12(Virgo), Jup 12-20(Pisces), Sat 20-25(Capricorn),
      // Mars 25-30(Scorpio).
      if (odd) {
        if (deg < 5) return mk(0); // Aries (Mars)
        if (deg < 10) return mk(10); // Aquarius (Saturn)
        if (deg < 18) return mk(8); // Sagittarius (Jupiter)
        if (deg < 25) return mk(2); // Gemini (Mercury)
        return mk(6); // Libra (Venus)
      } else {
        if (deg < 5) return mk(1); // Taurus (Venus)
        if (deg < 12) return mk(5); // Virgo (Mercury)
        if (deg < 20) return mk(11); // Pisces (Jupiter)
        if (deg < 25) return mk(9); // Capricorn (Saturn)
        return mk(7); // Scorpio (Mars)
      }
    }
    case 60: {
      const part = Math.floor(deg / 0.5); // 0..59
      return mk(sign + part); // count from the sign itself
    }
    default: {
      // General equal-division fallback: D parts of (30/D)°, counted from the sign.
      if (!Number.isInteger(D) || D < 1) throw new Error(`vargaOf: bad divisor ${D}`);
      const part = Math.floor(deg / (30 / D));
      return mk(sign + part);
    }
  }
}

/* ─── Jaimini chara karakas (by sidereal degree-within-sign, Rahu reverse) ─── */

const KARAKA_NAMES = ["AK", "AmK", "BK", "MK", "PiK", "PuK", "GK", "DK"]; // 8-karaka scheme
/**
 * Jaimini chara karakas. Rank the 7 grahas + Rahu by degrees traversed within their
 * sign (highest = Atmakaraka). Rahu uses reverse degree (30 − degInSign) because it
 * is always retrograde. Returns {AK,AmK,…,DK} → graha name.
 * @param {{name:string, degInSign:number}[]} grahaList  must include Rahu (Ketu ignored)
 */
function charaKarakas(grahaList) {
  const used = grahaList
    .filter((g) => g.name !== "Ketu") // 8-karaka scheme excludes Ketu
    .map((g) => ({
      name: g.name,
      score: g.name === "Rahu" ? 30 - g.degInSign : g.degInSign,
    }))
    .sort((a, b) => b.score - a.score);
  const out = {};
  for (let i = 0; i < KARAKA_NAMES.length && i < used.length; i++) {
    out[KARAKA_NAMES[i]] = used[i].name;
  }
  return out;
}

/* ═══════════════════════════════ LAYER 3 — Vimshottari ════════════════════════════ */

const VIMS_YEAR_DAYS = 365.2425; // days per dasha-year (civil/Gregorian year used by JHora)
// Dasha lords in cycle order with their period lengths (years). Sum = 120.
const VIMS_SEQ = [
  ["Ketu", 7], ["Venus", 20], ["Sun", 6], ["Moon", 10], ["Mars", 7],
  ["Rahu", 18], ["Jupiter", 16], ["Saturn", 19], ["Mercury", 17],
];
const VIMS_TOTAL = 120;

/** Index of a lord in VIMS_SEQ. */
function vimsIndex(lord) {
  return VIMS_SEQ.findIndex(([n]) => n === lord);
}

/**
 * Build nested Vimshottari dasha tree to `levels` deep (default 3: MD→AD→PD).
 * @param {number} moonSid  Moon sidereal longitude (deg)
 * @param {number} birthJD  birth Julian Day (the same time-scale is returned throughout)
 * @returns {{lord,startJD,endJD,years,sub?}[]}  full 120-year sequence of Mahadashas.
 */
function vimshottari(moonSid, birthJD, levels = 3) {
  const nak = nakshatraOf(moonSid);
  const startLord = nak.lord;
  const startIdx = vimsIndex(startLord);
  const [, startYears] = VIMS_SEQ[startIdx];
  // Balance of the starting MD = fraction of nakshatra REMAINING × its full period.
  const remainingFrac = 1 - nak.fracPassed;
  const balanceYears = startYears * remainingFrac;
  // Virtual MD start = birthJD shifted back by the elapsed (already-traversed) portion.
  const elapsedDays = (startYears - balanceYears) * VIMS_YEAR_DAYS;
  const virtualStartJD = birthJD - elapsedDays;

  // Recursive sub-period builder: split [start, start+lenDays] over the lord cycle
  // beginning at `firstLord`, each child proportional to its period / 120.
  function buildSubs(parentStartJD, parentLengthDays, firstLord, depth) {
    if (depth <= 0) return undefined;
    const subs = [];
    let cursor = parentStartJD;
    const fi = vimsIndex(firstLord);
    for (let k = 0; k < 9; k++) {
      const [lord, yrs] = VIMS_SEQ[(fi + k) % 9];
      const lenDays = parentLengthDays * (yrs / VIMS_TOTAL);
      const node = {
        lord,
        startJD: cursor,
        endJD: cursor + lenDays,
        years: lenDays / VIMS_YEAR_DAYS,
      };
      const sub = buildSubs(cursor, lenDays, lord, depth - 1);
      if (sub) node.sub = sub;
      subs.push(node);
      cursor += lenDays;
    }
    return subs;
  }

  // Top-level Mahadashas: full 120-year sequence from the virtual start.
  const tree = [];
  let cursor = virtualStartJD;
  for (let k = 0; k < 9; k++) {
    const [lord, yrs] = VIMS_SEQ[(startIdx + k) % 9];
    const lenDays = yrs * VIMS_YEAR_DAYS;
    const node = {
      lord,
      startJD: cursor,
      endJD: cursor + lenDays,
      years: yrs,
    };
    const sub = buildSubs(cursor, lenDays, lord, levels - 1);
    if (sub) node.sub = sub;
    tree.push(node);
    cursor += lenDays;
  }
  return tree;
}

/** Format a UT Julian Day → "YYYY-MM-DD" (civil date of the day containing jd). */
function jdToDateStr(jd) {
  const z = Math.floor(jd + 0.5); // JDN of the civil day (00h boundary) containing jd
  const { y, m, d } = astro.jdnToGregorian(z);
  const pad = (n) => String(n).padStart(2, "0");
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Active dasha lords at Julian day `jd` within a tree (leaf path MD→AD→PD…). */
function dashaAt(tree, jd) {
  const path = [];
  let level = tree;
  while (level) {
    const node = level.find((n) => jd >= n.startJD && jd < n.endJD);
    if (!node) break;
    path.push(node.lord);
    level = node.sub;
  }
  return path;
}

/* ═══════════════════════════ TOP-LEVEL compute(o) ═════════════════════════ */

// The 7 grahas, with their VSOP/ELP longitude source. Rahu = lunar node (TRUE by default,
// mean if opts.meanNode); Ketu = Rahu+180.
const GRAHA_DEFS = [
  ["Sun", "sun"], ["Moon", "moon"], ["Mars", "mars"], ["Mercury", "mercury"],
  ["Jupiter", "jupiter"], ["Venus", "venus"], ["Saturn", "saturn"],
];

/** Nutation in obliquity Δε (degrees), Meeus ch.22 — leading terms (~0.5″). */
function nutationLongitudeInObliquity(jdeTT) {
  const T = (jdeTT - 2451545.0) / 36525;
  const D = (297.85036 + 445267.11148 * T) * D2R;
  const M = (357.52772 + 35999.05034 * T) * D2R;
  const Mp = (134.96298 + 477198.867398 * T) * D2R;
  const F = (93.27191 + 483202.017538 * T) * D2R;
  const Om = (125.04452 - 1934.136261 * T) * D2R;
  // [d,m,mp,f,om, cosCoeff(0.0001")]
  const terms = [
    [0, 0, 0, 0, 1, 92025],
    [-2, 0, 0, 2, 2, 5736],
    [0, 0, 0, 2, 2, 977],
    [0, 0, 0, 0, 2, -895],
    [0, 1, 0, 0, 0, 54],
    [0, 0, 1, 0, 0, -7],
    [-2, 1, 0, 2, 2, 224],
    [0, 0, 0, 2, 1, 200],
    [0, 0, 1, 2, 2, 129],
    [-2, -1, 0, 2, 2, -95],
  ];
  let deps = 0;
  for (const [d, m, mp, f, om, c] of terms) {
    deps += c * Math.cos(d * D + m * M + mp * Mp + f * F + om * Om);
  }
  return (deps * 0.0001) / 3600;
}

/**
 * Full Jyotish chart for input `o` = {y,m,d,hour,minute,tz,lat,lon}.
 * Vedic convention: RAW CLOCK instant → UT (no true-solar adjustment).
 * @param {object} [opts]  {meanNode:true} → Rahu/Ketu from the MEAN node instead of the
 *   default TRUE (osculating) node. (Vimshottari is Moon-driven and unaffected either way.)
 * Returns {input, jdUT, jdeTT, ayanamsa, grahas, lagna, bhavas, karakas, dasha}.
 */
function compute(o, opts = {}) {
  const jdUT = astro.julianDayUT(o.y, o.m, o.d, o.hour, o.minute, o.tz);
  const jde = astro.utToTT(jdUT, o.y);
  const ayan = lahiriAyanamsa(jde);

  const grahas = {};
  const karakaInput = [];
  for (const [name, body] of GRAHA_DEFS) {
    const trop =
      name === "Moon" ? moonLongitude(jde).lon : geocentricApparentLongitude(body, jde);
    const sid = toSidereal(trop, ayan);
    const rasi = rashiOf(sid);
    const nak = nakshatraOf(sid);
    grahas[name] = {
      tropical: trop,
      sidereal: sid,
      rasi,
      nakshatra: { index: nak.index, name: nak.name, lord: nak.lord, pada: nak.pada },
      navamsa: navamsaOf(sid),
    };
    karakaInput.push({ name, degInSign: rasi.degInSign });
  }
  // Rahu (TRUE node by default, mean if opts.meanNode) + Ketu (Rahu+180), both sidereal.
  {
    const rahuTrop = opts.meanNode === true ? meanNode(jde) : trueNode(jde);
    const rahuSid = toSidereal(rahuTrop, ayan);
    const ketuSid = mod360(rahuSid + 180);
    for (const [name, sid, trop] of [
      ["Rahu", rahuSid, rahuTrop],
      ["Ketu", ketuSid, mod360(rahuTrop + 180)],
    ]) {
      const rasi = rashiOf(sid);
      const nak = nakshatraOf(sid);
      grahas[name] = {
        tropical: trop,
        sidereal: sid,
        rasi,
        nakshatra: { index: nak.index, name: nak.name, lord: nak.lord, pada: nak.pada },
        navamsa: navamsaOf(sid),
      };
      if (name === "Rahu") karakaInput.push({ name: "Rahu", degInSign: rasi.degInSign });
    }
  }

  // Lagna (ascendant): tropical from local sidereal time, then sidereal.
  const eps = obliquity(jde) + nutationLongitudeInObliquity(jde); // true obliquity
  const lstDeg = lst(jdUT, o.lon);
  const ascTrop = ascendantTropical(lstDeg, o.lat, eps);
  const ascSid = toSidereal(ascTrop, ayan);
  const lagnaRasi = rashiOf(ascSid);
  const lagnaNak = nakshatraOf(ascSid);
  const lagna = {
    tropical: ascTrop,
    sidereal: ascSid,
    rasi: lagnaRasi,
    nakshatra: { index: lagnaNak.index, name: lagnaNak.name, lord: lagnaNak.lord, pada: lagnaNak.pada },
    navamsa: navamsaOf(ascSid),
  };

  // 12 whole-sign bhavas from the Lagna sign.
  const bhavas = [];
  for (let i = 0; i < 12; i++) {
    const idx = (lagnaRasi.index + i) % 12;
    bhavas.push({ house: i + 1, signIndex: idx, sign: RASIS[idx] });
  }

  const karakas = charaKarakas(karakaInput);
  const dasha = vimshottari(grahas.Moon.sidereal, jdUT, 3);

  return { input: o, jdUT, jdeTT: jde, ayanamsa: ayan, grahas, lagna, bhavas, karakas, dasha };
}

module.exports = {
  vsop87,
  heliocentricXYZ,
  geocentricApparentLongitude,
  moonLongitude,
  moonDistance,
  moonVectorEcliptic,
  meanNode,
  trueNode,
  lahiriAyanamsa,
  obliquity,
  nutationLongitude,
  nutationLongitudeInObliquity,
  gmst,
  lst,
  ascendantTropical,
  // L2 — placement
  toSidereal,
  rashiOf,
  nakshatraOf,
  navamsaOf,
  vargaOf,
  charaKarakas,
  RASIS,
  NAKSHATRAS,
  NAK_LORDS,
  // L3 — Vimshottari
  vimshottari,
  jdToDateStr,
  dashaAt,
  VIMS_YEAR_DAYS,
  VIMS_SEQ,
  // top-level
  compute,
};

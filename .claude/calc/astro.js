"use strict";
/**
 * astro.js — astronomical primitives for 命理 calculators (no dependencies).
 * Meeus low-precision algorithms (Astronomical Algorithms, 2nd ed.):
 *   - Julian Day (integer + fractional UT)
 *   - Sun apparent geocentric longitude (ch. 25) → solar terms 节气
 *   - Equation of Time (ch. 28) → true (apparent) solar time
 *   - New Moon instants (ch. 49) → lunar-month boundaries for 紫微
 * Accuracy ~0.01° / a few minutes — ample for day-level pillar boundaries.
 */
const D2R = Math.PI / 180;
const mod360 = (x) => ((x % 360) + 360) % 360;

/** Julian Day Number (integer) for a Gregorian calendar date. */
function gregorianToJDN(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

/** Gregorian calendar date {y,m,d} from a Julian Day Number (integer). */
function jdnToGregorian(jdn) {
  let a = jdn + 32044;
  let b = Math.floor((4 * a + 3) / 146097);
  let c = a - Math.floor((146097 * b) / 4);
  let dd = Math.floor((4 * c + 3) / 1461);
  let e = c - Math.floor((1461 * dd) / 4);
  let mm = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * mm + 2) / 5) + 1;
  const month = mm + 3 - 12 * Math.floor(mm / 10);
  const year = 100 * b + dd - 4800 + Math.floor(mm / 10);
  return { y: year, m: month, d: day };
}

/** Fractional Julian Day (UT) from a local civil datetime + timezone offset (hours east of UTC). */
function julianDayUT(y, m, d, hour, minute, tzOffsetHours) {
  const dayFrac = (hour - tzOffsetHours) / 24 + minute / 1440;
  return gregorianToJDN(y, m, d) - 0.5 + dayFrac;
}

/** Approx ΔT (seconds), adequate for 1950–2050 (Espenak–Meeus). Pillar-irrelevant; refines minutes. */
function deltaTSeconds(year) {
  const t = year - 2000;
  return 62.92 + 0.32217 * t + 0.005589 * t * t;
}

/** Convert UT JD → TT (ephemeris) JD. */
function utToTT(jdUT, year) {
  return jdUT + deltaTSeconds(year) / 86400;
}

/** Sun's apparent geocentric longitude (deg) at TT Julian day jde. Meeus ch.25. */
function sunApparentLongitude(jde) {
  const T = (jde - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  const trueLong = L0 + C;
  const Omega = (125.04 - 1934.136 * T) * D2R;
  return mod360(trueLong - 0.00569 - 0.00478 * Math.sin(Omega));
}

/** Sun apparent longitude (deg) at a given UT JD (applies ΔT). */
function sunLongitudeAtUT(jdUT, year) {
  return sunApparentLongitude(utToTT(jdUT, year));
}

/**
 * UT JD at which the sun's apparent longitude first equals targetDeg, near jdGuessUT.
 * Newton iteration; the sun moves ~0.98565°/day.
 */
function solarLongitudeCrossingUT(targetDeg, jdGuessUT, year) {
  let jd = jdGuessUT;
  for (let i = 0; i < 10; i++) {
    const lam = sunLongitudeAtUT(jd, year);
    const delta = mod360(targetDeg - lam + 180) - 180; // sign-safe (JS % is negative for negatives → seam bug)
    if (Math.abs(delta) < 1e-7) break;
    jd += delta / 0.9856473;
  }
  return jd;
}

/**
 * UT JD of the solar term with apparent longitude L (deg) in the given Gregorian year.
 * Seeds from the linear distance to the vernal equinox (L=0 ≈ Mar 20), then Newton-refines.
 */
function solarTermUT(year, L) {
  const delta = L > 180 ? L - 360 : L; // signed degrees from the equinox
  const guess = gregorianToJDN(year, 3, 20) - 0.5 + delta / 0.9856473;
  return solarLongitudeCrossingUT(L, guess, year);
}

/** Equation of Time (minutes; apparent − mean solar). Meeus ch.28. */
function equationOfTimeMinutes(jdeTT) {
  const T = (jdeTT - 2451545.0) / 36525;
  const eps = (23.439291 - 0.0130042 * T) * D2R;
  const L0 = mod360(280.46646 + 36000.76983 * T) * D2R;
  const M = (357.52911 + 35999.05029 * T) * D2R;
  const e = 0.016708634 - 0.000042037 * T;
  const yv = Math.tan(eps / 2) ** 2;
  const E =
    yv * Math.sin(2 * L0) -
    2 * e * Math.sin(M) +
    4 * e * yv * Math.sin(M) * Math.cos(2 * L0) -
    0.5 * yv * yv * Math.sin(4 * L0) -
    1.25 * e * e * Math.sin(2 * M);
  return (E / D2R) * 4; // radians→deg→minutes
}

/**
 * True (apparent) solar time as decimal hours, from a local civil clock time.
 * trueSolar = civil + longitudeCorrection + equationOfTime.
 */
function trueSolarHours(y, m, d, hour, minute, tzOffsetHours, longitudeDeg) {
  const jdUT = julianDayUT(y, m, d, hour, minute, tzOffsetHours);
  const eot = equationOfTimeMinutes(utToTT(jdUT, y)); // minutes
  const civil = hour + minute / 60;
  const lonCorr = (longitudeDeg - tzOffsetHours * 15) / 15; // hours
  return civil + lonCorr + eot / 60;
}

/** UT JD of the new moon (lunar conjunction) nearest the lunation index k. Meeus ch.49. */
function newMoonUT(k) {
  const T = k / 1236.85;
  let jde =
    2451550.09766 +
    29.530588861 * k +
    0.00015437 * T * T -
    0.00000015 * T * T * T +
    0.00000000073 * T * T * T * T;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T) * D2R;
  const Mp =
    (201.5643 + 385.81693528 * k + 0.0107582 * T * T) * D2R;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T) * D2R;
  const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T * T) * D2R;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  let corr =
    -0.4072 * Math.sin(Mp) +
    0.17241 * E * Math.sin(M) +
    0.01608 * Math.sin(2 * Mp) +
    0.01039 * Math.sin(2 * F) +
    0.00739 * E * Math.sin(Mp - M) -
    0.00514 * E * Math.sin(Mp + M) +
    0.00208 * E * E * Math.sin(2 * M) -
    0.00111 * Math.sin(Mp - 2 * F) -
    0.00057 * Math.sin(Mp + 2 * F) +
    0.00056 * E * Math.sin(2 * Mp + M) -
    0.00042 * Math.sin(3 * Mp) +
    0.00042 * E * Math.sin(M + 2 * F) +
    0.00038 * E * Math.sin(M - 2 * F) -
    0.00024 * E * Math.sin(2 * Mp - M) -
    0.00017 * Math.sin(Om) -
    0.00007 * Math.sin(Mp + 2 * M) +
    0.00004 * Math.sin(2 * Mp - 2 * F) +
    0.00004 * Math.sin(3 * M) +
    0.00003 * Math.sin(Mp + M - 2 * F) +
    0.00003 * Math.sin(2 * Mp + 2 * F) -
    0.00003 * Math.sin(Mp + M + 2 * F) +
    0.00003 * Math.sin(Mp - M + 2 * F) -
    0.00002 * Math.sin(Mp - M - 2 * F) -
    0.00002 * Math.sin(3 * Mp + M) +
    0.00002 * Math.sin(4 * Mp);
  jde += corr;
  const year = 2000 + k / 12.3685;
  return jde - deltaTSeconds(year) / 86400; // TT→UT
}

module.exports = {
  D2R,
  mod360,
  gregorianToJDN,
  jdnToGregorian,
  julianDayUT,
  deltaTSeconds,
  utToTT,
  sunApparentLongitude,
  sunLongitudeAtUT,
  solarLongitudeCrossingUT,
  solarTermUT,
  equationOfTimeMinutes,
  trueSolarHours,
  newMoonUT,
};

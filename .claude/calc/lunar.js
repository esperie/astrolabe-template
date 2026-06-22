"use strict";
/**
 * lunar.js — Chinese lunisolar conversion (solar → lunar month/day) for 紫微.
 * Month boundaries from astro.newMoonUT; month numbering anchored on the 十一月
 * (the lunar month containing 冬至, longitude 270°); leap months detected as months
 * containing NO 中气 (a 中气 = a solar-longitude multiple of 30°, tested by crossing).
 * Validated against reference solar→lunar conversions (置闰/中气 edge cases).
 */
const A = require("./astro");

const civilDay = (jdUT, tz) => Math.floor(jdUT + tz / 24 + 0.5);
const nmK = (jdUT) => Math.round((jdUT - 2451550.09766) / 29.530588861);

/** k of the new moon that STARTS the lunar month containing eventJD. */
function monthStartK(eventJD, tz) {
  const k0 = nmK(eventJD);
  for (let k = k0 + 2; k >= k0 - 3; k--) {
    if (civilDay(A.newMoonUT(k), tz) <= civilDay(eventJD, tz)) return k;
  }
  return k0;
}

/** Does lunar month [newMoon(k), newMoon(k+1)) contain a 中气 (solar longitude ≡ 0 mod 30)? */
function hasMajorTerm(k) {
  const a = A.newMoonUT(k), b = A.newMoonUT(k + 1);
  const ya = A.jdnToGregorian(Math.floor(a + 0.5)).y;
  const la = A.sunLongitudeAtUT(a, ya);
  let lb = A.sunLongitudeAtUT(b, ya);
  if (lb < la) lb += 360;
  return Math.floor(lb / 30) - Math.floor(la / 30) >= 1;
}

/** Solar Gregorian date → {lunarMonth(1-12), lunarDay(1-30), isLeap}. tz default Singapore (+8). */
function solarToLunar(y, m, d, tz = 8) {
  const target = A.gregorianToJDN(y, m, d);
  const jdUT = target - 0.5 + (12 - tz) / 24; // ~local noon
  const startK = monthStartK(jdUT, tz);
  const lunarDay = civilDay(jdUT, tz) - civilDay(A.newMoonUT(startK), tz) + 1;

  // 十一月 = the month containing the 冬至 nearest the date (longitude 270°)
  const ya = A.jdnToGregorian(target).y;
  const dz = A.solarLongitudeCrossingUT(270, jdUT, ya);
  const m11K = monthStartK(dz, tz);

  let monthNo;
  if (startK <= m11K) {
    let steps = 0;
    for (let k = startK; k < m11K; k++) if (hasMajorTerm(k + 1)) steps++;
    monthNo = 11 - steps;
  } else {
    let steps = 0;
    for (let k = m11K; k < startK; k++) if (hasMajorTerm(k + 1)) steps++;
    monthNo = 11 + steps;
  }
  monthNo = (((monthNo - 1) % 12) + 12) % 12 + 1;
  return { lunarMonth: monthNo, lunarDay, isLeap: !hasMajorTerm(startK) };
}

module.exports = { solarToLunar };

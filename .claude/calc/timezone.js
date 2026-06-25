/**
 * timezone.js — accurate UTC-offset engine for birth-chart input, backed by the IANA tz database.
 *
 * The calculators convert civil clock time → true-solar time using a UTC offset (`tz`, hours).
 * Getting that offset right is non-trivial: political offsets have changed repeatedly (Singapore
 * was +7:30 until 1982-01-01, then +8; France was GMT until WWII, then CET) and DST shifts it
 * seasonally. A hand-typed offset is the single most error-prone input — a 30–60 min error there
 * silently flips an hour pillar near a 时辰 boundary.
 *
 * This engine does NOT guess from a curated table. It resolves the EXACT offset (all historical
 * transitions + DST) from the IANA tz database that Node bundles via ICU — the same authoritative
 * data zoneinfo/`date` use. Given a place (IANA zone) + the local birth datetime, it returns the
 * true offset, so the offset is DERIVED, never hand-typed. The supplied `tz` (if any) becomes a
 * cross-check, not the source of truth.
 *
 * RESIDUAL (honest): the IANA db is authoritative for the modern era and well-researched
 * historically, but zoneinfo itself documents that PRE-1970 offsets can be approximate (often
 * rounded to the city's local mean time). For a pre-1970 birth near an hour boundary, treat the
 * derived offset as best-available, not gospel. DST gap/overlap (spring-forward / fall-back) local
 * times are resolved deterministically to the post-transition offset; flagged when detected.
 */

/** Offset (whole minutes) the zone had at a given UTC instant, per the IANA db (via ICU). */
function offsetMinutesAtUTC(zone, utcMs) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const m = {};
  for (const p of dtf.formatToParts(new Date(utcMs))) m[p.type] = p.value;
  // ICU may emit hour "24" at midnight in h23 mode on some platforms — normalize.
  const hh = +m.hour % 24;
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, hh, +m.minute, +m.second);
  return Math.round((asUTC - utcMs) / 60000);
}

/** True if `zone` is a valid IANA zone name on this platform. */
function isValidZone(zone) {
  if (!zone || typeof zone !== "string") return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: zone }); return true; }
  catch { return false; }
}

/**
 * Resolve the exact UTC offset (fractional hours) for a LOCAL wall-clock birth time in `zone`.
 * Iterates to converge near a transition (the offset depends on the instant, which depends on the
 * offset). Throws RangeError on an unknown zone. Also reports whether the local time is in a DST
 * gap/overlap (ambiguous), resolved to the post-transition offset.
 */
function resolveOffset({ zone, y, m, d, hour = 0, minute = 0 }) {
  if (!isValidZone(zone)) throw new RangeError(`unknown IANA time zone: ${JSON.stringify(zone)}`);
  const localAsUTC = Date.UTC(y, m - 1, d, hour, minute);
  let off = offsetMinutesAtUTC(zone, localAsUTC);
  const off2 = offsetMinutesAtUTC(zone, localAsUTC - off * 60000);
  const off3 = offsetMinutesAtUTC(zone, localAsUTC - off2 * 60000);
  // Convergence: off2===off3 in the normal case. Inequality ⇒ the wall time sits in a transition
  // gap/overlap (a DST spring-forward hole or fall-back repeat) — rare for births; flag it.
  const ambiguous = off2 !== off3;
  return { offsetHours: off3 / 60, offsetMinutes: off3, ambiguous };
}

const fmtH = (h) => (h >= 0 ? "+" : "") + (Number.isInteger(h) ? String(h) : (Math.round(h * 60) % 60 === 0 ? String(h) : `${h.toFixed(4).replace(/0+$/, "")}`));

/**
 * Reconcile the chart's timezone input into the offset to actually use, authoritatively.
 *   • zone present & valid → DERIVE the offset from the IANA db (the source of truth). If a `tz`
 *     was also supplied and disagrees (>1 min), warn and use the derived value. Flag DST ambiguity.
 *   • zone present but invalid → warn; fall back to the supplied `tz`.
 *   • no zone, `tz` supplied → use it; a coarse longitude-band check flags a gross wrong-zone/sign.
 *   • no zone, no `tz` → cannot resolve; warn (caller keeps its default).
 * Returns { tz, source: 'zone'|'supplied'|'unresolved', derived, ambiguous, warnings:[{sev,msg}] }.
 * Never throws; never silently changes a value without a warning.
 */
function reconcile({ zone, tz, y, m, d, hour = 0, minute = 0, longitude } = {}) {
  const warnings = [];
  const date = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  if (zone && isValidZone(zone)) {
    const { offsetHours, ambiguous } = resolveOffset({ zone, y, m, d, hour, minute });
    if (tz != null && Number.isFinite(tz) && Math.abs(tz - offsetHours) >= 1 / 60) {
      warnings.push({ sev: "warn", msg: `supplied tz=${fmtH(tz)} disagrees with the IANA offset for ${zone} on ${date} (${fmtH(offsetHours)}). Using the authoritative ${fmtH(offsetHours)}. (Wrong-era offset? e.g. Singapore was +7:30 before 1982.)` });
    }
    if (ambiguous) {
      warnings.push({ sev: "info", msg: `${date} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} sits in a DST transition (gap/overlap) for ${zone}; offset resolved to ${fmtH(offsetHours)} — verify if the birth time is near the changeover.` });
    }
    if (y < 1970) {
      warnings.push({ sev: "info", msg: `pre-1970 birth: the IANA db offset for ${zone} (${fmtH(offsetHours)}) is best-available but zoneinfo flags pre-1970 history as approximate — verify for boundary-sensitive hours.` });
    }
    return { tz: offsetHours, source: "zone", derived: offsetHours, ambiguous, warnings };
  }

  if (zone) {
    warnings.push({ sev: "warn", msg: `zone "${zone}" is not a valid IANA name — offset NOT derived. Use a canonical zone (e.g. "Asia/Singapore"). Falling back to the supplied tz.` });
  } else {
    warnings.push({ sev: "info", msg: `no "zone" given — tz not history/DST-checked. For an authoritative offset, add "zone":"Area/City" (IANA name) to the birth input.` });
  }

  // Coarse longitude band when we have no authoritative zone: a tz wildly off the longitude-implied
  // offset is almost always a wrong zone or a sign flip.
  if (longitude != null && Number.isFinite(longitude) && Number.isFinite(tz)) {
    const solar = longitude / 15;
    if (Math.abs(tz - solar) > 3) {
      warnings.push({ sev: "warn", msg: `tz=${fmtH(tz)} is ${Math.abs(tz - solar).toFixed(1)}h from the longitude-implied offset (${fmtH(solar)}h for lon ${longitude}°) — likely a wrong zone or sign error. Verify.` });
    }
  }
  return { tz, source: Number.isFinite(tz) ? "supplied" : "unresolved", derived: null, ambiguous: false, warnings };
}

export { resolveOffset, isValidZone, reconcile, offsetMinutesAtUTC };
export default { resolveOffset, isValidZone, reconcile, offsetMinutesAtUTC };

#!/usr/bin/env node
/** timezone.test.mjs — the IANA-backed offset engine: exact historical + DST resolution, reconcile.
 *  Oracle: the IANA tz database (zoneinfo) via Node's bundled ICU. Values cross-checked against
 *  published zoneinfo transitions. Assertions are exact (whole-minute) where the db is exact. */
import tz from "./timezone.js";
let pass = 0, fail = 0;
const ok = (n, c, g = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  got=" + g}`); c ? pass++ : fail++; };
const off = (zone, y, m, d, h = 12, mi = 0) => tz.resolveOffset({ zone, y, m, d, hour: h, minute: mi }).offsetHours;
const hasWarn = (r) => r.warnings.some((w) => w.sev === "warn");
const sev = (r) => r.warnings.map((w) => w.sev).sort().join(",");

// ── EXACT historical resolution (the whole point: accuracy) ──
ok("SG pre-1982 = +7.5 (the era-correct offset)", off("Asia/Singapore", 1975, 8, 20, 10, 0) === 7.5, off("Asia/Singapore", 1975, 8, 20, 10, 0));
ok("SG 1981-12-31 = +7.5 (pre-switch)", off("Asia/Singapore", 1981, 12, 31) === 7.5);
ok("SG 1982-01-01 = +8 (switch day)", off("Asia/Singapore", 1982, 1, 1) === 8);
ok("SG 1985 = +8", off("Asia/Singapore", 1985, 6, 15) === 8);
ok("SG 1935 = +7:20 (7.3333h)", Math.abs(off("Asia/Singapore", 1935, 6, 1) - 22 / 3) < 1e-9, off("Asia/Singapore", 1935, 6, 1));
ok("SG 1943 = +9 (occupation)", off("Asia/Singapore", 1943, 1, 1) === 9);
ok("India 1985 = +5.5", off("Asia/Kolkata", 1985, 1, 1) === 5.5);
ok("Nepal 2000 = +5.75 (45-min zone)", off("Asia/Kathmandu", 2000, 1, 1) === 5.75);
ok("Tehran 2000 = +3.5 (30-min zone)", off("Asia/Tehran", 2000, 1, 1) === 3.5);

// ── DST resolved automatically, both hemispheres + both directions ──
ok("NYC 1990 summer = -4 (EDT)", off("America/New_York", 1990, 7, 1) === -4);
ok("NYC 1990 winter = -5 (EST)", off("America/New_York", 1990, 1, 1) === -5);
ok("Sydney Jan = +11 (AEDT, S.hemisphere summer)", off("Australia/Sydney", 2020, 1, 15) === 11);
ok("Sydney Jul = +10 (AEST)", off("Australia/Sydney", 2020, 7, 15) === 10);
ok("London Jul = +1 (BST)", off("Europe/London", 1985, 7, 1) === 1);
ok("London Jan = 0 (GMT)", off("Europe/London", 1985, 1, 1) === 0);

// ── Moscow's irregular DST history (the case that defeats hand-tables) ──
ok("Moscow 1992 summer = +4 (MSD)", off("Europe/Moscow", 1992, 6, 28, 8, 30) === 4);
ok("Moscow 2012 = +4 (perm-DST era)", off("Europe/Moscow", 2012, 6, 1) === 4);
ok("Moscow 2015 = +3 (DST abolished 2014)", off("Europe/Moscow", 2015, 6, 1) === 3);

// ── validity / error handling ──
ok("isValidZone true for real zone", tz.isValidZone("Asia/Singapore") === true);
ok("isValidZone false for junk", tz.isValidZone("Mars/Olympus") === false);
ok("isValidZone false for empty", tz.isValidZone("") === false && tz.isValidZone(null) === false);
let threw = false; try { tz.resolveOffset({ zone: "Nope/Nope", y: 2000, m: 1, d: 1 }); } catch { threw = true; }
ok("resolveOffset throws on unknown zone", threw);

// ── reconcile: derive authoritatively, catch a wrong supplied tz ──
const r1 = tz.reconcile({ zone: "Asia/Singapore", tz: 7.5, y: 1975, m: 8, d: 20, hour: 10, minute: 0, longitude: 104 });
ok("reconcile: zone+correct tz → derives 7.5, no warn", r1.tz === 7.5 && r1.source === "zone" && !hasWarn(r1), `${r1.tz}/${sev(r1)}`);
const r2 = tz.reconcile({ zone: "Asia/Singapore", tz: 8, y: 1975, m: 8, d: 20, hour: 10, minute: 0, longitude: 104 });
ok("reconcile: zone + WRONG tz8 → corrects to 7.5 + warns", r2.tz === 7.5 && hasWarn(r2), `${r2.tz}/${sev(r2)}`);
const r3 = tz.reconcile({ zone: "Asia/Singapore", y: 1985, m: 6, d: 15, hour: 9, longitude: 104 });
ok("reconcile: zone, no tz → derives 8 silently", r3.tz === 8 && r3.source === "zone" && r3.warnings.length === 0, `${r3.tz}/${sev(r3)}`);
const r4 = tz.reconcile({ zone: "Mars/Olympus", tz: 3, y: 2000, m: 1, d: 1, longitude: 45 });
ok("reconcile: invalid zone → warn + fall back to supplied tz", r4.tz === 3 && r4.source === "supplied" && hasWarn(r4));
const r5 = tz.reconcile({ tz: 8, y: 2000, m: 1, d: 1, longitude: 103 });
ok("reconcile: no zone, sane tz → info only", r5.tz === 8 && sev(r5) === "info");
const r6 = tz.reconcile({ tz: 8, y: 2000, m: 1, d: 1, longitude: -70 });
ok("reconcile: no zone, gross tz/lon mismatch → warn", hasWarn(r6));
const r7 = tz.reconcile({ zone: "Europe/Moscow", tz: 4, y: 1992, m: 6, d: 28, hour: 8, minute: 30, longitude: 37.6 });
ok("reconcile: Moscow summer tz4 matches IANA → no warn", r7.tz === 4 && !hasWarn(r7), `${r7.tz}/${sev(r7)}`);
const r8 = tz.reconcile({ zone: "Asia/Singapore", tz: 7.5, y: 1975, m: 8, d: 20, hour: 10, minute: 0 });
ok("reconcile: pre-1970 emits info, but post-1970 does not", r8.warnings.every((w) => !/pre-1970/.test(w.msg)));
const r9 = tz.reconcile({ zone: "Asia/Singapore", tz: 7.5, y: 1960, m: 6, d: 1, hour: 12 });
ok("reconcile: 1960 birth → pre-1970 info note", r9.warnings.some((w) => /pre-1970/.test(w.msg)));

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

#!/usr/bin/env node
/**
 * public-validation.test.mjs — the Astrolabe TEMPLATE's engine-validation suite.
 *
 * The shareable template carries NO personal birth data. Instead it validates all four
 * calculators against a PUBLIC, independently-documented chart: Albert Einstein
 * (14 Mar 1879, 11:30 LMT Ulm — Astro-Databank Rodden rating AA / birth record).
 *
 * Oracle sources (independent of this code):
 *   - 八字: pillars 己卯/丁卯/丙申/甲午, Day Master 丙, 大运 reverse — unanimous across multiple
 *     published Chinese BaZi sources (destiny.to, lzyc.top, 周新春易学网, 算准网).
 *   - 吠陀 Vedic (Lahiri sidereal): Sun Pisces 1.3° Purva-Bhadrapada p4 (lon ≈331.3°);
 *     Moon Scorpio 22.2° Jyeshtha p2 (lon ≈232.2°); Lagna Gemini ~19°; ayanāṃśa ≈22.18°
 *     — Lagna360 + AstroSage agree; tropical Sun/Moon (353.5°/254.5°) are JPL-anchorable.
 *   - 紫微 / 奇门: no clean public oracle exists for Einstein, so those two are REGRESSION
 *     LOCKS (pin this engine's own output to catch drift), explicitly not externally validated.
 *
 * Per-instance charts are validated separately by the per-person canon-consistency.test.mjs
 * (generated at onboarding). Run: node .claude/calc/public-validation.test.mjs
 */
import bazi from "./bazi.js";
import ziwei from "./ziwei.js";
import qimen from "./qimen.js";
import vedic from "./vedic.js";

let pass = 0, fail = 0;
const ok = (n, c, g = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  got=" + g}`); c ? pass++ : fail++; };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// Einstein — 11:30 LMT Ulm → LMT offset +40m (tz=0.6667h); lon 9.99°E; lat 48.40°N.
const I = { y: 1879, m: 3, d: 14, hour: 11, minute: 30, tz: 40 / 60, longitude: 9.99, latitude: 48.40, gender: "male" };

// ── 八字 (oracle: published consensus) ──
const b = bazi.computeChart(I);
const P = b.pillars;
ok("bazi pillars 己卯 丁卯 丙申 甲午",
  [P.year.gz, P.month.gz, P.day.gz, P.hour.gz].join(" ") === "己卯 丁卯 丙申 甲午",
  [P.year.gz, P.month.gz, P.day.gz, P.hour.gz].join(" "));
ok("bazi Day Master 丙 (Yang Fire)", P.day.gz[0] === "丙", P.day.gz[0]);
ok("bazi 大运 reverse (逆行)", b.luck.forward === false, String(b.luck.forward));
ok("bazi 大运 seq 丙寅乙丑甲子癸亥壬戌辛酉庚申己未",
  b.luck.list.slice(0, 8).map((l) => l.gz).join(" ") === "丙寅 乙丑 甲子 癸亥 壬戌 辛酉 庚申 己未",
  b.luck.list.slice(0, 8).map((l) => l.gz).join(" "));
ok("bazi 大运 start age ≈ 3", Math.round(b.luck.startAgeYears) === 3, b.luck.startAgeYears.toFixed(2));
// 八宅 directions — all 8 gua resolve via 游年翻卦 (was a 2-entry gap); anchor 坎/离 beyond gua 3/7
{
  const dirs = {};
  for (let yr = 1960; yr < 2000; yr++) for (const g of ["male", "female"]) {
    const c = bazi.computeChart({ y: yr, m: 6, d: 15, hour: 12, minute: 0, tz: 8, longitude: 120, latitude: 30, gender: g });
    dirs[c.gua.num] = c.gua.directions;
  }
  const allEight = [1, 2, 3, 4, 6, 7, 8, 9].every((n) => dirs[n] && Object.keys(dirs[n]).length === 8);
  ok("bazi 八宅 all 8 gua resolve · 坎 生气东南 · 离 生气东",
    allEight && dirs[1]?.生气 === "东南" && dirs[9]?.生气 === "东",
    `allEight=${allEight} 坎=${dirs[1]?.生气} 离=${dirs[9]?.生气}`);
}

// ── 吠陀 Vedic (oracle: Lagna360 / AstroSage, Lahiri sidereal) ──
const v = vedic.compute({ y: I.y, m: I.m, d: I.d, hour: I.hour, minute: I.minute, tz: I.tz, lon: I.longitude, lat: I.latitude });
const lonSid = (x) => x.rasi.index * 30 + x.rasi.degInSign;
ok("vedic ayanāṃśa ≈ 22.18°", near(v.ayanamsa, 22.18, 0.05), v.ayanamsa.toFixed(3));
ok("vedic Sun Pisces · Purva Bhadrapada p4",
  v.grahas.Sun.rasi.name === "Pisces" && v.grahas.Sun.nakshatra.name === "Purva Bhadrapada" && v.grahas.Sun.nakshatra.pada === 4,
  `${v.grahas.Sun.rasi.name}/${v.grahas.Sun.nakshatra.name}/p${v.grahas.Sun.nakshatra.pada}`);
ok("vedic Sun sidereal lon ≈ 331.3° (±0.1)", near(lonSid(v.grahas.Sun), 331.32, 0.1), lonSid(v.grahas.Sun).toFixed(2));
ok("vedic Moon Scorpio · Jyeshtha p2",
  v.grahas.Moon.rasi.name === "Scorpio" && v.grahas.Moon.nakshatra.name === "Jyeshtha" && v.grahas.Moon.nakshatra.pada === 2,
  `${v.grahas.Moon.rasi.name}/${v.grahas.Moon.nakshatra.name}/p${v.grahas.Moon.nakshatra.pada}`);
ok("vedic Moon sidereal lon ≈ 232.2° (±0.3)", near(lonSid(v.grahas.Moon), 232.22, 0.3), lonSid(v.grahas.Moon).toFixed(2));
ok("vedic Lagna Gemini ~19° · Ardra p4",
  v.lagna.rasi.name === "Gemini" && near(v.lagna.rasi.degInSign, 19.5, 1.0) && v.lagna.nakshatra.name === "Ardra",
  `${v.lagna.rasi.name} ${v.lagna.rasi.degInSign.toFixed(2)}/${v.lagna.nakshatra.name}`);

// ── 紫微 / 奇门 — REGRESSION LOCKS (no public oracle; pin this engine's output to catch drift) ──
const z = ziwei.chartFromSolar({ ...I, useTrueSolar: true });
ok("ziwei [regression] 命宫酉 · 金四局 · 命主文曲",
  z.mingGong.branch === "酉" && z.wuxingJu === "金四局" && z.mingZhu === "文曲",
  `${z.mingGong.branch}/${z.wuxingJu}/${z.mingZhu}`);
const q = qimen.cast(I);
ok("qimen [regression] 阳遁1局 · Destiny宫2 杜门",
  q.dingju.label === "阳遁1局" && q.destiny.palace === 2 && q.destiny.door === "杜门",
  `${q.dingju.label}/${q.destiny.palace}/${q.destiny.door}`);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

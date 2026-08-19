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
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
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
// Einstein's hour pillar is 甲午 — a 六仪遁甲 case. The pre-2026-08-12 lock pinned Destiny宫2,
// which was CORRUPTED output: 甲 is absent from the 地盘, so 时干宫 came back undefined and the
// 天盘 rotation ran off a −1 index. Re-pinned to the corrected chart. The 定局/值符星/值使门/值使宫
// layer never depended on 时干宫 and is byte-identical across the fix (阳遁1局 · 天辅 · 杜门 @宫4).
const q = qimen.cast(I);
ok("qimen [regression] 阳遁1局 · 值符星天辅 · 值使门杜门@宫4",
  q.dingju.label === "阳遁1局" && q.zhiFuStar === "天辅" && q.zhiShiDoor === "杜门" && q.zhiShiPalace === 4,
  `${q.dingju.label}/${q.zhiFuStar}/${q.zhiShiDoor}/${q.zhiShiPalace}`);
ok("qimen [regression] 甲午时 → 时干宫4 (甲遁辛) · shift=0 · Destiny 艮8 天任/九地/杜门",
  q.shiganPalace === 4 && [1, 8, 3, 4, 9, 2, 7, 6].every((p) => q.chart[p].tianStem === q.chart[p].diPan) &&
  q.destiny.palace === 8 && q.destiny.star === "天任" && q.destiny.deity === "九地" && q.destiny.door === "杜门",
  `${q.shiganPalace}/${q.destiny.palace}/${q.destiny.star}/${q.destiny.deity}/${q.destiny.door}`);

// ── Hour convention (the A/B fork) — bazi must honour `useTrueSolar` like ziwei/qimen do ──
// Synthetic inputs (no person): a clock time just past a 时辰 boundary, west of its meridian, so
// true-solar and raw clock land in DIFFERENT 时辰. Regression locks — before 2026-08-19 bazi had
// no convention switch at all, so `cast.mjs --clock/--both` printed the true-solar chart under a
// clock heading and the hedge hour pillar was unreachable from the tool.
{
  const base = { y: 1879, m: 3, d: 14, tz: 0, longitude: -5, latitude: 0, gender: "male" };
  const fork = { ...base, hour: 13, minute: 5 };            // true-solar 12.59 (午) vs clock 13.08 (未)
  const lateZi = { ...base, hour: 23, minute: 10 };         // true-solar 22.68 (亥) vs clock 23.17 (子)
  const dflt = bazi.computeChart(fork), solar = bazi.computeChart({ ...fork, useTrueSolar: true });
  const clock = bazi.computeChart({ ...fork, useTrueSolar: false });
  ok("bazi default hour convention === true-solar (unchanged)",
    dflt.pillars.hour.gz === solar.pillars.hour.gz && dflt.mingGong === solar.mingGong && dflt.hourConvention === "true-solar",
    `${dflt.pillars.hour.gz}/${dflt.mingGong}/${dflt.hourConvention}`);
  ok("bazi useTrueSolar=false → clock hour pillar 甲午→乙未",
    solar.pillars.hour.gz === "甲午" && clock.pillars.hour.gz === "乙未" && clock.hourConvention === "clock",
    `${solar.pillars.hour.gz}→${clock.pillars.hour.gz}/${clock.hourConvention}`);
  ok("bazi 命宫 follows the hour convention 壬申→辛未",
    solar.mingGong === "壬申" && clock.mingGong === "辛未", `${solar.mingGong}→${clock.mingGong}`);
  // The late-子时 day roll must use the SAME clock that defines the 时辰, or the day pillar and
  // the hour pillar come from two different conventions at once.
  // qimen built its 符头/定局 and 五鼠遁 hour stem from the true-solar 日柱 even in clock mode —
  // a late-子时 clock chart mixed a true-solar 日柱 with a clock 时柱. 值使宫 moves with the roll.
  ok("qimen clock lane uses the clock 日柱 (值使宫 1→8)",
    qimen.cast(lateZi).zhiShiPalace === 1 && qimen.cast({ ...lateZi, useTrueSolar: false }).zhiShiPalace === 8,
    `${qimen.cast(lateZi).zhiShiPalace}→${qimen.cast({ ...lateZi, useTrueSolar: false }).zhiShiPalace}`);
  ok("bazi late-子时 roll follows the convention 丙申→丁酉",
    bazi.computeChart(lateZi).pillars.day.gz === "丙申" &&
    bazi.computeChart({ ...lateZi, useTrueSolar: false }).pillars.day.gz === "丁酉",
    `${bazi.computeChart(lateZi).pillars.day.gz}→${bazi.computeChart({ ...lateZi, useTrueSolar: false }).pillars.day.gz}`);
}

// ── cast.mjs CLI contract — --both / --clock must fork ALL THREE Chinese systems ──
{
  const run = (...a) => execFileSync(process.execPath, [fileURLToPath(new URL("./cast.mjs", import.meta.url)), ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const argsEinstein = ["1879-03-14", "11:30", String(40 / 60), "9.99", "48.40", "male"];
  const both = run(...argsEinstein, "--both"), plain = run(...argsEinstein);
  const count = (s, re) => (s.match(re) || []).length;
  ok("cast --both prints 2× 八字 / 2× 紫微 / 2× 奇门 (one per hour convention)",
    count(both, /── 八字 /g) === 2 && count(both, /── 紫微 /g) === 2 && count(both, /── 奇门 /g) === 2,
    `${count(both, /── 八字 /g)}/${count(both, /── 紫微 /g)}/${count(both, /── 奇门 /g)}`);
  ok("cast default prints 1× of each, headed by its convention",
    count(plain, /── 八字 /g) === 1 && /── 八字 \(true-solar \(.\)\) ──/.test(plain) && !plain.includes("(clock"),
    `${count(plain, /── 八字 /g)}`);
  ok("cast --clock forks the 八字 block too (no true-solar chart under a clock heading)",
    /── 八字 \(clock \(.\)\) ──/.test(run(...argsEinstein, "--clock")), "no clock 八字 block");
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

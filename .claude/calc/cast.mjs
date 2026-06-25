#!/usr/bin/env node
/**
 * cast.mjs — one-shot CLI that casts 八字 + 紫微 + 奇门 + 吠陀 for a birth datetime, from the
 * validated calculators (never hand-computed). The default chart is loaded from a per-instance
 * .claude/calc/birth.json (PERSONAL, never synced/promoted) — the owner's birth data, written by
 * onboarding. With no birth.json (the bare template) it falls back to a PUBLIC sample (Einstein).
 *
 *   node .claude/calc/cast.mjs                         # the default sample chart
 *   node .claude/calc/cast.mjs 1990-05-20 08:30 8 114 22.3 female  # date time tz lon [lat] [gender]
 *     (latitude is needed for the Vedic ascendant; omit it and the Lagna defaults to the equator)
 *   node .claude/calc/cast.mjs --clock                 # use raw clock time
 *   node .claude/calc/cast.mjs --both                  # show both hour conventions
 */
import fs from "node:fs";
import bazi from "./bazi.js";
import ziwei from "./ziwei.js";
import qimen from "./qimen.js";
import vedic from "./vedic.js";
import timezone from "./timezone.js";

// Default chart: a per-instance .claude/calc/birth.json (PERSONAL — never synced or promoted) holds
// the owner's birth data, written at onboarding. The bare template ships none and falls back to a
// PUBLIC sample (Albert Einstein, AA-rated), so the framework runs standalone with zero personal data.
const PUBLIC_SAMPLE = { label: "SAMPLE — A. Einstein (public)", y: 1879, m: 3, d: 14, hour: 11, minute: 30, tz: 40 / 60, longitude: 9.99, latitude: 48.40, gender: "male" };
let CANON = PUBLIC_SAMPLE;
try { CANON = JSON.parse(fs.readFileSync(new URL("./birth.json", import.meta.url), "utf8")); }
catch (e) { if (e.code !== "ENOENT") throw e; }
const CANON_LABEL = CANON.label || "CHART";
const { label: _label, ...CANON_CHART } = CANON;   // strip the display label from the chart input
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const pos = argv.filter((a) => !a.startsWith("--"));
let inp = { ...CANON_CHART };
if (pos.length >= 2) {
  const [Y, M, D] = pos[0].split("-").map(Number);
  const [h, mi] = pos[1].split(":").map(Number);
  // pos: date time [tz] [lon] [lat] [gender]. Latitude is optional; if omitted, gender may sit in
  // its slot — detect numeric vs gender-string so old `… lon gender` calls still work.
  const isNum = (s) => s !== undefined && s !== "" && !isNaN(+s);
  const lat = isNum(pos[4]) ? +pos[4] : undefined;
  const gender = (isNum(pos[4]) ? pos[5] : pos[4]) || "male";
  inp = { y: Y, m: M, d: D, hour: h, minute: mi || 0, tz: pos[2] ? +pos[2] : 8, longitude: pos[3] ? +pos[3] : 120, latitude: lat, gender };
  if (lat === undefined) console.warn("  ⚠ no latitude given — Vedic Lagna/ascendant computed at the EQUATOR (lat 0); pass a 5th positional latitude for the real ascendant.");
}
const isCanon = JSON.stringify(inp) === JSON.stringify(CANON_CHART);

// Authoritative timezone: when a zone is known (birth.json "zone" or --zone=Area/City), DERIVE the
// exact UTC offset (historical transitions + DST) from the IANA db rather than trusting a hand-typed
// tz. reconcile() returns the offset to use; a wrong supplied tz is corrected and flagged. This MUST
// run before the chart is computed so the corrected offset feeds the true-solar conversion.
const zoneArg = [...flags].map((f) => /^--zone=(.+)$/.exec(f)).find(Boolean);
const zone = zoneArg ? zoneArg[1] : inp.zone;
const rec = timezone.reconcile({ zone, tz: inp.tz, y: inp.y, m: inp.m, d: inp.d, hour: inp.hour, minute: inp.minute, longitude: inp.longitude });
if (rec.tz != null && Number.isFinite(rec.tz)) inp.tz = rec.tz;

const b = bazi.computeChart(inp);
const P = b.pillars;
console.log(`\n════ ${isCanon ? CANON_LABEL : "CHART"} — ${inp.y}-${String(inp.m).padStart(2, "0")}-${String(inp.d).padStart(2, "0")} ${String(inp.hour).padStart(2, "0")}:${String(inp.minute).padStart(2, "0")} tz${inp.tz}${rec.source === "zone" ? `(${zone})` : ""} lon${inp.longitude} ${inp.gender} ════`);
console.log(`true-solar hour ≈ ${b.trueSolarHours.toFixed(2)}`);
// tz warnings: a corrected/disagreeing offset ('warn') always surfaces; advisory notes ('info' —
// no-zone, DST-ambiguous, pre-1970) only for ad-hoc charts, not the clean canon default.
for (const w of rec.warnings) {
  if (w.sev === "warn") console.warn(`  ⚠ tz: ${w.msg}`);
  else if (!isCanon) console.warn(`  · tz: ${w.msg}`);
}

console.log(`\n── 八字 (true-solar) ──`);
console.log(`  时    日    月    年`);
console.log(`  ${P.hour.gz}  ${P.day.gz}  ${P.month.gz}  ${P.year.gz}`);
console.log(`  ${P.hour.tenGod}  ${P.day.tenGod}  ${P.month.tenGod}  ${P.year.tenGod}`);
console.log(`  纳音: ${P.year.nayin}/${P.month.nayin}/${P.day.nayin}/${P.hour.nayin}`);
console.log(`  大运 (${b.luck.forward ? "顺" : "逆"}, 起${b.luck.startAgeYears.toFixed(1)}): ${b.luck.list.map((l) => `${l.gz}(${l.startAge})`).join(" ")}`);
console.log(`  胎元 ${b.taiYuan} · 命宫 ${b.mingGong} · 贵人 ${b.stars.天乙贵人.join("")} · 文昌 ${b.stars.文昌} · 桃花 ${b.stars.桃花} · 驿马 ${b.stars.驿马}`);
console.log(`  本命卦 ${b.gua.num} ${b.gua.trigram} (${b.gua.group})`);
// (用神 / favourable-element analysis is per-person — it lives in the instance canon, not here.)

function ziweiBlock(useTrueSolar) {
  const z = ziwei.chartFromSolar({ ...inp, useTrueSolar });
  console.log(`\n── 紫微 (${z.convention}) — 农历${z.lunar.lunarMonth}月${z.lunar.lunarDay}日 · ${z.wuxingJu} · 命主${z.mingZhu} 身主${z.shenZhu} ──`);
  console.log(`  四化: ${z.sihua.禄}化禄 ${z.sihua.权}化权 ${z.sihua.科}化科 ${z.sihua.忌}化忌`);
  for (const p of z.palaces) {
    const tag = `${p.isMing ? "★命" : ""}${p.isShen ? "身" : ""}`.padEnd(3, " ");
    console.log(`  ${tag}${p.name}(${p.stem}${p.branch})  ${(p.mainStars.join("·") || "—").padEnd(14, " ")}  ${p.auxStars.join(" ")}`);
  }
}
ziweiBlock(true);
if (flags.has("--both")) ziweiBlock(false);
else if (flags.has("--clock")) ziweiBlock(false);

function qimenBlock(useTrueSolar) {
  const q = qimen.cast({ ...inp, useTrueSolar });
  const d = q.destiny;
  console.log(`\n── 奇门 (${useTrueSolar ? "true-solar" : "clock"}) — ${q.dingju.label} (${q.dingju.jieqi}${q.dingju.yuan}) · 旬首${q.xunFirst}(仪${q.yi}) · 旬空${q.xunkong.join("")} ──`);
  console.log(`  值符 ${q.zhiFuStar} · 值使 ${q.zhiShiDoor}`);
  console.log(`  命局奇门宫: ${d.direction}(${d.palace}) 命干${d.lifeStem} · 门${d.door}(值使) · 星${d.star} · 神${d.deity}`);
}
qimenBlock(true);
if (flags.has("--both")) qimenBlock(false);

function vedicBlock() {
  const v = vedic.compute({ y: inp.y, m: inp.m, d: inp.d, hour: inp.hour, minute: inp.minute, tz: inp.tz, lat: inp.latitude ?? 0, lon: inp.longitude });
  const fmt = (g) => `${g.rasi.name.padEnd(11)} ${g.rasi.degInSign.toFixed(2).padStart(5)}°  ${g.nakshatra.name}(${g.nakshatra.pada})  D9:${g.navamsa.name}`;
  console.log(`\n── 吠陀 Vedic (sidereal · Lahiri ayan ${v.ayanamsa.toFixed(3)}° · raw-clock→UT) ──`);
  console.log(`  Lagna    ${fmt(v.lagna)}`);
  for (const name of ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]) {
    console.log(`  ${name.padEnd(8)} ${fmt(v.grahas[name])}`);
  }
  const k = v.karakas;
  console.log(`  Karakas: AK ${k.AK} · AmK ${k.AmK} · BK ${k.BK} · MK ${k.MK} · PiK ${k.PiK} · PuK ${k.PuK} · GK ${k.GK} · DK ${k.DK}`);
  const md = v.dasha.map((n) => `${n.lord}(${vedic.jdToDateStr(n.startJD).slice(0, 4)})`).join(" → ");
  console.log(`  Vimśottari MD: ${md}`);
}
vedicBlock();

console.log(`\n[hour] Birth-hour conventions (true-solar vs raw-clock) can shift the hour pillar — run --both for hour-sensitive reads.`);
console.log("");

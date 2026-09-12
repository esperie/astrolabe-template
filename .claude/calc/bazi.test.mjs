#!/usr/bin/env node
/**
 * bazi.test.mjs — validates bazi.js against the Joey Yap oracle (canon.md).
 * Run: node .claude/calc/bazi.js's dir → node .claude/calc/bazi.test.mjs
 * Exit 0 = all pass.
 */
import pkg from "./bazi.js";
import astro from "./astro.js";
const { computeChart, monthlyPillars } = pkg;

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  got=${JSON.stringify(got)}${ok ? "" : ` want=${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
};
const near = (name, got, want, tol) => {
  const ok = Math.abs(got - want) <= tol;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  got=${got.toFixed(3)} want≈${want} (±${tol})`);
  ok ? pass++ : fail++;
};

// ── Jack: 14 Dec 1979, 3:05pm, Singapore (UTC+7:30), lon 103.85, male ──
const c = computeChart({ y: 1979, m: 12, d: 14, hour: 15, minute: 5, tz: 7.5, longitude: 103.85, gender: "male" });

eq("Year pillar", c.pillars.year.gz, "己未");
eq("Month pillar", c.pillars.month.gz, "丙子");
eq("Day pillar", c.pillars.day.gz, "乙卯");
eq("Hour pillar (true-solar)", c.pillars.hour.gz, "癸未");
near("True solar hour ≈14.6", c.trueSolarHours, 14.6, 0.15);

eq("Year ten-god 偏财", c.pillars.year.tenGod, "偏财");
eq("Month ten-god 伤官", c.pillars.month.tenGod, "伤官");
eq("Hour ten-god 偏印", c.pillars.hour.tenGod, "偏印");

eq("Nayin year 天上火", c.pillars.year.nayin, "天上火");
eq("Nayin month 涧下水", c.pillars.month.nayin, "涧下水");
eq("Nayin day 大溪水", c.pillars.day.nayin, "大溪水");
eq("Nayin hour 杨柳木", c.pillars.hour.nayin, "杨柳木");

eq("Luck reverse", c.luck.forward, false);
eq("Luck[0]", c.luck.list[0].gz, "乙亥");
eq("Luck[1]", c.luck.list[1].gz, "甲戌");
eq("Luck[2]", c.luck.list[2].gz, "癸酉");
eq("Luck[3]", c.luck.list[3].gz, "壬申");
eq("Luck[4] current", c.luck.list[4].gz, "辛未");
near("Luck start age ≈2", c.luck.startAgeYears, 2.3, 0.6);

eq("胎元 丁卯", c.taiYuan, "丁卯");
eq("命宫 甲戌 (Joey Yap oracle)", c.mingGong, "甲戌");
eq("天乙贵人 子申", c.stars.天乙贵人, ["子", "申"]);
eq("文昌 午", c.stars.文昌, "午");
eq("桃花 子", c.stars.桃花, "子");
eq("驿马 巳", c.stars.驿马, "巳");
eq("孤辰 巳", c.stars.孤辰, "巳");
eq("本命卦 3 震 East", [c.gua.num, c.gua.trigram, c.gua.group], [3, "震", "East"]);
eq("吉方 生气 南", c.gua.directions.生气, "南");

// ── 2026 monthly pillars + 节 dates (oracle: 庚寅 Feb4 ... 辛丑 Jan5) ──
const mp = monthlyPillars(2026);
eq("2026 月柱[0] 庚寅", mp[0].gz, "庚寅");
eq("2026 月柱[6] 丙申", mp[6].gz, "丙申");
eq("2026 月柱[10] 庚子", mp[10].gz, "庚子");
eq("2026 月柱[11] 辛丑", mp[11].gz, "辛丑");
// 节 dates in Singapore local (UTC+8 in 2026): Feb4, Mar5, Apr5, May5, Jun5, Jul7
const wantDates = [[2, 4], [3, 5], [4, 5], [5, 5], [6, 5], [7, 7], [8, 7], [9, 7], [10, 8], [11, 7], [12, 7]];
mp.slice(0, 11).forEach((seg, i) => {
  const g = astro.jdnToGregorian(Math.floor(seg.termUT + 8 / 24 + 0.5));
  const ok = g.y === 2026 && g.m === wantDates[i][0] && Math.abs(g.d - wantDates[i][1]) <= 1;
  console.log(`${ok ? "PASS" : "FAIL"}  2026 节[${i}] ${seg.gz} date ${g.m}/${g.d} want≈${wantDates[i][0]}/${wantDates[i][1]}`);
  ok ? pass++ : fail++;
});

/* ══════════════════ 干支 relation tables (relations) ══════════════════
 * Doctrine tests — these are not ephemeris, so the oracle is the classical rule itself,
 * asserted explicitly. The 三刑 three-member rule is the reason this layer exists: a
 * reading once shipped "丑未 = 三刑" (it is a 六冲; the 三刑 needs 戌).
 * Fixtures: the canon chart, and the untuned cross-validation charts (Cheer / Alena).
 */
const { relations, elementWeights } = pkg;
// Cheer — 24 Dec 1972 03:06 Singapore male (the synastry counterparty; raw-clock/B hour).
const cheer = computeChart({ y: 1972, m: 12, d: 24, hour: 3, minute: 6, tz: 7.5, longitude: 103.85, gender: "male" });
// Alena — 28 Jun 1992 08:30 female (cross-validate fixture; 壬申 丙午 乙亥 庚辰).
const alena = computeChart({ y: 1992, m: 6, d: 28, hour: 8, minute: 30, tz: 8, longitude: 120, gender: "female" });
eq("fixture Cheer 壬子 壬子 己丑 乙丑", [cheer.pillars.year.gz, cheer.pillars.month.gz, cheer.pillars.day.gz, cheer.pillars.hour.gz], ["壬子", "壬子", "己丑", "乙丑"]);
eq("fixture Alena 壬申 丙午 乙亥 庚辰", [alena.pillars.year.gz, alena.pillars.month.gz, alena.pillars.day.gz, alena.pillars.hour.gz], ["壬申", "丙午", "乙亥", "庚辰"]);

const countType = (r, t) => r.findings.filter((f) => f.type === t).length;
const first = (r, t) => r.findings.find((f) => f.type === t);

// ── Jack (己未 丙子 乙卯 癸未) ──
const rJack = relations(c);
eq("Jack 相刑 子卯 (无礼之刑, formed)", [first(rJack, "相刑").subtype, first(rJack, "相刑").formed], ["无礼之刑", true]);
eq("Jack has NO 三刑 (no 丑戌未 / 寅巳申)", countType(rJack, "三刑"), 0);
eq("Jack 半合 卯未 → 木, missing 亥", [first(rJack, "半合").element, first(rJack, "半合").missing, first(rJack, "半合").formed], ["木", ["亥"], true]);
eq("Jack 六害 子未 ×2 (year+hour 未 vs month 子)", countType(rJack, "六害"), 2);
eq("Jack 伏吟 支 未 (己未/癸未, same branch different stem)", [first(rJack, "伏吟").level, first(rJack, "伏吟").branch], ["支", "未"]);
eq("Jack has NO 六冲", countType(rJack, "六冲"), 0);
eq("Jack 未未 is NOT 自刑 (未 ∉ 辰午酉亥)", countType(rJack, "自刑"), 0);

// ── Cheer (壬子 壬子 己丑 乙丑) ──
const rCheer = relations(cheer);
eq("Cheer 伏吟 柱 壬子 (identical GZ)", [first(rCheer, "伏吟").level, first(rCheer, "伏吟").gz], ["柱", "壬子"]);
eq("Cheer 六合 子丑 ×4", countType(rCheer, "六合"), 4);
eq("Cheer 六合 nominal 化土", first(rCheer, "六合").nominalElement, "土");
eq("Cheer 三会未成 亥子丑 missing 亥, formed=false", [first(rCheer, "三会未成").missing, first(rCheer, "三会未成").formed], [["亥"], false]);
eq("Cheer alone: no 三刑 and no 三刑未成 (only 丑 of 丑戌未)", countType(rCheer, "三刑") + countType(rCheer, "三刑未成"), 0);

// ── Cross-chart (synastry) — the case that was previously miscalled ──
const rX = relations(c, cheer, { labelA: "Jack", labelB: "Cheer" });
eq("cross mode label", rX.mode, "cross");
eq("cross 六冲 丑未 ×4 (2 未 × 2 丑)", countType(rX, "六冲"), 4);
eq("cross: 丑+未 is NOT a formed 三刑", countType(rX, "三刑"), 0);
{
  const p = first(rX, "三刑未成");
  eq("cross 三刑未成 丑未 formed=false, missing 戌", [p.formed, p.branches.slice().sort().join(""), p.missing], [false, ["丑", "未"].sort().join(""), ["戌"]]);
}
{
  // Every cross finding MUST span both charts (intra-chart relations are excluded).
  const bad = rX.findings.filter((f) => !(f.participants.some((p) => p.chart === "Jack") && f.participants.some((p) => p.chart === "Cheer")));
  eq("cross findings all span both charts", bad.length, 0);
  // Jack's own 半合 卯未 / 相刑 pair-internal findings must NOT leak into cross mode.
  eq("cross excludes Jack-only 半合", countType(rX, "半合"), 0);
}
eq("cross 相刑 子卯 ×2 (Jack 卯 vs Cheer 子×2)", countType(rX, "相刑"), 2);
eq("cross 天干相冲 丙壬 ×2", countType(rX, "天干相冲"), 2);

// ── 三刑 doctrine, explicit (synthetic pillars — the correctness rule this layer encodes) ──
{
  const full = relations(["丁丑", "庚戌", "乙未", "甲申"]);
  const f = first(full, "三刑");
  eq("丑戌未 complete → 三刑 恃势之刑 formed", [f.subtype, f.formed, f.complete, f.missing], ["恃势之刑", true, true, []]);
  const yin = relations(["丙寅", "癸巳", "庚申", "甲子"]);
  const g = first(yin, "三刑");
  eq("寅巳申 complete → 三刑 无恩之刑 formed", [g.subtype, g.formed, g.complete], ["无恩之刑", true, true]);
  const two = relations(["丙寅", "庚申", "甲子", "乙丑"]);
  eq("寅+申 alone → NO 三刑", countType(two, "三刑"), 0);
  eq("寅+申 alone → 三刑未成 missing 巳, formed=false", [first(two, "三刑未成").missing, first(two, "三刑未成").formed], [["巳"], false]);
  eq("寅申 also reported as 六冲", countType(two, "六冲"), 1);
  // A doubled member of a 三刑 group is still not a 三刑.
  const dbl = relations(["丁丑", "己丑", "乙未", "甲申"]);
  eq("丑丑未 (doubled 丑, no 戌) → NO 三刑", countType(dbl, "三刑"), 0);
}

// ── 三合 / 三会 frames ──
{
  const sh = relations(["甲申", "丙子", "戊辰", "乙亥"]);
  const f = first(sh, "三合");
  eq("申子辰 complete → 三合 水, complete, missing []", [f.element, f.formed, f.complete, f.missing], ["水", true, true, []]);
  eq("complete 三合 does NOT also emit 半合", countType(sh, "半合"), 0);
  const half = relations(["甲申", "丙子", "戊寅", "乙亥"]);
  eq("申+子 (含旺神) → 半合 水 missing 辰", [first(half, "半合").element, first(half, "半合").missing, first(half, "半合").formed], ["水", ["辰"], true]);
  const shengMu = relations(["甲申", "戊辰", "丙寅", "丁卯"]);
  eq("申+辰 (生+墓, no 旺神) → NOT 半合", countType(shengMu, "半合"), 0);
  eq("申+辰 → 三合未成 missing 子, formed=false", [first(shengMu, "三合未成").missing, first(shengMu, "三合未成").formed], [["子"], false]);
  // Alena (壬申 丙午 乙亥 庚辰) is the same 生+墓 case on a REAL untuned chart.
  eq("Alena 申+辰 → 三合未成 (missing 子), not 半合", [countType(relations(alena), "半合"), first(relations(alena), "三合未成").missing], [0, ["子"]]);
  eq("Alena 六害 申亥", countType(relations(alena), "六害"), 1);
  const hui = relations(["甲寅", "丁卯", "戊辰", "乙亥"]);
  const h = first(hui, "三会");
  eq("寅卯辰 complete → 三会 木 东方", [h.element, h.direction, h.formed, h.complete], ["木", "东方", true, true]);
  eq("三会 partial is formed=false (no 半会)", first(relations(["甲寅", "丁卯", "庚申", "壬午"]), "三会未成").formed, false);
}

// ── 自刑 / 伏吟 / 反吟 / 天干 relations ──
{
  const zx = relations(["甲辰", "戊辰", "丙寅", "丁卯"]);
  eq("辰辰 → 自刑 formed", [countType(zx, "自刑"), first(zx, "自刑").formed], [1, true]);
  const fy = relations(["甲子", "庚午", "丙寅", "丁卯"]);
  eq("甲子/庚午 → 反吟 柱 (天克地冲)", [first(fy, "反吟").level, first(fy, "反吟").note], ["柱", "天克地冲"]);
  eq("甲子/庚午 also 六冲 + 天干相冲", [countType(fy, "六冲"), countType(fy, "天干相冲")], [1, 1]);
  const noFy = relations(["甲子", "戊午", "丙寅", "丁卯"]);
  eq("戊午 vs 甲子: 六冲 but NO 反吟 (戊 has no 冲)", [countType(noFy, "六冲"), countType(noFy, "反吟")], [1, 0]);
  const th = relations(["甲子", "己巳", "丙寅", "丁卯"]);
  eq("甲己 → 天干五合 nominal 土", [first(th, "天干五合").nominalElement, first(th, "天干五合").formed], ["土", true]);
  eq("卯辰 → 六害", countType(relations(["丁卯", "戊辰", "丙寅", "甲午"]), "六害"), 1);
}

// ── input flexibility: GZ-string array ≡ chart.pillars ──
{
  const viaChart = relations(c).findings.map((f) => f.type).sort().join(",");
  const viaArray = relations(["己未", "丙子", "乙卯", "癸未"]).findings.map((f) => f.type).sort().join(",");
  eq("relations(GZ array) ≡ relations(chart)", viaArray, viaChart);
  // Labelled extra pillars (大运/流年) can be passed in alongside the natal four.
  const withLuck = relations([...["己未", "丙子", "乙卯", "癸未"].map((gz) => ({ gz })), { gz: "辛未", label: "大运" }]);
  eq("labelled extra pillar (大运 辛未) participates in findings", withLuck.findings.some((f) => f.participants.some((p) => p.label === "大运")), true);
  let threw = false;
  try { relations(["己未", "XX"]); } catch { threw = true; }
  eq("bad pillar throws", threw, true);
  let threwLbl = false;
  try { relations(c, cheer, { labelA: "X", labelB: "X" }); } catch { threwLbl = true; }
  eq("identical cross labels throw (findings are chart-identified)", threwLbl, true);
}

/* ══════════════════ 藏干 weighting (elementWeights) ══════════════════
 * Convention: 本气 1.0 · 中气 0.5 · 余气 0.3 over HIDDEN[branch] (already ordered
 * 本气→余气); 藏干 and visible 天干 tallied SEPARATELY. This reproduces the weighted
 * tallies used in readings/ — Cheer's 水 3.0 · 土 2.0 · 金 0.6 · 火 0 · 木 0.
 */
{
  const wCheer = elementWeights(cheer);
  eq("Cheer 藏干 tally 水3.0 土2.0 金0.6 火0 木0 (reading §0)", wCheer.hidden, { 木: 0, 火: 0, 土: 2, 金: 0.6, 水: 3 });
  eq("Cheer 天干 tally 壬壬己乙 = 水2 土1 木1", wCheer.stems, { 木: 1, 火: 0, 土: 1, 金: 0, 水: 2 });
  eq("convention reported", wCheer.convention.hiddenWeights, [1, 0.5, 0.3]);
  const wJack = elementWeights(c);
  // 未(己1.0土 丁0.5火 乙0.3木)×2 · 子(癸1.0水) · 卯(乙1.0木)
  eq("Jack 藏干 tally 木1.6 火1 土2 金0 水1", wJack.hidden, { 木: 1.6, 火: 1, 土: 2, 金: 0, 水: 1 });
  eq("Jack 天干 tally 己丙乙癸 = 土1 火1 木1 水1", wJack.stems, { 木: 1, 火: 1, 土: 1, 金: 0, 水: 1 });
  const wAlena = elementWeights(alena);
  // 申(庚1.0金 壬0.5水 戊0.3土) · 午(丁1.0火 己0.5土) · 亥(壬1.0水 甲0.5木) · 辰(戊1.0土 乙0.5木 癸0.3水)
  eq("Alena 藏干 tally 木1.0 火1.0 土1.8 金1.0 水1.8", wAlena.hidden, { 木: 1, 火: 1, 土: 1.8, 金: 1, 水: 1.8 });
  // total = hidden + stems, element by element.
  const sumOK = ["木", "火", "土", "金", "水"].every((k) => Math.abs(wJack.total[k] - (wJack.hidden[k] + wJack.stems[k])) < 1e-9);
  eq("total = hidden + stems", sumOK, true);
  // Weight invariant: Σ hidden = Σ over branches of (1.0 + 0.5·中气? + 0.3·余气?).
  const expect = ["未", "子", "卯", "未"].reduce((s, br) => s + pkg.HIDDEN[br].reduce((a, _, i) => a + [1, 0.5, 0.3][i], 0), 0);
  const got = ["木", "火", "土", "金", "水"].reduce((s, k) => s + wJack.hidden[k], 0);
  eq("Σ Jack 藏干 weights = Σ per-branch 本/中/余", Math.round(got * 1e6) / 1e6, Math.round(expect * 1e6) / 1e6);
  // Custom convention is honoured (flat 1/1/1 → Cheer 金 = 2 × 辛).
  eq("custom hiddenWeights [1,1,1] → Cheer 金 2", elementWeights(cheer, { hiddenWeights: [1, 1, 1] }).hidden.金, 2);
  eq("stemWeight 0 zeroes the 天干 tally", elementWeights(cheer, { stemWeight: 0 }).stems, { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 });
  eq("detail rows = 4 stems + Σ藏干", elementWeights(cheer).detail.length, 4 + ["子", "子", "丑", "丑"].reduce((s, br) => s + pkg.HIDDEN[br].length, 0));

  // ── 得令 (monthMultiplier) and includeDayStem — MUST 16a axes 4 and 5, added 2026-09-09.
  // These exist because 16a mandated a weighting sweep the tool could not perform, so "passes 16a"
  // was decided by what happened to be implemented. Both moved a LIVE superlative on this roster.
  const diana = ["戊午", "辛酉", "丁亥", "丙午"];        // month 辛酉 = 金 · DM 丁 = 火
  eq("得令 ×1 is the identity", elementWeights(diana, { monthMultiplier: 1 }).total, elementWeights(diana).total);
  // 月 pillar 辛酉 contributes 辛(金1.0 stem) + 酉(辛 本气 1.0) = 金 2.0; ×2 adds exactly 2.0 more.
  eq("得令 ×2 doubles the MONTH pillar only (金 2→4, 火 unchanged)",
    elementWeights(diana, { monthMultiplier: 2 }).total, { 木: 0.5, 火: 4, 土: 2, 金: 4, 水: 1 });
  eq("得令 ×3 → 金 6, other pillars still untouched",
    elementWeights(diana, { monthMultiplier: 3 }).total.金, 6);
  // Diana's 火 4.0 is 1.0 of her OWN 丁 Day-Master stem + 3.0 of branch. Dropping it costs exactly
  // stemWeight — which is why "highest 火 on the roster" was an artefact, not a fact about her.
  eq("includeDayStem:false drops the DM's own stem (火 4→3)",
    elementWeights(diana, { includeDayStem: false }).total.火, 3);
  eq("includeDayStem:false costs exactly stemWeight",
    elementWeights(diana, { includeDayStem: false, stemWeight: 0.5 }).total.火,
    elementWeights(diana, { stemWeight: 0.5 }).total.火 - 0.5);
  eq("includeDayStem:false leaves the day BRANCH intact (亥 → 水 1.0 still present)",
    elementWeights(diana, { includeDayStem: false }).total.水, 1);
  // ⚠ FAIL CLOSED, not silently inert. normalizePillars labels a bare array p1…p4; a 4-pillar array
  // is mapped to year/month/day/hour, but anything else must THROW rather than no-op — the defect
  // class of dasha-margin.mjs's inert `--level` flag.
  eq("bare 4-pillar array is mapped positionally, so the knob bites",
    elementWeights(diana, { monthMultiplier: 2 }).total.金, 4);
  const threw = (fn) => { try { fn(); return false; } catch { return true; } };
  eq("monthMultiplier on unlabelled non-4 pillars THROWS",
    threw(() => elementWeights([{ gz: "戊午", label: "x" }, { gz: "辛酉", label: "y" }], { monthMultiplier: 2 })), true);
  eq("includeDayStem:false on unlabelled non-4 pillars THROWS",
    threw(() => elementWeights([{ gz: "戊午", label: "x" }, { gz: "辛酉", label: "y" }], { includeDayStem: false })), true);
  eq("…but the SAME call with defaults still works (knobs fail closed, tally does not)",
    elementWeights([{ gz: "戊午", label: "x" }, { gz: "辛酉", label: "y" }]).total.金, 2);
  // Both axes, not just the first — the label said "both" while asserting only one (round 6).
  eq("convention block reports monthMultiplier",
    elementWeights(diana, { monthMultiplier: 2, includeDayStem: false }).convention.monthMultiplier, 2);
  eq("convention block reports includeDayStem",
    elementWeights(diana, { monthMultiplier: 2, includeDayStem: false }).convention.includeDayStem, false);
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

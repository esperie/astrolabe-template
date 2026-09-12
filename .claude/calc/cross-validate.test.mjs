#!/usr/bin/env node
/**
 * cross-validate.test.mjs — convergence test: the bazi calculator on OTHER Joey Yap
 * family charts it was NOT tuned to (different year / month / gender / hour). Reproducing
 * these is the real evidence the engine is correct, not curve-fit to Jack.
 * Sources: ~/Documents/Personal/Readings/bazi/{Jack,Alena,T-bazi}.pdf (Joey Yap reports).
 *
 * ⚠ WHY lon120 (2026-09-06 — read this before "fixing" the inputs).
 * lon120 == the standard meridian for UTC+8, i.e. NO longitude correction — that is RAW CLOCK,
 * and raw clock is the PUBLISHER'S ACTUAL CONVENTION. It is not a convenience. Feeding these
 * subjects their real Singapore longitude BREAKS the match: Melissa 09:00 → 甲辰 (report says
 * 乙巳) and T 09:45 → 庚辰 (report says 辛巳). Both are locked as assertions below so the fact
 * is TESTED, not just commented.
 *
 * Jack (line ~18) is the sole exception, fed tz7.5/lon103.85 (true-solar): his report was
 * generated from a time HE had already adjusted himself (03:05pm → 02:35pm), so his chart
 * reaches the same 癸未 by a different route. That report therefore ECHOES the true-solar
 * convention rather than corroborating it, and is NOT independent evidence for hour B —
 * see canon §1/§3, corrected 2026-09-06. Alena's true birthplace is Rostov-on-Don (~39.7°E);
 * lon120 still lands her on 辰 (true-solar there ≈ 07:06, also 辰), so her row is stable either way.
 * T (25 Jan 1992 09:45, female) is a 3rd untuned chart.
 */
import bazi from "./bazi.js";

let pass = 0, fail = 0;
const ok = (n, c, g = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  got=" + g}`); c ? pass++ : fail++; };
const pillars = (c) => [c.pillars.year.gz, c.pillars.month.gz, c.pillars.day.gz, c.pillars.hour.gz].join(" ");

// ── Jack (regression) — 14 Dec 1979 3:05pm Singapore male ──
const jack = bazi.computeChart({ y: 1979, m: 12, d: 14, hour: 15, minute: 5, tz: 7.5, longitude: 103.85, gender: "male" });
ok("Jack 己未 丙子 乙卯 癸未", pillars(jack) === "己未 丙子 乙卯 癸未", pillars(jack));
ok("Jack 本命卦 3 震 + 生气南", jack.gua.num === 3 && jack.gua.directions?.生气 === "南");

// ── Alena (NOT tuned) — 28 Jun 1992 08:30am female ──
const a = bazi.computeChart({ y: 1992, m: 6, d: 28, hour: 8, minute: 30, tz: 8, longitude: 120, gender: "female" });
ok("Alena 壬申 丙午 乙亥 庚辰", pillars(a) === "壬申 丙午 乙亥 庚辰", pillars(a));
ok("Alena 十神 正印/伤官/正官", [a.pillars.year.tenGod, a.pillars.month.tenGod, a.pillars.hour.tenGod].join("/") === "正印/伤官/正官", [a.pillars.year.tenGod, a.pillars.month.tenGod, a.pillars.hour.tenGod].join("/"));
ok("Alena 纳音 年 剑锋金", a.pillars.year.nayin === "剑锋金", a.pillars.year.nayin);
ok("Alena 大运 逆 乙巳/甲辰/癸卯/壬寅", !a.luck.forward && a.luck.list.slice(0, 4).map((l) => l.gz).join("/") === "乙巳/甲辰/癸卯/壬寅", a.luck.list.slice(0, 4).map((l) => l.gz).join("/"));
ok("Alena 大运 起≈8", Math.round(a.luck.startAgeYears) >= 7 && Math.round(a.luck.startAgeYears) <= 8, a.luck.startAgeYears.toFixed(2));
ok("Alena 胎元 丁酉", a.taiYuan === "丁酉", a.taiYuan);
ok("Alena 贵人 子申", JSON.stringify(a.stars.天乙贵人) === JSON.stringify(["子", "申"]), JSON.stringify(a.stars.天乙贵人));
ok("Alena 文昌午·桃花子·驿马巳·孤辰寅", a.stars.文昌 === "午" && a.stars.桃花 === "子" && a.stars.驿马 === "巳" && a.stars.孤辰 === "寅", [a.stars.文昌, a.stars.桃花, a.stars.驿马, a.stars.孤辰].join("/"));
ok("Alena 本命卦 7 兑 West", a.gua.num === 7 && a.gua.trigram === "兑" && a.gua.group === "West", a.gua.num + a.gua.trigram + a.gua.group);
ok("Alena 八宅 生气西北/绝命东 (兑)", a.gua.directions?.生气 === "西北" && a.gua.directions?.绝命 === "东", JSON.stringify(a.gua.directions));
ok("起运岁 取整: Jack=2, Alena=8", jack.luck.list[0].startAge === 2 && a.luck.list[0].startAge === 8, jack.luck.list[0].startAge + "/" + a.luck.list[0].startAge);

// ── 命宫 (Joey Yap oracle, 3-chart validation of the 太阳过宫 rule) ──
ok("Jack 命宫 甲戌", jack.mingGong === "甲戌", jack.mingGong);
ok("Alena 命宫 丙午", a.mingGong === "丙午", a.mingGong);

// ── T (NOT tuned) — 25 Jan 1992 09:45am female (pre-立春 → 辛未年) ──
const t = bazi.computeChart({ y: 1992, m: 1, d: 25, hour: 9, minute: 45, tz: 8, longitude: 120, gender: "female" });
ok("T 辛未 辛丑 庚子 辛巳", pillars(t) === "辛未 辛丑 庚子 辛巳", pillars(t));
ok("T 命宫 戊戌", t.mingGong === "戊戌", t.mingGong);
ok("T 胎元 壬辰", t.taiYuan === "壬辰", t.taiYuan);

// ── Jinghao (NOT tuned) — 01 Jan 1985 04:15pm male (pre-立春 → 甲子年) ──
const jh = bazi.computeChart({ y: 1985, m: 1, d: 1, hour: 16, minute: 15, tz: 8, longitude: 120, gender: "male" });
ok("Jinghao 甲子 丙子 庚子 甲申", pillars(jh) === "甲子 丙子 庚子 甲申", pillars(jh));
ok("Jinghao 命宫 壬申", jh.mingGong === "壬申", jh.mingGong);
ok("Jinghao 胎元 丁卯", jh.taiYuan === "丁卯", jh.taiYuan);

// ── Melissa (NOT tuned) — 24 Apr 1983 09:00am female ──
const mel = bazi.computeChart({ y: 1983, m: 4, d: 24, hour: 9, minute: 0, tz: 8, longitude: 120, gender: "female" });
ok("Melissa 癸亥 丙辰 壬午 乙巳", pillars(mel) === "癸亥 丙辰 壬午 乙巳", pillars(mel));
ok("Melissa 命宫 己未", mel.mingGong === "己未", mel.mingGong);
ok("Melissa 胎元 丁未", mel.taiYuan === "丁未", mel.taiYuan);

// ── CONVENTION LOCK (2026-09-06) — the publisher's tool uses RAW CLOCK, not true-solar ──
// Canon once cited that publisher's report as "authoritative professional support" for Jack's
// hour B. It was circular: the owner had typed in his own true-solar-adjusted time. These two
// assertions pin the convention as a FACT about the tool, so the claim cannot silently return.
// Each subject's report agrees with the raw-clock chart above and DISAGREES with true-solar here.
const melTS = bazi.computeChart({ y: 1983, m: 4, d: 24, hour: 9, minute: 0, tz: 8, longitude: 103.85, gender: "female" });
ok("publisher = RAW CLOCK: Melissa true-solar SG gives 甲辰, not the report's 乙巳",
  melTS.pillars.hour.gz === "甲辰" && mel.pillars.hour.gz === "乙巳", melTS.pillars.hour.gz);
const tTS = bazi.computeChart({ y: 1992, m: 1, d: 25, hour: 9, minute: 45, tz: 8, longitude: 103.85, gender: "female" });
ok("publisher = RAW CLOCK: T true-solar SG gives 庚辰, not the report's 辛巳",
  tTS.pillars.hour.gz === "庚辰" && t.pillars.hour.gz === "辛巳", tTS.pillars.hour.gz);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

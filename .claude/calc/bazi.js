"use strict";
/**
 * bazi.js — deterministic Four Pillars (八字) calculator. No natural-language math.
 * Validated against external professional oracles (see public-validation.test.mjs).
 *
 * Covers: four pillars (true-solar hour), 藏干, 十神, 纳音, 大运 (direction + start age +
 * sequence), 胎元, symbolic stars (天乙贵人 / 文昌 / 桃花 / 驿马 / 孤辰), 本命卦 / 八宅, and
 * monthly pillars for any solar year.
 *
 * VALIDATION STATUS: oracle-validated = pillars, 大运, 胎元, 纳音, 贵人, 文昌, 桃花, 驿马, 卦,
 * monthly pillars + 节 dates, 命宫 (validated on reference charts). PENDING (flagged in output) = 孤辰.
 */
const A = require("./astro");

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
// element index: 0木 1火 2土 3金 4水 ; yang = stem index even
const STEM_ELEM = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const gzFromIndex = (i) => {
  const k = ((i % 60) + 60) % 60;
  return STEMS[k % 10] + BRANCHES[k % 12];
};
const idxOfStem = (s) => STEMS.indexOf(s);
const idxOfBranch = (b) => BRANCHES.indexOf(b);

// 60 jiazi 纳音 (paired). index by jiazi number (甲子=0).
const NAYIN_PAIRS = [
  "海中金", "炉中火", "大林木", "路旁土", "剑锋金", "山头火", "涧下水", "城头土",
  "白蜡金", "杨柳木", "泉中水", "屋上土", "霹雳火", "松柏木", "长流水", "沙中金",
  "山下火", "平地木", "壁上土", "金箔金", "覆灯火", "天河水", "大驿土", "钗钏金",
  "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水",
];
const nayin = (jiaziIdx) => NAYIN_PAIRS[Math.floor((((jiaziIdx % 60) + 60) % 60) / 2)];

// 藏干 (本气→余气), by branch.
const HIDDEN = {
  子: ["癸"], 丑: ["己", "癸", "辛"], 寅: ["甲", "丙", "戊"], 卯: ["乙"],
  辰: ["戊", "乙", "癸"], 巳: ["丙", "庚", "戊"], 午: ["丁", "己"], 未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"], 酉: ["辛"], 戌: ["戊", "辛", "丁"], 亥: ["壬", "甲"],
};

// Ten-god of `other` stem relative to `day` stem.
function tenGod(dayStem, otherStem) {
  const dE = STEM_ELEM[idxOfStem(dayStem)];
  const oE = STEM_ELEM[idxOfStem(otherStem)];
  const same = idxOfStem(dayStem) % 2 === idxOfStem(otherStem) % 2;
  if (oE === dE) return same ? "比肩" : "劫财";
  if (oE === (dE + 1) % 5) return same ? "食神" : "伤官"; // 我生
  if (oE === (dE + 2) % 5) return same ? "偏财" : "正财"; // 我克
  if (dE === (oE + 2) % 5) return same ? "七杀" : "正官"; // 克我
  return same ? "偏印" : "正印"; // 生我
}

// jiazi index (0..59) from a stem+branch pair.
function jiaziIndex(stem, branch) {
  const s = idxOfStem(stem), b = idxOfBranch(branch);
  for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i;
  return -1;
}

// Month branch (寅-based) from sun apparent longitude. 节 boundaries every 30° from 315° (立春).
function monthBranchFromLongitude(lambda) {
  const seg = Math.floor(A.mod360(lambda - 315) / 30); // 0=寅 ... 10=子 11=丑
  return { branch: BRANCHES[(2 + seg) % 12], seg, termLongitude: A.mod360(315 + seg * 30) };
}

// 命宫 (Life Palace) — by 太阳过宫 (中气 month, NOT 节), per the classical rule and
// a professional reference oracle. Invariant (oracle-validated, 子=0 indices):
//   命宫支 + 中气月支 + 时支 ≡ 辰 (4)  →  mingIdx = 4 − midMonthIdx − hourIdx (mod 12).
// Stem via 五虎遁 from the year stem. Validated against 5 independent professional reports
// (reference charts A–E, spanning different year/month/gender/hour; predicted before reveal).
// 中气 boundaries sit at 330°+k·30° of apparent solar longitude (15° past each 节).
function lifePalace(lambda, hourBranchIdx, yStem) {
  const segMid = Math.floor(A.mod360(lambda - 330) / 30); // 0=寅's 中气 window …
  const midMonthIdx = (2 + segMid) % 12;
  const mingIdx = (((4 - midMonthIdx - hourBranchIdx) % 12) + 12) % 12;
  const stemStart = (idxOfStem(yStem) * 2 + 2) % 10; // 寅月 stem (五虎遁)
  const stem = STEMS[(stemStart + ((mingIdx - 2 + 12) % 12)) % 10];
  return stem + BRANCHES[mingIdx];
}

const reduceDigit = (n) => {
  while (n > 9) n = String(n).split("").reduce((a, c) => a + +c, 0);
  return n;
};

// 本命卦 (Ming Gua). solarYear = 立春-adjusted year. Returns {num, trigram, group}.
function mingGua(solarYear, gender) {
  const s = reduceDigit(solarYear % 100);
  let num;
  if (gender === "male") num = solarYear < 2000 ? 10 - s : 9 - s;
  else num = solarYear < 2000 ? s + 5 : s + 6;
  num = reduceDigit(num);
  if (num === 0) num = gender === "male" ? 9 : 6;
  if (num === 5) num = gender === "male" ? 2 : 8;
  const TRIGRAMS = { 1: "坎", 2: "坤", 3: "震", 4: "巽", 6: "乾", 7: "兑", 8: "艮", 9: "离" };
  const EAST = new Set([1, 3, 4, 9]);
  return { num, trigram: TRIGRAMS[num], group: EAST.has(num) ? "East" : "West" };
}

// 八宅 directions via the 游年翻卦 algorithm — covers ALL 8 gua deterministically (the old
// 2-entry table only had 震3/兑7). Each trigram = 3 bits (bottom=1, middle=2, top=4; yang=1/yin=0);
// flipping lines in the fixed sequence 上中下中上中下中 yields the 8 stars in order. 伏位 = self.
// Validated: reproduces an East-group anchor (gua 3, all 8/8 vs reference) and a West-group
// anchor (gua 7: 生气西北 / 绝命东) exactly.
const TRIGRAM_BITS = { 坎: 2, 坤: 0, 震: 1, 巽: 6, 乾: 7, 兑: 3, 艮: 4, 离: 5 };
const BITS_DIR = { 0: "西南", 1: "东", 2: "北", 3: "西", 4: "东北", 5: "南", 6: "东南", 7: "西北" };
const GUA_STARS = ["生气", "五鬼", "延年", "六煞", "祸害", "天医", "绝命", "伏位"];
const GUA_FLIPS = [4, 2, 1, 2, 4, 2, 1, 2]; // 上中下中上中下中
function guaDirections(trigram) {
  let b = TRIGRAM_BITS[trigram];
  if (b == null) return null;
  const out = {};
  for (let i = 0; i < 8; i++) { b ^= GUA_FLIPS[i]; out[GUA_STARS[i]] = BITS_DIR[b]; }
  return out;
}

// Symbolic stars (validated subset).
const TIANYI = { // 天乙贵人 by day stem
  甲: ["丑", "未"], 戊: ["丑", "未"], 庚: ["丑", "未"], 乙: ["子", "申"], 己: ["子", "申"],
  丙: ["亥", "酉"], 丁: ["亥", "酉"], 辛: ["寅", "午"], 壬: ["卯", "巳"], 癸: ["卯", "巳"],
};
const WENCHANG = { 甲: "巳", 乙: "午", 丙: "申", 戊: "申", 丁: "酉", 己: "酉", 庚: "亥", 辛: "子", 壬: "寅", 癸: "卯" };
// trinity group of a branch → {peachBlossom 桃花/咸池, postHorse 驿马}
function trinityStars(branch) {
  const groups = {
    申子辰: { 桃花: "酉", 驿马: "寅" }, 寅午戌: { 桃花: "卯", 驿马: "申" },
    巳酉丑: { 桃花: "午", 驿马: "亥" }, 亥卯未: { 桃花: "子", 驿马: "巳" },
  };
  for (const g in groups) if (g.includes(branch)) return groups[g];
  return {};
}
// 孤辰 by (day) branch group — method matched to the reference oracle (卯→巳). Flagged pending.
function guChen(branch) {
  if ("亥子丑".includes(branch)) return "寅";
  if ("寅卯辰".includes(branch)) return "巳";
  if ("巳午未".includes(branch)) return "申";
  return "亥"; // 申酉戌
}

/**
 * Compute the full bazi chart.
 * @param {object} o {y,m,d,hour,minute,tz,longitude,gender,lateZi}
 */
function computeChart(o) {
  const { y, m, d, hour, minute = 0, tz, longitude, gender = "male", lateZi = true } = o;
  const jdUT = A.julianDayUT(y, m, d, hour, minute, tz);
  const lambda = A.sunLongitudeAtUT(jdUT, y);

  // ── Year (立春-adjusted) ──
  const lichun = A.solarTermUT(y, 315);
  const baziYear = jdUT < lichun ? y - 1 : y;
  const yearIdx = (((baziYear - 4) % 60) + 60) % 60;
  const yStem = STEMS[yearIdx % 10], yBranch = BRANCHES[yearIdx % 12];

  // ── Month (by 节) ──
  const mb = monthBranchFromLongitude(lambda);
  const monthStemStart = (idxOfStem(yStem) * 2 + 2) % 10; // 寅月 stem
  const mStemIdx = (monthStemStart + mb.seg) % 10;
  const mStem = STEMS[mStemIdx], mBranch = mb.branch;

  // ── Day (JDN; optional late-子时 roll) ──
  const tsRaw = A.trueSolarHours(y, m, d, hour, minute, tz, longitude);
  let dayJDN = A.gregorianToJDN(y, m, d);
  if (lateZi && tsRaw >= 23) dayJDN += 1;
  const dayIdx = (((dayJDN + 49) % 60) + 60) % 60;
  const dStem = STEMS[dayIdx % 10], dBranch = BRANCHES[dayIdx % 12];

  // ── Hour (true solar) ──
  const ts = ((tsRaw % 24) + 24) % 24;
  const hourBranchIdx = Math.floor((ts + 1) / 2) % 12; // 子=23–01
  const hBranch = BRANCHES[hourBranchIdx];
  const ziHourStem = ((idxOfStem(dStem) % 5) * 2) % 10;
  const hStem = STEMS[(ziHourStem + hourBranchIdx) % 10];

  const pillars = {
    year: { stem: yStem, branch: yBranch, gz: yStem + yBranch, tenGod: tenGod(dStem, yStem), nayin: nayin(yearIdx), hidden: HIDDEN[yBranch].map((s) => ({ stem: s, tenGod: tenGod(dStem, s) })) },
    month: { stem: mStem, branch: mBranch, gz: mStem + mBranch, tenGod: tenGod(dStem, mStem), nayin: nayin(jiaziIndex(mStem, mBranch)), hidden: HIDDEN[mBranch].map((s) => ({ stem: s, tenGod: tenGod(dStem, s) })) },
    day: { stem: dStem, branch: dBranch, gz: dStem + dBranch, tenGod: "日主", nayin: nayin(dayIdx), hidden: HIDDEN[dBranch].map((s) => ({ stem: s, tenGod: tenGod(dStem, s) })) },
    hour: { stem: hStem, branch: hBranch, gz: hStem + hBranch, tenGod: tenGod(dStem, hStem), nayin: nayin(jiaziIndex(hStem, hBranch)), hidden: HIDDEN[hBranch].map((s) => ({ stem: s, tenGod: tenGod(dStem, s) })) },
  };

  // ── 大运 (direction + start age + sequence) ──
  const yangYear = idxOfStem(yStem) % 2 === 0;
  const forward = (yangYear && gender === "male") || (!yangYear && gender === "female");
  const prevTerm = A.solarLongitudeCrossingUT(mb.termLongitude, jdUT - 16, y); // start of this 节
  const nextTerm = A.solarLongitudeCrossingUT(A.mod360(mb.termLongitude + 30), jdUT + 1, y);
  const diffDays = forward ? nextTerm - jdUT : jdUT - prevTerm;
  const startAgeYears = diffDays / 3;
  const monthIdx60 = jiaziIndex(mStem, mBranch);
  const luck = [];
  for (let k = 0; k < 10; k++) {
    const idx = forward ? monthIdx60 + 1 + k : monthIdx60 - 1 - k;
    luck.push({ gz: gzFromIndex(idx), startAge: Math.round(startAgeYears) + 10 * k }); // round (standard 大运 convention)
  }

  // ── 胎元 / 命宫 ──
  const taiYuan = STEMS[(idxOfStem(mStem) + 1) % 10] + BRANCHES[(idxOfBranch(mBranch) + 3) % 12];
  const mingGong = lifePalace(lambda, hourBranchIdx, yStem);

  // ── symbolic stars ──
  const tri = trinityStars(dBranch);
  const stars = {
    天乙贵人: TIANYI[dStem],
    文昌: WENCHANG[dStem],
    桃花: tri.桃花,
    驿马: tri.驿马,
    孤辰: guChen(dBranch), // PENDING multi-chart validation
  };

  const gua = mingGua(baziYear, gender);
  const directions = guaDirections(gua.trigram);

  return {
    input: o,
    trueSolarHours: tsRaw,
    pillars,
    luck: { forward, startAgeYears, list: luck },
    taiYuan,
    mingGong,
    stars,
    gua: { ...gua, directions },
    _pendingValidation: ["孤辰"],
  };
}

/** Monthly pillars for a solar year (12 节-segments), with the 节 instant (UT JD). */
function monthlyPillars(solarYear) {
  const yearIdx = (((solarYear - 4) % 60) + 60) % 60;
  const yStem = STEMS[yearIdx % 10];
  const monthStemStart = (idxOfStem(yStem) * 2 + 2) % 10;
  const out = [];
  // 12 节 starting at 立春 (315°) of solarYear through 小寒 (285°) of next year
  for (let seg = 0; seg < 12; seg++) {
    const L = A.mod360(315 + seg * 30);
    const yr = seg <= 7 ? solarYear : solarYear + 1; // autumn/winter 节 seed converges to prior-year crossing
    const termUT = A.solarTermUT(yr, L);
    out.push({
      seg,
      branch: BRANCHES[(2 + seg) % 12],
      gz: STEMS[(monthStemStart + seg) % 10] + BRANCHES[(2 + seg) % 12],
      termLongitude: L,
      termUT,
    });
  }
  return out;
}

module.exports = { computeChart, monthlyPillars, tenGod, nayin, mingGua, STEMS, BRANCHES };

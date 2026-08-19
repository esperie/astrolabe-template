"use strict";
/**
 * bazi.js — deterministic Four Pillars (八字) calculator. No natural-language math.
 * Validated against external professional oracles (see public-validation.test.mjs).
 *
 * Covers: four pillars (true-solar hour), 藏干, 十神, 纳音, 大运 (direction + start age +
 * sequence), 胎元, symbolic stars (天乙贵人 / 文昌 / 桃花 / 驿马 / 孤辰), 本命卦 / 八宅,
 * monthly pillars for any solar year, the 干支 RELATION tables (冲/合/害/刑/三合/三会/伏吟/
 * 反吟, single-chart and cross-chart), and weighted 藏干 element tallies.
 *
 * VALIDATION STATUS: oracle-validated = pillars, 大运, 胎元, 纳音, 贵人, 文昌, 桃花, 驿马, 卦,
 * monthly pillars + 节 dates, 命宫 (validated on reference charts). PENDING (flagged in output) = 孤辰.
 * `relations()` / `elementWeights()` are DOCTRINE tables, not ephemeris: they are validated by
 * the explicit doctrine tests in bazi.test.mjs (notably the 三刑 three-member rule), not by an
 * external oracle.
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

/* ═══════════════════ 藏干 weighting (element strength tallies) ═══════════════════ */

const ELEM_NAMES = ["木", "火", "土", "金", "水"];
const elemOfStem = (s) => ELEM_NAMES[STEM_ELEM[idxOfStem(s)]];

// CONVENTION (documented, configurable): the classical 本气/中气/余气 split of each 藏干,
// weighted 本气 1.0 · 中气 0.5 · 余气 0.3 — HIDDEN[branch] is already ordered 本气→余气.
// (So 丑 contributes 己 1.0 土 · 癸 0.5 水 · 辛 0.3 金.) This is the weighting the 身强/身弱
// strength reads use. It counts BRANCH-hidden stems only; the four VISIBLE stems are
// tallied separately in `stems` (never silently mixed in), because a 藏干 tally and a 天干
// tally answer different questions and summing them is a convention choice the caller must
// make explicitly.
const HIDDEN_WEIGHTS = [1.0, 0.5, 0.3];

/**
 * Weighted element tallies for a chart's pillars.
 * @param {object|Array} input  a chart, a chart.pillars object, or an array of pillars
 *   (GZ strings like "己未", or {gz}/{stem,branch} objects — see normalizePillars).
 * @param {object} [opts] {hiddenWeights:[本气,中气,余气]=[1,0.5,0.3], stemWeight:1.0}
 * @returns {{convention, hidden, stems, total, detail}}
 *   hidden = 藏干-weighted tally {木,火,土,金,水}; stems = visible-天干 tally;
 *   total  = hidden + stems (offered, never assumed); detail = per-contribution rows.
 */
function elementWeights(input, opts = {}) {
  const w = opts.hiddenWeights || HIDDEN_WEIGHTS;
  const sw = opts.stemWeight == null ? 1.0 : opts.stemWeight;
  const zero = () => ({ 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 });
  const hidden = zero(), stems = zero(), total = zero();
  const detail = [];
  for (const p of normalizePillars(input, null)) {
    const se = elemOfStem(p.stem);
    stems[se] += sw;
    total[se] += sw;
    detail.push({ pillar: p.label, source: "天干", stem: p.stem, element: se, weight: sw, qi: "天干" });
    const hs = HIDDEN[p.branch];
    hs.forEach((s, i) => {
      const weight = w[i] == null ? 0 : w[i];
      const e = elemOfStem(s);
      hidden[e] += weight;
      total[e] += weight;
      detail.push({
        pillar: p.label, source: "藏干", branch: p.branch, stem: s, element: e, weight,
        qi: ["本气", "中气", "余气"][i] || `余气+${i}`,
      });
    });
  }
  const round = (o) => { for (const k of ELEM_NAMES) o[k] = Math.round(o[k] * 1e6) / 1e6; return o; };
  return {
    convention: { hiddenWeights: w.slice(0, 3), stemWeight: sw, basis: "本气/中气/余气; 藏干 and 天干 tallied separately" },
    hidden: round(hidden), stems: round(stems), total: round(total), detail,
  };
}

/* ══════════ Relation tables — 冲/合/害/刑/三合/三会/伏吟/反吟 (tested layer) ══════════ */
// These exist so no reading ever hand-rolls them again. Every table is explicit; the
// 三刑 / 三合 / 三会 frames report COMPLETE vs partial and name the missing branch.

const LIUHE = [ // 六合 — pair → the element it nominally 化s into (transformation is CONDITIONAL)
  ["子", "丑", "土"], ["寅", "亥", "木"], ["卯", "戌", "火"],
  ["辰", "酉", "金"], ["巳", "申", "水"], ["午", "未", "土"],
];
const LIUHAI = [["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"]]; // 六害 (穿)
const SANHE = [ // 三合局 — [生, 旺(中神), 墓, element]
  ["申", "子", "辰", "水"], ["亥", "卯", "未", "木"],
  ["寅", "午", "戌", "火"], ["巳", "酉", "丑", "金"],
];
const SANHUI = [ // 三会方 — [.,.,., element, direction]
  ["寅", "卯", "辰", "木", "东方"], ["巳", "午", "未", "火", "南方"],
  ["申", "酉", "戌", "金", "西方"], ["亥", "子", "丑", "水", "北方"],
];
// 三刑 — the ONLY two three-way 刑 frames. A two-member subset is NOT a formed 三刑
// (the 丑未 error: 丑未 is a 六冲; the 三刑 needs 戌 as well).
const SANXING = [["丑", "戌", "未", "恃势之刑"], ["寅", "巳", "申", "无恩之刑"]];
const ZIXING = ["辰", "午", "酉", "亥"]; // 自刑 — a doubled branch punishes itself
const TIANGAN_HE = [["甲", "己", "土"], ["乙", "庚", "金"], ["丙", "辛", "水"], ["丁", "壬", "木"], ["戊", "癸", "火"]];
const TIANGAN_CLASH = [["甲", "庚"], ["乙", "辛"], ["丙", "壬"], ["丁", "癸"]]; // 戊/己 (中央土) have no 冲

/**
 * Normalize any pillar input to [{chart,label,stem,branch,gz}].
 * Accepts: a chart (has .pillars) · a {year,month,day,hour} pillars object · an array of
 * "己未" GZ strings · an array of {gz,label} or {stem,branch,label}. Array entries take a
 * `label` if given, else "p1".."pN" — so 大运/流年 pillars can be passed in with names.
 */
function normalizePillars(input, chartLabel) {
  const src = input && input.pillars ? input.pillars : input;
  if (!src || typeof src !== "object") throw new Error("relations: pillars must be an object or array");
  const out = [];
  const push = (label, stem, branch) => out.push({ chart: chartLabel, label, stem, branch, gz: stem + branch });
  const read = (p, fallbackLabel) => {
    if (typeof p === "string") return push(fallbackLabel, p[0], p[1]);
    if (!p) throw new Error(`relations: empty pillar at ${fallbackLabel}`);
    const gz = p.gz;
    const stem = p.stem || (gz && gz[0]);
    const branch = p.branch || (gz && gz[1]);
    return push(p.label || fallbackLabel, stem, branch);
  };
  if (Array.isArray(src)) src.forEach((p, i) => read(p, `p${i + 1}`));
  else for (const k of Object.keys(src)) read(src[k], k);
  for (const p of out) {
    if (!STEMS.includes(p.stem) || !BRANCHES.includes(p.branch)) {
      throw new Error(`relations: bad pillar '${p.label}' = ${p.stem}${p.branch}`);
    }
  }
  return out;
}

/**
 * Structured 干支 relation findings for one chart, or ACROSS two charts (synastry).
 *
 * Single-chart:  relations(chart)            → every relation inside that chart.
 * Cross-chart:   relations(chartA, chartB)   → ONLY relations whose participants span both
 *                charts (intra-chart findings are excluded — call relations(x) for those).
 *
 * Every finding carries `formed`: true = the relation actually obtains; false = a named
 * frame that is NOT formed (reported with `missing` so a near-miss is visible without ever
 * being mistaken for the real thing).
 *
 * Types: 六冲 · 六合 · 六害 · 三合 · 半合 · 三合未成 · 三会 · 三会未成 · 三刑 · 三刑未成 ·
 *        相刑(子卯) · 自刑 · 伏吟 · 反吟 · 天干五合 · 天干相冲
 *
 * @param {object|Array} a  chart / pillars / pillar array (see normalizePillars)
 * @param {object|Array} [b]  second chart → cross-chart mode
 * @param {object} [opts] {labelA:"A", labelB:"B"}
 * @returns {{mode, pillars, findings, byType}}
 */
function relations(a, b, opts = {}) {
  const cross = b != null;
  const labelA = opts.labelA || (cross ? "A" : null);
  const labelB = opts.labelB || "B";
  if (cross && labelA === labelB) throw new Error("relations: labelA and labelB must differ (cross-chart findings are identified by chart label)");
  const A = normalizePillars(a, labelA);
  const B = cross ? normalizePillars(b, labelB) : [];
  const all = A.concat(B);
  const findings = [];
  const spans = (ps) => !cross || (ps.some((p) => p.chart === labelA) && ps.some((p) => p.chart === labelB));
  const add = (f) => { if (spans(f.participants)) findings.push(f); };

  // ── pairwise (branch + stem) ──
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const p = all[i], q = all[j];
      const pair = [p, q];
      const bi = idxOfBranch(p.branch), bj = idxOfBranch(q.branch);
      const stemClash = TIANGAN_CLASH.some(([x, y]) => (p.stem === x && q.stem === y) || (p.stem === y && q.stem === x));
      const branchClash = ((bi - bj + 12) % 12) === 6;

      if (branchClash) add({ type: "六冲", formed: true, branches: [p.branch, q.branch], participants: pair });
      for (const [x, y, el] of LIUHE) {
        if ((p.branch === x && q.branch === y) || (p.branch === y && q.branch === x)) {
          add({ type: "六合", formed: true, branches: [p.branch, q.branch], nominalElement: el,
                note: "化 is CONDITIONAL (needs month-order/transparent stem support) — element is nominal, not asserted", participants: pair });
        }
      }
      for (const [x, y] of LIUHAI) {
        if ((p.branch === x && q.branch === y) || (p.branch === y && q.branch === x)) {
          add({ type: "六害", alias: "穿", formed: true, branches: [p.branch, q.branch], participants: pair });
        }
      }
      // 子卯 — the two-member 无礼之刑 (a genuine 相刑, unlike a 丑未/寅申 subset)
      if ((p.branch === "子" && q.branch === "卯") || (p.branch === "卯" && q.branch === "子")) {
        add({ type: "相刑", subtype: "无礼之刑", formed: true, branches: ["子", "卯"], participants: pair });
      }
      if (p.branch === q.branch && ZIXING.includes(p.branch)) {
        add({ type: "自刑", formed: true, branches: [p.branch, q.branch], participants: pair });
      }
      // 伏吟 / 反吟 (pillar level). Plain branch-冲 alone is reported above as 六冲.
      if (p.gz === q.gz) add({ type: "伏吟", level: "柱", formed: true, gz: p.gz, participants: pair });
      else if (p.branch === q.branch) add({ type: "伏吟", level: "支", formed: true, branch: p.branch, participants: pair });
      if (stemClash && branchClash) {
        add({ type: "反吟", level: "柱", formed: true, note: "天克地冲", stems: [p.stem, q.stem], branches: [p.branch, q.branch], participants: pair });
      }
      for (const [x, y, el] of TIANGAN_HE) {
        if ((p.stem === x && q.stem === y) || (p.stem === y && q.stem === x)) {
          add({ type: "天干五合", formed: true, stems: [p.stem, q.stem], nominalElement: el,
                note: "化 is CONDITIONAL — element is nominal, not asserted", participants: pair });
        }
      }
      if (stemClash) add({ type: "天干相冲", formed: true, stems: [p.stem, q.stem], participants: pair });
    }
  }

  // ── three-branch frames (presence-based over all pillars) ──
  const byBranch = {};
  for (const p of all) (byBranch[p.branch] = byBranch[p.branch] || []).push(p);
  const holders = (br) => byBranch[br] || [];
  const flat = (brs) => brs.flatMap(holders);

  for (const [sheng, wang, mu, el] of SANHE) {
    const present = [sheng, wang, mu].filter((br) => holders(br).length);
    const missing = [sheng, wang, mu].filter((br) => !holders(br).length);
    if (present.length === 3) {
      add({ type: "三合", formed: true, complete: true, group: `${sheng}${wang}${mu}`, element: el, branches: present, missing: [], participants: flat(present) });
    } else if (present.length === 2) {
      if (present.includes(wang)) {
        // 半合 — a genuine partial frame, because it contains the 旺神 (中神).
        add({ type: "半合", formed: true, complete: false, group: `${sheng}${wang}${mu}`, element: el, branches: present, missing, participants: flat(present) });
      } else {
        // 生+墓 without the 旺神 — NOT a 半合. Reported unformed so it can never be counted as one.
        add({ type: "三合未成", formed: false, complete: false, group: `${sheng}${wang}${mu}`, element: el, branches: present, missing,
              note: `生+墓 without the 旺神 ${wang} — not a 半合`, participants: flat(present) });
      }
    }
  }
  for (const [x, y, z, el, dir] of SANHUI) {
    const present = [x, y, z].filter((br) => holders(br).length);
    const missing = [x, y, z].filter((br) => !holders(br).length);
    if (present.length === 3) {
      add({ type: "三会", formed: true, complete: true, group: `${x}${y}${z}`, element: el, direction: dir, branches: present, missing: [], participants: flat(present) });
    } else if (present.length === 2) {
      add({ type: "三会未成", formed: false, complete: false, group: `${x}${y}${z}`, element: el, direction: dir, branches: present, missing,
            note: "三会方 requires all three — no 半会", participants: flat(present) });
    }
  }
  for (const [x, y, z, sub] of SANXING) {
    const present = [x, y, z].filter((br) => holders(br).length);
    const missing = [x, y, z].filter((br) => !holders(br).length);
    if (present.length === 3) {
      add({ type: "三刑", subtype: sub, formed: true, complete: true, group: `${x}${y}${z}`, branches: present, missing: [], participants: flat(present) });
    } else if (present.length === 2) {
      // HARD RULE: two of three is NOT a 三刑. Emitted unformed, under a distinct type,
      // with the missing branch named (e.g. 丑+未 → missing 戌; 丑未 itself is a 六冲).
      add({ type: "三刑未成", subtype: sub, formed: false, complete: false, group: `${x}${y}${z}`, branches: present, missing,
            note: `NOT a formed 三刑 — needs ${missing.join("")}`, participants: flat(present) });
    }
  }

  const byType = {};
  for (const f of findings) (byType[f.type] = byType[f.type] || []).push(f);
  return { mode: cross ? "cross" : "single", pillars: all, findings, byType };
}

/**
 * Compute the full bazi chart.
 *
 * `useTrueSolar` selects the HOUR CONVENTION (the A/B fork): true (default) = true-solar time,
 * the orthodox BaZi convention; false = raw civil-clock time, the school that skips the
 * longitude + equation-of-time correction. The choice drives the hour pillar, the late-子时 day
 * roll, and 命宫 (which is built from the hour branch) — nothing else in the chart. Same option
 * name and semantics as `ziwei.chartFromSolar` / `qimen.cast`, so a caller can fork all three
 * systems on one flag.
 *
 * @param {object} o {y,m,d,hour,minute,tz,longitude,gender,lateZi,useTrueSolar}
 */
function computeChart(o) {
  const { y, m, d, hour, minute = 0, tz, longitude, gender = "male", lateZi = true, useTrueSolar = true } = o;
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
  // The hour convention also governs the late-子时 roll: whichever clock defines the 时辰
  // must be the one that decides whether the birth already fell into the next 日柱.
  const tsRaw = A.trueSolarHours(y, m, d, hour, minute, tz, longitude);
  const convRaw = useTrueSolar ? tsRaw : hour + minute / 60;
  let dayJDN = A.gregorianToJDN(y, m, d);
  if (lateZi && convRaw >= 23) dayJDN += 1;
  const dayIdx = (((dayJDN + 49) % 60) + 60) % 60;
  const dStem = STEMS[dayIdx % 10], dBranch = BRANCHES[dayIdx % 12];

  // ── Hour (true-solar by default; raw clock when useTrueSolar=false) ──
  const ts = ((convRaw % 24) + 24) % 24;
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
    hourConvention: useTrueSolar ? "true-solar" : "clock",
    hourHours: ts,
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

module.exports = {
  computeChart, monthlyPillars, tenGod, nayin, mingGua,
  // relation + strength layer (tested — never hand-roll these in a reading)
  relations, normalizePillars, elementWeights,
  STEMS, BRANCHES, HIDDEN, HIDDEN_WEIGHTS,
};

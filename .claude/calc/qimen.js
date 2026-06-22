"use strict";
/**
 * qimen.js — deterministic 奇门遁甲 (时家奇门, 转盘法). No natural-language math.
 * Validated against a [reference] "Qi Men Destiny Palace" reference reading (e.g. a chart casting
 * to [redacted] / [redacted reference chart]).
 * The per-instance owner's natal 命局 is recorded and validated in .claude/canon/canon.md.
 *
 * Defaults to the true-solar hour pillar (consistent with the bazi working-default hour chart).
 * Reports BOTH the full 9-palace 转盘 chart and the Destiny-Palace summary — resolving
 * the 值使门 vs the rotated-八门-at-the-Destiny-Palace distinction such reports often gloss.
 */
const bazi = require("./bazi.js");
const astro = require("./astro.js");
const STEMS = bazi.STEMS, BRANCHES = bazi.BRANCHES;

const HOME_STAR = { 1: "天蓬", 2: "天芮", 3: "天冲", 4: "天辅", 5: "天禽", 6: "天心", 7: "天柱", 8: "天任", 9: "天英" };
const HOME_DOOR = { 1: "休门", 2: "死门", 3: "伤门", 4: "杜门", 6: "开门", 7: "惊门", 8: "生门", 9: "景门" };
const DIRECTION = { 1: "北", 2: "西南", 3: "东", 4: "东南", 5: "中", 6: "西北", 7: "西", 8: "东北", 9: "南" };
const RING = [1, 8, 3, 4, 9, 2, 7, 6]; // Luoshu perimeter, clockwise
const rIdx = (p) => RING.indexOf(p);
const LIUYI = ["戊", "己", "庚", "辛", "壬", "癸"];
const ORDER = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"];
const SHEN = ["值符", "螣蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"];

// 24 节气 三元局: [遁, 上元, 中元, 下元]
const JU_TABLE = {
  冬至: ["阳", 1, 7, 4], 小寒: ["阳", 2, 8, 5], 大寒: ["阳", 3, 9, 6], 立春: ["阳", 8, 5, 2], 雨水: ["阳", 9, 6, 3], 惊蛰: ["阳", 1, 7, 4],
  春分: ["阳", 3, 9, 6], 清明: ["阳", 4, 1, 7], 谷雨: ["阳", 5, 2, 8], 立夏: ["阳", 4, 1, 7], 小满: ["阳", 5, 2, 8], 芒种: ["阳", 6, 3, 9],
  夏至: ["阴", 9, 3, 6], 小暑: ["阴", 8, 2, 5], 大暑: ["阴", 7, 1, 4], 立秋: ["阴", 2, 5, 8], 处暑: ["阴", 1, 4, 7], 白露: ["阴", 9, 3, 6],
  秋分: ["阴", 7, 1, 4], 寒露: ["阴", 6, 9, 3], 霜降: ["阴", 5, 8, 2], 立冬: ["阴", 6, 9, 3], 小雪: ["阴", 5, 8, 2], 大雪: ["阴", 4, 7, 1],
};
const JIEQI_BY_SEG = ["春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒", "大寒", "立春", "雨水", "惊蛰"];

function jiaziIndex(stem, branch) {
  const s = STEMS.indexOf(stem), b = BRANCHES.indexOf(branch);
  for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i;
  return -1;
}

/** Cast the chart. useTrueSolar default true (B / 未时, consistent with [reference]). */
function cast({ y, m, d, hour, minute = 0, tz, longitude, useTrueSolar = true }) {
  const b = bazi.computeChart({ y, m, d, hour, minute, tz, longitude });
  const dayStem = b.pillars.day.stem;
  const hourStem = useTrueSolar ? b.pillars.hour.stem : null;
  const hourBranch = useTrueSolar ? b.pillars.hour.branch : BRANCHES[Math.floor(((hour + minute / 60 + 1) % 24) / 2) % 12];
  // hour stem for clock mode (五鼠遁 from day stem)
  const dStemIdx = STEMS.indexOf(dayStem);
  const hOrd = BRANCHES.indexOf(hourBranch);
  const hStem = useTrueSolar ? hourStem : STEMS[(((dStemIdx % 5) * 2) % 10 + hOrd) % 10];

  // ── 定局 ──
  const jdUT = astro.julianDayUT(y, m, d, hour, minute, tz);
  const lambda = astro.sunLongitudeAtUT(jdUT, y);
  const jieqi = JIEQI_BY_SEG[Math.floor(lambda / 15) % 24];
  const dayIdx = jiaziIndex(b.pillars.day.stem, b.pillars.day.branch);
  let fu = dayIdx; // 符头 = nearest 甲/己 day ≤ birth day
  while (fu % 10 !== 0 && fu % 10 !== 5) fu = (fu + 59) % 60;
  const fuBranch = fu % 12;
  const yuan = [0, 6, 3, 9].includes(fuBranch) ? 0 : [2, 8, 5, 11].includes(fuBranch) ? 1 : 2; // 上中下
  const [dun, ...juByYuan] = JU_TABLE[jieqi];
  const ju = juByYuan[yuan];

  // ── 地盘 ──
  const dipan = {};
  let p = ju;
  for (const s of ORDER) { dipan[p] = s; p = dun === "阳" ? (p === 9 ? 1 : p + 1) : (p === 1 ? 9 : p - 1); }
  const palaceOfStem = (st) => { for (const pp in dipan) if (dipan[pp] === st) return +pp; };

  // ── 旬首 / 旬空 ──
  const hourIdx = jiaziIndex(hStem, hourBranch);
  const xunFirst = hourIdx - (hourIdx % 10);
  const yi = LIUYI[xunFirst / 10];
  const xb = xunFirst % 12;
  const xunkong = [BRANCHES[(xb + 10) % 12], BRANCHES[(xb + 11) % 12]];

  // 中宫寄坤二: a stem in palace 5 (center) is treated as 坤2 for all star/door/rotation lookups
  // (土五局 cases). NOTE: the 中宫 值符 convention (天禽 vs 天芮) lacks an oracle — flagged via dingju.centerJi.
  const jiPalace = (p) => (p === 5 ? 2 : p);
  const yiPalaceRaw = palaceOfStem(yi);
  const shiganPalaceRaw = palaceOfStem(hStem);
  const yiPalace = jiPalace(yiPalaceRaw);
  const shiganPalace = jiPalace(shiganPalaceRaw);
  const zhiFuStar = HOME_STAR[yiPalace];
  const zhiShiDoor = HOME_DOOR[yiPalace];

  // ── 天盘 (rotate 九星 so 值符星 → 时干宫) ──
  const tianStar = {}, tianStem = {};
  const shift = rIdx(shiganPalace) - rIdx(yiPalace);
  for (let r = 0; r < 8; r++) {
    const home = RING[r], tgt = RING[((r + shift) % 8 + 8) % 8];
    tianStar[tgt] = HOME_STAR[home];
    tianStem[tgt] = dipan[home];
  }
  const qinTarget = RING[((rIdx(2) + shift) % 8 + 8) % 8]; // 天禽 rides 天芮(palace2)

  // ── 八门 (值使门 advances 时辰count; 阳顺/阴逆) ──
  const dir = dun === "阳" ? 1 : -1;
  const steps = hourIdx - xunFirst;
  const zhiShiPalace = RING[((rIdx(yiPalace) + dir * steps) % 8 + 8) % 8];
  const doorShift = rIdx(zhiShiPalace) - rIdx(yiPalace);
  const bamen = {};
  for (let r = 0; r < 8; r++) bamen[RING[((r + doorShift) % 8 + 8) % 8]] = HOME_DOOR[RING[r]];

  // ── 八神 (值符神 at 时干宫; 阳顺/阴逆) ──
  const bashen = {};
  for (let i = 0; i < 8; i++) bashen[RING[((rIdx(shiganPalace) + dir * i) % 8 + 8) % 8]] = SHEN[i];

  // ── 9-palace chart ──
  const chart = {};
  for (let pp = 1; pp <= 9; pp++) {
    chart[pp] = {
      palace: pp, direction: DIRECTION[pp],
      diPan: dipan[pp],
      tianStar: pp === 5 ? "天禽" : tianStar[pp] || null,
      tianStem: pp === 5 ? dipan[5] : tianStem[pp] || null,
      door: pp === 5 ? null : bamen[pp] || null,
      shen: pp === 5 ? null : bashen[pp] || null,
    };
  }
  chart[qinTarget].tianStarAlt = "天禽"; chart[qinTarget].tianStemAlt = dipan[5];

  // ── Destiny Palace = palace of 天盘日干; door = 值使门 ([reference] convention) ──
  let destinyPalace; for (const pp in tianStem) if (tianStem[pp] === dayStem) destinyPalace = +pp;
  if (destinyPalace === undefined && dipan[5] === dayStem) destinyPalace = 2; // 中宫寄坤二: 日干天盘落中宫 → 寄坤2
  const destiny = {
    palace: destinyPalace, direction: DIRECTION[destinyPalace], lifeStem: dayStem,
    door: zhiShiDoor, star: tianStar[destinyPalace], deity: bashen[destinyPalace],
    note: `Destiny door = 值使门(${zhiShiDoor}); rotated 八门 at this palace = ${bamen[destinyPalace]}`,
  };

  return {
    dingju: { jieqi, yuan: ["上元", "中元", "下元"][yuan], dun, ju, label: `${dun}遁${ju}局`, method: "拆补", centerJi: yiPalaceRaw === 5 || shiganPalaceRaw === 5 },
    hourPillar: hStem + hourBranch, xunFirst: STEMS[xunFirst % 10] + BRANCHES[xunFirst % 12], yi, xunkong,
    zhiFuStar, zhiShiDoor, zhiShiPalace, shiganPalace,
    chart, destiny,
  };
}

module.exports = { cast };

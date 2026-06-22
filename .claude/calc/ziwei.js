"use strict";
/**
 * ziwei.js — deterministic 紫微斗数 chart placement. No natural-language math.
 * Placement engine validated against a reference A-chart oracle (raw-clock hour) in the
 * engine tests. The same engine emits both the raw-clock (A) and the true-solar (B) charts
 * for any birth datetime; the per-instance owner's chart and A/B status live in .claude/canon/canon.md.
 *
 * Scope: 命/身宫, 五行局, 命主/身主, 14 main stars, 四化, and the major 副星/煞星
 * (禄存 擎羊 陀罗 文昌 文曲 左辅 右弼 天魁 天钺 火星 铃星 地空 地劫 天马 红鸾 天喜 天刑 天姚),
 * plus 大限. Minor symbolic stars (蜚廉, 年解, 台辅 …) are intentionally out of scope —
 * tools disagree on them and they carry little reading weight.
 *
 * NAMING NOTE — 地空 vs 天空: the 劫空 pair (placed symmetrically from 亥 by hour) is named
 * 地空/地劫 here. Some schools/software (e.g. LifeDNA) call the 子-side member 天空 instead —
 * SAME position, different label. A comparison showing 天空 where we emit 地空 is a naming
 * variant, NOT a placement mismatch. (Verified against the LifeDNA A-chart oracle, 2026-06.)
 */
const bazi = require("./bazi.js");
const astro = require("./astro.js");
const lunar = require("./lunar.js");

const STEMS = bazi.STEMS;
const BRANCHES = bazi.BRANCHES;
const bi = (b) => BRANCHES.indexOf(b);
const si = (s) => STEMS.indexOf(s);
const wrap = (n) => ((n % 12) + 12) % 12;

function jiaziIndex(stem, branch) {
  const s = si(stem), b = bi(branch);
  for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i;
  return -1;
}
const nayinElement = (gzIdx) => bazi.nayin(gzIdx).slice(-1); // 金木水火土

const ZIWEI_SERIES = { 紫微: 0, 天机: -1, 太阳: -3, 武曲: -4, 天同: -5, 廉贞: -8 };
const TIANFU_SERIES = { 天府: 0, 太阴: 1, 贪狼: 2, 巨门: 3, 天相: 4, 天梁: 5, 七杀: 6, 破军: 10 };

const SIHUA = {
  甲: { 禄: "廉贞", 权: "破军", 科: "武曲", 忌: "太阳" },
  乙: { 禄: "天机", 权: "天梁", 科: "紫微", 忌: "太阴" },
  丙: { 禄: "天同", 权: "天机", 科: "文昌", 忌: "廉贞" },
  丁: { 禄: "太阴", 权: "天同", 科: "天机", 忌: "巨门" },
  戊: { 禄: "贪狼", 权: "太阴", 科: "右弼", 忌: "天机" },
  己: { 禄: "武曲", 权: "贪狼", 科: "天梁", 忌: "文曲" },
  庚: { 禄: "太阳", 权: "武曲", 科: "太阴", 忌: "天同" },
  辛: { 禄: "巨门", 权: "太阳", 科: "文曲", 忌: "文昌" },
  壬: { 禄: "天梁", 权: "紫微", 科: "左辅", 忌: "武曲" },
  癸: { 禄: "破军", 权: "巨门", 科: "太阴", 忌: "贪狼" },
};
const LUCUN = { 甲: "寅", 乙: "卯", 丙: "巳", 丁: "午", 戊: "巳", 己: "午", 庚: "申", 辛: "酉", 壬: "亥", 癸: "子" };
const KUI = { 甲: "丑", 乙: "子", 丙: "亥", 丁: "亥", 戊: "丑", 己: "子", 庚: "丑", 辛: "午", 壬: "卯", 癸: "卯" };
const YUE = { 甲: "未", 乙: "申", 丙: "酉", 丁: "酉", 戊: "未", 己: "申", 庚: "未", 辛: "寅", 壬: "巳", 癸: "巳" };
const MINGZHU = ["贪狼", "巨门", "禄存", "文曲", "廉贞", "武曲", "破军", "武曲", "廉贞", "文曲", "禄存", "巨门"]; // by 命宫支
const SHENZHU = ["火星", "天相", "天梁", "天同", "文昌", "天机", "铃星", "天相", "天梁", "天同", "文昌", "天机"]; // by 年支
const PALACES = ["命宫", "兄弟", "夫妻", "子女", "财帛", "疾厄", "迁移", "交友", "官禄", "田宅", "福德", "父母"];

function trinityGroup(branch) {
  if ("寅午戌".includes(branch)) return "寅午戌";
  if ("申子辰".includes(branch)) return "申子辰";
  if ("巳酉丑".includes(branch)) return "巳酉丑";
  return "亥卯未";
}
const HUOLING_START = { 寅午戌: ["丑", "卯"], 申子辰: ["寅", "戌"], 巳酉丑: ["卯", "戌"], 亥卯未: ["酉", "戌"] };
const TIANMA = { 寅午戌: "申", 申子辰: "寅", 巳酉丑: "亥", 亥卯未: "巳" };

/** Core placement from canonical inputs (the validated engine). */
function placeChart({ lunarMonth, lunarDay, yearStem, yearBranch, hourBranch, gender }) {
  const hOi = bi(hourBranch), yBi = bi(yearBranch);
  const mingIdx = wrap(1 + lunarMonth - hOi);
  const shenIdx = wrap(1 + lunarMonth + hOi);

  const yinStem = (si(yearStem) * 2 + 2) % 10; // 寅 palace stem (五虎遁)
  const stemAt = (b) => STEMS[(yinStem + wrap(b - 2)) % 10];

  const mingGZ = jiaziIndex(stemAt(mingIdx), BRANCHES[mingIdx]);
  const juName = { 水: "水二局", 木: "木三局", 金: "金四局", 土: "土五局", 火: "火六局" }[nayinElement(mingGZ)];
  const ju = { 水二局: 2, 木三局: 3, 金四局: 4, 土五局: 5, 火六局: 6 }[juName];

  // 紫微 position (商余法), then the two star series.
  const M = Math.ceil(lunarDay / ju) * ju;
  const shang = M / ju, jie = M - lunarDay;
  const idx1 = wrap(2 + shang - 1);
  const ziweiIdx = jie % 2 === 0 ? wrap(idx1 + jie) : wrap(idx1 - jie);
  const tianfuIdx = wrap(4 - ziweiIdx);

  const byBranch = Array.from({ length: 12 }, () => ({ main: [], aux: [] }));
  for (const [star, off] of Object.entries(ZIWEI_SERIES)) byBranch[wrap(ziweiIdx + off)].main.push(star);
  for (const [star, off] of Object.entries(TIANFU_SERIES)) byBranch[wrap(tianfuIdx + off)].main.push(star);

  // 副星
  const place = (star, b) => byBranch[wrap(b)].aux.push(star);
  place("文昌", 10 - hOi); place("文曲", 4 + hOi);
  place("左辅", 4 + lunarMonth - 1); place("右弼", 10 - (lunarMonth - 1));
  const luIdx = bi(LUCUN[yearStem]);
  place("禄存", luIdx); place("擎羊", luIdx + 1); place("陀罗", luIdx - 1);
  place("天魁", bi(KUI[yearStem])); place("天钺", bi(YUE[yearStem]));
  place("地空", 11 - hOi); place("地劫", 11 + hOi);
  const grp = trinityGroup(yearBranch);
  place("火星", bi(HUOLING_START[grp][0]) + hOi); place("铃星", bi(HUOLING_START[grp][1]) + hOi);
  place("天马", bi(TIANMA[grp]));
  const hongIdx = wrap(3 - yBi);
  place("红鸾", hongIdx); place("天喜", hongIdx + 6);
  // 天刑 从酉起正月顺数至生月; 天姚 从丑起正月顺数至生月 (lunar month)
  place("天刑", 9 + (lunarMonth - 1)); place("天姚", 1 + (lunarMonth - 1));

  // 四化 (by year stem) — mark stars IN PLACE so palaces and starsAt() agree
  const sh = SIHUA[yearStem];
  const sihuaByStar = {}; for (const t of ["禄", "权", "科", "忌"]) sihuaByStar[sh[t]] = t;
  const mark = (s) => (sihuaByStar[s] ? `${s}化${sihuaByStar[s]}` : s);
  for (const cell of byBranch) { cell.main = cell.main.map(mark); cell.aux = cell.aux.map(mark); }

  // assemble palaces (names from 命宫, decreasing branch)
  const forward = (si(yearStem) % 2 === 0) === (gender === "male"); // 阳男/阴女 → 顺
  const palaces = [];
  for (let k = 0; k < 12; k++) {
    const b = wrap(mingIdx - k);
    palaces.push({
      name: PALACES[k],
      branch: BRANCHES[b],
      stem: stemAt(b),
      isMing: b === mingIdx,
      isShen: b === shenIdx,
      mainStars: byBranch[b].main,
      auxStars: byBranch[b].aux,
    });
  }
  // 大限
  const daxian = [];
  for (let k = 0; k < 12; k++) {
    const b = forward ? wrap(mingIdx + k) : wrap(mingIdx - k);
    daxian.push({ branch: BRANCHES[b], ageStart: ju + 10 * k });
  }

  return {
    mingGong: { branch: BRANCHES[mingIdx], stem: stemAt(mingIdx) },
    shenGong: { branch: BRANCHES[shenIdx], stem: stemAt(shenIdx), palace: PALACES[wrap(mingIdx - shenIdx)] },
    wuxingJu: juName,
    mingZhu: MINGZHU[mingIdx],
    shenZhu: SHENZHU[yBi],
    ziwei: BRANCHES[ziweiIdx],
    tianfu: BRANCHES[tianfuIdx],
    sihua: { 禄: sh.禄, 权: sh.权, 科: sh.科, 忌: sh.忌 },
    palaces,
    daxian,
    starsAt: (branch) => byBranch[bi(branch)],
  };
}

/**
 * Compose from a solar birth datetime. useTrueSolar=true → 未时 (Chart B, default,
 * consistent with [reference]); false → raw clock 申时 (Chart A, the free-tool convention).
 */
function chartFromSolar({ y, m, d, hour, minute = 0, tz, longitude, gender = "male", useTrueSolar = true }) {
  const lun = lunar.solarToLunar(y, m, d, tz);
  const b = bazi.computeChart({ y, m, d, hour, minute, tz, longitude, gender });
  let hourBranch;
  if (useTrueSolar) {
    hourBranch = b.pillars.hour.branch;
  } else {
    const civil = ((hour + minute / 60 + 1) % 24);
    hourBranch = BRANCHES[Math.floor(civil / 2) % 12];
  }
  const chart = placeChart({
    lunarMonth: lun.lunarMonth, lunarDay: lun.lunarDay,
    yearStem: b.pillars.year.stem, yearBranch: b.pillars.year.branch,
    hourBranch, gender,
  });
  return { lunar: lun, hourBranch, convention: useTrueSolar ? "true-solar (B/未)" : "clock (A/申)", ...chart };
}

module.exports = { placeChart, chartFromSolar };

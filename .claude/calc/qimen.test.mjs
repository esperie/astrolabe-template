#!/usr/bin/env node
/** qimen.test.mjs — validate 奇门 cast vs the Joey Yap "Qi Men Destiny Palace" oracle. */
import qm from "./qimen.js";
const { cast } = qm;

let pass = 0, fail = 0;
const ok = (name, cond, info = "") => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  got=" + info}`); cond ? pass++ : fail++; };

const c = cast({ y: 1979, m: 12, d: 14, hour: 15, minute: 5, tz: 7.5, longitude: 103.85 });

// ── 定局 ──
ok("节气 大雪", c.dingju.jieqi === "大雪", c.dingju.jieqi);
ok("三元 中元", c.dingju.yuan === "中元", c.dingju.yuan);
ok("定局 阴遁七局", c.dingju.label === "阴遁7局", c.dingju.label);
ok("时柱 癸未 (true-solar)", c.hourPillar === "癸未", c.hourPillar);
ok("旬首 甲戌 / 仪己", c.xunFirst === "甲戌" && c.yi === "己", c.xunFirst + "/" + c.yi);
ok("旬空 申酉", JSON.stringify(c.xunkong) === JSON.stringify(["申", "酉"]), JSON.stringify(c.xunkong));
ok("值符星 天心", c.zhiFuStar === "天心", c.zhiFuStar);
ok("值使门 开门", c.zhiShiDoor === "开门", c.zhiShiDoor);

// ── Destiny Palace (the Joey Yap oracle) ──
const D = c.destiny;
ok("Destiny 宫 乾6/西北", D.palace === 6 && D.direction === "西北", D.palace + "/" + D.direction);
ok("Destiny 命干 乙", D.lifeStem === "乙", D.lifeStem);
ok("Destiny 门 开 (值使)", D.door === "开门", D.door);
ok("Destiny 星 天任", D.star === "天任", D.star);
ok("Destiny 神 九地", D.deity === "九地", D.deity);

// ── full-chart structural sanity ──
ok("乾6 天盘 天任+乙", c.chart[6].tianStar === "天任" && c.chart[6].tianStem === "乙", c.chart[6].tianStar + "+" + c.chart[6].tianStem);
ok("乾6 rotated 八门 = 休门 (≠值使开门)", c.chart[6].door === "休门", c.chart[6].door);
ok("坤2 值符 (时干宫)", c.chart[2].shen === "值符" && c.chart[2].tianStar === "天心", c.chart[2].shen + "/" + c.chart[2].tianStar);

// ── 中宫寄坤二: a 土五局 case that previously crashed (palace 5 → undefined door/star/deity) ──
const q5 = cast({ y: 2023, m: 2, d: 10, hour: 12, minute: 0, tz: 8, longitude: 120 });
ok("土五局 局数有效", typeof q5.dingju.ju === "number" && q5.dingju.label.endsWith("局"), q5.dingju.label);
ok("土五局 值使门 defined", typeof q5.zhiShiDoor === "string" && q5.zhiShiDoor.length > 0, String(q5.zhiShiDoor));
ok("土五局 destiny door/star/deity defined", !!q5.destiny.door && !!q5.destiny.star && !!q5.destiny.deity, JSON.stringify(q5.destiny));
ok("土五局 all 8 ring doors defined", [1, 2, 3, 4, 6, 7, 8, 9].every((p) => !!q5.chart[p].door), JSON.stringify([1, 2, 3, 4, 6, 7, 8, 9].map((p) => q5.chart[p].door)));

// ── 日干天盘落中宫 (~20% of days): Destiny Palace must not be undefined (寄坤2) ──
const qc = cast({ y: 2024, m: 6, d: 21, hour: 6, minute: 0, tz: 8, longitude: 120 });
ok("日干落中宫 → destiny 全字段已定义 (寄坤2)", qc.destiny.palace !== undefined && !!qc.destiny.direction && !!qc.destiny.star && !!qc.destiny.deity && !!qc.destiny.door, JSON.stringify(qc.destiny));

// ── 六仪遁甲 regression: 甲 never sits on the 地盘 (甲子→戊 … 甲寅→癸). A 甲 hour previously made
//    shiganPalace undefined → rIdx(undefined) = −1 → a garbage shift corrupted 天盘干/九星/八神.
//    Invariant: a 甲 hour IS its own 旬首, so 值符 already sits on the 时干宫 ⇒ shift 0 ⇒ 天盘 = 地盘
//    in every ring palace and every 九星 stays home. Covers all six 旬 (incl. a 中宫寄坤二 case).
const RING8 = [1, 8, 3, 4, 9, 2, 7, 6];
const HOME = { 1: "天蓬", 2: "天芮", 3: "天冲", 4: "天辅", 6: "天心", 7: "天柱", 8: "天任", 9: "天英" };
const JIA_HOURS = [
  { gz: "甲子", yi: "戊", shigan: 1, i: { y: 2024, m: 1, d: 1, hour: 0, minute: 30, tz: 8, longitude: 120 } },
  { gz: "甲戌", yi: "己", shigan: 2, i: { y: 2024, m: 1, d: 1, hour: 20, minute: 30, tz: 8, longitude: 120 } },
  { gz: "甲申", yi: "庚", shigan: 3, i: { y: 2024, m: 1, d: 2, hour: 16, minute: 30, tz: 8, longitude: 120 } },
  { gz: "甲午", yi: "辛", shigan: 4, i: { y: 2024, m: 1, d: 3, hour: 12, minute: 30, tz: 8, longitude: 120 } },
  { gz: "甲辰", yi: "壬", shigan: 2, i: { y: 2024, m: 1, d: 4, hour: 8, minute: 30, tz: 8, longitude: 120 } }, // 壬居中宫 → 寄坤2
  { gz: "甲寅", yi: "癸", shigan: 6, i: { y: 2024, m: 1, d: 5, hour: 4, minute: 30, tz: 8, longitude: 120 } },
];
for (const t of JIA_HOURS) {
  const q = cast(t.i);
  ok(`甲时 ${t.gz}: 时柱 + 旬首仪 ${t.yi}`, q.hourPillar === t.gz && q.yi === t.yi, q.hourPillar + "/" + q.yi);
  ok(`甲时 ${t.gz}: 时干宫 defined = ${t.shigan} (甲遁${t.yi})`, q.shiganPalace === t.shigan, String(q.shiganPalace));
  ok(`甲时 ${t.gz}: shift=0 → 天盘干 = 地盘干 in all 8 ring palaces`,
    RING8.every((p) => q.chart[p].tianStem === q.chart[p].diPan),
    JSON.stringify(RING8.map((p) => p + ":" + q.chart[p].tianStem + "/" + q.chart[p].diPan)));
  ok(`甲时 ${t.gz}: shift=0 → 九星 all at home palace`,
    RING8.every((p) => q.chart[p].tianStar === HOME[p]),
    JSON.stringify(RING8.map((p) => p + ":" + q.chart[p].tianStar)));
  ok(`甲时 ${t.gz}: 值符神 at 时干宫 ${t.shigan}`, q.chart[t.shigan].shen === "值符", q.chart[t.shigan].shen);
  ok(`甲时 ${t.gz}: 命局 star/deity/door all defined`,
    !!q.destiny.palace && !!q.destiny.star && !!q.destiny.deity && !!q.destiny.door, JSON.stringify(q.destiny));
}

// ── the owner's A-hedge chart (raw clock 15:05 → 申时, hour pillar 甲申): pinned 命局 ──
const qA = cast({ y: 1979, m: 12, d: 14, hour: 15, minute: 5, tz: 7.5, longitude: 103.85, useTrueSolar: false });
ok("A-hedge 甲申时: 时干宫 = 坤2 (甲遁庚, 庚居中宫寄坤二)", qA.hourPillar === "甲申" && qA.yi === "庚" && qA.shiganPalace === 2, qA.hourPillar + "/" + qA.yi + "/" + qA.shiganPalace);
ok("A-hedge 值使 unchanged: 死门 @坤2 · 值符星 天芮", qA.zhiShiDoor === "死门" && qA.zhiShiPalace === 2 && qA.zhiFuStar === "天芮", qA.zhiShiDoor + "/" + qA.zhiShiPalace + "/" + qA.zhiFuStar);
ok("A-hedge 命局 艮8/东北 · 命干乙 · 天任 · 白虎 · 值使死门",
  qA.destiny.palace === 8 && qA.destiny.direction === "东北" && qA.destiny.lifeStem === "乙" &&
  qA.destiny.star === "天任" && qA.destiny.deity === "白虎" && qA.destiny.door === "死门",
  JSON.stringify(qA.destiny));

// ── 甲 DAY stem (~10% of days): 日干甲 is located via the DAY's 旬首仪, not left undefined ──
const qJ = cast({ y: 2024, m: 1, d: 1, hour: 6, minute: 0, tz: 8, longitude: 120 }); // 甲子日 丁卯时
ok("甲日 日干遁旬首仪 → 命局 兑7/西 · 天蓬 · 值符 (命干仍记甲)",
  qJ.destiny.palace === 7 && qJ.destiny.direction === "西" && qJ.destiny.lifeStem === "甲" &&
  qJ.destiny.star === "天蓬" && qJ.destiny.deity === "值符" && qJ.destiny.note.includes("日干甲遁戊"),
  JSON.stringify(qJ.destiny));

// ── sweep: no cast in a 120-day × 12-hour grid may leave 时干宫 or 命局宫 undefined ──
let holes = 0;
for (let d = 0; d < 120; d++) {
  const dt = new Date(Date.UTC(2024, 0, 1) + d * 86400000);
  for (let h = 0; h < 24; h += 2) {
    const q = cast({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), hour: h, minute: 30, tz: 8, longitude: 120 });
    if (q.shiganPalace === undefined || q.destiny.palace === undefined) holes++;
  }
}
ok("1440-cast sweep: 时干宫 & 命局宫 never undefined", holes === 0, holes + " undefined");

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

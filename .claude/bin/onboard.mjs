#!/usr/bin/env node
/**
 * onboard.mjs — generate a new instance's protected canon from birth data, deterministically.
 *
 *   node .claude/bin/onboard.mjs --name "Full Name" --date 1990-05-20 --time 08:30 \
 *        --tz 8 --lon 114.1 --lat 22.3 --gender female [--instance .] [--dry-run] [--force]
 *
 * It casts all four systems (bazi/ziwei/qimen/vedic) via the validated calculators and writes:
 *   - .claude/canon/canon.md            (GUARDRAILS + computed facts §1-2,5-8,13; §3/4/9/10 scaffolded
 *                                         "AWAITING ANALYSIS" — 用神/spine/red-lines need analyst judgment)
 *   - .claude/calc/canon-consistency.test.mjs  (7 regression-lock assertions for THIS chart)
 *   - .claude/calc/eval-extra.json      ({} if absent)
 *
 * It does NOT fabricate 用神 / strategy. After running, the onboarding session authors §3/4/9/10 via
 * the bazi-analyst + decision-advisor, amends the GUARDRAILS via canon-amend.mjs, then `eval` + redteam.
 * Chart math is ALWAYS the calculators (rules/calc-authority.md). Refuses to overwrite an existing
 * canon without --force.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
}
const flag = (n) => process.argv.includes("--" + n);

const name = arg("name");
const date = arg("date");          // YYYY-MM-DD
const time = arg("time");          // HH:MM
const tz = arg("tz");              // hours east of UT (e.g. 8, or 7.5)
const lon = arg("lon");            // east longitude
const lat = arg("lat");            // north latitude (Vedic ascendant)
const gender = arg("gender");      // male | female
const INSTANCE = path.resolve(arg("instance", ROOT));
const DRY = flag("dry-run"), FORCE = flag("force");

if (!name || !date || !time || tz == null || lon == null || lat == null || !gender) {
  console.error("usage: onboard.mjs --name N --date YYYY-MM-DD --time HH:MM --tz H --lon L --lat L --gender male|female [--instance dir] [--dry-run] [--force]");
  process.exit(2);
}
const [Y, M, D] = date.split("-").map(Number);
const [h, mi] = time.split(":").map(Number);
const I = { y: Y, m: M, d: D, hour: h, minute: mi || 0, tz: +tz, longitude: +lon, latitude: +lat, gender };

// ── cast all four (import the instance's calculators so onboarding validates THAT engine) ──
const calc = (f) => import(path.join(INSTANCE, ".claude/calc", f));
const bazi = (await calc("bazi.js")).default;
const ziwei = (await calc("ziwei.js")).default;
const qimen = (await calc("qimen.js")).default;
const vedic = (await calc("vedic.js")).default;

const b = bazi.computeChart(I);
const P = b.pillars;
const pillars = [P.year.gz, P.month.gz, P.day.gz, P.hour.gz].join(" ");
const dm = P.day.gz[0];
const monthBranch = P.month.gz[1];
const luckSeq = b.luck.list.map((l) => `${l.gz}(${l.startAge})`).join(" · ");
const luck5 = b.luck.list.slice(0, 4).map((l) => l.gz).join(" ");

// A/B hour fork: does the hour pillar differ true-solar vs raw-clock?
const bClock = bazi.computeChart({ ...I, longitude: +tz * 15 });   // align longitude to tz meridian → ~no solar shift
const hourClock = bClock.pillars.hour.gz;
const abFork = hourClock !== P.hour.gz;

const z = ziwei.chartFromSolar({ ...I, useTrueSolar: true });
const sihua = `${z.sihua.禄}禄 ${z.sihua.权}权 ${z.sihua.科}科 ${z.sihua.忌}忌`;
const q = qimen.cast(I);
const v = vedic.compute({ y: I.y, m: I.m, d: I.d, hour: I.hour, minute: I.minute, tz: I.tz, lon: I.longitude, lat: I.latitude });
const gp = (x) => `${x.rasi.name} ${x.rasi.degInSign.toFixed(2)}° ${x.nakshatra.name}-${x.nakshatra.pada} /D9:${x.navamsa.name}`;
const grahaLine = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]
  .map((n) => `${n} ${v.grahas[n].rasi.name} ${v.grahas[n].rasi.degInSign.toFixed(1)}° ${v.grahas[n].nakshatra.name}-${v.grahas[n].nakshatra.pada}`).join(" · ");
const k = v.karakas;
const md = v.dasha.map((n) => `${n.lord}(${vedic.jdToDateStr(n.startJD).slice(0, 4)})`).join(" → ");

// ── render canon.md ──
const guard = `<!-- GUARDRAILS:START -->
[CANON] Destiny advisory — protected (.claude/canon/canon.md). Chart math = ALWAYS the calculators in .claude/calc/, NEVER mental arithmetic.
• Owner: ${name}. Born ${date} ${time} (tz${tz}, lon${lon}, lat${lat}), ${gender}.
• Pillars (true-solar): 年${P.year.gz} 月${P.month.gz} 日${P.day.gz} 时${P.hour.gz}. Day Master ${dm}, born ${monthBranch}月.${abFork ? " ⚠ HOUR is near a 时辰 boundary — A/B fork live (§3)." : ""}
• 用神 / favourable elements: ⏳ AWAITING ANALYSIS — to be authored by the bazi-analyst (§4). Do not assert until filled.
• Spine (upcoming 大运/流年): ⏳ AWAITING ANALYSIS (§9).
• Method: triangulate all four systems; symmetric red-team, falsifiability-first, no retrodiction; A/B forks → low-regret. Verify in canon; don't re-derive.
<!-- GUARDRAILS:END -->`;

const canon = `# CANON — Destiny & Decision Advisory (Protected Source of Truth)

Hook-protected. Amend ONLY via the ceremony in \`rules/canon-protection.md\`
(\`canon-guard.js\` blocks silent edits; \`settings.permissions.deny\` backs it up).
Authoritative reference for all 命理 (bazi / ziwei / qimen / 吠陀 Vedic) and life/decision
advisory for **${name}**. Verify against it; never re-derive from memory. All chart math comes
from the deterministic calculators in \`.claude/calc/\`.

${guard}

## 1. Birth data
- **${date}, clock ${time}, ${gender}.** tz UTC+${tz} · longitude ${lon}°E · latitude ${lat}°N.
- True-solar hour ≈ ${b.trueSolarHours.toFixed(2)}h (used for the bazi/ziwei/qimen hour pillar).

## 2. Four Pillars (true-solar)
| Pillar | 干支 | Ten-god | 纳音 |
|---|---|---|---|
| Year 年 | ${P.year.gz} | ${P.year.tenGod} | ${P.year.nayin} |
| Month 月 | ${P.month.gz} | ${P.month.tenGod} | ${P.month.nayin} |
| Day 日 | ${P.day.gz} | 日主 (DM) | ${P.day.nayin} |
| Hour 时 | ${P.hour.gz} | ${P.hour.tenGod} | ${P.hour.nayin} |
- Day Master **${dm}**, born **${monthBranch}月**.

## 3. A/B hour status
${abFork
    ? `- ⚠ **A/B fork is LIVE.** True-solar → hour **${P.hour.gz}** (working default, "B"). Raw-clock → **${hourClock}** ("A").
- ⏳ AWAITING ANALYSIS: assess P(A) vs P(B) (true-solar convention vs recorded-time reliability), and dual-track any hour-dependent read. Never silently collapse A/B.`
    : `- Hour pillar **${P.hour.gz}** is robust (birth time is not near a 时辰 boundary; true-solar and raw-clock agree). No material A/B fork.`}

## 4. 用神 — favourable / unfavorable elements
- ⏳ **AWAITING ANALYSIS.** Determine 身强/身弱, 调候 needs, and the favorable/忌 elements via the
  bazi-analyst (this is analytical judgment, not auto-computed — do NOT fabricate). Fill before going live.

## 5. 大运 Luck Pillars (${b.luck.forward ? "forward 顺" : "reverse 逆"}; start age ≈ ${b.luck.startAgeYears.toFixed(1)})
\`${luckSeq}\`

## 6. Symbolic stars / palaces
- 命宫(bazi) **${b.mingGong}** · 胎元 **${b.taiYuan}** · 天乙贵人 **${b.stars.天乙贵人.join("·")}** · 文昌 **${b.stars.文昌}** · 桃花 **${b.stars.桃花}** · 驿马 **${b.stars.驿马}** · 孤辰 **${b.stars.孤辰}**.
- 本命卦 (Ming Gua): **${b.gua.num} ${b.gua.trigram} (${b.gua.group} group)**. 吉方 生气${(b.gua.directions || {}).生气 ?? "—"} / 天医${(b.gua.directions || {}).天医 ?? "—"} / 延年${(b.gua.directions || {}).延年 ?? "—"} / 伏位${(b.gua.directions || {}).伏位 ?? "—"}.

## 7. 紫微斗数 (true-solar) — engine-derived
- 命宫 **${z.mingGong.branch} ${z.palaces.find((p) => p.isMing)?.mainStars.join("·") || "—"}** · 五行局 **${z.wuxingJu}** · 命主 **${z.mingZhu}** · 身主 **${z.shenZhu}**.
- 农历 ${z.lunar.lunarMonth}月${z.lunar.lunarDay}日 · 四化: ${sihua}.

## 8. 奇门遁甲 — engine-derived
- ${q.dingju.label} (${q.dingju.jieqi}${q.dingju.yuan}) · 值符 ${q.zhiFuStar} · 值使 ${q.zhiShiDoor}.
- 命局奇门宫: ${q.destiny.direction}(${q.destiny.palace}) 命干 ${q.destiny.lifeStem} · 门 ${q.destiny.door} · 星 ${q.destiny.star} · 神 ${q.destiny.deity}.

## 9. Timing spine
- ⏳ **AWAITING ANALYSIS.** Author the upcoming 大运/流年 spine (and its cross-check vs the Vedic
  Vimśottari daśā, §13) via the decision-advisor. Fill before going live.

## 10. Strategic red lines
- ⏳ **AWAITING ANALYSIS / personal.** Capture the owner's decision red lines and track-record priors
  (from \`docs/\` + interview) via the decision-advisor.

## 11. Methodology commitments
0. **TRIANGULATE ALL FOUR SYSTEMS (HARD RULE)** — every reading synthesizes 八字 + 紫微 + 奇门 + 吠陀 Vedic, never 1–2; build from convergence, flag divergence; always red-team AND vet to convergence before delivery.
1. **Chart math = deterministic calculators only** (\`.claude/calc/\`), never natural-language arithmetic.
2. Symmetric red-team; falsifiability-first; no retrodiction; separate convention from event-fit.
3. A/B forks → bazi-first → ziwei-where-A&B-agree → qimen snapshot → Vedic daśā for long-wave → low-regret.
4. Plain language; calibrated confidence; never present metaphysics as fact.

## 13. 吠陀 Vedic (Jyotish / sidereal, Lahiri) — engine-derived
- Convention: **sidereal, Lahiri ayanāṃśa** (${v.ayanamsa.toFixed(3)}° for ${Y}); **raw clock → UT** (NO true-solar hour); Rahu/Ketu = **true (osculating) node**.
- **Lagna** ${gp(v.lagna)}.
- Grahas: ${grahaLine}.
- **Karakas** (Jaimini): AK ${k.AK} · AmK ${k.AmK} · BK ${k.BK} · MK ${k.MK} · PiK ${k.PiK} · PuK ${k.PuK} · GK ${k.GK} · DK ${k.DK}.
- **Vimśottari MD**: ${md}.

---

## VALIDATION ORACLE (for the calculators)
Generated by \`onboard.mjs\` from the validated calculators for input (${date} ${time}, tz${tz}, lon${lon}, lat${lat}, ${gender}). The per-person guard \`canon-consistency.test.mjs\` locks these computed values against future calculator drift. The framework engines are independently validated against a public chart in \`public-validation.test.mjs\`. §4/§9/§10 require analyst authoring before this instance is "live".
`;

// ── render canon-consistency.test.mjs (7 regression-lock assertions) ──
const lonSid = (x) => (x.rasi.index * 30 + x.rasi.degInSign);
const test = `#!/usr/bin/env node
/**
 * canon-consistency.test.mjs — locks the four calculators to THIS instance's canon chart.
 * Generated by onboard.mjs for ${name} (${date} ${time}). If a calculator drifts from a
 * canon-stated value, this fails. (Per-person; the oracle is the canon's §2/5/6/7/8/13.)
 */
import bazi from "./bazi.js";
import ziwei from "./ziwei.js";
import qimen from "./qimen.js";
import vedic from "./vedic.js";

const I = { y: ${Y}, m: ${M}, d: ${D}, hour: ${h}, minute: ${mi || 0}, tz: ${+tz}, longitude: ${+lon}, latitude: ${+lat}, gender: ${JSON.stringify(gender)} };
let pass = 0, fail = 0;
const ok = (n, c, g = "") => { console.log(\`\${c ? "PASS" : "FAIL"}  \${n}\${c ? "" : "  got=" + g}\`); c ? pass++ : fail++; };

const b = bazi.computeChart(I);
ok("canon §2 pillars ${pillars}",
  [b.pillars.year.gz, b.pillars.month.gz, b.pillars.day.gz, b.pillars.hour.gz].join(" ") === ${JSON.stringify(pillars)},
  [b.pillars.year.gz, b.pillars.month.gz, b.pillars.day.gz, b.pillars.hour.gz].join(" "));
ok("canon §5 大运 ${luck5}", b.luck.list.slice(0, 4).map((l) => l.gz).join(" ") === ${JSON.stringify(luck5)}, b.luck.list.slice(0, 4).map((l) => l.gz).join(" "));
ok("canon §6 胎元${b.taiYuan} · 卦${b.gua.num}", b.taiYuan === ${JSON.stringify(b.taiYuan)} && b.gua.num === ${b.gua.num}, b.taiYuan + "/" + b.gua.num);

const z = ziwei.chartFromSolar({ ...I, useTrueSolar: true });
ok("canon §7 ziwei 命宫${z.mingGong.branch} · ${z.wuxingJu} · 命主${z.mingZhu}", z.mingGong.branch === ${JSON.stringify(z.mingGong.branch)} && z.wuxingJu === ${JSON.stringify(z.wuxingJu)} && z.mingZhu === ${JSON.stringify(z.mingZhu)}, z.mingGong.branch + "/" + z.wuxingJu + "/" + z.mingZhu);

const q = qimen.cast(I);
ok("canon §8 qimen ${q.dingju.label} · 宫${q.destiny.palace} ${q.destiny.door}", q.dingju.label === ${JSON.stringify(q.dingju.label)} && q.destiny.palace === ${q.destiny.palace} && q.destiny.door === ${JSON.stringify(q.destiny.door)}, q.dingju.label + "/" + q.destiny.palace + "/" + q.destiny.door);

const v = vedic.compute({ y: I.y, m: I.m, d: I.d, hour: I.hour, minute: I.minute, tz: I.tz, lon: I.longitude, lat: I.latitude });
ok("canon §13 vedic Lagna ${v.lagna.rasi.name} · Moon ${v.grahas.Moon.rasi.name}/${v.grahas.Moon.nakshatra.name} · AK ${k.AK}",
  v.lagna.rasi.name === ${JSON.stringify(v.lagna.rasi.name)} && v.grahas.Moon.rasi.name === ${JSON.stringify(v.grahas.Moon.rasi.name)} && v.grahas.Moon.nakshatra.name === ${JSON.stringify(v.grahas.Moon.nakshatra.name)} && v.karakas.AK === ${JSON.stringify(k.AK)},
  v.lagna.rasi.name + "/" + v.grahas.Moon.rasi.name + "/" + v.grahas.Moon.nakshatra.name + "/AK=" + v.karakas.AK);
ok("canon §13 vedic daśā ${v.dasha[0].lord}→…→${v.dasha[3].lord}",
  v.dasha[0].lord === ${JSON.stringify(v.dasha[0].lord)} && v.dasha[3].lord === ${JSON.stringify(v.dasha[3].lord)},
  v.dasha[0].lord + "→…→" + v.dasha[3].lord);

console.log(\`\\n\${pass}/\${pass + fail} passed\`);
process.exit(fail ? 1 : 0);
`;

// ── write ──
const canonPath = path.join(INSTANCE, ".claude/canon/canon.md");
const testPath = path.join(INSTANCE, ".claude/calc/canon-consistency.test.mjs");
const extraPath = path.join(INSTANCE, ".claude/calc/eval-extra.json");

if (fs.existsSync(canonPath) && !FORCE && !DRY) {
  console.error(`✗ canon already exists at ${canonPath}. Use --force to overwrite (it is amended via canon-amend.mjs once live).`);
  process.exit(2);
}

console.log(`\n  Onboarding: ${name} — ${date} ${time} (tz${tz} lon${lon} lat${lat} ${gender})`);
console.log(`  八字 ${pillars} · DM ${dm}${abFork ? " · ⚠ A/B hour fork" : ""}`);
console.log(`  紫微 命宫${z.mingGong.branch} ${z.wuxingJu} · 奇门 ${q.dingju.label} · 吠陀 Lagna ${v.lagna.rasi.name} / Moon ${v.grahas.Moon.rasi.name}`);

if (DRY) { console.log(`\n  (dry-run — nothing written)\n`); process.exit(0); }

fs.mkdirSync(path.dirname(canonPath), { recursive: true });
fs.writeFileSync(canonPath, canon);
fs.writeFileSync(testPath, test);
if (!fs.existsSync(extraPath)) fs.writeFileSync(extraPath, "{}\n");
console.log(`\n  ✓ wrote canon.md + canon-consistency.test.mjs`);

console.log(`  re-validating …`);
try {
  const out = execFileSync("node", [path.join(INSTANCE, ".claude/calc/eval.mjs"), "--quiet"], { encoding: "utf8", env: { ...process.env, ASTROLABE_EVAL_NO_BIN: "1" } });
  console.log("  " + out.trim());
} catch (e) {
  console.log("  " + ((e.stdout || "") + (e.stderr || "")).trim());
  console.log("  ✗ eval did not pass — investigate.");
  process.exit(1);
}
console.log(`\n  NEXT (this session, before the instance is "live"):
   1. Author §4 用神 (bazi-analyst), §9 spine + §10 red lines (decision-advisor) — analyst judgment, not fabricated.
   2. Amend the GUARDRAILS block with the 用神/spine via:  node .claude/bin/canon-amend.mjs …
   3. node .claude/calc/eval.mjs   (expect PASS)   ·   then destiny-redteam the canon.\n`);

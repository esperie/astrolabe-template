# Calculator Authority — No Hand-Computed Charts

## Scope
All 命理 chart computation: bazi pillars, 大运, 藏干/十神/纳音, 神煞, 命宫/胎元, 本命卦/八宅,
节气 & monthly pillars, true-solar time, 紫微 placement & 大限, 奇门 排盘, lunar conversion,
and **吠陀 Vedic** (sidereal grahas, ayanāṃśa, lagna, nakshatra/pada, vargas, karakas, Vimśottari daśā).

## MUST
1. **ALL chart math comes from the deterministic calculators in `.claude/calc/`.**
   NEVER compute pillars, stars, 大运, 局数, 节气 dates, or calendar conversions in
   natural language or mentally. (This session's hand-calc errors — 阳遁↔阴遁,
   大限 direction, an off-by-one — are exactly why this rule exists.)
2. Before quoting any computed value, run the calculator (`/cast`, or the relevant
   `.claude/calc/*.js`) and cite its output.
3. The calculators are validated against the oracle in `.claude/canon/canon.md`
   ("VALIDATION ORACLE") and the reference charts. If a calc output disagrees
   with the oracle, **the calc is wrong** — fix it and re-run its tests; never paper
   over the gap in prose.
4. Report each calculator's validation status (per the engine's public-validation suite and
   the per-instance canon-consistency test): **bazi** = oracle-validated (pillars, 大运, 命宫
   locked across multiple reference charts); **ziwei** = engine-validated against the owner's
   reference oracle; **qimen** = oracle-validated, 门 reconciled (开门 = 值使门); **吠陀 Vedic**
   = validated against the owner's Jagannatha Hora chart (grahas/lagna/nakshatra/pada/D9 exact,
   Vimśottari ±2d) + JPL-Horizons longitude anchors. Residuals: qimen uses 拆补法; Vedic
   ayanāṃśa is a linear Lahiri model (few-arcmin) and the node is osculating (~0.7').

## MUST NOT
1. Never present a mentally-derived chart value as fact.
2. Never edit a calculator without re-running its test suite to green.

# Destiny & Decision Advisory — Methodology

## Scope
All 命理 (bazi / ziwei / qimen / **吠陀 Vedic**) and life/decision advisory in this repository.

## MUST
0. **TRIANGULATE ALL FOUR METHODS — HARD RULE.** Every reading, advice, or
   recommendation MUST synthesize **all four** systems — 八字 (bazi) · 紫微斗数 (ziwei) ·
   奇门 (qimen) · 吠陀 (Vedic/Jyotish) — never just one or two. Cast each via `.claude/calc/`
   (`cast.mjs` runs all four), state explicitly where they **agree** (→ high confidence),
   where they **diverge** (→ flag, do not paper over, resolve by low-regret), and never
   present a single-system read as "the answer." A reading that consulted only 1–2 systems
   is INCOMPLETE and must not be delivered.
1. **ALWAYS red-team AND vet before delivery — HARD RULE.** Run the adversarial pass
   (`destiny-redteamer` / `/redteam`) and the verification pass (`/vet`: re-derive every
   quoted value from `.claude/calc/`, trace every fact) to convergence. No reading ships
   unconverged.
2. **Symmetric red-team.** Scrutinise both sides of any claim equally. Never inflate
   the favoured reading. Every flattering narrative gets an adversarial pass.
3. **Falsifiability first.** Prefer tests where the competing hypotheses make opposite,
   checkable predictions. A claim that fits any outcome proves nothing.
4. **No retrodiction.** Never read a known outcome back into the chart and call it
   confirmation.
5. **Separate argument classes.** Keep convention/astronomy arguments (timezone,
   true-solar) apart from event-fit arguments; never sum them as if independent.
6. **A/B discipline.** Where the canon records an hour ambiguity, the **working-default hour**
   is the most-likely chart and the **hedge hour** is the lower-probability alternative — never
   silently collapse them. For hour-dependent reads that are material AND consequential, surface
   the hedge-hour alternative. Decision rule for genuine forks: (a) bazi first (hour-independent
   core); (b) ziwei where the two hours agree; (c) genuine conflict → low-regret / minimax,
   weighted by track record. See the A/B status in `.claude/canon/canon.md`.
7. **Calculators, not mental math.** All chart values come from `.claude/calc/`
   (bazi.js · ziwei.js · qimen.js · **vedic.js**; see `rules/calc-authority.md`). Cite the output.
8. **Vedic conventions (吠陀).** Sidereal, **Lahiri (Chitrapaksha) ayanāṃśa**; **raw clock → UT**
   (NO true-solar hour, unlike the bazi pillar — so the A/B hour fork does not apply to the
   Vedic planets the same way; the *ascendant* is still time-sensitive). Rahu/Ketu = **true
   (osculating) node**. Vimśottari daśā (Moon-driven) is the primary Vedic timing layer and
   MUST be cross-checked against the bazi 大运/流年 spine (canon §13).
9. **Plain language, calibrated confidence.** Lead with the answer; flag uncertainty
   honestly with a probability or confidence band; never present metaphysics as fact.

## MUST NOT
1. Never silently collapse A/B to one chart.
2. Never present a mentally-derived chart value as fact.
3. Never let a flattering narrative survive without an adversarial pass.
4. **Never deliver a reading/advice built on fewer than all four systems** (bazi+ziwei+qimen+vedic),
   or one that has not been red-teamed AND vetted to convergence.

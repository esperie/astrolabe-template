---
description: Decision support for a live choice (venture, contract, timing, relationship) — 命理 + strategy → one low-regret recommendation.
argument-hint: "<the decision you're weighing>"
---

Decision to advise on: **$ARGUMENTS**

**HARD RULE (`rules/destiny-advisory.md` §0–1):** triangulate **all four systems** — never 1–2 — and **redteam + vet to convergence** before delivering.

Use **decision-advisor** (reads `.claude/canon/canon.md`, casts via `.claude/calc/`). The main agent routes chart specifics to **all four analysts** (bazi / ziwei / qimen / vedic) and the draft to **destiny-redteamer** + a `/vet` pass. Apply the four-system decision rule:

0. **Cast all four** (`cast.mjs`); build from where bazi+ziwei+qimen+吠陀 **converge**, flag divergences.
1. Bazi first (hour-independent: the owner's 用神/喜忌 and the timing spine from the canon).
2. Ziwei where A & B agree (`cast.mjs --both` for forks).
3. Qimen for the situational snapshot; **Vedic Vimśottari daśā** for long-wave timing (the current MD/AD — should corroborate the spine).
4. Genuine fork → low-regret / minimax, weighted by the owner's track record and the recurring patterns and red lines recorded in the canon.

Output: ONE recommendation → four-system + strategic rationale (state convergence/divergence) → the low-regret hedge → the tripwires that flip it. Then redteam + vet. Never fence-sit; never hand-compute.

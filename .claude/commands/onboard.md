---
description: First-run onboarding — collect the owner's birth data, cast all four systems, generate the protected canon + per-person consistency test, then author the analytical sections and validate to convergence.
---

# /onboard — set up this Astrolabe instance

You are setting up a NEW instance for its owner. The deterministic chart comes from the
calculators; the analytical sections (用神 / spine / red lines) require your judgment via the
analysts — **never fabricate them**. Work to convergence: nothing is "live" until eval PASSES and
the canon is red-teamed.

## 1. Collect birth data (ask the owner; confirm each)
- **Full name**, **birth date** (YYYY-MM-DD), **exact clock time** (HH:MM — ask for the most precise
  source; flag if approximate), **birthplace** → resolve to **latitude, longitude, timezone offset**
  (UTC+H at birth — mind historical tz/DST), and **gender** (for 大运 direction + 本命卦).
- If the exact time is uncertain or near a 时辰 boundary, note it — the generator flags an A/B fork.
- Birthplace is REQUIRED for the Vedic ascendant; without lat/lon the Vedic lagna/daśā are provisional.

## 2. Generate the factual canon (deterministic)
Run the generator (fill the collected values):
```
node .claude/bin/onboard.mjs --name "<Full Name>" --date <YYYY-MM-DD> --time <HH:MM> \
     --tz <H> --lon <E.long> --lat <N.lat> --gender <male|female>
```
It casts all four systems, writes `.claude/canon/canon.md` (computed §1,2,5,6,7,8,13 + scaffolded
§3,4,9,10) and `.claude/calc/canon-consistency.test.mjs`, and runs eval. Confirm it prints PASS.
(Use `--dry-run` first to preview; `--force` only to regenerate.)

## 3. Author the analytical sections (analyst judgment — to convergence)
The §4/§9/§10 blocks are `⏳ AWAITING ANALYSIS`. Author them properly:
- **§4 用神** — delegate to **bazi-analyst**: 身强/身弱, 调候, favourable vs 忌 elements, with reasoning.
- **§3 A/B** (if a fork was flagged) — bazi-analyst: assess P(A) vs P(B); set the working default; keep the hedge.
- **§9 timing spine** + cross-check vs the Vedic Vimśottari daśā — **decision-advisor**.
- **§10 strategic red lines** — decision-advisor, from the owner's `docs/` + interview (personal).
Triangulate ALL FOUR systems; state agreement/divergence honestly (`rules/destiny-advisory.md` §0).

## 4. Commit the analysis into the protected canon (the ceremony)
Amend the canon (incl. updating the GUARDRAILS block's 用神/spine lines) ONLY via the sanctioned tool:
```
node .claude/bin/canon-amend.mjs --reason "onboarding: author 用神/spine/red-lines" --by "<approver>" --edits <edits.json>
```
(`rules/canon-protection.md`.) Never hand-edit the canon.

## 5. Converge
- `node .claude/calc/eval.mjs` → **PASS** (canon-consistency now locks this chart).
- Run **destiny-redteamer** on the canon (confirmation bias, retrodiction, A/B over-collapse, any
  hand-computed value). Fix to convergence.
- Seed `.claude/skills/01-personal-profile/SKILL.md` and `docs/00-anchor/` from the owner's info.
- State the convergence verdict. The instance is now live.

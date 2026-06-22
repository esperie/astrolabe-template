---
name: destiny-systems
description: How to read the instance owner's 八字 / 紫微斗数 / 奇门遁甲 / 吠陀 Vedic — where the chart facts live, the 用神 model, the A/B hour question, the Vimśottari daśā, and how to drive the deterministic calculators. Use for any 命理 / destiny / fortune / 流年 / 大运 / daśā question.
---

# Destiny Systems — Reading Reference

The authoritative facts live in `.claude/canon/canon.md` (hook-protected). All chart math comes from `.claude/calc/` — **never hand-compute** (`rules/calc-authority.md`).

> **HARD RULE (`rules/destiny-advisory.md` §0):** every reading/advice **triangulates all four
> systems — 八字 + 紫微 + 奇门 + 吠陀 Vedic** — never just 1–2. State agreements (high confidence)
> and divergences (flag, low-regret). **Always `/redteam` AND `/vet` to convergence before delivery.**

## Quick cast
`node .claude/calc/cast.mjs` → full 八字 + 紫微 + 奇门 + 吠陀 for the owner (uses the canon's birth data). `--both` adds the hedge-hour charts; pass an explicit `YYYY-MM-DD HH:MM tz lon gender` to cast anyone.

## The chart
All of the owner's chart facts — pillars, 日主/月令, 用神/喜忌, 神煞, 大运 sequence, the 紫微 placements and 四化, the 奇门 命局, and the 吠陀 Vedic chart (Lagna, grahas, karakas, Vimśottarī daśā) — live in **`.claude/canon/canon.md`** (hook-protected). Read them there at runtime; they are per-person and are NOT hardcoded here. Cite calculator output for any computed value.

When reading: lead with the owner's **用神/喜忌** (map every 流年/大运 干支 → 十神 → favorable/unfavorable per that model), read 七杀 / other 十神 as wieldable vs. consuming, and anchor strategic reads to the **timing spine** recorded in the canon.

## The A/B hour (read the canon's A/B section)
Where the canon records an hour ambiguity, it names a **working-default hour** (the most-likely chart, typically true-solar-adjusted) and a lower-probability **hedge hour** (e.g. a raw-clock convention) — these can land the chart in a different 五行局 / 命宫. **Never silently collapse the two**; dual-track (`--both`) where the hour is material and consequential. Read the exact probabilities and conditions from the canon.

## The timing spine (hour-independent)
The owner's multi-year timing spine (which years are ship/lock vs. defend vs. scale, and why) is recorded in the canon. Note which findings are hour-independent (hold for both A and B) versus hour-dependent.

## Agents
`bazi-analyst` · `ziwei-analyst` · `qimen-analyst` · `vedic-analyst` (cast + interpret — use **all four**); `decision-advisor` (synthesizes the four into one low-regret call); `destiny-redteamer` (adversarial pass before delivery). Main-agent orchestration: cast all four (`cast.mjs`), route to each analyst, synthesize via decision-advisor, then redteam + vet.

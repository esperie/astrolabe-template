# Astrolabe — Personal Knowledge Base & Four-System Destiny Advisory

> _"An instrument for reading a life."_

This is an **Astrolabe instance** — a private, personal knowledge base paired with a
deterministic, oracle-validated four-system 命理 (Chinese + Vedic) decision-advisory engine,
governed by Cognitive-Orchestration (COC) anti-drift machinery.

**This is NOT a software project.** It holds minimal code (the calculators, hooks, tools). The
work is knowledge management, life/decision advisory, and personal strategy — for **one person**
(the instance owner). Replace this paragraph and `docs/` with your own during onboarding.

> **New here? Run `/onboard`** (or `node .claude/bin/onboard.mjs`) — it collects your birth data,
> casts all four systems, writes your protected `canon`, and validates. Nothing below works until
> your canon exists.

## Absolute Directives

1. **Accuracy over impressiveness.** Every claim in generated output MUST trace to a source in
   `docs/` or the canon. Never fabricate. Flag unverifiable claims `[UNVERIFIED]`.
2. **Plain language by default.** Lead with the answer; match the owner's level.
3. **Privacy.** This repo holds birth data and personal details — keep it **private**. Never expose
   to public tools or services.
4. **Chart math is ALWAYS the calculators.** Never hand-compute pillars, stars, 大运, 局数, 节气,
   or daśā (`rules/calc-authority.md`).

## Destiny & Decision Advisory (the universal core)

All chart math is deterministic code (`rules/calc-authority.md`).

> **HARD RULE (`rules/destiny-advisory.md` §0–1):** every reading/advice **triangulates all four
> systems** — 八字 (bazi) · 紫微斗数 (ziwei) · 奇门 (qimen) · 吠陀 (Vedic) — never just 1–2 — and is
> **always red-teamed AND vetted to convergence** before delivery. The main agent orchestrates:
> `cast.mjs` (all four) → the four analysts → `decision-advisor` → `destiny-redteamer` + `/vet`.

### Protected canon
`.claude/canon/canon.md` is the hook-protected source of truth (birth data, oracle-validated
pillars, the A/B hour status, 用神, 大运, the timing spine, methodology) and the calculators'
validation oracle. Amend only via the ceremony in `rules/canon-protection.md`
(`node .claude/bin/canon-amend.mjs …`). `canon-guard.js` + `settings.permissions.deny` block
silent edits; `inject-canon.js` injects the guardrails every turn.

### Calculators (`.claude/calc/`) — validated vs professional 命理 reports, Jagannatha Hora & JPL Horizons
| File | Covers | Tests |
|---|---|---|
| `astro.js` | Julian day, Meeus 日躔/节气, 真太阳时, 新月 | — |
| `bazi.js` | 四柱, 大运, 藏干/十神/纳音, 神煞, 胎元, 命宫, 本命卦, 月柱 | bazi · cross-validate |
| `lunar.js` | 农历转换 (置闰/中气) | (via ziwei) |
| `ziwei.js` | 命/身宫, 五行局, 紫微+14主星, 四化, 副星, 大限 | ziwei |
| `qimen.js` | 定局, 转盘, 值符/值使, 八门/八神, 命局宫 | qimen |
| `vedic.js` | VSOP87/Moon ephemeris, Lahiri 黄道, 宫/星/nakshatra/pada, vargas, karakas, Vimśottari | vedic |

Run `node .claude/calc/cast.mjs` for the full chart; `node .claude/calc/eval.mjs` to validate the
whole gate (VERDICT PASS); `node .claude/calc/*.test.mjs` for individual suites.

### Commands
`/onboard` (first run) · `/cast` (any date, all four) · `/chart` (canon + consistency guard) ·
`/year` (流年) · `/decision` (live choice) · `/qimen` · `/vedic` · `/destiny-redteam`.

## Workspace methodology

| Command | Phase | Purpose |
|---|---|---|
| `/start` | 00 | Load context, surface state, set the plan |
| `/analyze` | 01 | Research and validate an initiative |
| `/todos` | 02 | Create roadmap; stops for approval |
| `/implement` | 03 | Execute one task at a time |
| `/redteam` · `/vet` | 04 | Adversarial stress-test / verify to convergence |
| `/codify` | 05 | Capture knowledge for future sessions |
| `/ws` · `/sweep` · `/wrapup` | — | Status · outstanding-work audit · save-and-close |

## Rules Index
`calc-authority` · `canon-protection` · `destiny-advisory` · `redteam-mandatory` ·
`communication` · `agents` · `git` · `no-stubs` · `security` · `learned-instincts` (auto).

## Agents
**Destiny:** bazi/ziwei/qimen/vedic-analyst · decision-advisor · destiny-redteamer.
**Review & analysis:** intermediate-reviewer · security-reviewer · requirements-analyst · deep-analyst.
**Management:** todo-manager · gh-manager.

## Skills
`01-personal-profile` (yours — fill in) · `03-destiny-systems` · `04-decision-method`.

## Framework updates
This instance receives framework updates from the Astrolabe **template** via the sync tool
(`node .claude/bin/sync.mjs`). Your personal files (canon, docs, profile, learning, workspaces)
are **never** overwritten by a sync. See `.claude/SYNC-LOG.md` for history.

## Knowledge Base Structure (`docs/`)
Organize as you like. A common layout: `00-anchor/` (identity & vision) · `01-…/` per life domain.
Onboarding seeds a minimal skeleton.

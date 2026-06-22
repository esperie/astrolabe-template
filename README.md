# Astrolabe (template)

_An instrument for reading a life._

A private, personal **knowledge base** + a deterministic, oracle-validated **four-system 命理
advisory engine** (八字 bazi · 紫微斗数 ziwei · 奇门 qimen · 吠陀 Vedic), wrapped in
Cognitive-Orchestration anti-drift governance (a hook-protected canon, an eval-harness gate, and a
red-team-to-convergence mandate).

This is the **template** — the framework source of truth. Each person clones it into their own
private instance and runs onboarding.

> **New here? Start with [INTRODUCTION.md](INTRODUCTION.md)** — a plain-language guide for readers
> who've never met these systems: what the four are, the philosophy that makes this different from
> fortune-telling, what it's useful for, how a reading works, **how to set it up and run it inside
> Claude Code (desktop)**, and when to use `high` vs `xhigh` vs `ultracode`. The quick start below
> assumes you already know what you're looking at.

## Quick start

```bash
# 1. clone this template into your own private instance
cp -r template ~/my-astrolabe && cd ~/my-astrolabe && git init

# 2. onboard — collects birth data, casts all four systems, writes your canon, validates
#    (in Claude Code:)  /onboard
node .claude/bin/onboard.mjs

# 3. confirm the gate is green
node .claude/calc/eval.mjs        # → VERDICT: PASS

# 4. read your chart
node .claude/calc/cast.mjs
```

## What you get

- **Four validated calculators** (`.claude/calc/`) — chart math is deterministic code, never hand-computed.
- **A protected canon** (`.claude/canon/canon.md`) — your birth data + oracle-verified chart facts,
  guarded against silent drift by `canon-guard.js`, injected into every turn by `inject-canon.js`,
  amended only through an audited ceremony.
- **An eval-harness gate** (`.claude/calc/eval.mjs`) — runs every test suite, fails on drift.
- **Destiny analysts + a decision-advisor + a red-teamer**, and a workspace methodology
  (`/start /analyze /todos /implement /redteam /vet /codify`).

## Updating an instance

Framework improvements are made in the template and rolled out:

```bash
node .claude/bin/sync.mjs ~/my-astrolabe          # additive; never touches your personal files
node .claude/bin/sync.mjs ~/my-astrolabe --dry-run # preview
node .claude/bin/sync.mjs ~/my-astrolabe --check   # report drift only
```

## Privacy

Instances hold birth data and personal details. **Keep them private.** Do not push to public
remotes. See `.claude/rules/security.md`.

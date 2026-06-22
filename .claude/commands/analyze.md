---
description: Phase 01 — research and validate a project/initiative for the current workspace.
argument-hint: "[project name]"
---

## Workspace resolution
1. If **$ARGUMENTS** names a project, use `workspaces/$ARGUMENTS/`; else the most-recently-modified dir under `workspaces/` (excluding `_template`). If none exists, offer to create one from `workspaces/_template/`.
2. Read `workspaces/<project>/briefs/` first — that's the user's input surface.

## Do
- Load the relevant KB: `skills/01-personal-profile`, `skills/02-standards-reference`, and the relevant `docs/` (00-anchor positioning/IP, career, standards, clients…). For 命理/decision work, read `.claude/canon/canon.md` and drive the calculators.
- Research thoroughly; document in `workspaces/<project>/01-analysis/` (sequential `01-`, `02-` files). Distill the **thesis, audience, value proposition, and the evidence base**.
- **Accuracy first** — every claim traces to a `docs/` source or is flagged `[UNVERIFIED]`; never fabricate or inflate (`rules/branding.md`).
- Delegate: **deep-analyst** (research/positioning), **requirements-analyst** (breakdown).

## Gate (mandatory)
Red-team the analysis **to convergence** (`/redteam`): gaps, unsourced claims, weak positioning, first-principles soundness. State the convergence verdict before reporting `/analyze` complete (`rules/redteam-mandatory.md`). Next: `/todos`.

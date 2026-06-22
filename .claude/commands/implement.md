---
description: Phase 03 — execute ONE approved roadmap task at a time, vetting each to convergence. Repeat.
argument-hint: "[project name or specific task]"
---

## Workspace resolution
Resolve the project as in `/analyze`; read `02-plans/` + `todos/`.

## Do — one task at a time
1. Pick the next **approved** task; mark it in_progress.
2. Execute it. For content (CV/bio/pitch/deck): generate from the KB via the right skill/agent (**branding-strategist**, **content-strategist**), every claim source-traced, into `workspaces/<project>/outputs/`. For 命理: calculators only (`.claude/calc/`), never hand-math.
3. **Vet to convergence** (`/vet`): tests green (if code), claims sourced, nothing fabricated, no canon contradiction → fix → re-vet until clean. (The `vet-gate` Stop hook enforces this.)
4. Delegate review: **intermediate-reviewer**; **security-reviewer** before anything containing personal/client data.
5. Mark complete; move to the next task. **One task at a time — do not batch.**

When the roadmap is done: `/codify`, then `/wrapup`.

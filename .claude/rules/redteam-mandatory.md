# Red-Team / Vet to Convergence — Mandatory

## Scope
Every **substantive step** in this repository: code/calculator changes, canon or `docs/`
edits, generated content (CV / bio / pitch / deck), chart readings, and any
decision or recommendation.

## MUST
1. **No substantive step is "done" until it has been vetted or red-teamed to
   CONVERGENCE** — an adversarial/verification pass that yields NO new critical or
   major findings.
2. **Convergence is iterative.** Run `/vet` (or `/redteam` for substantial/adversarial
   work) → fix every must-fix → re-run → repeat until a round is clean. One pass that
   found must-fixes is NOT convergence — keep going.
3. **Verification is concrete, not vibes:**
   - code/calculators → tests MUST be green (re-run them);
   - chart values → re-derive from `.claude/calc/` (never hand-math);
   - factual claims → trace to a source in `docs/` or flag `[UNVERIFIED]`;
   - canon → no contradiction with the validated calculators.
4. **State the convergence verdict explicitly** (what was checked · residuals) before
   declaring the step complete or wrapping up.
5. The **`vet-gate.js` Stop hook enforces this**: a turn that made substantive changes
   without a verification/redteam pass is blocked from finishing.

## MUST NOT
1. Never declare a step done — or `/wrapup` a session — with failing tests, an
   unverified claim, or an unconverged finding.
2. Never present hand-computed chart values or unsourced facts as verified.

> The gate is satisfiable in-turn: run the tests / `/vet` / `/redteam` and state the
> result. It exists to make "I'll verify later" impossible, not to obstruct real work.

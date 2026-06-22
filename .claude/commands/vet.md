---
description: Verify the current work — run tests, re-derive every quoted chart value from the calculators, confirm every claim is sourced. The fast quality-gate before stopping.
argument-hint: "[what to vet — defaults to the work just done]"
---

Vet: **$ARGUMENTS** (if blank, the work just done).

Verification pass (not adversarial — that's `/redteam`):
1. **Tests** — run the eval harness: **`node .claude/calc/eval.mjs`** (one command: runs every `*.test.mjs` across calc+hooks, checks each against its expected count = catches silent drift, reports oracle + residuals, exits non-zero on any failure). **Verdict must be PASS** — any FAIL/DRIFT/CRASH blocks; fix and re-vet.
2. **Chart values** — re-derive every quoted pillar/star/大运/局 from `.claude/calc/` (never trust hand-math); cite the calculator output.
3. **Claims** — every factual statement traces to a `docs/` source; flag `[UNVERIFIED]` otherwise.
4. **Hygiene** — no stubs/placeholders, no canon contradiction, no fabricated/inflated credentials, private data not exposed.

Output: a **PASS/FAIL per check + the overall gate verdict**. If anything fails, fix and re-vet **to convergence**. If the work is substantial or needs adversarial scrutiny, escalate to **`/redteam`**. (`rules/redteam-mandatory.md`)

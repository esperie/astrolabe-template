---
description: Adversarially stress-test the current work TO CONVERGENCE — break it, find confirmation bias, edge/boundary cases, security holes, unverified or hand-computed claims. Repeat until a clean round.
argument-hint: "[what to red-team — defaults to the work just done]"
---

Red-team to **convergence**: **$ARGUMENTS** (if blank, the work just done).

Default to doubt — try to make it fail. Attack each applicable dimension:
- **Correctness / bugs** and **edge & boundary cases** (off-by-one, empty, extreme, leap/seam/center cases).
- **Security / bypass** for any hook or guard (try real exploit vectors, not theory).
- **Confirmation bias / retrodiction** for any 命理 reading; **convention vs event-fit**; A/B over-collapse.
- **Unverified / hand-computed values** — re-run `.claude/calc/` and the test suites; a mismatch means the work is wrong.
- **Source-traceability** — every factual claim maps to a `docs/` source or is `[UNVERIFIED]`.

Method: review directly, and/or spawn reviewers — **destiny-redteamer** for chart work, or independent reviewers for code/content. For substantial work, use the **Workflow** tool (multiple independent reviewers + synthesis) **if the user has opted in**; otherwise review inline.

Output per finding: **severity · issue · fix**. Then **APPLY the must-fixes, re-run, and REPEAT** until a round yields no new critical/major findings. State the **convergence verdict** and any residuals. This satisfies the mandate (`rules/redteam-mandatory.md`).

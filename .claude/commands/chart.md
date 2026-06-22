---
description: Show the owner's canonical chart (working-default hour) and confirm the calculators still reproduce the canon (consistency guard).
---

Canon consistency guard (calculators vs `.claude/canon/canon.md`):

!`node "$CLAUDE_PROJECT_DIR/.claude/calc/canon-consistency.test.mjs"`

Full canonical chart:

!`node "$CLAUDE_PROJECT_DIR/.claude/calc/cast.mjs"`

Summarise the headline facts (pillars, 用神/喜忌, the current 大运, the timing spine, A/B status) — all read from the canon — in a few plain lines. If the consistency guard above shows any FAIL, STOP and flag it — a calculator has drifted from the canon and must be fixed before any reading.

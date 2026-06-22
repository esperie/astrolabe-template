---
description: Cast 八字 + 紫微 + 奇门 + 吠陀 Vedic for a date (defaults to the owner's canon chart). Deterministic — runs the validated calculators.
argument-hint: "[YYYY-MM-DD HH:MM tz lon gender] [--both] [--clock]"
---

Chart cast (deterministic calculators, never hand-computed):

!`node "$CLAUDE_PROJECT_DIR/.claude/calc/cast.mjs" $ARGUMENTS`

Now read `.claude/canon/canon.md` and give a brief, plain-language interpretation anchored on the owner's **用神/喜忌** and timing spine (both recorded in the canon). Cite values from the cast above — do not recompute. The canon's **working-default hour** is the default; mention the hedge-hour alternative only where the hour pillar is material and consequential to the question.

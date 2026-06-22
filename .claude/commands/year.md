---
description: 流年 (annual) analysis for a given year — four-system (bazi + ziwei + qimen + 吠陀 Vedic daśā). Defaults to the current year.
argument-hint: "[year]"
---

Produce a 流年 analysis for **$ARGUMENTS** (if blank, use the current year) for the instance owner.

1. Read `.claude/canon/canon.md`.
2. Compute the year's 干支 and the 流年/流月 picture from the calculators (`.claude/calc/`). Delegate to **all four** analysts — **bazi / ziwei / qimen / vedic** — for the chart specifics (run calculators, never hand-compute). For Vedic, locate the year within the Vimśottari daśā (current MD; which AD/PD covers the year).
3. Interpret strictly via the owner's **用神/喜忌** and the canon spine (both from `.claude/canon/canon.md`); triangulate the four — state where they converge/diverge. Foreground any defend/risk years flagged in the canon, and note which findings are hour-independent.
4. Route the draft to **destiny-redteamer** AND run `/vet` before finalizing (HARD RULE: redteam + vet to convergence).

Plain language, calibrated confidence, ONE clear read with tripwires.

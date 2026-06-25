---
description: "Comprehensive outstanding-work audit for this Astrolabe instance — workspaces, GH issues, convergence gaps, canon/calc integrity, framework-rollout drift, privacy, and process hygiene. End-of-cycle gate before /wrapup."
---

## Purpose

A `/sweep` is the structural defense against "I think we're done." Before declaring a session
converged or wrapping up, surface every class of outstanding item: in-flight workspace work, open
GH issues, unconverged deliverables, canon/calculator drift, framework-rollout drift, privacy leaks,
and process hygiene.

Distinct from `/redteam` (adversarially breaks ONE deliverable to convergence) and `/vet` (the fast
tests + claim-check gate): `/sweep` is **instance-wide** and rolls every workspace and every
cross-repo surface into one report. Adapted from the loom `/sweep` to this framework's artifacts.

**Instance-scoped** — audits the CURRENT instance repo (and its rollout relationship to template +
sibling instances). It does NOT do per-person readings or edit sibling instances.

## Execution model

Autonomous — runs every sweep, accumulates findings into one report. The agent MAY fix trivial gaps
inline (`rules/redteam-mandatory.md` + "if you found it, you own it") but MUST surface every finding
with a disposition: **FIX-NOW** / **FILE-ISSUE** / **DEFER-WITH-REASON** / **FALSE-POSITIVE**. The
report is the deliverable; the agent does NOT decide the next session's scope — that is a human call.

## Workflow

Run all 8 sweeps. Aggregate into one report with severity (CRIT / HIGH / MED / LOW), disposition, and
a pointer (file:line, issue#, PR#). Chart values cited in any finding MUST be re-derived from
`.claude/calc/` — never hand-computed (`rules/calc-authority.md`).

### Sweep 1: Active workspace work
```bash
ls -d workspaces/*/ 2>/dev/null
grep -rln '⬜\|🟡\|TODO\|TBD\|DRAFT\|\[ \]' workspaces/ 2>/dev/null | head -40
```
Surface open checklist items (e.g. ⬜/🟡 rows), in-progress drafts, and any workspace whose state is
stale (no edit >30d). Classify each open item: **still-wanted** (re-queue with a value reason),
**abandon** (recommend closure, surface to the user — never auto-close), or **deferred** (alive,
lower priority, with a reason). Items with no rationale → flag "needs a value-anchor from the user."

### Sweep 2: GitHub open issues — current repo
```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) && \
  gh issue list --repo "$REPO" --state open --limit 50 --json number,title,labels,updatedAt
```
If the repo has no remote (`gh` errors), record "N/A — no GitHub remote" and move on. Categorize:
closeable (delivered), genuinely actionable, deferred (with a reason). Age alone is NOT a closure
reason.

### Sweep 3: Open PRs and stale branches
```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) && \
  gh pr list --repo "$REPO" --state open --limit 50 --json number,title,isDraft,statusCheckRollup
git branch -r --no-merged origin/main 2>/dev/null | grep -v 'HEAD ->'
```
Surface: draft PRs >7d, any PR with red CI (never merge red), remote branches without a PR (orphan
work), local-only branches. N/A if no remote.

### Sweep 4: Convergence gate — the eval harness + unconverged deliverables
```bash
node .claude/calc/eval.mjs        # the deterministic gate: MUST be PASS (all suites green)
```
This is the BUILD-mode analog of a spec-redteam sweep. (a) The eval harness MUST be green — any red
suite is a CRIT. (b) Then scan this session's substantive deliverables (readings, CV/bio/pitch, canon
or docs edits, calculator changes) and flag any that have NOT been red-teamed AND vetted to
convergence (`rules/redteam-mandatory.md` — every substantive step needs a stated convergence verdict;
a chart reading needs all four systems triangulated + a `destiny-redteamer`/`/vet` pass).

### Sweep 5: Canon & calculator integrity
```bash
node .claude/calc/canon-consistency.test.mjs    # canon ↔ calculators agree (per-person oracle)
```
Confirm: the canon-consistency test is green (the calculators still reproduce the canon's locked
facts); the protection hooks are intact (`hooks/canon-guard.js` + `hooks/inject-canon.js` present and
referenced in `settings.json`); no quoted chart value in any workspace deliverable disagrees with a
fresh `.claude/calc/` derivation (`rules/calc-authority.md`, `rules/canon-protection.md`). Any
canon↔calc contradiction is a CRIT — fix the calc/canon, never paper over it in prose.

### Sweep 6: Framework-rollout drift (develop → promote → fan-out)
```bash
# from the dev instance; T = the template path (../template by convention)
node ../template/.claude/bin/promote.mjs "$(pwd)" --check    # up-drift: instance ahead of template?
node ../template/.claude/bin/sync.mjs    "$(pwd)" --check    # down-drift: template ahead of instance?
```
Per `rules/framework-rollout.md`: surface any framework file that differs between this instance and
template (pick ONE editing site + reconcile), any NEW framework file not yet declared in
`sync-manifest.json` (invisible to promote until declared), and any instance whose `eval.mjs` is not
PASS. A clean instance reports "no drift" both directions. (Sibling instances are audited by running
their own `/sweep`, not from here.)

### Sweep 7: Cross-repo privacy / de-personalization
```bash
# owner/personal tokens MUST NOT appear in any framework file bound for the PUBLIC template
git -C ../template grep -nIE '<owner-name>|<birth-date>|<birth-coords>|<client/IP terms>' 2>/dev/null
```
Per `rules/security.md` + the promote de-personalization gate: scan anything public-bound (the
template) or shared for owner PII (name, birth data/coords), client names, IP/product terms, or
sibling-instance data. Pull the exact tokens from `.claude/calc/birth.json` + `.claude/bin/promote-deny.json`.
Any hit in a framework file is a CRIT (report file:line, NOT the value). The token-scan misses
prose/docstrings — also eyeball recently-promoted files.

### Sweep 8: Process hygiene
```bash
git status --short                                  # uncommitted work
git rev-list --left-right --count origin/main...HEAD 2>/dev/null   # ahead/behind origin
grep -rEn 'TODO|FIXME|TBD|\[INSERT|Coming soon' --include='*.js' --include='*.mjs' --include='*.md' \
  --exclude-dir=node_modules .claude/ docs/ 2>/dev/null | head -20   # stub markers (rules/no-stubs.md)
git worktree list                                   # orphan worktrees (e.g. stray model-bench)
```
Surface: uncommitted changes, branch ahead/behind origin (commit/push per `rules/git.md`), new
stub/placeholder markers in production paths (BLOCKED per `rules/no-stubs.md`), orphan worktrees,
`.session-notes` >30d.

## Output

Write findings to `SWEEP-<date>.md` at the repo root (or `workspaces/<project>/04-validate/sweep-<date>.md`
when a workspace is active). Each finding: `[SEVERITY] [Sweep N] <title>` + Location + Disposition +
Evidence + Why-this-matters + Action-taken (if FIX-NOW, with commit SHA). End with cross-cutting
observations and 2–5 ranked recommended next-session items.

## Closure

Before reporting `/sweep` complete:
1. ALL Sweep 1–8 outputs accumulated.
2. Trivial fixes applied inline and reclassified `FIXED` with a commit SHA.
3. Non-trivial fixes filed as workspace todos OR GH issues with delivered-code references.
4. Report committed.
5. Optional: human authorization for the recommended next-session scope.

The report is the deliverable. Run `/sweep` BEFORE `/wrapup` — wrapup assumes the sweep is clean.

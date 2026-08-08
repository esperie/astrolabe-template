# Multi-CLI Lanes (Claude Code · Codex · Gemini)

## Scope
Running this Astrolabe instance under a CLI other than Claude Code, and changing any
artifact that feeds the emitted `AGENTS.md` / `GEMINI.md` / `.codex/` / `.gemini/` lanes.

## The model
`.claude/` is the **single authoring site**. `node .claude/bin/emit-cli-artifacts.mjs`
derives the Codex and Gemini lanes from it. The emitted trees are committed so a fresh
clone is multi-CLI without a build step and drift is visible in review.

| Source (authored) | Emitted (generated — never hand-edit) |
|---|---|
| `CLAUDE.md` + `rules/*.md` | `AGENTS.md`, `GEMINI.md` (rules **inlined** — neither CLI has a per-rule loader) |
| `settings.json` hooks | `.codex/hooks.json`, `.gemini/settings.json` |
| `commands/*.md` | `.codex/prompts/*.md`, `.gemini/commands/*.toml` |
| `skills/<n>/SKILL.md` | `.codex/skills/<n>/`, `.gemini/skills/<n>/` |
| `agents/**.md` | `.gemini/agents/*.md` (tool names translated) |

## Enforcement reality — MEASURED, not assumed (2026-08-08)

Canon protection and the convergence gate have **different strength on each lane**. This
table is the product of live probes, not vendor documentation. Treat it as the truth and
**re-measure after any CLI upgrade** — do not upgrade the claims from reading a changelog.

| Lane | Context (soft) | Hook enforcement (hard) | Net canon protection |
|---|---|---|---|
| **Claude Code** | `CLAUDE.md` | ✅ live — `settings.json` + `canon-guard.js` | **Write-time, airtight** |
| **Codex 0.147** | ✅ verified live — model loaded `AGENTS.md` and refused a canon write unprompted | ❌ **hooks not supported** — an instrumented probe was never invoked, repo-local *and* user-global (`CODEX_HOME`), while the shell command itself ran | **Soft + commit-time** |
| **Gemini 0.41.2** | ⚠️ unverified — account returns `IneligibleTierError` | ⚠️ unverified live; adapter translation covered by subprocess tests | **Commit-time (assume soft only)** |

`.codex/hooks.json` is emitted for **forward-compatibility only**. Its presence is not
evidence of enforcement. If a Codex release starts honoring it, the lane becomes hard with
no edits — the wiring is already correct and tested.

## MUST
1. **Never hand-edit an emitted artifact.** Change the `.claude/` source and re-run the
   emitter. `emit-cli-artifacts.mjs --check` fails on drift and runs in `eval.mjs`.
2. **Treat `.githooks/pre-commit` as the load-bearing cross-lane guard.** It is the only
   canon protection that holds regardless of CLI, editor, or tool — because git is the one
   chokepoint every lane shares. Install it with
   `node .claude/bin/install-git-guard.mjs` (sets `core.hooksPath=.githooks`). A clone
   without it has **no** canon protection outside Claude Code.
3. **Keep `project_doc_max_bytes = 65536` in `.codex/config.toml`.** `AGENTS.md` carries the
   inlined rules and exceeds Codex's 32,768-byte default; without the raise Codex silently
   **truncates the governance rules**, including canon-protection and the convergence
   mandate. This value is load-bearing.
4. **Re-measure after a CLI upgrade.** Re-run the lane probes and update the table above.
   Vendor docs have been wrong in both directions here: Codex dropped repo-local
   `.codex/prompts/` discovery (0.128+) and does not honor `hooks.json` at 0.147.
5. **State the lane's protection tier** when advising on work that will run outside Claude
   Code — never imply canon is write-time protected on Codex or Gemini.

## MUST NOT
1. Never claim a lane is enforced because its config file exists. Only a live probe
   (`hook actually invoked`) or a passing subprocess test counts as evidence.
2. Never weaken `lane-adapter.js`'s fail-closed posture. A wrapper-level failure exits 2 =
   BLOCK; on the canon lane a broken guard must never let the write through.
3. Never put per-person or venture data in an emitted artifact. `AGENTS.md`/`GEMINI.md`
   inline `CLAUDE.md` + rules, which are framework-level; the canon, `docs/`, and the
   venture module stay out of the emitted lanes and out of `promote`.

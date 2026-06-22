# Framework Rollout — Develop, Promote, Fan-Out

## Scope
Changing the Astrolabe **framework** — the shared calculators, hooks, commands, destiny/management
agents, destiny skills, rules, and the `bin/` tools — across the template and its instances. NOT
per-person content (canon, `docs/`, profile, branding, the private oracle suites): that is personal
and never leaves its instance.

## The model
- **`template` is the master** — the de-personalized, public-validated source of truth.
- **Work happens in the dev instance**, then **rolls out**.
- Every instance carries the *generalized* framework — files identical
  to template. Per-person facts are read at runtime from that instance's canon + `.claude/calc/birth.json`
  + `.claude/calc/eval-extra.json`. They are NEVER hardcoded in a framework file.

## MUST
1. **One editing site per change.** Edit a framework file in EITHER `template` (then `sync` DOWN) OR the
   dev instance (then `promote` UP) — **never both**. `promote` has no notion of "newer"; it pushes any
   instance↔template *difference* upward, so editing both sides creates ambiguous drift and a blind
   promote can revert a newer template. When unsure: `sync <inst> --check` (down-drift) /
   `promote <inst> --check` (up-drift) report which side is ahead.
2. **Roll out with the tools, never by hand-copying:**
   - `node template/.claude/bin/sync.mjs <instance>` — template → instance (additive, personal-safe).
   - `node template/.claude/bin/promote.mjs <instance>` — instance → template (the dangerous direction).
   - `node template/.claude/bin/rollout.mjs [--from <dev-instance>] [--dry-run]` — promote dev→template
     (fail-closed gate) **then** sync template → ALL instances. One command, the normal path.
3. **Keep the template de-personalized.** A framework file MUST carry ZERO per-person data. `promote`
   enforces it: it refuses **atomically** (zero writes for the whole run) any file containing owner
   tokens — name + birth coordinates from `birth.json`, plus `.claude/bin/promote-deny.json` terms
   (names, client/IP). If promote refuses, de-personalize the file; do not weaken the scan.
4. **Declare a new framework file deliberately** — add its path to `sync-manifest.json` (`framework` to
   sync it, `personal` to guard it) before it will move. `promote` only carries files the template
   already has (the template-parity guard), so a brand-new file is invisible to it until declared.
5. **Every rollout is eval-gated.** `sync`/`promote` re-run the target's `eval.mjs` and fail on red.
   Never commit a rollout whose instances did not return PASS.

## MUST NOT
1. Never hand-edit a framework file directly in a non-dev instance — the next sync
   reverts it. Make the change in the dev flow and roll out.
2. Never put per-person data (birth data, pillars, name, client/IP terms) in a framework file — it
   belongs in canon / `birth.json` / `eval-extra.json` (personal, never promoted).
3. Never bypass or weaken the de-personalization scan to force a promote.

# Canon Protection

## What
`.claude/canon/canon.md` is the hook-protected source of truth for destiny/advisory
facts: birth data, the JDN/oracle-verified pillars, the A/B hour status (B default,
A hedge), 用神, the 大运 sequence, symbolic stars, the timing spine, IP red lines, and
methodology commitments. It is also the calculators' validation oracle.

## MUST
1. **Treat the canon as authoritative.** Verify against it. Do NOT re-derive established
   facts from memory and risk drift (e.g. re-asserting a wrong hour pillar, or
   collapsing the A/B status to a false certainty).
2. **Amending the canon is a deliberate ceremony, never silent:**
   - State the exact change and the reason to the user, and get explicit confirmation.
   - Then **the assistant applies it via the sanctioned tool**:
     `node .claude/bin/canon-amend.mjs --reason "<why>" --by "<approver>" --edits <edits.json>`
     (write `edits.json` = `[{old,new},…]` exact-string replacements first). The tool
     verifies every `old` is found, the `GUARDRAILS:START/END` markers survive, and
     appends an entry to `.claude/canon/AMEND-LOG.md` (the audit trail). No more manual
     python / hand-editing by the user — the assistant does it, approval recorded in the log.
   - (Legacy fallbacks still work: the user edits manually, or `CANON_AMEND=1` env on a
     direct edit. The amend tool is preferred — it is audited and frictionless.)
3. `hooks/canon-guard.js` (PreToolUse, Edit/Write/NotebookEdit + Bash) and
   `settings.permissions.deny` enforce this — they block silent edits and Bash-based
   circumvention (`>>`, `sed -i`, `rm`, `mv`, `cp`, `tee`, `dd`). The guard EXEMPTS a
   sole `node …canon-amend.mjs` invocation (no chaining/redirects) — that one path is the
   audited amend ceremony; everything else stays blocked.

## MUST NOT
1. Do not disable, bypass, or weaken `canon-guard.js` / `inject-canon.js` without
   explicit user instruction.
2. Do not set `CANON_AMEND=1` except as the final step of a user-confirmed amendment.

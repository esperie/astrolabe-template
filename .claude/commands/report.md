---
description: Render a reading as a designed report (HTML + PDF + DOCX), palette derived from the owner's 用神. Defaults to the newest INDIVIDUAL reading; say a name or "partnership" for a synastry.
---

Render a reading through the report design system (`skills/06-report-design`).

Request: **$ARGUMENTS**

INDIVIDUAL readings (the default — newest first):

!`cd "${CLAUDE_PROJECT_DIR:-.}" && ls -t readings/*.md 2>/dev/null | grep -viE "synastry|partner|together|co-ownership|matrix" | head -6 || echo "  (none)"`

PARTNERSHIP / synastry readings (newest first):

!`cd "${CLAUDE_PROJECT_DIR:-.}" && ls -t readings/*.md 2>/dev/null | grep -iE "synastry|partner|together|co-ownership|matrix" | head -6 || echo "  (none)"`

Owner's elements, for the palette:

!`grep -m2 -iE "^- \*\*用神|忌神" "${CLAUDE_PROJECT_DIR:-.}/.claude/canon/canon.md" 2>/dev/null | cut -c1-160 || echo "  (no canon §4 — use the neutral default palette)"`

## What to do

1. **Decide the report TYPE first — and default to INDIVIDUAL** (`skills/06-report-design` §1).
   Most requests are the owner asking about themselves. Only choose partnership when a second named
   person is genuinely the subject.
   - `$ARGUMENTS` empty → the **newest INDIVIDUAL reading** from the first list above.
     **Do not** silently pick the newest file overall; a partnership read is not the default.
   - `$ARGUMENTS` names a file → use it.
   - `$ARGUMENTS` names a person or says partnership/synastry → the matching partnership reading.
   - Nothing matches → list the candidates and stop. Do not guess.
   **State which type and which file you chose, in one line, before rendering.**

2. **If no suitable reading exists yet, say so and stop.** This command renders an existing reading;
   it does not cast one. Point at `/cast`, `/year`, `/decision` or `/qimen` instead — a report built
   from an un-red-teamed analysis would violate `rules/redteam-mandatory.md`.

3. **Derive the palette from the canon, never invent it** (§2). `--accent1` = 用神 #1 ·
   `--accent2` = 用神 #2 · `--risk` = 忌神 #1, passed as element characters (木/火/土/金/水).
   **Note whose palette it is: the OWNER is the reader, even when the subject is someone else.**
   **Say the derivation out loud** — it is routinely counter-intuitive (an owner whose 用神 is 火 gets
   *red as the encouraging colour* and their 忌神 as the risk colour, inverting normal convention).
   Omit any element you genuinely cannot determine; the renderer falls back to a neutral palette.

4. **Pick the redaction tier** (§6.5) and justify it in a few words: `private` (birth data, third
   parties, strategy — the default), `shareable` (findings and actions only), `counterparty` (must not
   telegraph the owner's red lines). It is stamped into the rendered header.

5. **Render:**
   ```
   node "${CLAUDE_PROJECT_DIR:-.}/.claude/bin/render-reading.mjs" <reading.md> \
        --accent1 <元素> --accent2 <元素> --risk <元素> --tier <tier>
   ```
   All three formats by default; `--formats html,pdf` to narrow.

6. **Report the FULL paths and sizes for all three files** — the output folder is gitignored, so it is
   easy to miss. Offer to open the HTML. Then restate the rail: a `private` render carries birth data
   and third-party detail and **stays local — never upload or forward it** (`rules/security.md`).

`pandoc` is required; PDF also wants `weasyprint` or `soffice` (the renderer warns and skips PDF
rather than failing if neither is present).

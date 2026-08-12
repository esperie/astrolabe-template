---
description: Render a reading through the report design system to HTML + PDF + DOCX, with the palette derived from the reader's 用神. Pass a path, or omit it to render the most recent reading.
---

Render a reading as a designed report (`skills/06-report-design`).

Target: **$ARGUMENTS** — if empty, use the most recently modified file in `readings/`.

Available readings (newest first):

!`ls -t "$CLAUDE_PROJECT_DIR"/readings/*.md 2>/dev/null | head -8 || echo "  (no readings yet)"`

The owner's favourable/unfavourable elements, for the palette derivation:

!`grep -A3 "^## 4\." "$CLAUDE_PROJECT_DIR/.claude/canon/canon.md" 2>/dev/null | grep -iE "用神|忌神" | head -4 || echo "  (no canon §4 — use the framework default palette)"`

## What to do

1. **Resolve the target.** Use `$ARGUMENTS` if given; otherwise the newest `readings/*.md` above.
   If the argument names a reading that does not exist, list the candidates and stop.

2. **Derive the palette from the canon, do not invent it** (`skills/06-report-design` §2):
   `--accent1` = the element of 用神 #1 · `--accent2` = 用神 #2 · `--risk` = 忌神 #1.
   Pass them as the element characters (木/火/土/金/水). Omit any you genuinely cannot determine —
   the renderer falls back to the neutral framework palette rather than guessing.
   **Say the derivation out loud** before rendering, because the result is often counter-intuitive:
   a reader whose 用神 is 火 gets *red as the encouraging colour* and their 忌神 as the risk colour.

3. **Pick the redaction tier** (§6.5) and state why: `private` (birth data, third-party names,
   strategy — the default), `shareable` (findings and actions only), or `counterparty` (must not
   telegraph the reader's own red lines). The tier is stamped into the rendered header.

4. **Render:**
   ```
   node "$CLAUDE_PROJECT_DIR/.claude/bin/render-reading.mjs" <reading.md> \
        --accent1 <元素> --accent2 <元素> --risk <元素> --tier <tier>
   ```
   Add `--formats html,pdf` (or any subset) to skip a format; the default is all three.
   Outputs land in `readings/rendered/` and are gitignored — derived, binary, regenerable.

5. **Report** the paths and sizes, and restate the privacy rail: a `private` render carries birth data
   and third-party detail and **stays local — never upload or forward it** (`rules/security.md`).

If `pandoc` is missing the renderer exits and says so (`brew install pandoc`); PDF additionally wants
`weasyprint` or `soffice`, and the renderer skips PDF with a warning rather than failing if neither
is present.

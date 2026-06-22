#!/usr/bin/env node
/**
 * Hook: canon-guard
 * Event: PreToolUse
 * Matcher: Edit|Write|NotebookEdit  AND  Bash
 * Purpose: Hard-block silent mutation of the protected destiny canon
 *          (.claude/canon/). The canon holds facts we cannot afford to get
 *          wrong — most critically the UNRESOLVED A/B hour pillar, which a
 *          future session must never silently collapse to one chart.
 *
 *   - Edit/Write/NotebookEdit on a canon path  → deny
 *   - Bash command that would write/delete/move a canon path → deny
 *     (covers the >>, sed -i, rm, mv, cp, tee, dd circumvention surface that
 *      settings.permissions.deny — which only sees Edit/Write — cannot catch)
 *
 * Escape hatch (the amendment ceremony): set CANON_AMEND=1 for the action.
 * This is intended to be the FINAL step after stating the change to the user
 * and getting explicit confirmation. See rules/canon-protection.md.
 *
 * Fail-open on malformed input; fail-CLOSED only on a positive canon match.
 */
const { isCanonPath, bashTouchesCanon } = require("./lib/canon");

const AMEND = process.env.CANON_AMEND === "1";

const TIMEOUT = setTimeout(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}, 4000);

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  clearTimeout(TIMEOUT);
  let data = {};
  try {
    data = JSON.parse(input);
  } catch {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let blocked = false;
  let target = "";
  try {
    const tool = data.tool_name || "";
    const ti = data.tool_input || {};
    if (tool === "Bash") {
      if (bashTouchesCanon(ti.command, data)) {
        blocked = true;
        target = "(bash) " + String(ti.command || "").slice(0, 140);
      }
    } else {
      const fp = ti.file_path || ti.notebook_path || "";
      if (isCanonPath(fp, data)) {
        blocked = true;
        target = fp;
      }
    }
  } catch {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  if (blocked && !AMEND) {
    const reason =
      "PROTECTED CANON: '" +
      target +
      "' is the hook-protected destiny/advisory source of truth (.claude/canon/). " +
      "Silent mutation is blocked to prevent drift — most importantly, never collapse the UNRESOLVED A/B hour pillar to one chart, and never overwrite a JDN-verified fact. " +
      "To amend: (1) state the exact change and reason to the user and get explicit confirmation; (2) re-run this action with CANON_AMEND=1 set, or have the user edit the file manually. See rules/canon-protection.md.";
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
      }),
    );
    process.exit(0);
  }

  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
});

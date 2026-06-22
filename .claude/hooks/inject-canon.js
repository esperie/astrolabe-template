#!/usr/bin/env node
/**
 * Hook: inject-canon
 * Event: UserPromptSubmit
 * Purpose: Inject the protected destiny-canon GUARDRAILS block into EVERY user
 *          turn. This is the primary anti-amnesia / anti-drift mechanism — it
 *          runs fresh each turn, independent of memory or context compaction,
 *          so the verified pillars, the UNRESOLVED A/B status, 用神, and the
 *          timing spine can never be silently forgotten or "re-derived" wrong.
 *
 * Delivery: hookSpecificOutput.additionalContext — the only UserPromptSubmit
 *           field the host injects into the agent's turn (loom #466).
 *
 * Fail-open: any error → {continue:true} with no injection. Never blocks.
 */
const { loadCanonSummary } = require("./lib/canon");

const TIMEOUT = setTimeout(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}, 3000);

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  clearTimeout(TIMEOUT);
  let data = {};
  try {
    data = JSON.parse(input);
  } catch {
    /* fall through with empty data — loader uses cwd/env */
  }
  let ctx = null;
  try {
    ctx = loadCanonSummary(data);
  } catch {
    ctx = null;
  }
  if (!ctx) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
  console.log(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: ctx,
      },
    }),
  );
  process.exit(0);
});

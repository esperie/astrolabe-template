#!/usr/bin/env node
/**
 * Hook: calc-reminder
 * Event: UserPromptSubmit
 * Purpose: When a prompt looks like a chart-computation request, inject a reminder to
 *          use the deterministic calculators (.claude/calc/) rather than hand-computing.
 *          Reinforces rules/calc-authority.md on exactly the turns that need it.
 * Fail-open: any error → {continue:true}, never blocks.
 */
const KEYWORDS = /(八字|四柱|紫微|斗数|奇门|遁甲|大运|大限|流年|流月|排盘|命盘|用神|节气|喜忌|bazi|ziwei|qimen|four\s*pillar|luck\s*pillar|astrolog)/i;

const TIMEOUT = setTimeout(() => { console.log(JSON.stringify({ continue: true })); process.exit(0); }, 2500);
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  clearTimeout(TIMEOUT);
  let msg = "";
  try { msg = JSON.parse(input)?.tool_input?.user_message || JSON.parse(input)?.prompt || ""; } catch {}
  if (!msg || !KEYWORDS.test(msg)) { console.log(JSON.stringify({ continue: true })); process.exit(0); }
  const ctx =
    "[CALC] Chart math → run the calculators in .claude/calc/ (node), NEVER hand-compute " +
    "(bazi.js · ziwei.js · qimen.js · vedic.js · cast.mjs). Hand-calc is a known error source. " +
    "Read the owner's chart facts (pillars, 用神, A/B hour, daśā) from .claude/canon/canon.md at runtime. " +
    "See rules/calc-authority.md.";
  console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx } }));
  process.exit(0);
});

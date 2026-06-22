#!/usr/bin/env node
/**
 * Hook: vet-gate
 * Event: Stop
 * Purpose: ENFORCE rules/redteam-mandatory.md — a turn that made substantive changes
 *          (Edit/Write/NotebookEdit, or a write-ish Bash) without a verification /
 *          red-team pass is blocked from finishing. Forces the convergence discipline.
 *
 * Detection (heuristic, fail-OPEN on any doubt so it never wedges a session):
 *   - parse the transcript for tool_uses/text since the last real user message;
 *   - "substantive" = an Edit/Write/NotebookEdit, or a Bash command that writes;
 *   - "verified"    = a Bash test run, a Task/Workflow/Agent call, OR text that states
 *                     a convergence/vet verdict (redteam, converge, "N/N pass", verdict…).
 *   - substantive && !verified  →  block once (honors stop_hook_active to avoid loops).
 */
const fs = require("fs");

const TIMEOUT = setTimeout(() => { console.log(JSON.stringify({})); process.exit(0); }, 5000);
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  clearTimeout(TIMEOUT);
  let data = {};
  try { data = JSON.parse(input); } catch { return done({}); }
  if (!data || typeof data !== "object") return done({});
  if (data.stop_hook_active) return done({}); // already continued once — don't loop

  const tp = data.transcript_path;
  if (!tp || !fs.existsSync(tp)) return done({});
  let lines;
  try { lines = fs.readFileSync(tp, "utf8").split("\n").filter(Boolean); } catch { return done({}); }

  const tools = [], bash = [], texts = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    let o; try { o = JSON.parse(lines[i]); } catch { continue; }
    const role = o.type || (o.message && o.message.role);
    const content = o.message && o.message.content;
    const blocks = Array.isArray(content) ? content : (typeof content === "string" ? [{ type: "text", text: content }] : []);
    const isToolResult = blocks.some((b) => b && b.type === "tool_result");
    if (role === "user" && !isToolResult) break; // reached the user turn that opened this span
    if (role === "assistant") {
      for (const b of blocks) {
        if (b && b.type === "tool_use") { tools.push(b.name); if (b.name === "Bash" && b.input && b.input.command) bash.push(b.input.command); }
        if (b && b.type === "text" && b.text) texts.push(b.text);
      }
    }
  }

  const substantive =
    tools.some((n) => n === "Edit" || n === "Write" || n === "NotebookEdit") ||
    bash.some((c) => /(^|[^0-9>])>>?(?!&)|\b(tee|mv|cp|rm|install|rsync|truncate|dd)\b|\bsed\b[^|;]*-i|\bgit\s+commit/.test(c));
  if (!substantive) return done({});

  const verified =
    bash.some((c) => /\.test\.|(^|\s)test(\s|$)|pytest|jest|vitest|mocha|\bnpm\s+(test|run\s+test)|cargo\s+test|go\s+test|node\s+\S*test/i.test(c)) ||
    tools.some((n) => n === "Task" || n === "Workflow" || n === "Agent") ||
    texts.some((t) => /(red-?team|redteam|converg|\bvet(ted|ting)?\b|verdict|all\s+(tests?\s+)?(pass|green)|\b\d+\s*\/\s*\d+\s*(pass|passed|green))/i.test(t));
  if (verified) return done({});

  return done({
    decision: "block",
    reason:
      "CONVERGENCE GATE (rules/redteam-mandatory.md): this turn made substantive changes without a vet/red-team pass. " +
      "Run /vet (tests + claim-checks) or /redteam (adversarial, to convergence) and state the verdict before stopping. " +
      "If you genuinely already verified, say so explicitly — run the test suite or note the result (e.g. 'all tests pass').",
  });
});

function done(obj) { console.log(JSON.stringify(obj)); process.exit(0); }

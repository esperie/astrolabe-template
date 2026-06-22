#!/usr/bin/env node
/**
 * Tests for canon-guard.js — runs the hook as a child process against a matrix
 * of inputs and asserts deny/allow. Run: node .claude/hooks/canon-guard.test.mjs
 * Self-contained (no external fixtures). Exit 0 = all pass, 1 = any fail.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const hook = path.join(here, "canon-guard.js");
const projectDir = path.resolve(here, "..", ".."); // .claude/hooks -> repo root
const ABS = path.join(projectDir, ".claude/canon/canon.md");

function run(input, env = {}) {
  try {
    const out = execFileSync("node", [hook], {
      input: JSON.stringify(input),
      env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, ...env },
      encoding: "utf8",
    });
    return JSON.parse(out);
  } catch (e) {
    return { __error: e.message };
  }
}
const denied = (r) =>
  r?.hookSpecificOutput?.permissionDecision === "deny" || r?.decision === "block";

const cases = [
  ["Edit canon (rel) → deny", { tool_name: "Edit", tool_input: { file_path: ".claude/canon/canon.md" } }, {}, true],
  ["Write canon (abs) → deny", { tool_name: "Write", tool_input: { file_path: ABS } }, {}, true],
  ["NotebookEdit canon → deny", { tool_name: "NotebookEdit", tool_input: { notebook_path: ".claude/canon/canon.md" } }, {}, true],
  ["Edit other rule → allow", { tool_name: "Edit", tool_input: { file_path: ".claude/rules/communication.md" } }, {}, false],
  ["Write docs → allow", { tool_name: "Write", tool_input: { file_path: "docs/08-personal/x.md" } }, {}, false],
  ["Bash append canon → deny", { tool_name: "Bash", tool_input: { command: "echo hi >> .claude/canon/canon.md" } }, {}, true],
  ["Bash append no-space → deny", { tool_name: "Bash", tool_input: { command: "echo hi>>.claude/canon/canon.md" } }, {}, true],
  ["Bash rm canon → deny", { tool_name: "Bash", tool_input: { command: "rm -f .claude/canon/canon.md" } }, {}, true],
  ["Bash sed -i canon → deny", { tool_name: "Bash", tool_input: { command: "sed -i '' s/A/B/ .claude/canon/canon.md" } }, {}, true],
  ["Bash mv canon → deny", { tool_name: "Bash", tool_input: { command: "mv .claude/canon/canon.md /tmp/x" } }, {}, true],
  ["Bash cat canon → allow", { tool_name: "Bash", tool_input: { command: "cat .claude/canon/canon.md" } }, {}, false],
  ["Bash grep canon → allow", { tool_name: "Bash", tool_input: { command: "grep 用神 .claude/canon/canon.md" } }, {}, false],
  ["Bash unrelated → allow", { tool_name: "Bash", tool_input: { command: "ls -la docs" } }, {}, false],
  ["Edit canon + CANON_AMEND → allow", { tool_name: "Edit", tool_input: { file_path: ".claude/canon/canon.md" } }, { CANON_AMEND: "1" }, false],
  ["Malformed input → allow", "NOT_JSON_PLACEHOLDER", {}, false],
  // ── sanctioned amend tool: sole invocation ALLOWED; smuggled/chained/redirected DENIED ──
  ["Bash canon-amend tool → allow", { tool_name: "Bash", tool_input: { command: "node .claude/bin/canon-amend.mjs --reason x --edits /tmp/e.json" } }, {}, false],
  ["Bash canon-amend abs path → allow", { tool_name: "Bash", tool_input: { command: "node /repo/.claude/bin/canon-amend.mjs --reason 'fix' --edits /tmp/p.json --dry-run" } }, {}, false],
  ["Bash rm && canon-amend → deny", { tool_name: "Bash", tool_input: { command: "rm -f .claude/canon/canon.md && node .claude/bin/canon-amend.mjs --reason x --edits /tmp/e.json" } }, {}, true],
  ["Bash canon-amend > canon → deny", { tool_name: "Bash", tool_input: { command: "node .claude/bin/canon-amend.mjs --edits /tmp/e.json > .claude/canon/canon.md" } }, {}, true],
  ["Bash canon-amend | tee canon → deny", { tool_name: "Bash", tool_input: { command: "node .claude/bin/canon-amend.mjs --edits /tmp/e.json | tee .claude/canon/canon.md" } }, {}, true],
  // ── sole non-mutating git on canon ALLOWED; destructive/chained still DENIED ──
  ["Bash git add canon → allow", { tool_name: "Bash", tool_input: { command: "git add .claude/canon/canon.md" } }, {}, false],
  ["Bash git commit -F → allow", { tool_name: "Bash", tool_input: { command: "git commit -q -F /tmp/msg.txt" } }, {}, false],
  ["Bash git add canon && rm → deny", { tool_name: "Bash", tool_input: { command: "git add .claude/canon/canon.md && rm .claude/canon/canon.md" } }, {}, true],
  ["Bash git checkout . canon → deny", { tool_name: "Bash", tool_input: { command: "git checkout -- .claude/canon/canon.md" } }, {}, true],
  ["Bash git restore canon → deny", { tool_name: "Bash", tool_input: { command: "git restore .claude/canon/canon.md" } }, {}, true],
  // ── red-team round-1 bypass vectors (must DENY without CANON_AMEND) ──
  ["Bash python write → deny", { tool_name: "Bash", tool_input: { command: "python3 -c \"open('.claude/canon/canon.md','w').write('x')\"" } }, {}, true],
  ["Bash perl -i → deny", { tool_name: "Bash", tool_input: { command: "perl -i -pe 's/a/b/' .claude/canon/canon.md" } }, {}, true],
  ["Bash install → deny", { tool_name: "Bash", tool_input: { command: "install /tmp/x .claude/canon/canon.md" } }, {}, true],
  ["Bash rsync → deny", { tool_name: "Bash", tool_input: { command: "rsync /tmp/x .claude/canon/canon.md" } }, {}, true],
  ["Bash rm -rf dir → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .claude/canon" } }, {}, true],
  ["Bash mv dir → deny", { tool_name: "Bash", tool_input: { command: "mv .claude/canon /tmp/x" } }, {}, true],
  ["Bash ex → deny", { tool_name: "Bash", tool_input: { command: "ex -sc 'wq' .claude/canon/canon.md" } }, {}, true],
  ["Bash $VAR indirection → deny", { tool_name: "Bash", tool_input: { command: "F=.claude/canon; echo hi >> $F/canon.md" } }, {}, true],
  ["Edit CANON case-alias → deny", { tool_name: "Edit", tool_input: { file_path: ".claude/CANON/canon.md" } }, {}, true],
  ["Write canon/README → deny (subtree)", { tool_name: "Write", tool_input: { file_path: ".claude/canon/README.md" } }, {}, true],
  // negative controls (must still ALLOW)
  ["Bash node calc test → allow", { tool_name: "Bash", tool_input: { command: "node .claude/calc/canon-consistency.test.mjs" } }, {}, false],
  ["Bash head canon → allow", { tool_name: "Bash", tool_input: { command: "head -5 .claude/canon/canon.md" } }, {}, false],
  ["Bash echo word 'canon' → allow", { tool_name: "Bash", tool_input: { command: "echo the canon says hi" } }, {}, false],
  // ── red-team round-2 vectors (must DENY) ──
  ["Bash glob c* → deny", { tool_name: "Bash", tool_input: { command: "echo x >> .claude/c*/c*.md" } }, {}, true],
  ["Bash char-class → deny", { tool_name: "Bash", tool_input: { command: "echo x >> .claude/c[a]non/c[a]non.md" } }, {}, true],
  ["Bash split-var → deny", { tool_name: "Bash", tool_input: { command: "a=ca;b=non; echo x >> .claude/${a}${b}/${a}${b}.md" } }, {}, true],
  ["Bash cmd-subst → deny", { tool_name: "Bash", tool_input: { command: "printf x >> .claude/$(echo c)anon/$(echo c)anon.md" } }, {}, true],
  ["Bash find -exec tee → deny", { tool_name: "Bash", tool_input: { command: "find .claude -name canon.md -exec tee {} \\;" } }, {}, true],
  ["Bash rm -rf .claude (ancestor) → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .claude" } }, {}, true],
  ["Bash mv .claude (ancestor) → deny", { tool_name: "Bash", tool_input: { command: "mv .claude /tmp/cc" } }, {}, true],
  ["Bash git reset --hard → deny", { tool_name: "Bash", tool_input: { command: "git reset --hard" } }, {}, true],
  ["Bash git checkout . → deny", { tool_name: "Bash", tool_input: { command: "git checkout ." } }, {}, true],
  // negative controls (must still ALLOW)
  ["Bash find read → allow", { tool_name: "Bash", tool_input: { command: "find .claude -name canon.md" } }, {}, false],
  ["Bash git status → allow", { tool_name: "Bash", tool_input: { command: "git status" } }, {}, false],
  ["Bash git stash → allow", { tool_name: "Bash", tool_input: { command: "git stash" } }, {}, false],
  // ── proactive: archive extractors / perm-softeners targeting .claude (must DENY) ──
  ["Bash tar -C .claude → deny", { tool_name: "Bash", tool_input: { command: "tar -xf /tmp/e.tar -C .claude" } }, {}, true],
  ["Bash unzip into canon dir → deny", { tool_name: "Bash", tool_input: { command: "unzip /tmp/e.zip -d .claude/canon" } }, {}, true],
  ["Bash chmod canon → deny", { tool_name: "Bash", tool_input: { command: "chmod 777 .claude/canon/canon.md" } }, {}, true],
  // ── red-team round-3: over-trigger / false-positive regressions (must ALLOW) ──
  // verb-as-filename: `eval` inside eval.mjs + grep glob-chars + .claude path was wrongly denied
  ["Bash grep regex under .claude → allow", { tool_name: "Bash", tool_input: { command: 'grep -oE "[a-zA-Z_-]+\\.test\\.mjs" .claude/calc/eval.mjs | sort -u' } }, {}, false],
  ["Bash node eval piped → allow", { tool_name: "Bash", tool_input: { command: "node .claude/calc/eval.mjs 2>&1 | tail -5" } }, {}, false],
  // ancestor (`.`/.claude) + harmless stderr redirect, no destructive verb → was wrongly denied
  ["Bash compound find+devnull (no .claude) → allow", { tool_name: "Bash", tool_input: { command: "ls -la && echo hi && find . -iname '*.md' 2>/dev/null | head -5" } }, {}, false],
  ["Bash find . piped xargs wc → allow", { tool_name: "Bash", tool_input: { command: "find . -name '*.mjs' | xargs wc -l" } }, {}, false],
  // read canon with stderr redirect / case-insensitive grep → was wrongly denied
  ["Bash cat canon + 2>/dev/null → allow", { tool_name: "Bash", tool_input: { command: "cat .claude/canon/canon.md 2>/dev/null" } }, {}, false],
  ["Bash grep -i canon → allow", { tool_name: "Bash", tool_input: { command: "grep -i 用神 .claude/canon/canon.md" } }, {}, false],
  // but a destructive verb piped from find/xargs onto an ancestor must STILL deny
  ["Bash find . | xargs rm → deny", { tool_name: "Bash", tool_input: { command: "find . -name canon.md | xargs rm -f" } }, {}, true],
  // ── arrows are ambiguous with redirects → fail SAFE (deny), and the glob+arrow bypass MUST deny ──
  // node -e with `=>` AND a glob char (`[`) under .claude is conservatively blocked (was a bypass
  // when we stripped arrows; use a temp .mjs to read instead). Fail-safe, not a hole.
  ["Bash node -e arrow+glob under .claude → deny (fail-safe)", { tool_name: "Bash", tool_input: { command: "node -e 'import(\".claude/calc/bazi.js\").then(m=>console.log(m.default.x[0]))'" } }, {}, true],
  // C1 regression: glob-obscured canon path + arrow-preceded redirect must DENY (was the bypass)
  ["Bash arrow-redirect glob canon → deny", { tool_name: "Bash", tool_input: { command: "echo x ->.claude/can[o]n/canon.md" } }, {}, true],
  ["Bash =>redirect glob canon → deny", { tool_name: "Bash", tool_input: { command: "echo x =>.claude/c*/canon.md" } }, {}, true],
  // node -e WITHOUT a glob char reading a .claude module still allowed (no EXPANSION → rule 4 quiet)
  ["Bash node -e arrow no-glob under .claude → allow", { tool_name: "Bash", tool_input: { command: "node -e 'import(\".claude/calc/bazi.js\").then(m=>console.log(m.default.foo))'" } }, {}, false],
];

let pass = 0,
  fail = 0;
for (const [name, input, env, want] of cases) {
  const r = run(input, env);
  const got = denied(r);
  const ok = got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (got ${got ? "deny" : "allow"}, want ${want ? "deny" : "allow"})`);
  if (r.__error) console.log("   child error:", r.__error);
  ok ? pass++ : fail++;
}
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

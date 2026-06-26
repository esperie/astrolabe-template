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
  // bare `git stash` reverts the worktree (incl. an uncommitted canon amendment) → now DENY;
  // only the read-only `git stash list` / `git stash show` stay allowed.
  ["Bash git stash → deny (worktree revert)", { tool_name: "Bash", tool_input: { command: "git stash" } }, {}, true],
  ["Bash git stash list → allow", { tool_name: "Bash", tool_input: { command: "git stash list" } }, {}, false],
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
  // ── quote-aware redirect detection: an arrow/`>` INSIDE quotes is masked (proven NOT a
  //    redirect) → read-only `node -e '…m=>…'` is ALLOWED; an UNquoted arrow-redirect still DENIES ──
  // node -e whose `=>` (and `[` glob) live inside the single-quoted -e arg is read-only → allow.
  // (Pre-quote-aware this was a fail-safe DENY; masking now proves the `>` is quoted, not a redirect.)
  ["Bash node -e arrow+glob under .claude → allow (quoted)", { tool_name: "Bash", tool_input: { command: "node -e 'import(\".claude/calc/bazi.js\").then(m=>console.log(m.default.x[0]))'" } }, {}, false],
  // C1 regression: an UNQUOTED arrow → its `>` is OUTSIDE quotes → survives masking → the
  // glob-obscured canon path + arrow-preceded redirect must STILL DENY (the arrow-strip bypass).
  ["Bash arrow-redirect glob canon → deny", { tool_name: "Bash", tool_input: { command: "echo x ->.claude/can[o]n/canon.md" } }, {}, true],
  ["Bash =>redirect glob canon → deny", { tool_name: "Bash", tool_input: { command: "echo x =>.claude/c*/canon.md" } }, {}, true],
  // node -e WITHOUT a glob char reading a .claude module still allowed (no EXPANSION → rule 4 quiet)
  ["Bash node -e arrow no-glob under .claude → allow", { tool_name: "Bash", tool_input: { command: "node -e 'import(\".claude/calc/bazi.js\").then(m=>console.log(m.default.foo))'" } }, {}, false],
  // ── round-4: read-only over-trigger fix — cd-led reads + strict `sed -n` reads (must ALLOW) ──
  ["Bash cd canon && grep → allow", { tool_name: "Bash", tool_input: { command: "cd .claude/canon && grep -n 用神 canon.md" } }, {}, false],
  ["Bash cd canon && cat → allow", { tool_name: "Bash", tool_input: { command: "cd .claude/canon && cat canon.md" } }, {}, false],
  ["Bash cd canon ; head → allow", { tool_name: "Bash", tool_input: { command: "cd .claude/canon ; head -20 canon.md" } }, {}, false],
  ["Bash cd canon && cat | grep → allow", { tool_name: "Bash", tool_input: { command: "cd .claude/canon && cat canon.md | grep 大运" } }, {}, false],
  ["Bash sed -n range canon → allow", { tool_name: "Bash", tool_input: { command: "sed -n '1,5p' .claude/canon/canon.md" } }, {}, false],
  ["Bash sed -n with `;` canon → deny (tokenizer splits `;`)", { tool_name: "Bash", tool_input: { command: "sed -n '10p;20p' .claude/canon/canon.md" } }, {}, true],
  ["Bash cat canon | sed -n → allow", { tool_name: "Bash", tool_input: { command: "cat .claude/canon/canon.md | sed -n '2,8p'" } }, {}, false],
  // ── round-4 adversarial: the fix must NOT open a write bypass (must DENY) ──
  ["Bash cd canon && rm → deny", { tool_name: "Bash", tool_input: { command: "cd .claude/canon && rm canon.md" } }, {}, true],
  ["Bash cd canon && sed -i → deny", { tool_name: "Bash", tool_input: { command: "cd .claude/canon && sed -i '' s/a/b/ canon.md" } }, {}, true],
  ["Bash cd canon && echo >> → deny", { tool_name: "Bash", tool_input: { command: "cd .claude/canon && echo x >> canon.md" } }, {}, true],
  ["Bash cd canon && tee → deny", { tool_name: "Bash", tool_input: { command: "cd .claude/canon && tee canon.md" } }, {}, true],
  ["Bash cd /tmp && cd canon && rm → deny", { tool_name: "Bash", tool_input: { command: "cd /tmp && cd .claude/canon && rm canon.md" } }, {}, true],
  ["Bash cd canon && node read → deny (unknown verb)", { tool_name: "Bash", tool_input: { command: "cd .claude/canon && node read.mjs canon.md" } }, {}, true],
  ["Bash sed -n with w-command → deny", { tool_name: "Bash", tool_input: { command: "sed -n '1,5p;w /tmp/x' .claude/canon/canon.md" } }, {}, true],
  ["Bash sed s///w canon → deny", { tool_name: "Bash", tool_input: { command: "sed -n 's/a/b/w out' .claude/canon/canon.md" } }, {}, true],
  ["Bash sed -n then rm canon → deny", { tool_name: "Bash", tool_input: { command: "sed -n '1,5p' .claude/canon/canon.md && rm .claude/canon/canon.md" } }, {}, true],
  ["Bash awk read canon → deny (by design)", { tool_name: "Bash", tool_input: { command: "awk 'NR<5' .claude/canon/canon.md" } }, {}, true],
  ["Bash cd canon newline cat → allow", { tool_name: "Bash", tool_input: { command: "cd .claude/canon\ncat canon.md" } }, {}, false],
  ["Bash cd canon newline rm → deny", { tool_name: "Bash", tool_input: { command: "cd .claude/canon\nrm canon.md" } }, {}, true],
  // ── round-5: quote-aware operator detection — the /sweep over-trigger fix (must ALLOW) ──
  // (A) node -e whose only `=>`/`>` lives INSIDE the quoted -e arg, plus a "canon" literal
  //     (canon-guard/inject-canon), was wrongly denied by rule (3) (the incidental `>` made it
  //     "writeCapable"). Masking the quoted span proves there is no redirect → allow.
  ["Bash node -e settings-check (=> in quotes) + canon → allow", { tool_name: "Bash", tool_input: { command: "node -e \"const h=require('fs').readFileSync('.claude/settings.json','utf8'); console.log(['canon-guard','inject-canon'].every(x=>h.includes(x)))\"" } }, {}, false],
  // (B) bare `>` comparison inside quotes + a 'canon' literal (no .claude path) → allow
  ["Bash node -e bare > comparison + 'canon' → allow", { tool_name: "Bash", tool_input: { command: "node -e \"const s='canon'; console.log(s.length > 0)\"" } }, {}, false],
  // (C) a write-verb WORD inside a grep -E pattern is not a command-position verb → allow
  ["Bash grep -E 'x|eval|y' canon → allow (verb in pattern)", { tool_name: "Bash", tool_input: { command: "grep -nE 'x|eval|y' .claude/canon/canon.md" } }, {}, false],
  // (D) quirk-1 exact: cd-ancestor + pipe + write-verb in a grep pattern (was a false DENY) → allow
  ["Bash cd .claude && cat | grep -E 'a|eval|b' → allow", { tool_name: "Bash", tool_input: { command: "cd .claude && cat canon/canon.md | grep -E 'a|eval|b'" } }, {}, false],
  // ── round-5 adversarial: quote-awareness must NOT open a write bypass (must DENY) ──
  // node -e that ACTUALLY writes the LITERAL canon path → still caught (canon path token on raw)
  ["Bash node -e writeFileSync canon → deny", { tool_name: "Bash", tool_input: { command: "node -e \"require('fs').writeFileSync('.claude/canon/canon.md','x')\"" } }, {}, true],
  // a real `>` OUTSIDE quotes survives masking even with an unrelated quoted arg before it → deny
  ["Bash echo \"q arg\" > canon → deny", { tool_name: "Bash", tool_input: { command: "echo \"hello world\" > .claude/canon/canon.md" } }, {}, true],
  // redirect to a QUOTED canon target: `>` outside quotes + path token from raw scan → deny
  ["Bash echo x > 'canon' (quoted target) → deny", { tool_name: "Bash", tool_input: { command: "echo x > '.claude/canon/canon.md'" } }, {}, true],
  // UNBALANCED quote → maskQuotes returns null → fail safe to raw → `>` detected → deny
  ["Bash unbalanced quote + > canon → deny (fail-safe)", { tool_name: "Bash", tool_input: { command: "echo x > .claude/canon/canon.md \"oops" } }, {}, true],
  // closed under-block holes: a QUOTED / concat-obfuscated write verb still executes → deny
  ["Bash 'rm' -rf .claude (quoted verb, ancestor) → deny", { tool_name: "Bash", tool_input: { command: "'rm' -rf .claude" } }, {}, true],
  ["Bash r\"m\" -rf .claude (concat verb, ancestor) → deny", { tool_name: "Bash", tool_input: { command: "r\"m\" -rf .claude" } }, {}, true],
  ["Bash 'rm' canon path → deny", { tool_name: "Bash", tool_input: { command: "'rm' .claude/canon/canon.md" } }, {}, true],
  ["Bash 'tee' quoted canon target → deny", { tool_name: "Bash", tool_input: { command: "'tee' '.claude/canon/canon.md'" } }, {}, true],
  // ── round-6: intra-word-quote CONCATENATION bypass — closed by dequote() on the path scan ──
  // bash concatenates .cla"ude" → .claude and ca""non → canon; the raw tokenizer split on '"
  // fragmented these so the ancestor/canon target hid. dequote() reconstructs the word. (must DENY)
  ["Bash rm -rf .cla\"ude\" (concat ancestor) → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .cla\"ude\"" } }, {}, true],
  ["Bash rm -rf .cl\"aud\"e (mid concat) → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .cl\"aud\"e" } }, {}, true],
  ["Bash rm -rf .cla'ude' (single-q concat) → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .cla'ude'" } }, {}, true],
  ["Bash rm -rf $'.cl''aude' (ANSI-C concat) → deny", { tool_name: "Bash", tool_input: { command: "rm -rf $'.cl''aude'" } }, {}, true],
  ["Bash mv .cla\"ude\" /tmp/x → deny", { tool_name: "Bash", tool_input: { command: "mv .cla\"ude\" /tmp/x" } }, {}, true],
  ["Bash rm -rf .cla\"ude\"/* (concat + glob) → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .cla\"ude\"/*" } }, {}, true],
  ["Bash echo > .claude/ca\"\"non/ca\"\"non.md → deny", { tool_name: "Bash", tool_input: { command: "echo x > .claude/ca\"\"non/ca\"\"non.md" } }, {}, true],
  ["Bash echo >> .claude/ca''non/ca''non.md → deny", { tool_name: "Bash", tool_input: { command: "echo x >> .claude/ca''non/ca''non.md" } }, {}, true],
  ["Bash echo > per-letter c\"a\"n\"o\"n → deny", { tool_name: "Bash", tool_input: { command: "echo x > .claude/c\"a\"n\"o\"n/c\"a\"n\"o\"n.md" } }, {}, true],
  ["Bash rm -f per-letter c'a'n'o'n → deny", { tool_name: "Bash", tool_input: { command: "rm -f .claude/c'a'n'o'n/c'a'n'o'n.md" } }, {}, true],
  ["Bash tee .claude/ca\"\"non/... → deny", { tool_name: "Bash", tool_input: { command: "echo x | tee .claude/ca\"\"non/ca\"\"non.md" } }, {}, true],
  ["Bash dd of=.claude/ca\"\"non/... → deny", { tool_name: "Bash", tool_input: { command: "dd of=.claude/ca\"\"non/ca\"\"non.md if=/dev/null" } }, {}, true],
  ["Bash truncate .claude/ca\"\"non/... → deny", { tool_name: "Bash", tool_input: { command: "truncate -s 0 .claude/ca\"\"non/ca\"\"non.md" } }, {}, true],
  ["Bash cp /tmp/x .claude/ca\"\"non/... → deny", { tool_name: "Bash", tool_input: { command: "cp /tmp/x .claude/ca\"\"non/ca\"\"non.md" } }, {}, true],
  ["Bash mv .claude/ca\"\"non/... /tmp → deny", { tool_name: "Bash", tool_input: { command: "mv .claude/ca\"\"non/ca\"\"non.md /tmp/x" } }, {}, true],
  ["Bash cat /dev/null>.claude/ca\"\"non/... → deny", { tool_name: "Bash", tool_input: { command: "cat /dev/null>.claude/ca\"\"non/ca\"\"non.md" } }, {}, true],
  ["Bash bash -c ANSI-C concat canon → deny", { tool_name: "Bash", tool_input: { command: "bash -c 'rm .claude/'$'canon/canon.md'" } }, {}, true],
  // ── round-6: over-block friction reducers (the /sweep ask) — read-only idioms now ALLOWED ──
  ["Bash nl canon | head → allow", { tool_name: "Bash", tool_input: { command: "nl .claude/canon/canon.md | head" } }, {}, false],
  ["Bash cut -c canon → allow", { tool_name: "Bash", tool_input: { command: "cut -c1-40 .claude/canon/canon.md" } }, {}, false],
  ["Bash xxd canon | head → allow", { tool_name: "Bash", tool_input: { command: "xxd .claude/canon/canon.md | head" } }, {}, false],
  ["Bash od -c canon | head → allow", { tool_name: "Bash", tool_input: { command: "od -c .claude/canon/canon.md | head" } }, {}, false],
  ["Bash column -t canon → allow", { tool_name: "Bash", tool_input: { command: "column -t .claude/canon/canon.md" } }, {}, false],
  ["Bash comm canon /tmp/x → allow", { tool_name: "Bash", tool_input: { command: "comm -12 .claude/canon/canon.md /tmp/x" } }, {}, false],
  ["Bash fold -w canon → allow", { tool_name: "Bash", tool_input: { command: "fold -w 80 .claude/canon/canon.md" } }, {}, false],
  ["Bash 'cat' canon (quoted reader) → allow", { tool_name: "Bash", tool_input: { command: "'cat' .claude/canon/canon.md" } }, {}, false],
  ["Bash \\cat canon (escaped reader) → allow", { tool_name: "Bash", tool_input: { command: "\\cat .claude/canon/canon.md" } }, {}, false],
  ["Bash git grep canon → allow", { tool_name: "Bash", tool_input: { command: "git grep -n 用神 -- .claude/canon" } }, {}, false],
  // ── round-6 control: the quoted reader must NOT exempt a quoted WRITER ──
  ["Bash 'tee' canon (quoted writer) → deny", { tool_name: "Bash", tool_input: { command: "'tee' .claude/canon/canon.md" } }, {}, true],
  // KNOWN RESIDUAL (NOT asserted as allow — documented): an interpreter that builds the canon path
  // at RUNTIME escapes the static matcher and CANNOT be closed without re-breaking the node-read
  // exemption (read/write inside `node -e` is undecidable). Examples (pre-existing, all four
  // systems agree these need the FS-immutable defence noted in lib/canon.js, not a regex):
  //   node -e "require('fs').rmSync('.claude',{recursive:true})"
  //   node -e "require('fs').writeFileSync('.claude/'+'canon/canon.md','x')"
  //   node -e "require('fs').writeFileSync(['.claude','canon','canon.md'].join('/'),'x')"
  // ── round-7: ANSI-C ($'…') escape-encoded canon/.claude targets — closed by dequote()+ansiEsc (DENY) ──
  // bash decodes $'\x63anon'→canon, $'\143anon'→canon; dequote now decodes the same, surfacing the path.
  ["Bash rm -rf .claude/$'\\x63anon' (hex) → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .claude/$'\\x63anon'" } }, {}, true],
  ["Bash rm -rf .claude/$'\\143anon' (octal) → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .claude/$'\\143anon'" } }, {}, true],
  ["Bash rm -rf full-hex canon → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .claude/$'\\x63\\x61\\x6e\\x6f\\x6e'" } }, {}, true],
  ["Bash rm -rf full-octal canon → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .claude/$'\\143\\141\\156\\157\\156'" } }, {}, true],
  ["Bash rm -rf split hex+literal canon → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .claude/$'\\x63'anon" } }, {}, true],
  ["Bash echo > ANSI-C canon file → deny", { tool_name: "Bash", tool_input: { command: "echo PWNED > .claude/$'\\x63anon'/$'\\x63anon'.md" } }, {}, true],
  ["Bash mv ANSI-C canon dir → deny", { tool_name: "Bash", tool_input: { command: "mv .claude/$'\\x63anon' /tmp/x" } }, {}, true],
  ["Bash tar -C ANSI-C canon → deny", { tool_name: "Bash", tool_input: { command: "tar -xf /tmp/evil.tar -C .claude/$'\\x63anon'" } }, {}, true],
  // ── round-7: command-substitution inside an exempted git/canon-amend verb — closed by HAS_SUBST gate (DENY) ──
  // (the `grep` addition newly exposed this; the gate also closes the pre-existing show/diff/log/add siblings)
  ["Bash git grep $(rm canon) → deny", { tool_name: "Bash", tool_input: { command: "git grep $(rm .claude/canon/canon.md)" } }, {}, true],
  ["Bash git grep `rm canon` (backtick) → deny", { tool_name: "Bash", tool_input: { command: "git grep `rm .claude/canon/canon.md`" } }, {}, true],
  ["Bash git grep \"$(sed -i canon)\" → deny", { tool_name: "Bash", tool_input: { command: "git grep \"$(sed -i s/a/b/ .claude/canon/canon.md)\"" } }, {}, true],
  ["Bash git grep --threads=$(dd of=canon) → deny", { tool_name: "Bash", tool_input: { command: "git grep --threads=$(dd of=.claude/canon/canon.md if=/dev/null) x" } }, {}, true],
  ["Bash git show $(rm canon) (pre-existing sibling) → deny", { tool_name: "Bash", tool_input: { command: "git show $(rm .claude/canon/canon.md)" } }, {}, true],
  ["Bash git log $(tee canon) → deny", { tool_name: "Bash", tool_input: { command: "git log $(tee .claude/canon/canon.md)" } }, {}, true],
  ["Bash git add $(rm canon) → deny", { tool_name: "Bash", tool_input: { command: "git add $(rm .claude/canon/canon.md)" } }, {}, true],
  ["Bash canon-amend --reason $(rm canon) → deny", { tool_name: "Bash", tool_input: { command: "node .claude/bin/canon-amend.mjs --reason \"$(rm .claude/canon/canon.md)\" --edits /tmp/e.json" } }, {}, true],
  // ── round-7 control: benign git grep / canon-amend (no substitution) STILL exempted (ALLOW) ──
  ["Bash git grep plain canon → allow", { tool_name: "Bash", tool_input: { command: "git grep -n foo -- .claude/canon" } }, {}, false],
  ["Bash git diff glob (no subst) → allow", { tool_name: "Bash", tool_input: { command: "git diff -- '*.md'" } }, {}, false],
  // ── round-8: git --output WRITE flag rides the inspect exemption → closed (DENY) ──
  ["Bash git diff --output=canon → deny", { tool_name: "Bash", tool_input: { command: "git diff --output=.claude/canon/canon.md" } }, {}, true],
  ["Bash git diff --output canon (space) → deny", { tool_name: "Bash", tool_input: { command: "git diff --output .claude/canon/canon.md" } }, {}, true],
  ["Bash git log --output=canon → deny", { tool_name: "Bash", tool_input: { command: "git log --output=.claude/canon/canon.md" } }, {}, true],
  ["Bash git show --output=canon → deny", { tool_name: "Bash", tool_input: { command: "git show --output=.claude/canon/canon.md" } }, {}, true],
  // ── round-8: brace-expansion {a,b}/{x..y} obfuscated canon target → closed by braceExpand (DENY) ──
  ["Bash rm brace-list canon → deny", { tool_name: "Bash", tool_input: { command: "rm .claude/ca{n,N}on/ca{n,N}on.md" } }, {}, true],
  ["Bash rm -rf brace ancestor → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .clau{d,D}e" } }, {}, true],
  ["Bash echo > brace canon → deny", { tool_name: "Bash", tool_input: { command: "echo x > .claude/ca{n,N}on/ca{n,N}on.md" } }, {}, true],
  ["Bash rm brace-seq canon → deny", { tool_name: "Bash", tool_input: { command: "rm .claude/ca{n..n}on/ca{n..n}on.md" } }, {}, true],
  ["Bash mv brace ancestor → deny", { tool_name: "Bash", tool_input: { command: "mv .clau{d,D}e /tmp/x" } }, {}, true],
  // ── round-8 control: brace expansion NOT under canon stays allowed (no false canon hit) ──
  ["Bash rm brace non-canon → allow", { tool_name: "Bash", tool_input: { command: "rm -rf build/{a,b}/out" } }, {}, false],
  // ── round-8: over-block fixes (the /sweep ask) — now ALLOWED ──
  // git grep with regex-alternation in the quoted pattern (the common multi-term idiom) — exemption now quote-aware
  ["Bash git grep -E 'a|b' canon → allow", { tool_name: "Bash", tool_input: { command: "git grep -E '用神|大运' -- .claude/canon/canon.md" } }, {}, false],
  // banner-then-read multi-segment pipeline — leadIsReadOnly now checks every segment
  ["Bash echo banner ; cat canon → allow", { tool_name: "Bash", tool_input: { command: "echo '=== canon ==='; cat .claude/canon/canon.md" } }, {}, false],
  ["Bash date ; head canon → allow", { tool_name: "Bash", tool_input: { command: "date; head -5 .claude/canon/canon.md" } }, {}, false],
  ["Bash echo path arg (no write) → allow", { tool_name: "Bash", tool_input: { command: "echo .claude/canon/canon.md" } }, {}, false],
  // ── round-8 control: banner-then-WRITE still denies (writeCapable wins) ──
  ["Bash echo banner ; rm canon → deny", { tool_name: "Bash", tool_input: { command: "echo hi; rm .claude/canon/canon.md" } }, {}, true],
  ["Bash echo > canon (redirect) → deny", { tool_name: "Bash", tool_input: { command: "echo hi > .claude/canon/canon.md" } }, {}, true],
  // ── round-9: backtick command-substitution (the $(…) twin) → closed (DENY) ──
  ["Bash echo `rm canon` (backtick) → deny", { tool_name: "Bash", tool_input: { command: "echo `rm .claude/canon/canon.md`" } }, {}, true],
  ["Bash echo `rm -rf .claude` (backtick ancestor) → deny", { tool_name: "Bash", tool_input: { command: "echo `rm -rf .claude`" } }, {}, true],
  ["Bash printf `tee canon` → deny", { tool_name: "Bash", tool_input: { command: "printf '%s' `tee .claude/canon/canon.md`" } }, {}, true],
  // ── round-9: $IFS / ${IFS} whitespace-glue → closed (DENY) ──
  ["Bash rm$IFS canon → deny", { tool_name: "Bash", tool_input: { command: "rm$IFS.claude/canon/canon.md" } }, {}, true],
  ["Bash rm${IFS} canon → deny", { tool_name: "Bash", tool_input: { command: "rm${IFS}.claude/canon/canon.md" } }, {}, true],
  ["Bash tee$IFS canon → deny", { tool_name: "Bash", tool_input: { command: "tee$IFS.claude/canon/canon.md" } }, {}, true],
  ["Bash rm$IFS-rf$IFS.claude (ancestor) → deny", { tool_name: "Bash", tool_input: { command: "rm$IFS-rf$IFS.claude" } }, {}, true],
  // ── round-9: git worktree-revert mutators → closed (DENY) ──
  ["Bash git checkout-index -f -a → deny", { tool_name: "Bash", tool_input: { command: "git checkout-index -f -a" } }, {}, true],
  ["Bash git read-tree -u HEAD → deny", { tool_name: "Bash", tool_input: { command: "git read-tree -u HEAD" } }, {}, true],
  ["Bash git stash push → deny", { tool_name: "Bash", tool_input: { command: "git stash push -m wip" } }, {}, true],
  // ── round-9: over-block fix — a `:` no-op lead before a canon read (ALLOW) ──
  [": no-op then cat canon → allow", { tool_name: "Bash", tool_input: { command: ": ; cat .claude/canon/canon.md" } }, {}, false],
  // ── round-10: ${VAR:-default} / ${VAR} parameter-expansion obfuscated target → closed by paramExpand (DENY) ──
  ["Bash rm ${X:-}/${Y:-a} canon → deny", { tool_name: "Bash", tool_input: { command: "rm -rf .clau${X:-}de/c${Y:-a}non" } }, {}, true],
  ["Bash echo > ${P:-c} canon → deny", { tool_name: "Bash", tool_input: { command: "echo x > .${P:-c}laude/${Q:-c}anon/file.md" } }, {}, true],
  ["Bash tee ${X:-} canon → deny", { tool_name: "Bash", tool_input: { command: "tee .clau${X:-}de/c${Y:-a}non/file.md" } }, {}, true],
  ["Bash echo > bare ${X} canon → deny (rule4)", { tool_name: "Bash", tool_input: { command: "echo x > .clau${X}de/c${Y}non/file.md" } }, {}, true],
  // ── round-10: command-substitution inside quotes executes → never provably-read-only (DENY) ──
  ["Bash cat \"$(rm canon)\" → deny", { tool_name: "Bash", tool_input: { command: "cat \"$(rm .claude/canon/canon.md)\"" } }, {}, true],
  ["Bash echo \"$(rm canon)\" → deny", { tool_name: "Bash", tool_input: { command: "echo \"$(rm .claude/canon/canon.md)\"" } }, {}, true],
  ["Bash true \"$(tee canon)\" → deny", { tool_name: "Bash", tool_input: { command: "true \"$(tee .claude/canon/canon.md)\"" } }, {}, true],
  ["Bash cat \"`rm canon`\" (quoted backtick) → deny", { tool_name: "Bash", tool_input: { command: "cat \"`rm .claude/canon/canon.md`\"" } }, {}, true],
  // ── round-10: more git worktree-revert mutators → closed (DENY) ──
  ["Bash git checkout HEAD -- . → deny", { tool_name: "Bash", tool_input: { command: "git checkout HEAD -- ." } }, {}, true],
  ["Bash git restore --source HEAD . → deny", { tool_name: "Bash", tool_input: { command: "git restore --source HEAD ." } }, {}, true],
  ["Bash git checkout -f main → deny", { tool_name: "Bash", tool_input: { command: "git checkout -f main" } }, {}, true],
  ["Bash git switch -f main → deny", { tool_name: "Bash", tool_input: { command: "git switch -f main" } }, {}, true],
  // ── round-10: over-block fixes — index-only git + unquoted sed -n read (ALLOW) ──
  ["Bash git stash drop → allow", { tool_name: "Bash", tool_input: { command: "git stash drop" } }, {}, false],
  ["Bash git stash clear → allow", { tool_name: "Bash", tool_input: { command: "git stash clear" } }, {}, false],
  ["Bash git restore --staged . → allow", { tool_name: "Bash", tool_input: { command: "git restore --staged ." } }, {}, false],
  ["Bash sed -n unquoted range canon → allow", { tool_name: "Bash", tool_input: { command: "sed -n 1,5p .claude/canon/canon.md" } }, {}, false],
  // ── round-10 control: a read that uses $() but no canon token stays allowed (no false deny) ──
  ["Bash cat $(ls) (no canon) → allow", { tool_name: "Bash", tool_input: { command: "cat $(ls) /tmp/x" } }, {}, false],
  // ── round-11: git GLOBAL-FLAG prefix no longer evades the worktree-revert mutators (DENY) ──
  ["Bash git -C . reset --hard → deny", { tool_name: "Bash", tool_input: { command: "git -C . reset --hard" } }, {}, true],
  ["Bash git -c x=y reset --hard → deny", { tool_name: "Bash", tool_input: { command: "git -c x=y reset --hard" } }, {}, true],
  ["Bash git --no-pager reset --hard → deny", { tool_name: "Bash", tool_input: { command: "git --no-pager reset --hard" } }, {}, true],
  ["Bash git -C . checkout HEAD -- . → deny", { tool_name: "Bash", tool_input: { command: "git -C . checkout HEAD -- ." } }, {}, true],
  ["Bash git -C . stash → deny", { tool_name: "Bash", tool_input: { command: "git -C . stash" } }, {}, true],
  // split clean flags
  ["Bash git clean -x -f → deny", { tool_name: "Bash", tool_input: { command: "git clean -x -f" } }, {}, true],
  ["Bash git clean -d -f → deny", { tool_name: "Bash", tool_input: { command: "git clean -d -f" } }, {}, true],
  // -c core.pager that runs rm on canon → still DENY (NOT exempted; canonHit fall-through)
  ["Bash git -c core.pager=rm-canon log → deny", { tool_name: "Bash", tool_input: { command: "git -c core.pager='rm .claude/canon/canon.md' log" } }, {}, true],
  // ── round-11: over-block fix — read-only git with a -C global flag is exempted again (ALLOW) ──
  ["Bash git -C . diff canon → allow", { tool_name: "Bash", tool_input: { command: "git -C . diff .claude/canon/canon.md" } }, {}, false],
  ["Bash git --no-pager log canon → allow", { tool_name: "Bash", tool_input: { command: "git --no-pager log -p -- .claude/canon/canon.md" } }, {}, false],
  // ── round-11 control: benign clean dry-run / branch switch stay allowed ──
  ["Bash git clean -n → allow", { tool_name: "Bash", tool_input: { command: "git clean -nd" } }, {}, false],
  ["Bash git checkout main (clean switch) → allow", { tool_name: "Bash", tool_input: { command: "git checkout main" } }, {}, false],
  // ── round-12: `git restore --staged --worktree` reverts the WORKTREE → no longer exempted (DENY) ──
  ["Bash git restore --staged --worktree . → deny", { tool_name: "Bash", tool_input: { command: "git restore --staged --worktree ." } }, {}, true],
  ["Bash git restore --staged --worktree canon → deny", { tool_name: "Bash", tool_input: { command: "git restore --staged --worktree .claude/canon/canon.md" } }, {}, true],
  ["Bash git restore --worktree . → deny", { tool_name: "Bash", tool_input: { command: "git restore --worktree ." } }, {}, true],
  ["Bash git restore -W . → deny", { tool_name: "Bash", tool_input: { command: "git restore -W ." } }, {}, true],
  // ── round-12 control: index-only `git restore --staged` stays exempt (ALLOW) ──
  ["Bash git restore --staged . → allow", { tool_name: "Bash", tool_input: { command: "git restore --staged ." } }, {}, false],
  ["Bash git restore --staged canon (index-only) → allow", { tool_name: "Bash", tool_input: { command: "git restore --staged .claude/canon/canon.md" } }, {}, false],
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

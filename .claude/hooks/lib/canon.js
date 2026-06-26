"use strict";
/**
 * lib/canon.js — shared loader + path matcher for the protected destiny canon.
 *
 * HARDENED (red-team rounds 1–2): isCanonPath matches the canon file, the canon DIR
 * node, and the subtree, case-folded + realpath-aware. bashTouchesCanon is fail-CLOSED
 * against: direct writes, interpreter writes (python/perl/…), `find -exec`, ANCESTOR
 * ops (`rm -rf .claude`), shell-expansion obfuscation (globs / char-classes / `$(…)` /
 * `${…}` targeting under .claude — post-expansion target is unknowable to a static
 * matcher, so deny), and bare/dir-wide git mutators that can revert an uncommitted
 * canon amendment. A path token that is provably READ-only is allowed.
 *
 * Note: for maximum assurance a future step may also make the file FS-immutable
 * (chflags uchg / chattr +i) toggled by the amend ceremony; the static net below
 * covers every bypass confirmed in review.
 */
const fs = require("fs");
const path = require("path");

function projectDir(data) { return process.env.CLAUDE_PROJECT_DIR || (data && data.cwd) || process.cwd(); }
function canonDir(data) { return path.join(projectDir(data), ".claude", "canon"); }
function canonFile(data) { return path.join(canonDir(data), "canon.md"); }

function realOrNull(p) {
  try { return fs.realpathSync.native ? fs.realpathSync.native(p) : fs.realpathSync(p); } catch { return null; }
}
const lc = (s) => (s || "").toLowerCase();

function isCanonPath(filePath, data) {
  if (!filePath || typeof filePath !== "string") return false;
  const root = projectDir(data);
  const abs = path.resolve(root, filePath.replace(/\/+$/, ""));
  const dir = canonDir(data), file = canonFile(data);
  const cands = [abs, realOrNull(abs)].filter(Boolean);
  const targets = [file, dir, realOrNull(file), realOrNull(dir)].filter(Boolean);
  for (const c of cands) for (const t of targets) {
    if (c === t || lc(c) === lc(t)) return true;
    if (c.startsWith(t + path.sep) || lc(c).startsWith(lc(t) + path.sep)) return true;
  }
  return false;
}

// Provably read-only leading command (no file-write path). `find` is NOT here — `-exec` writes.
// These commands have no built-in file-output mode, so a real write would need a redirect/verb
// elsewhere (which sets writeCapable and disqualifies the read-only exemption anyway).
const READONLY_LEAD = /^(?:sudo\s+)?(?:cat|bat|less|more|grep|egrep|fgrep|rg|head|tail|wc|stat|diff|cmp|file|ls|nl|cut|od|xxd|column|comm|fold|md5|md5sum|sha1sum|sha256sum|shasum|cksum)\b/;
// A `sed` invocation that can ONLY print a line number/range — `-n` mode, script restricted to
// digits/commas/`p`/`$` (NO `;`: the shell-connector tokenizer splits on `;` before this is
// tested, so a `;`-containing script can't be reasoned about quote-naively → left blocked). This
// grammar admits NO file-writing sed command (`w`, `W`, `s///w`), NO regex address, and NO
// in-place flag, so it is provably read-only. awk is NOT given an analogue: its `print >`,
// `printf|"cmd"`, `system()` writes cannot be statically proven absent without re-opening a bypass
// (cf. the reverted arrow-strip) — use `sed -n`, `head|tail`, or grep.
const SAFE_SED_READ = /^g?sed\s+-n\s+(?:(['"])\s*[0-9,p$\s]+\1|[0-9,p$]+)(?:\s+[^\s;|&<>]+)?\s*$/;
// Strip leading `cd <plain-path> (&&|;)` segments so a read pipeline that merely `cd`s first
// (`cd .claude/canon && grep X canon.md`) can still be recognised as read-only. The cd arg is
// plain path chars ONLY (no space/quote/expansion metachars), so a command-substitution or
// redirect can never hide inside it; anything fancier simply isn't stripped (fail-safe).
function stripLeadingCd(cmd) {
  return cmd.replace(/^\s*(?:cd\s+[A-Za-z0-9_.\/~@:+-]+[ \t]*(?:&&|;|\n)\s*)+/, "");
}
// Leads that produce NO file write of their own (so a pipeline of them, with !writeCapable, is
// read-only): banner/util verbs that print or change directory but never open a file for writing.
// A redirect or write-verb anywhere still sets writeCapable and disqualifies the whole command.
const HARMLESS_LEAD = /^(?:echo|printf|date|pwd|clear|true|cd|sleep|test|\[|:)(?![\w-])/;
// Is ONE segment read-only-led? A known reader (cat/grep/…, incl. quoted/escaped via cmdWord), a
// strict `sed -n` read, or a harmless non-writer (echo/printf/date/…).
function segIsReadOnly(seg) {
  seg = stripLeadingCd(seg).trim();
  if (!seg) return true;
  if (READONLY_LEAD.test(seg) || SAFE_SED_READ.test(seg) || HARMLESS_LEAD.test(seg)) return true;
  const w = cmdWord(seg.split(/\s+/)[0] || "");
  return READONLY_LEAD.test(w) || HARMLESS_LEAD.test(w);
}
// Does EVERY top-level segment lead with a reader/harmless verb? Positive allowlist gate: only
// flips provablyReadOnly true when `!writeCapable` already holds, so a redirect/write-verb has
// already disqualified the command. An unknown verb in ANY segment (`echo x; rm canon`) fails the
// gate. Multi-segment so a banner-then-read pipeline (`echo '== canon =='; cat canon`) is allowed.
function leadIsReadOnly(cmd) {
  for (const seg of splitSegments(stripLeadingCd(cmd))) {
    if (!segIsReadOnly(seg)) return false;
  }
  return true;
}
// Commands that write/modify files. Matched at COMMAND POSITION only (see hasWriteVerb) so a
// verb appearing inside a path/arg (e.g. `eval` in `.claude/calc/eval.mjs`, `tar` in `target/`)
// does NOT count. `xargs` is handled specially (write only if it invokes a write verb).
const WRITE_VERBS = new Set([
  "tee", "rm", "mv", "cp", "install", "rsync", "sponge", "truncate", "dd", "ln",
  "sed", "gsed", "perl", "awk", "python", "python3", "ruby", "ex", "ed", "patch",
  "eval", "tar", "gtar", "bsdtar", "unzip", "zip", "gzip", "gunzip", "xz", "bzip2",
  "7z", "cpio", "chmod", "chflags", "chattr",
]);
// Wrapper words that precede the real command (skip them to find the command-position verb).
const WRAPPERS = new Set(["sudo", "command", "nice", "time", "env", "exec", "builtin", "\\"]);
const FIND_WRITE = /-exec(?:dir)?\b|-delete\b|-fprintf?\b|-fls\b/;
const EXPANSION = /[*?[]|\$\(|`|\$\{/;
// Command-substitution / expansion that can RUN a command or expand to a hidden write target:
// `$(…)`, backticks, `${…}`. A command carrying any of these must NOT take the early sole-command
// exemptions (git-inspect / canon-amend) — it falls through to the full scan instead, so an
// embedded write (`git grep $(rm canon)`) is seen. Globs (`*?[`) are intentionally NOT here — they
// don't execute a command, and `git diff *.md` should stay exempt.
const HAS_SUBST = /\$\(|`|\$\{/;
// git commands that revert/overwrite the WORKTREE from HEAD/index/a tree and thus can destroy an
// UNCOMMITTED canon amendment: reset --hard; checkout-index; read-tree; clean -f; a force
// checkout/switch (-f/--force); a `checkout`/`restore` with a bare `.` pathspec (revert all paths;
// `restore --staged .` is index-only → NOT matched); and the stash family EXCEPT the non-worktree
// `stash list|show|drop|clear`. (bare `git stash` reverts the worktree → blocked.)
// A leading-global-flag prefix (`git -C <dir> …`, `git -c k=v …`, `git --no-pager …`) sits between
// `git` and the subcommand; tolerate ANY of them here so the mutator verb is still recognized
// (over-tolerating only adds DENYs = fail-safe). The `clean` force flag may appear in any flag token
// (`clean -x -f`), so scan the whole flag list for `-…f`/`--force`.
const GIT_GLOBAL_ANY = /(?:(?:-[Cc]\s+\S+|--[\w-]+(?:=\S+)?|-[A-Za-z])\s+)*/.source;
const BARE_GIT_MUTATOR = new RegExp(
  "\\bgit\\s+" + GIT_GLOBAL_ANY +
  "(?:reset\\s+--hard|checkout-index|read-tree|clean(?:\\s+\\S+)*?\\s+(?:-\\S*f|--force)|" +
  "stash(?!\\s+(?:list|show|drop|clear)\\b)|(?:checkout|switch)\\s+(?:-f|--force)\\b|" +
  "checkout(?:\\s+\\S+)*?\\s+\\.(?:\\s|$)|" +
  // restore with a bare `.` pathspec that touches the WORKTREE: either no --staged (default target
  // is the worktree) OR --staged accompanied by --worktree/-W (which restores the worktree too).
  // `restore --staged .` alone (index-only) is NOT matched → stays exempt.
  "restore(?![^;|&]*\\s--staged\\b)(?:\\s+\\S+)*?\\s+\\.(?:\\s|$)|" +
  "restore(?=[^;|&]*\\s(?:--worktree|-W)\\b)(?:\\s+\\S+)*?\\s+\\.(?:\\s|$))"
);
// SAFE global flags for the read-only inspect exemption: path/pager flags only. NOT `-c <k=v>` /
// `--config` (which can set core.pager/core.editor/alias to RUN an arbitrary command, e.g.
// `git -c core.pager='rm canon' log`) and NOT unknown short flags — those make the command fall
// through to the full scan (where an embedded canon path is still caught by canonHit).
const GIT_GLOBAL_SAFE = /(?:(?:-C\s+\S+|--git-dir(?:=\S+)?|--work-tree(?:=\S+)?|--no-pager|--paginate|--bare|--literal-pathspecs|-P)\s+)*/.source;
const GIT_INSPECT = new RegExp(
  "^git\\s+" + GIT_GLOBAL_SAFE +
  // `restore --staged` is index-only (read-safe) ONLY when --worktree/-W is absent — otherwise it
  // reverts the worktree and must fall through to the scan / BARE_GIT_MUTATOR.
  "(?:add|commit|status|diff|log|show|stage|grep|restore\\s+--staged(?![^;&|<>]*\\s(?:--worktree|-W)\\b))\\b[^;&|<>]*$"
);

// Mask the CONTENTS (and the delimiting quote chars) of balanced '…' / "…" spans to spaces,
// so a shell operator (> | ; & < ) that appears INSIDE quotes — where bash treats it as a
// literal, never an operator — is not mistaken for a real one (the `node -e "…a=>b…"` /
// `grep -E 'a|eval|b'` false-positive class). Length is preserved (one char → one char) so
// positions still line up with the raw command. Backslash escapes are honoured: OUTSIDE a
// quote `\x` makes x literal (so `\'`/`\"` do NOT open a quote, `\>` is not a redirect);
// inside "…" a `\"` does not close; inside '…' bash does NO escaping so only `'` closes. On
// UNBALANCED quotes we cannot reason about the command → return null and callers FAIL SAFE
// (use the raw command = conservative over-block). Masking only ever REMOVES operators
// (masked ⊆ raw), and a FUNCTIONAL redirect/pipe is always OUTSIDE quotes and therefore
// survives — so this can never hide a real write.
function maskQuotes(cmd) {
  let out = "";
  let q = null; // null | "'" | '"'
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (q === null) {
      if (ch === "\\") { out += " "; if (i + 1 < cmd.length) { out += " "; i++; } continue; }
      if (ch === "'" || ch === '"') { q = ch; out += " "; continue; }
      out += ch;
    } else if (q === '"') {
      if (ch === "\\") { out += " "; if (i + 1 < cmd.length) { out += " "; i++; } continue; }
      if (ch === '"') { q = null; out += " "; continue; }
      out += " ";
    } else { // q === "'"  (no escaping inside single quotes)
      if (ch === "'") { q = null; out += " "; continue; }
      out += " ";
    }
  }
  return q === null ? out : null;
}

// Split a command into segments at TOP-LEVEL shell connectors (|| | && & ; newline ( )),
// ignoring any of those chars that fall inside quotes. Returns RAW substrings (so a quoted
// command word like 'rm' survives for the verb check). Unbalanced quotes → naive split
// (fail safe: more segments = more chances to catch a write verb = over-block).
function splitSegments(cmd) {
  const masked = maskQuotes(cmd);
  if (masked === null) return cmd.split(/\|\||\||&&|&|;|\n|\(|\)/);
  const segs = [];
  let start = 0;
  for (let i = 0; i < masked.length; i++) {
    const two = masked.slice(i, i + 2);
    let len = 0;
    if (two === "||" || two === "&&") len = 2;
    else if ("|&;\n()`".includes(masked[i])) len = 1;   // ` = backtick command-substitution boundary
    if (len) { segs.push(cmd.slice(start, i)); i += len - 1; start = i + 1; }
  }
  segs.push(cmd.slice(start));
  return segs;
}

// Normalize a command WORD to its bare executable name: strip shell quoting/backslashes (so
// 'rm', "rm", r"m", \rm all resolve to rm — a quoted/escaped verb still executes) then take
// the basename. Used only for the WRITE_VERBS / WRAPPERS lookup; over-matching here = over-block.
const cmdWord = (w) => w.replace(/['"\\]/g, "").replace(/^.*\//, "").toLowerCase();

// Bash quote-REMOVAL for the TARGET scan: reconstruct the word the shell actually sees by
// dropping quote characters and concatenating adjacent segments, so an intra-word-quoted canon
// or .claude target can no longer hide from the path matcher:
//   .cla"ude"      → .claude        (ancestor-destroy: rm -rf .cla"ude")
//   ca""non/ca''non → canon/canon   (write target: echo x > .claude/ca""non/ca""non.md)
//   c'a'n'o'n      → canon          (rm -f .claude/c'a'n'o'n/...)
//   $'canon'       → canon          (ANSI-C: bash -c 'rm .claude/'$'canon/canon.md')
// The canonHit/ancestorHit/dotClaude scan and the literal-`canon` test run on BOTH the raw
// command AND this dequoted form (a boolean union), so dequoting can only ADD a detection,
// never remove one — fail-safe. maskQuotes guards the OPERATOR side; dequote guards the TARGET
// side. RESIDUAL (documented, not closed here): ANSI-C escape decoding ($'\x6f') and paths a
// language interpreter assembles at RUNTIME (node -e "...'.claude/'+'canon'...", .join('/')) —
// the latter is statically undecidable and conflicts with the node-read exemption; the lib
// header's FS-immutable note is the defence-in-depth for those.
// Decode ONE ANSI-C ($'…') backslash escape starting just after the `\` (index j). Returns
// [literal, charsConsumedAfterBackslash]. Covers the byte/codepoint forms that can spell ASCII
// letters (\xHH hex, \NNN octal, \uHHHH/\UHHHHHHHH) — i.e. the ones an obfuscated `canon`/`.claude`
// target would use (rm -rf .claude/$'\x63anon') — plus the standard C single-char escapes.
function ansiEsc(s, j) {
  const c = s[j];
  if (c === undefined) return ["\\", 0];
  const simple = { n: "\n", t: "\t", r: "\r", "\\": "\\", "'": "'", '"': '"', "?": "?", a: "\x07", b: "\b", e: "\x1b", E: "\x1b", f: "\f", v: "\v" };
  if (Object.prototype.hasOwnProperty.call(simple, c)) return [simple[c], 1];
  if (c === "x") { const m = /^[0-9a-fA-F]{1,2}/.exec(s.slice(j + 1)); if (m) return [String.fromCharCode(parseInt(m[0], 16)), 1 + m[0].length]; }
  if (c === "u") { const m = /^[0-9a-fA-F]{1,4}/.exec(s.slice(j + 1)); if (m) return [String.fromCharCode(parseInt(m[0], 16)), 1 + m[0].length]; }
  if (c === "U") { const m = /^[0-9a-fA-F]{1,8}/.exec(s.slice(j + 1)); if (m) return [String.fromCodePoint(parseInt(m[0], 16)), 1 + m[0].length]; }
  if (c >= "0" && c <= "7") { const m = /^[0-7]{1,3}/.exec(s.slice(j)); return [String.fromCharCode(parseInt(m[0], 8) & 0xff), m[0].length]; }
  return [c, 1]; // unknown escape → the literal char
}

function dequote(cmd) {
  let out = "";
  let q = null; // null | "'" (literal) | '"' (dq, \ escapes) | "ansi" ($'…', escapes DECODED)
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (q === null) {
      if (ch === "$" && cmd[i + 1] === "'") { q = "ansi"; i++; continue; }      // $'…' ANSI-C quoting
      if (ch === "$" && cmd[i + 1] === '"') continue;                           // $"…" → drop $, dq opens next iter
      if (ch === "\\") { if (i + 1 < cmd.length) { out += cmd[i + 1]; i++; } continue; }
      if (ch === "'" || ch === '"') { q = ch; continue; }
      out += ch;
    } else if (q === '"') {
      if (ch === "\\") { if (i + 1 < cmd.length) { out += cmd[i + 1]; i++; } continue; }
      if (ch === '"') { q = null; continue; }
      out += ch;
    } else if (q === "ansi") {
      if (ch === "'") { q = null; continue; }
      if (ch === "\\") { const [lit, adv] = ansiEsc(cmd, i + 1); out += lit; i += adv; continue; }
      out += ch;
    } else { // q === "'" plain single quote — literal, only ' closes
      if (ch === "'") { q = null; continue; }
      out += ch;
    }
  }
  return out;
}

// Expand a brace SEQUENCE `{x..y}` (chars or ints) to its members; null if not a sequence or too
// big (bounded ≤64 → caller fails safe to the literal).
function braceSeq(a, b) {
  const num = /^-?\d+$/.test(a) && /^-?\d+$/.test(b);
  if (!num && (a.length !== 1 || b.length !== 1)) return null;
  let lo = num ? parseInt(a, 10) : a.charCodeAt(0);
  let hi = num ? parseInt(b, 10) : b.charCodeAt(0);
  const step = lo <= hi ? 1 : -1, r = [];
  for (let v = lo; step > 0 ? v <= hi : v >= hi; v += step) {
    r.push(num ? String(v) : String.fromCharCode(v));
    if (r.length >= 64) return null;
  }
  return r;
}

// Bounded bash brace expansion for the PATH scan only: `.claude/ca{n,N}on` → tries
// `.claude/canon`+`.claude/caNon`; `.clau{d,D}e` → `.claude`+`.clauDe`; `ca{n..n}on` → `canon`.
// Catches a canon/.claude target obfuscated by {a,b}/{x..y} braces (rm .claude/ca{n,N}on/…).
// Capped (≤128 results, depth ≤6); anything bigger/odd/un-listy returns the literal (fail-safe —
// rule (4)'s EXPANSION net + the raw scan still apply). Leaves ${…} param-expansion alone (no
// comma / `..` inside → returned literal).
function braceExpand(w, depth) {
  depth = depth || 0;
  if (depth > 6 || w.indexOf("{") < 0) return [w];
  const open = w.indexOf("{");
  let close = -1, lvl = 0;
  for (let k = open; k < w.length; k++) { if (w[k] === "{") lvl++; else if (w[k] === "}" && --lvl === 0) { close = k; break; } }
  if (close < 0) return [w];
  const pre = w.slice(0, open), body = w.slice(open + 1, close), post = w.slice(close + 1);
  let alts = null;
  if (body.indexOf(",") >= 0) alts = body.split(",");
  else { const m = /^(\w+)\.\.(\w+)$/.exec(body); if (m) alts = braceSeq(m[1], m[2]); }
  if (!alts) { // not a list/seq we expand (e.g. ${VAR}, {single}) → keep the brace text, recurse right
    return braceExpand(post, depth + 1).map((r) => pre + "{" + body + "}" + r);
  }
  const out = [], heads = braceExpand(pre, depth + 1), tails = braceExpand(post, depth + 1);
  for (const a of alts) for (const h of heads) for (const tl of tails) {
    out.push(h + a + tl);
    if (out.length >= 128) return out;
  }
  return out;
}

// Resolve bash parameter expansion enough to expose an obfuscated canon/.claude target for the path
// scan: `${VAR:-d}` / `${VAR:=d}` / `${VAR-d}` / `${VAR=d}` / `${VAR:+d}` → the literal default/alt
// `d`; every other `${…}` (`${VAR}`, `${VAR#p}`, `${VAR/a/b}`) and bare `$VAR` → "" (the value is
// env-dependent). So `.clau${X:-}de` → `.claude` and `c${Y:-a}non` → `canon`. RESIDUAL (documented):
// a bare `${VAR}`/`$VAR` whose value is set in the EXTERNAL environment is statically unknowable —
// the empty-expansion still exposes any `.claude` literal prefix so rule (4) (EXPANSION+writeCapable
// +dotClaude) catches the common case, but a fully env-assembled path is the FS-immutable tier.
function paramExpand(cmd) {
  return cmd
    .replace(/\$\{[A-Za-z_]\w*:?[-=+]([^{}]*)\}/g, "$1") // ${VAR:-d}/:=/-/=/:+  → default/alt literal
    .replace(/\$\{[^{}]*\}/g, "")                         // any other ${…}       → ""
    .replace(/\$[A-Za-z_]\w*/g, "");                      // bare $VAR            → ""
}

// Is there a write verb at a COMMAND POSITION? Split on shell connectors (quote-aware), skip
// leading env-assignments + wrappers, then test the command word's basename. This is what
// stops the false positives: a write-verb that is only a substring of a path/filename — or a
// token inside a quoted arg (a `grep -E 'a|eval'` pattern) — is never at a command position,
// so it does not match.
function hasWriteVerb(cmd) {
  for (const seg of splitSegments(cmd)) {
    const words = seg.trim().split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < words.length && (/^[A-Za-z_]\w*=/.test(words[i]) || WRAPPERS.has(cmdWord(words[i])))) i++;
    if (i >= words.length) continue;
    const base = cmdWord(words[i]);
    if (base === "xargs") {
      // xargs is dangerous only if the command it runs is a write verb (xargs rm), not (xargs wc)
      for (let j = i + 1; j < words.length; j++) {
        if (words[j].startsWith("-")) continue; // skip xargs' own flags
        if (WRITE_VERBS.has(cmdWord(words[j]))) return true;
        break; // first non-flag word is the command xargs invokes
      }
      continue;
    }
    if (WRITE_VERBS.has(base)) {
      // a strict `sed -n '<line-ranges>'` cannot write a file — don't treat it as a write verb
      if ((base === "sed" || base === "gsed") && SAFE_SED_READ.test(seg.trim())) continue;
      return true;
    }
  }
  return false;
}

// A redirect that actually writes a real file. Harmless stderr/merge/devnull redirects
// (2>/dev/null, >/dev/null, 2>&1, &>/dev/null) are stripped first so they don't count —
// a real canon target would still be caught as a canon path token or under .claude.
// QUOTE-AWARE: a `>` INSIDE quotes (a comparison/arrow in `node -e "…a=>b…"`, or a literal
// `>` in an echo string) is not a redirect — maskQuotes() blanks quoted spans first so it
// isn't read as one. An UNbalanced-quote command can't be parsed → fall back to the raw
// string (fail safe: over-detect). NOTE: we do NOT strip `=>`/`->` arrows themselves —
// OUTSIDE quotes they are ambiguous with a real redirect (`echo x =>file` IS `echo x =` +
// `>file`), and stripping them opened a canon-write bypass (`echo x ->.claude/can[o]n/canon.md`).
// Masking only removes a `>` that is provably inside quotes; an unquoted arrow's `>` survives,
// so that bypass stays blocked.
function hasWriteRedirect(cmd) {
  const base = maskQuotes(cmd) ?? cmd;
  const stripped = base
    .replace(/[0-9]*>>?\s*\/dev\/null/g, "")
    .replace(/&>>?\s*\/dev\/null/g, "")
    .replace(/[0-9]*>&[0-9]?-?/g, "");
  return />/.test(stripped);
}

function bashTouchesCanon(command, data) {
  if (!command || typeof command !== "string") return false;
  // Normalize the $IFS / ${IFS…} whitespace-substitution trick to a real space up front, so a
  // word glued by it (`rm$IFS.claude/canon/canon.md`, `rm$IFS-rf$IFS.claude`) is seen as the
  // separate words bash sees — otherwise the write verb and the path token both hide in one token.
  const cmd = command.replace(/\$IFS\b|\$\{IFS[^}]*\}/g, " ");
  if (BARE_GIT_MUTATOR.test(cmd)) return true;

  // SANCTIONED amend path: `node .../canon-amend.mjs` enforces its own ceremony
  // The connector/redirect check (`[^;&|<>]`) runs against the QUOTE-MASKED command so a `;|&<>`
  // INSIDE a quoted arg (e.g. a `git grep -E 'a|b'` pattern) doesn't defeat the exemption, while a
  // REAL unquoted connector still does. HAS_SUBST (command-substitution/expansion) and `--output`
  // (a git WRITE flag: `git diff --output=<file>`) are checked on the RAW command and disqualify.
  const exemptScan = maskQuotes(cmd) ?? cmd;
  const exemptSafe = !HAS_SUBST.test(cmd) && !/--output\b/.test(cmd);

  // (mandatory --reason, GUARDRAILS-survival check, append-only audit log in
  // .claude/canon/AMEND-LOG.md). Allow ONLY when the command is SOLELY that invocation —
  // no shell connectors (; & |), no redirects (< >), and no command-substitution/expansion
  // ($(…)/`…`/${…}) — so a destructive op can't be smuggled in front of it (`rm canon.md &&
  // node …canon-amend.mjs`) or hidden in a substitution (`node …canon-amend.mjs --reason "$(rm canon)"`).
  if (exemptSafe && /^(?:[A-Z_]+=\S+\s+)*node\s+[^;&|<>]*canon-amend\.mjs(?:\s[^;&|<>]*)?$/.test(exemptScan.trim())) return false;

  // Non-mutating git on canon (stage / commit / inspect) doesn't alter canon's CONTENT —
  // the destructive git verbs (reset --hard, checkout ., restore ., clean -f, stash drop)
  // are already caught by BARE_GIT_MUTATOR above. Exempt ONLY a SOLE such command (no
  // chaining/redirect/command-substitution, and no `--output` write flag) so a destructive op
  // can't ride along (`git add x && rm canon`), hide in a substitution (`git grep $(rm canon)`),
  // or write canon via `git diff --output=.claude/canon/canon.md`.
  if (exemptSafe && GIT_INSPECT.test(exemptScan.trim())) return false;

  const writeVerb = hasWriteVerb(cmd);                 // command-position write verb (sed/perl/rm/…)
  const writeCapable = hasWriteRedirect(cmd) || FIND_WRITE.test(cmd) || writeVerb;
  // A command-substitution `$(…)` / backtick EXECUTES its body even inside quotes (`cat "$(rm
  // canon)"`), so a command that contains one can NEVER be "provably read-only" — maskQuotes
  // blanks the quoted body for operator detection, which would otherwise let a hidden write ride a
  // reader/harmless lead. (HAS_SUBST also covers ${…}, which doesn't execute a command but is cheap
  // to exclude here too.)
  const provablyReadOnly = !writeCapable && !HAS_SUBST.test(cmd) && leadIsReadOnly(cmd);

  const root = projectDir(data), dir = canonDir(data);
  // Scan path tokens from the raw command, its bash-dequoted form, AND its parameter-expanded form
  // (${VAR:-d}→d, ${VAR}→""), so an intra-word-quoted / $'…' / ${…}-obfuscated canon/.claude target
  // (`.cla"ude"`, `ca""non`, `c'a'n'o'n`, `$'canon'`, `.clau${X:-}de/c${Y:-a}non`) is still bound to
  // the canon path. Union of booleans = additive (can only add a deny). The `\n` joins keep tokens
  // from fusing across forms.
  const dq = dequote(cmd);
  const pe = paramExpand(dq);
  let canonHit = false, ancestorHit = false, dotClaude = false;
  for (let t0 of (cmd + "\n" + dq + "\n" + pe).split(/[\s;|&()'"=<>`]+/).filter(Boolean)) {
    t0 = t0.replace(/^[0-9]*[<>]+/, "").replace(/\/+$/, "");
    if (!t0 || t0.startsWith("-")) continue;
    for (const t of braceExpand(t0)) {                  // {a,b}/{x..y} brace-obfuscated targets too
      if (/(^|\/)\.claude(\/|$)/.test(t)) dotClaude = true;
      try { if (isCanonPath(t, data)) { canonHit = true; continue; } } catch {}
      try {
        const abs = path.resolve(root, t);
        if (abs === dir || lc(abs) === lc(dir) || dir.startsWith(abs + path.sep) || lc(dir).startsWith(lc(abs) + path.sep)) ancestorHit = true;
      } catch {}
    }
  }

  if (canonHit) return !provablyReadOnly;                                  // (1) explicit canon path token (raw or dequoted)
  if (ancestorHit && (writeVerb || FIND_WRITE.test(cmd))) return true;      // (2) destructive verb on ancestor dir (rm/mv/tar .claude); a bare redirect can't destroy a dir
  if ((/canon/i.test(cmd) || /canon/i.test(dq)) && writeCapable) return !provablyReadOnly; // (3) literal "canon" (raw or dequoted) + write
  if (EXPANSION.test(cmd) && writeCapable && dotClaude) return !provablyReadOnly; // (4) obfuscated write target under .claude (read-only leads exempt)
  return false;
}

function loadCanonSummary(data) {
  try {
    const f = canonFile(data);
    if (!fs.existsSync(f)) return null;
    const m = fs.readFileSync(f, "utf8").match(/<!--\s*GUARDRAILS:START\s*-->([\s\S]*?)<!--\s*GUARDRAILS:END\s*-->/);
    return m ? m[1].trim() : null;
  } catch { return null; }
}

module.exports = { projectDir, canonDir, canonFile, isCanonPath, bashTouchesCanon, loadCanonSummary };

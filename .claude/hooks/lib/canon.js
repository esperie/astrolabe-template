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
const READONLY_LEAD = /^(?:sudo\s+)?(?:cat|bat|less|more|grep|egrep|fgrep|rg|head|tail|wc|stat|diff|cmp|file|ls|md5|md5sum|sha1sum|sha256sum|shasum|cksum)\b/;
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
// bare/dir-wide git mutators that can revert/destroy an uncommitted canon amendment
const BARE_GIT_MUTATOR = /\bgit\s+(?:reset\s+--hard|checkout\s+(?:--\s+)?\.(?:\s|$)|restore\s+(?:--\s+)?\.(?:\s|$)|clean\s+-\S*f|stash\s+(?:drop|clear))/;

// Is there a write verb at a COMMAND POSITION? Split on shell connectors, skip leading
// env-assignments + wrappers, then test the command word's basename. This is what stops the
// false positives: a write-verb that is only a substring of a path/filename is never at a
// command position, so it does not match.
function hasWriteVerb(cmd) {
  for (const seg of cmd.split(/\|\||\||&&|&|;|\n|\(|\)/)) {
    const words = seg.trim().split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < words.length && (/^[A-Za-z_]\w*=/.test(words[i]) || WRAPPERS.has(words[i]))) i++;
    if (i >= words.length) continue;
    const base = words[i].replace(/^.*\//, "").toLowerCase();
    if (base === "xargs") {
      // xargs is dangerous only if the command it runs is a write verb (xargs rm), not (xargs wc)
      for (let j = i + 1; j < words.length; j++) {
        if (words[j].startsWith("-")) continue; // skip xargs' own flags
        if (WRITE_VERBS.has(words[j].replace(/^.*\//, "").toLowerCase())) return true;
        break; // first non-flag word is the command xargs invokes
      }
      continue;
    }
    if (WRITE_VERBS.has(base)) return true;
  }
  return false;
}

// A redirect that actually writes a real file. Harmless stderr/merge/devnull redirects
// (2>/dev/null, >/dev/null, 2>&1, &>/dev/null) are stripped first so they don't count —
// a real canon target would still be caught as a canon path token or under .claude.
function hasWriteRedirect(cmd) {
  const stripped = cmd
    .replace(/[0-9]*>>?\s*\/dev\/null/g, "")
    .replace(/&>>?\s*\/dev\/null/g, "")
    .replace(/[0-9]*>&[0-9]?-?/g, "");
  return />/.test(stripped);
}

function bashTouchesCanon(command, data) {
  if (!command || typeof command !== "string") return false;
  const cmd = command;
  if (BARE_GIT_MUTATOR.test(cmd)) return true;

  // SANCTIONED amend path: `node .../canon-amend.mjs` enforces its own ceremony
  // (mandatory --reason, GUARDRAILS-survival check, append-only audit log in
  // .claude/canon/AMEND-LOG.md). Allow ONLY when the command is SOLELY that invocation —
  // no shell connectors (; & |), no redirects (< >) — so a destructive op can't be
  // smuggled in front of it (e.g. `rm canon.md && node …canon-amend.mjs`).
  if (/^(?:[A-Z_]+=\S+\s+)*node\s+[^;&|<>]*canon-amend\.mjs(?:\s[^;&|<>]*)?$/.test(cmd.trim())) return false;

  // Non-mutating git on canon (stage / commit / inspect) doesn't alter canon's CONTENT —
  // the destructive git verbs (reset --hard, checkout ., restore ., clean -f, stash drop)
  // are already caught by BARE_GIT_MUTATOR above. Exempt ONLY a SOLE such command (no
  // chaining/redirect) so a destructive op can't ride along (e.g. `git add x && rm canon`).
  if (/^git\s+(?:add|commit|status|diff|log|show|stage|restore\s+--staged)\b[^;&|<>]*$/.test(cmd.trim())) return false;

  const writeVerb = hasWriteVerb(cmd);                 // command-position write verb (sed/perl/rm/…)
  const writeCapable = hasWriteRedirect(cmd) || FIND_WRITE.test(cmd) || writeVerb;
  const provablyReadOnly = !writeCapable && READONLY_LEAD.test(cmd.trim());

  const root = projectDir(data), dir = canonDir(data);
  let canonHit = false, ancestorHit = false, dotClaude = false;
  for (let t of cmd.split(/[\s;|&()'"=<>]+/).filter(Boolean)) {
    t = t.replace(/^[0-9]*[<>]+/, "").replace(/\/+$/, "");
    if (!t || t.startsWith("-")) continue;
    if (/(^|\/)\.claude(\/|$)/.test(t)) dotClaude = true;
    try { if (isCanonPath(t, data)) { canonHit = true; continue; } } catch {}
    try {
      const abs = path.resolve(root, t);
      if (abs === dir || lc(abs) === lc(dir) || dir.startsWith(abs + path.sep) || lc(dir).startsWith(lc(abs) + path.sep)) ancestorHit = true;
    } catch {}
  }

  if (canonHit) return !provablyReadOnly;                                  // (1) explicit canon path token
  if (ancestorHit && (writeVerb || FIND_WRITE.test(cmd))) return true;      // (2) destructive verb on ancestor dir (rm/mv/tar .claude); a bare redirect can't destroy a dir
  if (/canon/i.test(cmd) && writeCapable) return !provablyReadOnly;         // (3) literal "canon" + write
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

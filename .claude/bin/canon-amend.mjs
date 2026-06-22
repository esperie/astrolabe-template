#!/usr/bin/env node
/**
 * canon-amend.mjs — the SANCTIONED, audit-logged way to amend the protected canon
 * (.claude/canon/canon.md). Replaces the old "user runs python by hand" / CANON_AMEND
 * env ceremony, which was friction with no audit trail.
 *
 * The drift-protection still holds: canon-guard.js + settings.permissions.deny still
 * block silent Edit/Write/Bash-clobber of canon. This tool is the ONE deliberate path —
 * it requires an explicit --reason, verifies the GUARDRAILS markers survive, and appends
 * an audit entry to .claude/canon/AMEND-LOG.md. The assistant runs it only after stating
 * the exact change to the user and getting approval (recorded in --by / the log).
 *
 * Usage:
 *   node .claude/bin/canon-amend.mjs --reason "why" [--by "who"] --edits /tmp/edits.json [--dry-run]
 *   edits.json = [{ "old": "<exact text>", "new": "<replacement>" }, ...]
 *   (flag is --edits, not --patch: the guard treats the word "patch" as a write command)
 *               (each `old` must occur ≥1×; all occurrences are replaced; report per-edit count)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CANON = path.resolve(__dirname, "../canon/canon.md");
const LOG = path.resolve(__dirname, "../canon/AMEND-LOG.md");

function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const dryRun = process.argv.includes("--dry-run");
const reason = arg("--reason");
const by = arg("--by", "user (chat approval)");
const patchFile = arg("--edits");

if (!reason) { console.error("ERROR: --reason \"...\" is required (the ceremony: state why)."); process.exit(2); }
if (!patchFile) { console.error("ERROR: --edits <file.json> is required."); process.exit(2); }

let patch;
try { patch = JSON.parse(fs.readFileSync(patchFile, "utf8")); }
catch (e) { console.error("ERROR reading patch:", e.message); process.exit(2); }
if (!Array.isArray(patch) || !patch.length) { console.error("ERROR: patch must be a non-empty JSON array of {old,new}."); process.exit(2); }

let s = fs.readFileSync(CANON, "utf8");
const before = s;
const summary = [];
for (const [i, e] of patch.entries()) {
  if (typeof e.old !== "string" || typeof e.new !== "string") { console.error(`ERROR: patch[${i}] needs string old/new.`); process.exit(2); }
  const count = s.split(e.old).length - 1;
  if (count === 0) { console.error(`ERROR: patch[${i}] old-text NOT FOUND — aborting, no write:\n  ${JSON.stringify(e.old.slice(0, 70))}`); process.exit(3); }
  s = s.split(e.old).join(e.new);
  summary.push(`  [${i}] ${count}× replaced: ${JSON.stringify(e.old.slice(0, 50))} → ${JSON.stringify(e.new.slice(0, 50))}`);
}

// GUARDRAILS must survive.
for (const m of ["<!-- GUARDRAILS:START -->", "<!-- GUARDRAILS:END -->"]) {
  if (!s.includes(m) && before.includes(m)) { console.error(`ERROR: edit would remove ${m} — aborting.`); process.exit(4); }
}
if (s === before) { console.error("ERROR: no change produced."); process.exit(5); }

console.log(`Canon amendment ${dryRun ? "(DRY RUN)" : ""}`);
console.log(`  reason: ${reason}\n  by: ${by}`);
console.log(summary.join("\n"));
console.log(`  size: ${before.length} → ${s.length} chars`);

if (dryRun) { console.log("DRY RUN — nothing written."); process.exit(0); }

fs.writeFileSync(CANON, s);
const stamp = new Date().toISOString();
const entry = `\n## ${stamp}\n- by: ${by}\n- reason: ${reason}\n${summary.map((l) => l.trim()).map((l) => "- " + l).join("\n")}\n`;
fs.appendFileSync(LOG, fs.existsSync(LOG) ? entry : `# Canon Amendment Log\n_Every deliberate change to canon.md, via canon-amend.mjs._\n${entry}`);
console.log(`✓ canon amended; logged to ${path.relative(path.resolve(__dirname, "../.."), LOG)}`);

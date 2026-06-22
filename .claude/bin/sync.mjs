#!/usr/bin/env node
/**
 * sync.mjs — roll framework updates from the Astrolabe TEMPLATE into an INSTANCE.
 *
 *   node .claude/bin/sync.mjs <instance-dir>            # apply (additive)
 *   node .claude/bin/sync.mjs <instance-dir> --dry-run  # preview, write nothing
 *   node .claude/bin/sync.mjs <instance-dir> --check    # report drift; exit 1 if any (CI)
 *
 * Contract (see sync-manifest.json):
 *   - FRAMEWORK paths (template = source of truth) are copied template → instance.
 *   - PERSONAL paths (canon, docs, profile, learning, per-instance eval-extra, CLAUDE.md, …) are
 *     NEVER written or deleted — an instance's identity is sacrosanct. Enforced as a hard guard
 *     on every target, so even a mis-declared framework file can't clobber a personal one.
 *   - OBSOLETED paths are deleted from the instance on every sync (former layouts).
 *   - Additive: an instance file that is neither framework nor obsoleted is left untouched.
 * After a real apply: append to <instance>/.claude/SYNC-LOG.md and run the instance's eval.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(__dirname, "..", "..");          // bin/ -> .claude/ -> template root
const MANIFEST = JSON.parse(fs.readFileSync(path.join(__dirname, "sync-manifest.json"), "utf8"));

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const instanceArg = argv.find((a) => !a.startsWith("--"));
const DRY = flags.has("--dry-run");
const CHECK = flags.has("--check");

if (!instanceArg) {
  console.error("usage: node .claude/bin/sync.mjs <instance-dir> [--dry-run|--check]");
  process.exit(2);
}
const INSTANCE = path.resolve(instanceArg);
if (!fs.existsSync(path.join(INSTANCE, ".claude"))) {
  console.error(`✗ not an Astrolabe instance (no .claude/): ${INSTANCE}`);
  process.exit(2);
}
if (path.resolve(INSTANCE) === TEMPLATE) {
  console.error("✗ refusing to sync the template onto itself");
  process.exit(2);
}

const hash = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");
const norm = (rel) => rel.split(path.sep).join("/");

// PERSONAL matcher: exact path, or a `dir/**` prefix. Case-folded (macOS/Windows are
// case-insensitive — `.claude/Canon/canon.md` must still match) and any `..` path is personal-blocked.
function isPersonal(rel) {
  const r = norm(rel).toLowerCase();
  if (r.split("/").includes("..")) return true;   // never touch a traversal path
  return MANIFEST.personal.some((g0) => {
    const g = g0.toLowerCase();
    if (g.endsWith("/**")) { const base = g.slice(0, -3); return r === base || r.startsWith(base + "/"); }
    return r === g;
  });
}
// True iff `abs` is strictly inside INSTANCE (after the personal/traversal guards) — defense in depth.
function insideInstance(abs) {
  const root = path.resolve(INSTANCE) + path.sep;
  return (path.resolve(abs) + path.sep).startsWith(root);
}

// Enumerate every framework source file (expand dirs recursively).
function walk(absDir, relDir, out) {
  if (!fs.existsSync(absDir)) return;
  for (const e of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = path.join(relDir, e.name);
    if (e.isDirectory()) walk(path.join(absDir, e.name), rel, out);
    else out.push(norm(rel));
  }
}
const frameworkFiles = [];
for (const d of MANIFEST.framework.dirs) walk(path.join(TEMPLATE, d), d, frameworkFiles);
for (const f of MANIFEST.framework.files) if (fs.existsSync(path.join(TEMPLATE, f))) frameworkFiles.push(norm(f));

const created = [], updated = [], unchanged = [], skippedPersonal = [], removed = [];

for (const rel of frameworkFiles) {
  if (isPersonal(rel)) { skippedPersonal.push(rel); continue; }   // hard safety guard (incl. ..-paths)
  const src = path.join(TEMPLATE, rel);
  const dst = path.join(INSTANCE, rel);
  if (!insideInstance(dst)) { skippedPersonal.push(rel); continue; }
  // C2: NEVER follow a symlink at the target — it could point at a personal file (canon!), and
  // copyFileSync would write through it. Detect via lstat; replace the link with a real file.
  let lst = null; try { lst = fs.lstatSync(dst); } catch {}
  const isLink = !!lst?.isSymbolicLink();
  const exists = lst != null;
  if (!isLink && exists && hash(src) === hash(dst)) { unchanged.push(rel); continue; }
  (exists ? updated : created).push(rel);
  if (!DRY && !CHECK) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (isLink) fs.unlinkSync(dst);            // drop the symlink (its target is left untouched)
    fs.copyFileSync(src, dst);
  }
}

// OBSOLETED: delete from instance (never if personal, never via .., never outside the instance).
for (const rel of MANIFEST.obsoleted || []) {
  const r = norm(rel);
  if (isPersonal(r)) continue;
  const dst = path.join(INSTANCE, r);
  if (!insideInstance(dst)) continue;
  let lst = null; try { lst = fs.lstatSync(dst); } catch {}
  if (lst) { removed.push(r); if (!DRY && !CHECK) { if (lst.isSymbolicLink()) fs.unlinkSync(dst); else fs.rmSync(dst, { recursive: true, force: true }); } }
}

const changes = created.length + updated.length + removed.length;
const mode = DRY ? "DRY-RUN" : CHECK ? "CHECK" : "APPLY";
console.log(`\n  Astrolabe sync [${mode}]  ${TEMPLATE}  →  ${INSTANCE}`);
console.log(`  framework files: ${frameworkFiles.length} · created ${created.length} · updated ${updated.length} · unchanged ${unchanged.length} · obsoleted ${removed.length} · personal-skipped ${skippedPersonal.length}`);
const show = (label, list) => { if (list.length) console.log(`  ${label}:\n` + list.map((x) => `    + ${x}`).join("\n")); };
show("created", created); show("updated", updated); show("obsoleted (deleted)", removed);
if (skippedPersonal.length) console.log(`  ⚠ personal-guarded (NOT written): ${skippedPersonal.join(", ")}`);

if (CHECK) {
  console.log(changes ? `\n  ✗ DRIFT — ${changes} framework file(s) differ from template\n` : `\n  ✓ in sync — no framework drift\n`);
  process.exit(changes ? 1 : 0);
}
if (DRY) { console.log(`\n  (dry-run — nothing written)\n`); process.exit(0); }

// Real apply: provenance + re-validate.
if (changes) {
  const logLine = `- sync ${new Date().toISOString?.() ?? ""} — created ${created.length}, updated ${updated.length}, obsoleted ${removed.length} (from template)\n`;
  const logPath = path.join(INSTANCE, ".claude", "SYNC-LOG.md");
  const header = fs.existsSync(logPath) ? "" : "# Sync Log\n\nAppend-only record of framework rollouts from the Astrolabe template.\n\n";
  fs.appendFileSync(logPath, header + logLine);
}
console.log(`\n  re-validating instance …`);
try {
  const out = execFileSync("node", [path.join(INSTANCE, ".claude/calc/eval.mjs"), "--quiet"], { encoding: "utf8" });
  console.log("  " + out.trim());
  process.exit(/PASS/.test(out) ? 0 : 1);
} catch (e) {
  console.log("  " + ((e.stdout || "") + (e.stderr || "")).trim());
  console.log("  ✗ instance eval did NOT pass after sync — investigate before committing.");
  process.exit(1);
}

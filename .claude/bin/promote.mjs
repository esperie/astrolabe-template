#!/usr/bin/env node
/**
 * promote.mjs — roll framework changes UP from a working INSTANCE into the Astrolabe TEMPLATE
 * (the master). The reverse of sync.mjs, and the DANGEROUS direction: the template is the
 * shareable, de-personalized source of truth, so a promote must never carry an instance's personal
 * data upward. Three independent guards enforce that:
 *
 *   1. PERSONAL guard — only MANIFEST framework paths are eligible. canon / docs / profile / private
 *      oracle suites / CLAUDE.md / birth.json / eval-extra.json are personal and are NEVER promoted
 *      (same hard guard as sync, incl. ..-paths and case-fold).
 *   2. TEMPLATE-PARITY guard — only a file that ALREADY EXISTS in the template is promoted. A brand-
 *      new file in the instance is NOT auto-promoted (add it to sync-manifest.json first, on purpose).
 *      This stops an instance's private extras that happen to live inside a framework dir (e.g. a
 *      family-tuned bazi.test.mjs in calc/) from leaking up — they aren't in the template, so they
 *      are never eligible.
 *   3. DE-PERSONALIZATION scan — every file about to be promoted is scanned for the owner's personal
 *      tokens (name words + birth coordinates from birth.json, plus optional .claude/bin/
 *      promote-deny.json terms: client names, etc.). ANY hit → REFUSE that file and FAIL CLOSED.
 *
 *   node .claude/bin/promote.mjs <instance-dir>            # apply (template ← instance, framework only)
 *   node .claude/bin/promote.mjs <instance-dir> --dry-run  # preview, write nothing
 *   node .claude/bin/promote.mjs <instance-dir> --check    # report up-drift; exit 1 if any (CI / rollout)
 *
 * Run from the TEMPLATE (this tool is template-only — it is NOT in the framework set, so sync never
 * copies it to an instance, where it would mis-locate the template). After a real apply: append
 * template/.claude/PROMOTE-LOG.md and re-run the template's eval (public-validation must stay green).
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
  console.error("usage: node .claude/bin/promote.mjs <instance-dir> [--dry-run|--check]");
  process.exit(2);
}
const INSTANCE = path.resolve(instanceArg);
if (!fs.existsSync(path.join(INSTANCE, ".claude"))) {
  console.error(`✗ not an Astrolabe instance (no .claude/): ${INSTANCE}`);
  process.exit(2);
}
if (path.resolve(INSTANCE) === TEMPLATE) {
  console.error("✗ refusing to promote the template onto itself");
  process.exit(2);
}

const hash = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");
const norm = (rel) => rel.split(path.sep).join("/");

// PERSONAL matcher — identical contract to sync.mjs (exact path or `dir/**` prefix; case-folded;
// any `..` path is personal-blocked). The shared guard means a mis-declared framework file can
// never clobber a personal one in either direction.
function isPersonal(rel) {
  const r = norm(rel).toLowerCase();
  if (r.split("/").includes("..")) return true;
  return MANIFEST.personal.some((g0) => {
    const g = g0.toLowerCase();
    if (g.endsWith("/**")) { const base = g.slice(0, -3); return r === base || r.startsWith(base + "/"); }
    return r === g;
  });
}
const insideTemplate = (abs) => (path.resolve(abs) + path.sep).startsWith(path.resolve(TEMPLATE) + path.sep);

// Derive the owner's personal-token set for the de-personalization scan (guard 3).
function personalTokens(instanceDir) {
  const toks = new Set();
  const STOP = new Set(["canon", "chart", "sample", "public", "the", "and", "male", "female"]);
  try {
    const b = JSON.parse(fs.readFileSync(path.join(instanceDir, ".claude/calc/birth.json"), "utf8"));
    for (const w of String(b.label || "").split(/[^A-Za-z一-鿿]+/)) {
      const lw = w.toLowerCase();
      if (lw.length >= 3 && !STOP.has(lw)) toks.add(lw);
    }
    for (const k of ["longitude", "latitude"]) if (b[k] != null) toks.add(String(b[k]).toLowerCase());
  } catch { /* no birth.json (bare instance) — name/coords contribute no tokens */ }
  try {
    const extra = JSON.parse(fs.readFileSync(path.join(instanceDir, ".claude/bin/promote-deny.json"), "utf8"));
    for (const t of extra || []) { const s = String(t).trim().toLowerCase(); if (s) toks.add(s); }
  } catch { /* optional */ }
  return [...toks];
}
const TOKENS = personalTokens(INSTANCE);
function scanLeak(absFile) {
  const text = fs.readFileSync(absFile, "utf8").toLowerCase();
  return TOKENS.filter((t) => text.includes(t));
}

// Eligible framework files = the canonical framework set (walk the TEMPLATE's framework dirs + files).
// Promoting from the template's own list — not the instance's — is the template-parity guard: a file
// the template doesn't have is simply not in this set.
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

const promoted = [], unchanged = [], skippedAbsent = [], skippedPersonal = [], refused = [];

for (const rel of frameworkFiles) {
  if (isPersonal(rel)) { skippedPersonal.push(rel); continue; }      // guard 1
  const src = path.join(INSTANCE, rel);   // the instance's (newer) version
  const dst = path.join(TEMPLATE, rel);   // the template master
  if (!insideTemplate(dst)) { skippedPersonal.push(rel); continue; }
  // C2: never follow a symlink at the instance source — read the real file or skip.
  let lst = null; try { lst = fs.lstatSync(src); } catch {}
  if (lst?.isSymbolicLink()) { skippedAbsent.push(rel + " (symlink — skipped)"); continue; }
  if (lst == null) { skippedAbsent.push(rel); continue; }            // guard 2: instance lacks it
  if (hash(src) === hash(dst)) { unchanged.push(rel); continue; }
  const hits = scanLeak(src);                                        // guard 3
  if (hits.length) { refused.push({ rel, hits }); continue; }
  promoted.push(rel);
}
// PLAN is fully computed above with ZERO writes — so a leak in ANY file aborts the WHOLE promote
// before a single byte is written (atomic fail-closed), not after some files already landed.

const mode = DRY ? "DRY-RUN" : CHECK ? "CHECK" : "APPLY";
console.log(`\n  Astrolabe promote [${mode}]  ${INSTANCE}  →  ${TEMPLATE}`);
console.log(`  framework files: ${frameworkFiles.length} · promoted ${promoted.length} · unchanged ${unchanged.length} · instance-absent ${skippedAbsent.length} · personal-skipped ${skippedPersonal.length} · REFUSED ${refused.length}`);
const show = (label, list) => { if (list.length) console.log(`  ${label}:\n` + list.map((x) => `    + ${x}`).join("\n")); };
show(DRY || CHECK ? "would promote" : "promoted", promoted);
if (refused.length) {
  console.log(`\n  ✗ REFUSED — personal tokens found (de-personalize before promoting):`);
  for (const r of refused) console.log(`    ✗ ${r.rel}  (matched: ${r.hits.join(", ")})`);
}
if (skippedPersonal.length) console.log(`  ⚠ personal-guarded (NOT promoted): ${skippedPersonal.join(", ")}`);

// FAIL CLOSED on any refusal — a leak attempt must never exit 0.
if (refused.length) { console.log(`\n  ✗ ${refused.length} file(s) blocked by the de-personalization scan — nothing was written.\n`); process.exit(1); }

if (CHECK) {
  console.log(promoted.length ? `\n  ✗ UP-DRIFT — ${promoted.length} framework file(s) ahead of template (promotable)\n` : `\n  ✓ template up to date — no promotable changes\n`);
  process.exit(promoted.length ? 1 : 0);
}
if (DRY) { console.log(`\n  (dry-run — nothing written)\n`); process.exit(0); }

// Write phase — reached only when refused.length === 0 (no leak). Atomic w.r.t. the scan.
for (const rel of promoted) fs.copyFileSync(path.join(INSTANCE, rel), path.join(TEMPLATE, rel));

if (promoted.length) {
  const logLine = `- promote ${new Date().toISOString?.() ?? ""} — ${promoted.length} file(s) from ${path.basename(INSTANCE)}: ${promoted.join(", ")}\n`;
  const logPath = path.join(TEMPLATE, ".claude", "PROMOTE-LOG.md");
  const header = fs.existsSync(logPath) ? "" : "# Promote Log\n\nAppend-only record of framework changes promoted UP from instances into the template.\n\n";
  fs.appendFileSync(logPath, header + logLine);
}
console.log(`\n  re-validating template …`);
try {
  const out = execFileSync("node", [path.join(TEMPLATE, ".claude/calc/eval.mjs"), "--quiet"], { encoding: "utf8" });
  console.log("  " + out.trim());
  process.exit(/PASS/.test(out) ? 0 : 1);
} catch (e) {
  console.log("  " + ((e.stdout || "") + (e.stderr || "")).trim());
  console.log("  ✗ template eval did NOT pass after promote — investigate before committing.");
  process.exit(1);
}

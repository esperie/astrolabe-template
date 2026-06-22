#!/usr/bin/env node
/**
 * rollout.mjs — the full fan-out for the "develop in a working instance, roll out" workflow.
 *   1. PROMOTE framework changes UP from the dev instance (default set below) into the template.
 *   2. SYNC the template DOWN into every instance (the dev instance + its siblings).
 *
 * Promote runs first and is fail-closed: if its de-personalization scan refuses anything, or the
 * template fails to re-validate, the rollout ABORTS before syncing anything downward — so a leak or
 * a broken framework never propagates to the family instances.
 *
 *   node .claude/bin/rollout.mjs                  # promote the dev instance → template, then sync ALL instances
 *   node .claude/bin/rollout.mjs --dry-run        # preview every step, write nothing
 *   node .claude/bin/rollout.mjs --from <instance> # use a different dev instance as the promote source
 *
 * Template-only (NOT in the framework set, so sync never copies it to an instance). Instances are
 * discovered as sibling dirs of the template that contain a .claude/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(__dirname, "..", "..");
const PARENT = path.resolve(TEMPLATE, "..");

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const DRY = flags.has("--dry-run");
const fromArg =
  (argv.find((a) => a.startsWith("--from=")) || "").split("=")[1] ||
  (argv.includes("--from") ? argv[argv.indexOf("--from") + 1] : "") ||
  "esperie";

// Instances = sibling dirs of the template that have a .claude/ (excluding the template itself).
const ALL = fs.readdirSync(PARENT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => path.join(PARENT, e.name))
  .filter((p) => p !== TEMPLATE && fs.existsSync(path.join(p, ".claude")))
  .sort();

const FROM = path.join(PARENT, fromArg);
if (!ALL.includes(FROM)) { console.error(`✗ dev instance not found among instances: ${FROM}`); process.exit(2); }

const sh = (script, args) => {
  try { return { out: execFileSync("node", [path.join(__dirname, script), ...args], { encoding: "utf8" }), code: 0 }; }
  catch (e) { return { out: (e.stdout || "") + (e.stderr || ""), code: e.status ?? 1 }; }
};

console.log(`\n══ Astrolabe rollout ${DRY ? "[DRY-RUN] " : ""}══`);
console.log(`  promote source (dev instance): ${path.basename(FROM)}`);
console.log(`  sync targets: ${ALL.map((p) => path.basename(p)).join(", ")}`);

// 1. promote dev instance → template (fail-closed gate)
console.log(`\n── 1. promote ${path.basename(FROM)} → template ──`);
const prom = sh("promote.mjs", DRY ? [FROM, "--dry-run"] : [FROM]);
process.stdout.write(prom.out);
if (prom.code !== 0) {
  console.error(`\n✗ promote did NOT succeed (de-personalization refusal or template eval failure) — ABORTING before any downward sync.\n`);
  process.exit(1);
}

// 2. sync template → every instance
let failures = 0;
for (const inst of ALL) {
  console.log(`\n── 2. sync template → ${path.basename(inst)} ──`);
  const s = sh("sync.mjs", DRY ? [inst, "--dry-run"] : [inst]);
  process.stdout.write(s.out);
  if (s.code !== 0) { failures++; console.error(`  ✗ sync to ${path.basename(inst)} did not pass`); }
}

console.log(`\n══ rollout ${DRY ? "preview " : ""}complete — ${ALL.length} instance(s)${failures ? `, ${failures} FAILED` : ", all green"} ══\n`);
process.exit(failures ? 1 : 0);

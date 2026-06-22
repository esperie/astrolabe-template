#!/usr/bin/env node
/**
 * eval.mjs — the reusable evaluation harness for ALL deterministic implementations in
 * this repo (the 命理 calculators, the canon-consistency guard, the protection hooks,
 * and any future system — e.g. 铁板神数 起数). One command, one verdict.
 *
 *   node .claude/calc/eval.mjs            # human report + overall PASS/FAIL (exit 0/1)
 *   node .claude/calc/eval.mjs --json     # machine-readable JSON
 *   node .claude/calc/eval.mjs --quiet    # just the verdict line
 *
 * What it does:
 *   1. DISCOVERS every *.test.mjs under .claude/calc and .claude/hooks (future-proof:
 *      a new system's test file is picked up automatically).
 *   2. RUNS each suite, parses its pass/fail tally, and checks the suite's exit code.
 *   3. CHECKS each against the META registry below — expected pass count (catches silent
 *      test-count DRIFT, e.g. a deleted assertion), the validation ORACLE it leans on,
 *      and the known RESIDUALS. A suite with no META entry still runs (flagged "unregistered").
 *   4. Emits a table + a single convergence VERDICT; exits non-zero on ANY failure,
 *      count drift, or crash — so /vet, the Stop gate, and CI can all gate on it.
 *
 * To register a NEW implementation: add its `<name>.test.mjs` (validated against an
 * external oracle) and one META entry. That is the whole contract.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const DIRS = [path.join(ROOT, ".claude/calc"), path.join(ROOT, ".claude/hooks")];

// Registry: expected pass count + oracle + residuals per suite. `expect:null` = run but
// don't pin a count (e.g. counts still stabilising). Keep counts in sync as suites grow.
const META = {
  "astro.test.mjs":            { system: "astro (ephemeris core)", expect: 6,   oracle: "Meeus / known 节气 instants", residual: "—" },
  "public-validation.test.mjs":{ system: "public chart (Einstein)", expect: 13, oracle: "Astro-Databank AA · published BaZi · Lagna360/AstroSage · JPL", residual: "ziwei/qimen = regression locks (no public oracle); Moon ±0.3° (UT/ephemeris)" },
  "canon-consistency.test.mjs":{ system: "canon ↔ calculators",    expect: 7,   oracle: "instance canon.md §2/5/6/7/8/13", residual: "—", perPerson: true },
  "canon-guard.test.mjs":      { system: "canon-guard hook",        expect: 60,  oracle: "deny/allow vectors",          residual: "—" },
  "vet-gate.test.mjs":         { system: "vet-gate hook",           expect: 9,   oracle: "Stop-gate scenarios",         residual: "—" },
};

const flags = new Set(process.argv.slice(2));
const json = flags.has("--json"), quiet = flags.has("--quiet");

function parseTally(out) {
  // Take the LAST tally line — suites may print intermediate sub-totals (e.g. vedic's L1
  // block prints "30 passed" before the final "137 passed").
  const slash = [...out.matchAll(/(\d+)\s*\/\s*(\d+)\s+passed/g)];   // "43/43 passed"
  const verbose = [...out.matchAll(/(\d+)\s+passed,\s+(\d+)\s+failed/g)]; // "137 passed, 0 failed"
  if (verbose.length) { const m = verbose[verbose.length - 1]; return { pass: +m[1], total: +m[1] + +m[2], fail: +m[2] }; }
  if (slash.length) { const m = slash[slash.length - 1]; return { pass: +m[1], total: +m[2], fail: +m[2] - +m[1] }; }
  return null;
}

const suites = [];
for (const dir of DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".test.mjs")).sort()) {
    suites.push({ file: f, dirPath: path.join(dir, f) });
  }
}

const results = [];
for (const s of suites) {
  const meta = META[s.file] || { system: s.file.replace(".test.mjs", ""), expect: null, oracle: "—", residual: "(unregistered)" };
  let out = "", code = 0, crash = null;
  try {
    out = execFileSync("node", [s.dirPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    code = e.status ?? 1;
    out = (e.stdout || "") + (e.stderr || "");
    if (e.status == null) crash = e.message;
  }
  const tally = parseTally(out);
  const ranOk = code === 0 && tally && tally.fail === 0;
  const drift = meta.expect != null && tally && tally.pass !== meta.expect;
  const registered = !!META[s.file];
  const ok = ranOk && !drift && !crash;
  results.push({ ...meta, file: s.file, registered, pass: tally?.pass ?? null, total: tally?.total ?? null, fail: tally?.fail ?? null, code, drift, crash, ok });
}

// Integrity (NEW-3): a META entry with no matching discovered file = a suite was deleted/renamed
// → silent coverage loss. Fail closed. EXCEPT per-person suites (e.g. canon-consistency), which are
// generated at onboarding — absent in the bare template, enforced once an instance has a canon.
// (NEW-1): suites with no count-pin are surfaced loudly.
const orphanMeta = Object.keys(META).filter((k) => !META[k].perPerson && !suites.some((s) => s.file === k));
const unregistered = results.filter((r) => !r.registered).map((r) => r.file);
const allOk = results.every((r) => r.ok) && orphanMeta.length === 0;
const totalPass = results.reduce((a, r) => a + (r.pass || 0), 0);

if (json) {
  console.log(JSON.stringify({ verdict: allOk ? "PASS" : "FAIL", totalPass, suites: results }, null, 2));
} else {
  if (!quiet) {
    console.log("\n  EVAL HARNESS — deterministic implementations\n");
    for (const r of results) {
      const mark = r.ok ? "✓" : "✗";
      const cnt = r.pass == null ? "CRASH" : `${r.pass}${r.total ? "/" + r.total : ""}`;
      const exp = r.expect == null ? "" : (r.drift ? ` ⚠DRIFT exp${r.expect}` : ` (exp ${r.expect})`);
      console.log(`  ${mark} ${r.system.padEnd(26)} ${String(cnt).padStart(8)}${exp}`);
      if (!r.ok) console.log(`      ↳ ${r.crash ? "crash: " + r.crash : r.drift ? "count drift" : "exit " + r.code + " / failures"}`);
      if (r.residual && r.residual !== "—") console.log(`      residual: ${r.residual}`);
    }
    if (orphanMeta.length) console.log(`\n  ✗ ORPHAN META (registered suite missing from disk — coverage lost): ${orphanMeta.join(", ")}`);
    if (unregistered.length) console.log(`\n  ⚠ UNREGISTERED (ran, but no count-pin — add a META entry): ${unregistered.join(", ")}`);
    console.log(`\n  oracles: [reference] · LifeDNA · Jagannatha Hora · JPL Horizons · Meeus/转盘 rules`);
  }
  const warn = unregistered.length ? ` · ⚠${unregistered.length} unregistered` : "";
  console.log(`\n  VERDICT: ${allOk ? "PASS" : "FAIL"} — ${results.filter((r) => r.ok).length}/${results.length} suites, ${totalPass} assertions passing${warn}\n`);
}
process.exit(allOk ? 0 : 1);

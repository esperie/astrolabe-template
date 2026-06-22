#!/usr/bin/env node
/**
 * sync.test.mjs — end-to-end test for sync.mjs. Builds a throwaway instance in a temp dir,
 * mutates framework + personal files, and asserts the sync contract: framework files update,
 * personal files are NEVER touched (even when they live inside a framework dir, e.g.
 * learned-instincts.md), drift is detected, dry-run writes nothing, and apply re-validates.
 *
 * Standalone (not in the chart-math eval gate — sync is infra). Run:
 *   node .claude/bin/sync.test.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.resolve(__dirname, "..", "..");
const sync = path.join(__dirname, "sync.mjs");
const INST = path.join(os.tmpdir(), "astrolabe-synctest-" + process.pid);

const h = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");
let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const run = (args) => { try { return { out: execFileSync("node", [sync, INST, ...args], { encoding: "utf8" }), code: 0 }; } catch (e) { return { out: (e.stdout || "") + (e.stderr || ""), code: e.status ?? 1 }; } };

try {
  // 1. fresh instance = copy of template
  fs.rmSync(INST, { recursive: true, force: true });
  fs.cpSync(TEMPLATE, INST, { recursive: true });

  // 2. give it a personal identity
  fs.writeFileSync(path.join(INST, "CLAUDE.md"), "# My custom instance\nPersonal — do not clobber.\n");
  fs.mkdirSync(path.join(INST, ".claude/canon"), { recursive: true });
  fs.writeFileSync(path.join(INST, ".claude/canon/canon.md"), "<!-- GUARDRAILS:START -->\nmy birth data\n<!-- GUARDRAILS:END -->\n");
  fs.mkdirSync(path.join(INST, "docs"), { recursive: true });
  fs.writeFileSync(path.join(INST, "docs/mine.md"), "my private notes\n");
  fs.writeFileSync(path.join(INST, ".claude/rules/learned-instincts.md"), "# Learned Instincts\nMY evolved instincts — personal.\n");
  fs.writeFileSync(path.join(INST, ".claude/calc/canon-consistency.test.mjs"),
    'let p=0;for(let i=0;i<7;i++){console.log("PASS x"+i);p++;}console.log("\\n"+p+"/"+p+" passed");process.exit(0);\n');

  const personal = {
    "CLAUDE.md": "CLAUDE.md",
    "canon": ".claude/canon/canon.md",
    "docs": "docs/mine.md",
    "instincts": ".claude/rules/learned-instincts.md",
    "consistency": ".claude/calc/canon-consistency.test.mjs",
  };
  const before = Object.fromEntries(Object.entries(personal).map(([k, v]) => [k, h(path.join(INST, v))]));

  // 3. create framework DRIFT in the instance
  const fwRel = ".claude/rules/git.md";
  const fwTemplateHash = h(path.join(TEMPLATE, fwRel));
  fs.appendFileSync(path.join(INST, fwRel), "\nINSTANCE-LOCAL DRIFT (should be reverted by sync)\n");
  ok("setup: instance framework file drifted", h(path.join(INST, fwRel)) !== fwTemplateHash);

  // 4. --check detects drift, exits 1
  const chk = run(["--check"]);
  ok("--check reports drift + exits 1", chk.code === 1 && /DRIFT/.test(chk.out));

  // 5. --dry-run previews, writes nothing, flags personal guard
  const dry = run(["--dry-run"]);
  ok("--dry-run lists git.md as updated", /updated 1/.test(dry.out) && /git\.md/.test(dry.out));
  ok("--dry-run wrote nothing (still drifted)", h(path.join(INST, fwRel)) !== fwTemplateHash);
  ok("--dry-run flags learned-instincts as personal-guarded", /personal-guarded/.test(dry.out) && /learned-instincts/.test(dry.out));

  // 6. apply
  const app = run([]);
  ok("apply restores git.md to template version", h(path.join(INST, fwRel)) === fwTemplateHash);
  ok("apply re-validates instance to PASS", /VERDICT: PASS/.test(app.out));
  ok("apply wrote a SYNC-LOG.md", fs.existsSync(path.join(INST, ".claude/SYNC-LOG.md")));

  // 7. personal files UNTOUCHED
  for (const [k, v] of Object.entries(personal)) ok(`personal preserved: ${k}`, h(path.join(INST, v)) === before[k]);

  // 8. idempotent
  const app2 = run([]);
  ok("second apply is clean (no framework drift)", /created 0 · updated 0/.test(app2.out));

  // 9. C2 — a symlink at a framework target must NOT clobber its (personal) link-target
  const canonBytes = fs.readFileSync(path.join(INST, ".claude/canon/canon.md"));
  fs.unlinkSync(path.join(INST, ".claude/calc/astro.test.mjs"));
  fs.symlinkSync("../canon/canon.md", path.join(INST, ".claude/calc/astro.test.mjs")); // evil: point a framework file at the canon
  run([]);
  ok("C2: symlinked framework target does NOT clobber the canon", fs.readFileSync(path.join(INST, ".claude/canon/canon.md")).equals(canonBytes));
  ok("C2: the symlink was replaced by a real framework file", !fs.lstatSync(path.join(INST, ".claude/calc/astro.test.mjs")).isSymbolicLink());
} finally {
  fs.rmSync(INST, { recursive: true, force: true });
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

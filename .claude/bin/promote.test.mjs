#!/usr/bin/env node
/**
 * promote.test.mjs — adversarial end-to-end test for promote.mjs (instance → template, the
 * dangerous direction). Builds a throwaway TEMPLATE (copy of the real one) + a throwaway INSTANCE,
 * then asserts the three guards + atomicity:
 *   1. a changed framework file IS promoted up;
 *   2. a personal file living inside a framework dir (learned-instincts, birth.json, eval-extra) is
 *      NEVER promoted, even when changed;
 *   3. a NEW instance file the template lacks is NOT promoted (template-parity guard);
 *   4. the de-personalization scan REFUSES a framework file carrying an owner token (name OR birth
 *      coordinate), exits 1, and — atomically — writes NOTHING (a good change in the same run is
 *      NOT promoted either);
 *   5. --dry-run / --check write nothing and report correctly.
 *
 * Run from the TEMPLATE: node .claude/bin/promote.test.mjs   (standalone — sync/promote are infra).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL_TEMPLATE = path.resolve(__dirname, "..", "..");
const ROOT = path.join(os.tmpdir(), "astrolabe-promotetest-" + process.pid);
const TPL = path.join(ROOT, "template");          // throwaway template (write target)
const INST = path.join(ROOT, "instance");         // throwaway instance (source)
const promote = path.join(TPL, ".claude/bin/promote.mjs");

const h = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");
let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const run = (args) => { try { return { out: execFileSync("node", [promote, INST, ...args], { encoding: "utf8" }), code: 0 }; } catch (e) { return { out: (e.stdout || "") + (e.stderr || ""), code: e.status ?? 1 }; } };
const w = (base, rel, s) => { fs.mkdirSync(path.dirname(path.join(base, rel)), { recursive: true }); fs.writeFileSync(path.join(base, rel), s); };

try {
  fs.rmSync(ROOT, { recursive: true, force: true });
  fs.cpSync(REAL_TEMPLATE, TPL, { recursive: true });
  fs.cpSync(REAL_TEMPLATE, INST, { recursive: true });   // instance starts identical to template

  // instance identity: a birth.json (owner = "Casimir"; longitude 0.0) + a personal file inside a
  // framework dir. Tokens the scan must catch: "casimir", "0.0", "0.0".
  w(INST, ".claude/calc/birth.json", JSON.stringify({ label: "Casimir Q (canon)", y: 1979, m: 12, d: 14, hour: 15, minute: 5, tz: 7.5, longitude: 0.0, latitude: 0.0, gender: "male" }) + "\n");
  w(INST, ".claude/rules/learned-instincts.md", "# Learned Instincts\nMY evolved instincts — personal.\n");
  w(INST, ".claude/calc/eval-extra.json", '{ "private.test.mjs": { "expect": 9 } }\n');

  // baseline hashes of things that must NOT change in the template
  const instinctsTpl = path.join(TPL, ".claude/rules/learned-instincts.md");
  const birthTpl = path.join(TPL, ".claude/calc/birth.json");

  // ── case 1: a clean framework change is promotable ──
  w(INST, ".claude/rules/no-stubs.md", fs.readFileSync(path.join(INST, ".claude/rules/no-stubs.md"), "utf8") + "\nPROMOTABLE: harmless framework note.\n");

  const chk = run(["--check"]);
  ok("--check reports up-drift + exits 1", chk.code === 1 && /UP-DRIFT/.test(chk.out));
  ok("--check names the promotable file", /no-stubs\.md/.test(chk.out));

  const dry = run(["--dry-run"]);
  ok("--dry-run writes nothing (template no-stubs still original)", !/PROMOTABLE/.test(fs.readFileSync(path.join(TPL, ".claude/rules/no-stubs.md"), "utf8")));

  // ── case 2 + 3: personal files & new files must be ignored ──
  w(INST, ".claude/rules/learned-instincts.md", "# Learned Instincts\nCHANGED — must NOT promote.\n");
  w(INST, ".claude/rules/brandnew.md", "a brand-new rule the template does not have\n");
  const instinctsBefore = h(instinctsTpl);

  const app = run([]);
  ok("apply promotes the clean framework change", /PROMOTABLE/.test(fs.readFileSync(path.join(TPL, ".claude/rules/no-stubs.md"), "utf8")));
  ok("apply re-validates template to PASS", /VERDICT: PASS/.test(app.out));
  ok("apply wrote a PROMOTE-LOG.md", fs.existsSync(path.join(TPL, ".claude/PROMOTE-LOG.md")));
  ok("personal-in-framework-dir NOT promoted (learned-instincts untouched)", h(instinctsTpl) === instinctsBefore);
  ok("personal birth.json NOT promoted into template", !fs.existsSync(birthTpl) || !/casimir/i.test(fs.readFileSync(birthTpl, "utf8")));
  ok("new instance file NOT promoted (template-parity)", !fs.existsSync(path.join(TPL, ".claude/rules/brandnew.md")));

  // idempotent: second apply is clean
  const app2 = run([]);
  ok("second apply clean (template up to date)", /no promotable changes|promoted 0/.test(app2.out));

  // ── case 4: de-personalization scan — atomic fail-closed ──
  // one framework file gets an OWNER TOKEN, another gets a clean change in the SAME run.
  w(INST, ".claude/rules/git.md", fs.readFileSync(path.join(INST, ".claude/rules/git.md"), "utf8") + "\nLEAK: born at longitude 0.0.\n");
  w(INST, ".claude/rules/security.md", fs.readFileSync(path.join(INST, ".claude/rules/security.md"), "utf8") + "\nCLEAN: a harmless note.\n");
  const gitTplBefore = h(path.join(TPL, ".claude/rules/git.md"));
  const secTplBefore = h(path.join(TPL, ".claude/rules/security.md"));

  const leak = run([]);
  ok("scan REFUSES the leaking file + exits 1", leak.code === 1 && /REFUSED/.test(leak.out) && /git\.md/.test(leak.out));
  ok("scan reports the matched token", /103\.85/.test(leak.out));
  ok("ATOMIC: leaking file NOT written to template", h(path.join(TPL, ".claude/rules/git.md")) === gitTplBefore);
  ok("ATOMIC: the CLEAN file in the same run was ALSO not written", h(path.join(TPL, ".claude/rules/security.md")) === secTplBefore);

  // name token also caught
  w(INST, ".claude/rules/git.md", fs.readFileSync(path.join(REAL_TEMPLATE, ".claude/rules/git.md"), "utf8") + "\nApproved by Casimir.\n");
  const leak2 = run([]);
  ok("scan catches a NAME token too (casimir)", leak2.code === 1 && /casimir/i.test(leak2.out));
} finally {
  fs.rmSync(ROOT, { recursive: true, force: true });
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

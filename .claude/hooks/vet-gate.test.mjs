#!/usr/bin/env node
/** vet-gate.test.mjs — fixture transcripts exercise the Stop-hook convergence gate. */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const hook = path.join(here, "vet-gate.js");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vetgate-"));

const U = (text) => ({ type: "user", message: { role: "user", content: [{ type: "text", text }] } });
const Atool = (name, input = {}) => ({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", name, input }] } });
const Atext = (text) => ({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text }] } });
const TR = () => ({ type: "user", message: { role: "user", content: [{ type: "tool_result", content: "ok" }] } });
const transcript = (rows) => { const f = path.join(tmp, "t" + Math.random().toString(36).slice(2) + ".jsonl"); fs.writeFileSync(f, rows.map((r) => JSON.stringify(r)).join("\n")); return f; };
const run = (stop) => { try { return JSON.parse(execFileSync("node", [hook], { input: JSON.stringify(stop), encoding: "utf8" }) || "{}"); } catch (e) { return { __err: e.message }; } };
const blocked = (r) => r?.decision === "block";

let pass = 0, fail = 0;
const ok = (n, c, g = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  " + g}`); c ? pass++ : fail++; };

ok("edits w/o verify → BLOCK", blocked(run({ transcript_path: transcript([U("do X"), Atool("Write", { file_path: "a.md" }), TR()]) })));
ok("bash write w/o verify → BLOCK", blocked(run({ transcript_path: transcript([U("do X"), Atool("Bash", { command: "echo hi >> a.md" }), TR()]) })));
ok("edits + test run → allow", !blocked(run({ transcript_path: transcript([U("do X"), Atool("Write", {}), TR(), Atool("Bash", { command: "node .claude/calc/bazi.test.mjs" }), TR()]) })));
ok("edits + 'all pass' text → allow", !blocked(run({ transcript_path: transcript([U("do X"), Atool("Edit", {}), TR(), Atext("vetted — 42/42 pass, converged")]) })));
ok("edits + Workflow redteam → allow", !blocked(run({ transcript_path: transcript([U("do X"), Atool("Edit", {}), TR(), Atool("Workflow", {}), TR()]) })));
ok("no edits (chat) → allow", !blocked(run({ transcript_path: transcript([U("what is X"), Atext("X is ...")]) })));
ok("read-only bash → allow", !blocked(run({ transcript_path: transcript([U("show X"), Atool("Bash", { command: "cat a.md" }), TR()]) })));
ok("stop_hook_active → allow (no loop)", !blocked(run({ transcript_path: transcript([U("do X"), Atool("Write", {})]), stop_hook_active: true })));
ok("missing transcript → allow (fail-open)", !blocked(run({ transcript_path: "/no/such/file" })));

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

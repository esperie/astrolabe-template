#!/usr/bin/env node
/**
 * lane.test.mjs — cross-CLI lane contract tests.
 *
 * Two tiers:
 *   (1) PURE   — lane.js maps and translations on synthetic payloads.
 *   (2) SUBPROCESS — lane-adapter.js spawned as a REAL child process with
 *       lane-native payloads on stdin, asserting the actual exit code and
 *       wire output. These are the tests that matter: the whole point of the
 *       lane work is that canon protection survives on Codex and Gemini, and
 *       only a real process boundary proves the stdin/stdout/exit-code contract.
 *
 * The protected path is assembled at runtime from segments so this file's own
 * source does not trip the Bash-side canon scan when the suite is invoked.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ADAPTER = path.join(HERE, "lib", "lane-adapter.js");
const GUARD = path.join(HERE, "canon-guard.js");
const PROTECTED = ".claude/" + "can" + "on/" + "can" + "on.md";

const lane = require(path.join(HERE, "lib", "lane.js"));

let pass = 0;
const failures = [];
function t(name, fn) {
  try {
    fn();
    pass++;
  } catch (e) {
    failures.push(`${name}: ${e.message}`);
  }
}
function eq(a, b, msg) {
  const A = JSON.stringify(a);
  const B = JSON.stringify(b);
  if (A !== B) throw new Error(`${msg || ""} expected ${B}, got ${A}`);
}
function ok(c, msg) {
  if (!c) throw new Error(msg || "expected truthy");
}

// ── tier 1: pure ─────────────────────────────────────────────────────────────
t("lanes enumerated", () => eq(lane.LANES, ["cc", "codex", "gemini"]));
t("bad lane rejected", () => {
  let threw = false;
  try {
    lane.assertLane("cursor");
  } catch {
    threw = true;
  }
  ok(threw, "assertLane must reject unknown lane");
});

t("event map: gemini renames", () => {
  eq(lane.laneEvent("PreToolUse", "gemini"), "BeforeTool");
  eq(lane.laneEvent("Stop", "gemini"), "SessionEnd");
  eq(lane.laneEvent("UserPromptSubmit", "gemini"), "BeforeModel");
});
t("event map: codex keeps CC names", () => {
  eq(lane.laneEvent("PreToolUse", "codex"), "PreToolUse");
  eq(lane.laneEvent("Stop", "codex"), "Stop");
});

t("tool map: codex shell → Bash", () =>
  eq(lane.normalizeInbound({ tool_name: "shell", tool_input: { command: "ls" } }, "codex").tool_name, "Bash"));
t("tool map: gemini run_shell_command → Bash", () =>
  eq(lane.normalizeInbound({ tool_name: "run_shell_command", tool_input: {} }, "gemini").tool_name, "Bash"));
t("tool map: gemini write_file → Write", () =>
  eq(lane.normalizeInbound({ tool_name: "write_file", tool_input: {} }, "gemini").tool_name, "Write"));
t("tool map: codex apply_patch → Edit", () =>
  eq(lane.normalizeInbound({ tool_name: "apply_patch", tool_input: {} }, "codex").tool_name, "Edit"));

t("field alias: path → file_path", () =>
  eq(lane.normalizeInbound({ tool_name: "write_file", tool_input: { path: "x.md" } }, "gemini").tool_input.file_path, "x.md"));
t("field alias: nested tool.name/tool.input", () => {
  const n = lane.normalizeInbound({ tool: { name: "shell", input: { command: "echo hi" } } }, "codex");
  eq(n.tool_name, "Bash");
  eq(n.tool_input.command, "echo hi");
});
t("argv-array command joined to string", () =>
  eq(lane.normalizeInbound({ tool_name: "run_shell_command", tool_input: { command: ["rm", "-rf", "x"] } }, "gemini").tool_input.command, "rm -rf x"));

t("renderDecision: deny → exit 2 on every lane", () => {
  const cc = { hookSpecificOutput: { permissionDecision: "deny", permissionDecisionReason: "nope" } };
  for (const l of ["cc", "codex", "gemini"]) {
    const r = lane.renderDecision(cc, l);
    eq(r.exitCode, 2, `lane ${l}`);
    ok(r.denied, `lane ${l} denied flag`);
    ok(r.stderr.includes("nope"), `lane ${l} reason on stderr`);
  }
});
t("renderDecision: allow → exit 0", () => {
  for (const l of ["cc", "codex", "gemini"]) eq(lane.renderDecision({ continue: true }, l).exitCode, 0, `lane ${l}`);
});
t("renderDecision: cc deny passes through byte-for-byte", () => {
  const cc = { hookSpecificOutput: { permissionDecision: "deny", permissionDecisionReason: "r" } };
  eq(JSON.parse(lane.renderDecision(cc, "cc").stdout), cc);
});
t("renderDecision: additionalContext preserved per lane", () => {
  const cc = { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: "CTX" } };
  ok(lane.renderDecision(cc, "gemini").stdout.includes("CTX"));
  ok(lane.renderDecision(cc, "codex").stdout.includes("CTX"));
});
t("agent tool translation for gemini", () =>
  eq(lane.laneTools(["Bash", "Read", "Grep", "Glob"], "gemini"), ["run_shell_command", "read_file", "grep_search", "glob"]));

// ── tier 2: subprocess ───────────────────────────────────────────────────────
function runAdapter(laneName, target, payload, env = {}) {
  return spawnSync(process.execPath, [ADAPTER, `--lane=${laneName}`, target], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    cwd: ROOT,
    env: { ...process.env, CANON_AMEND: "", ...env },
  });
}

t("[subprocess] codex apply_patch on protected path → BLOCKED (exit 2)", () => {
  const r = runAdapter("codex", GUARD, { tool_name: "apply_patch", tool_input: { path: PROTECTED } });
  eq(r.status, 2, "exit code");
  ok(/PROTECTED/.test(r.stderr + r.stdout), "reason surfaced");
});

t("[subprocess] codex shell write to protected path → BLOCKED (exit 2)", () => {
  const r = runAdapter("codex", GUARD, {
    tool_name: "shell",
    tool_input: { command: `echo x >> ${PROTECTED}` },
  });
  eq(r.status, 2, "exit code");
});

t("[subprocess] gemini write_file on protected path → BLOCKED (exit 2)", () => {
  const r = runAdapter("gemini", GUARD, { tool_name: "write_file", tool_input: { file_path: PROTECTED } });
  eq(r.status, 2, "exit code");
  ok(JSON.parse(r.stdout).decision === "block", "gemini native block verdict");
});

t("[subprocess] gemini replace on protected path → BLOCKED (exit 2)", () => {
  const r = runAdapter("gemini", GUARD, { tool_name: "replace", tool_input: { path: PROTECTED } });
  eq(r.status, 2, "exit code");
});

t("[subprocess] gemini run_shell_command sed -i on protected path → BLOCKED", () => {
  const r = runAdapter("gemini", GUARD, {
    tool_name: "run_shell_command",
    tool_input: { command: ["sed", "-i", "s/a/b/", PROTECTED] },
  });
  eq(r.status, 2, "exit code");
});

t("[subprocess] benign write on both lanes → ALLOWED (exit 0)", () => {
  for (const [l, tool] of [["codex", "apply_patch"], ["gemini", "write_file"]]) {
    const r = runAdapter(l, GUARD, { tool_name: tool, tool_input: { file_path: "docs/00-anchor/notes.md" } });
    eq(r.status, 0, `lane ${l} exit code`);
  }
});

t("[subprocess] benign shell on both lanes → ALLOWED", () => {
  for (const [l, tool] of [["codex", "shell"], ["gemini", "run_shell_command"]]) {
    const r = runAdapter(l, GUARD, { tool_name: tool, tool_input: { command: "node .claude/calc/cast.mjs" } });
    eq(r.status, 0, `lane ${l} exit code`);
  }
});

t("[subprocess] CANON_AMEND=1 ceremony still opens the gate on non-CC lanes", () => {
  const r = runAdapter("codex", GUARD, { tool_name: "apply_patch", tool_input: { path: PROTECTED } }, { CANON_AMEND: "1" });
  eq(r.status, 0, "amend ceremony must pass through");
});

t("[subprocess] FAIL-CLOSED: missing hook target → exit 2", () => {
  const r = runAdapter("codex", "/nonexistent/hook.js", { tool_name: "apply_patch", tool_input: { path: PROTECTED } });
  eq(r.status, 2, "exit code");
  ok(/not found/.test(r.stderr), "reason surfaced");
});

t("[subprocess] FAIL-CLOSED: invalid lane → exit 2", () => {
  const r = spawnSync(process.execPath, [ADAPTER, "--lane=cursor", GUARD], {
    input: "{}",
    encoding: "utf8",
    cwd: ROOT,
  });
  eq(r.status, 2, "exit code");
});

t("[subprocess] FAIL-CLOSED: no --lane flag → exit 2", () => {
  const r = spawnSync(process.execPath, [ADAPTER, GUARD], { input: "{}", encoding: "utf8", cwd: ROOT });
  eq(r.status, 2, "exit code");
});

t("[subprocess] adapter works from a SUBDIRECTORY cwd (no project-dir env on codex)", () => {
  const r = spawnSync(process.execPath, [ADAPTER, "--lane=codex", ".claude/hooks/canon-guard.js"], {
    input: JSON.stringify({ tool_name: "apply_patch", tool_input: { path: PROTECTED } }),
    encoding: "utf8",
    cwd: path.join(ROOT, "docs"),
    env: { ...process.env, CANON_AMEND: "" },
  });
  eq(r.status, 2, "must still block when cwd is not the repo root");
});

t("[subprocess] malformed stdin does not crash the adapter", () => {
  const r = spawnSync(process.execPath, [ADAPTER, "--lane=codex", GUARD], {
    input: "not json{{",
    encoding: "utf8",
    cwd: ROOT,
  });
  ok(r.status === 0, `expected clean allow on malformed payload, got ${r.status}`);
});

t("[subprocess] UserPromptSubmit context hook rides the adapter", () => {
  const r = runAdapter("codex", path.join(ROOT, ".claude/hooks/inject-canon.js"), {
    hook_event_name: "UserPromptSubmit",
    prompt: "what is my chart",
  });
  eq(r.status, 0, "exit code");
  ok(r.stdout.length > 0, "context emitted");
});

// ── emitter drift ────────────────────────────────────────────────────────────
// Emitting the Codex/Gemini lanes is OPT-IN per instance: an instance that has
// never run the emitter legitimately has no AGENTS.md, and that is not drift.
// Once an instance HAS emitted, the lanes must track the .claude/ source or the
// two dialects silently diverge — that is what this guards.
t("[subprocess] emitted CLI lanes are in sync with .claude/ source (if emitted)", () => {
  if (!fs.existsSync(path.join(ROOT, "AGENTS.md"))) return; // lanes not emitted here
  const r = spawnSync(process.execPath, [path.join(ROOT, ".claude/bin/emit-cli-artifacts.mjs"), "--check"], {
    encoding: "utf8",
    cwd: ROOT,
  });
  eq(r.status, 0, `emitter --check reported drift:\n${r.stdout}${r.stderr}`);
});

// ── bin/astro dispatcher ─────────────────────────────────────────────────────
// Codex 0.128+ stopped discovering repo-local .codex/prompts/, so this dispatcher
// is the only invocation surface for the phase commands on that lane. Exercised
// against a STUB `codex` on PATH so the prompt assembly is verified without
// spending a real model call.
const ASTRO = path.join(ROOT, "bin", "astro");

t("[subprocess] dispatcher: no args → usage + exit 2", () => {
  if (!fs.existsSync(ASTRO)) return; // lanes not emitted in this instance
  const r = spawnSync(ASTRO, [], { encoding: "utf8", cwd: ROOT });
  eq(r.status, 2, "exit code");
  ok(/usage: bin\/astro/.test(r.stderr), "usage text on stderr");
});

t("[subprocess] dispatcher: unknown command → exit 2", () => {
  if (!fs.existsSync(ASTRO)) return;
  const r = spawnSync(ASTRO, ["definitely-not-a-command"], { encoding: "utf8", cwd: ROOT });
  eq(r.status, 2, "exit code");
  ok(/unknown command/.test(r.stderr), "reason on stderr");
});

t("[subprocess] dispatcher: strips frontmatter and passes the body to the CLI", () => {
  if (!fs.existsSync(ASTRO)) return;
  const stub = fs.mkdtempSync(path.join(os.tmpdir(), "astro-stub-"));
  try {
    const shim = path.join(stub, "codex");
    fs.writeFileSync(shim, '#!/bin/sh\nprintf "STUB argc=%s\\n" "$#"\nprintf "%s" "$2"\n');
    fs.chmodSync(shim, 0o755);
    const r = spawnSync(ASTRO, ["chart"], {
      encoding: "utf8",
      cwd: ROOT,
      env: { ...process.env, PATH: `${stub}:${process.env.PATH}` },
    });
    ok(/STUB argc=2/.test(r.stdout), `stub not invoked as 'codex exec <prompt>': ${r.stdout}${r.stderr}`);
    ok(!/^---$/m.test(r.stdout), "frontmatter delimiter leaked into the prompt");
    ok(/consistency guard|canonical chart/i.test(r.stdout), "prompt body missing");
  } finally {
    fs.rmSync(stub, { recursive: true, force: true });
  }
});

// ── report ───────────────────────────────────────────────────────────────────
const total = pass + failures.length;
if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`  ✗ lane contract  ${pass}/${total} passed`);
  process.exit(1);
}
console.log(`  ✓ cross-CLI lane contract      ${pass}/${total} passed`);
console.log(`      residual: these prove the ADAPTER translates and fails closed. Codex 0.147 invokes`);
console.log(`      NO hooks (measured — repo-local + CODEX_HOME probes never fired), and the Gemini`);
console.log(`      lane is unverified live (account tier). Cross-lane guard = .githooks/pre-commit.`);

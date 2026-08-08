#!/usr/bin/env node
/**
 * lane-adapter.js — run a Claude-Code-dialect hook under Codex or Gemini CLI.
 *
 * Registered by the emitted `.codex/hooks.json` and `.gemini/settings.json` as:
 *
 *   node ./.claude/hooks/lib/lane-adapter.js --lane=codex ./.claude/hooks/canon-guard.js
 *
 * It reads the lane-native payload on stdin, translates it to the CC shape via
 * `lane.js`, runs the REAL hook as a child process, then translates the hook's
 * verdict back to the lane's wire form. The hooks themselves stay untouched and
 * CC-native, so the (proven, 204-assertion-tested) Claude Code lane carries zero
 * regression risk from multi-CLI support.
 *
 * WHY A CHILD PROCESS, NOT require():
 *   The hooks are stdin-driven scripts that call process.exit() — requiring them
 *   in-process would exit the adapter before it could translate the verdict, and
 *   would give them the adapter's stdin rather than the rewritten payload.
 *
 * WHY ARGV, NOT A SHELL ENV PREFIX:
 *   Codex executes `type:"command"` hooks via execvp, not a shell. The obvious
 *   `ASTRO_LANE=codex node hook.js` would make `ASTRO_LANE=codex` argv[0] → ENOENT
 *   → the hook silently never runs, i.e. the canon guard fails OPEN. Everything
 *   this adapter needs is therefore passed as plain argv flags.
 *
 * WHY PATHS RESOLVE OFF __dirname:
 *   Codex exports no project-dir env var (no $CODEX_PROJECT_DIR), so hook commands
 *   must use relative paths — which break if the CLI runs hooks from a subdirectory.
 *   The target is resolved against cwd first, then against the repo root derived
 *   from this file's own location, which is cwd-independent.
 *
 * FAIL-CLOSED. A wrapper-level failure (target missing, spawn failure, child killed
 * by a signal, unparseable verdict on a deny-capable event) exits 2 = BLOCK. On the
 * canon lane a broken guard must never let the write through. A target that loads
 * and exits 1 is passed through as 1 — that is the hooks' legitimate non-blocking
 * "warn" semantics, and remapping it to 2 would clobber the vet-gate contract.
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { normalizeInbound, renderDecision, isLane } = require("./lane");

const FAIL_CLOSED_EXIT = 2;
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

function failClosed(message) {
  try {
    fs.writeSync(2, `lane-adapter: ${message}\n`);
  } catch {
    /* stderr unavailable — the exit code still carries the block */
  }
  process.exit(FAIL_CLOSED_EXIT);
}

function parseArgs(argv) {
  let lane = null;
  const rest = [];
  for (const a of argv) {
    if (a.startsWith("--lane=")) lane = a.slice("--lane=".length);
    else rest.push(a);
  }
  return { lane, target: rest[0] };
}

function resolveTarget(target) {
  if (!target) return null;
  const candidates = [
    path.resolve(process.cwd(), target),
    path.resolve(REPO_ROOT, target),
    path.resolve(REPO_ROOT, ".claude/hooks", path.basename(target)),
  ];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function main(rawStdin) {
  const { lane, target } = parseArgs(process.argv.slice(2));
  if (!isLane(lane)) failClosed(`--lane=<cc|codex|gemini> required (got '${lane}')`);

  const resolved = resolveTarget(target);
  if (!resolved) failClosed(`hook target not found: '${target}' (cwd=${process.cwd()})`);

  let data = {};
  try {
    data = rawStdin.trim() ? JSON.parse(rawStdin) : {};
  } catch {
    // Malformed payload is not evidence of a canon write; matching the hooks'
    // own posture, translate an empty payload rather than blocking every call.
    data = {};
  }

  const ccPayload = normalizeInbound(data, lane);

  const child = spawnSync(process.execPath, [resolved], {
    input: JSON.stringify(ccPayload),
    encoding: "utf8",
    env: { ...process.env, ASTRO_LANE: lane },
    timeout: 10000,
    maxBuffer: 8 * 1024 * 1024,
  });

  if (child.error) failClosed(`cannot spawn hook '${resolved}': ${child.error.message}`);
  if (child.signal) failClosed(`hook '${resolved}' killed by signal ${child.signal}`);

  // Exit 2 from the hook itself is already a block — honor it directly, and
  // surface whatever reason it wrote so the operator sees why.
  if (child.status === FAIL_CLOSED_EXIT) {
    const reason = (child.stderr || child.stdout || "blocked by hook").trim();
    const r = renderDecision(
      { hookSpecificOutput: { permissionDecision: "deny", permissionDecisionReason: reason } },
      lane,
    );
    process.stdout.write(r.stdout);
    fs.writeSync(2, r.stderr + "\n");
    process.exit(r.exitCode);
  }

  let verdict = null;
  const out = (child.stdout || "").trim();
  if (out) {
    try {
      verdict = JSON.parse(out);
    } catch {
      verdict = null;
    }
  }

  // A hook that exited 0 with no parseable verdict means "allow" (that is the CC
  // default), so this is not a fail-closed case — only a nonzero exit is.
  if (verdict === null) {
    if (child.status && child.status !== 0) {
      // Non-blocking warn tier (exit 1): pass the code and message through.
      if (child.stderr) fs.writeSync(2, child.stderr);
      process.exit(child.status);
    }
    process.exit(0);
  }

  const r = renderDecision(verdict, lane);
  process.stdout.write(r.stdout);
  if (r.stderr) fs.writeSync(2, r.stderr + "\n");
  process.exit(r.exitCode);
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (buf += c));
process.stdin.on("end", () => main(buf));
// If stdin never closes (some CLIs invoke hooks with no payload on an open pipe),
// proceed with an empty payload rather than hanging the tool call forever.
setTimeout(() => {
  try {
    process.stdin.pause();
  } catch {
    /* already closed */
  }
  main(buf);
}, 8000).unref();

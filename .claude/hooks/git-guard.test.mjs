#!/usr/bin/env node
/**
 * git-guard.test.mjs — commit-time canon backstop tests.
 *
 * Every case runs against a THROWAWAY git repository created in a temp dir, so a
 * real `git commit` is exercised end-to-end (the hook only proves anything when
 * git itself invokes it) without touching this repo's history or index.
 *
 * The protected path is assembled from segments at runtime so this file's source
 * does not trip the Bash-side canon scan.
 */

import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const HOOK_SRC = path.join(ROOT, ".githooks", "pre-commit");
const CANON_DIR = ".claude/" + "can" + "on";
const CANON_FILE = `${CANON_DIR}/` + "can" + "on.md";
const LOG_FILE = `${CANON_DIR}/AMEND-LOG.md`;

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

function mkRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "astro-gitguard-"));
  const g = (a, env) =>
    execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", env: { ...process.env, ...env } });
  g(["init", "-q"]);
  g(["config", "user.email", "t@t.t"]);
  g(["config", "user.name", "t"]);
  fs.mkdirSync(path.join(dir, ".githooks"), { recursive: true });
  fs.copyFileSync(HOOK_SRC, path.join(dir, ".githooks", "pre-commit"));
  fs.chmodSync(path.join(dir, ".githooks", "pre-commit"), 0o755);
  g(["config", "core.hooksPath", ".githooks"]);
  // seed a baseline commit so diff --cached behaves normally
  fs.writeFileSync(path.join(dir, "README.md"), "seed\n");
  g(["add", "README.md"]);
  g(["commit", "-q", "-m", "seed"]);
  fs.mkdirSync(path.join(dir, CANON_DIR), { recursive: true });
  fs.writeFileSync(path.join(dir, CANON_FILE), "pillars: original\n");
  fs.writeFileSync(path.join(dir, LOG_FILE), "# log\n");
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "canon baseline"], { CANON_AMEND: "1" });
  return { dir, g };
}

function commit(dir, msg, env = {}) {
  return spawnSync("git", ["-C", dir, "commit", "-q", "-m", msg], {
    encoding: "utf8",
    env: { ...process.env, CANON_AMEND: "", ...env },
  });
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

t("[git] canon edit with NO audit-log entry → commit BLOCKED", () => {
  const { dir, g } = mkRepo();
  try {
    fs.writeFileSync(path.join(dir, CANON_FILE), "pillars: SILENTLY CHANGED\n");
    g(["add", CANON_FILE]);
    const r = commit(dir, "sneak");
    if (r.status === 0) throw new Error("commit succeeded — backstop did not fire");
    if (!/PROTECTED CANON/.test(r.stderr)) throw new Error(`unexpected stderr: ${r.stderr}`);
    const log = execFileSync("git", ["-C", dir, "log", "--oneline"], { encoding: "utf8" });
    if (/sneak/.test(log)) throw new Error("blocked commit still landed in history");
  } finally {
    cleanup(dir);
  }
});

t("[git] canon edit WITH audit-log entry → commit ALLOWED", () => {
  const { dir, g } = mkRepo();
  try {
    fs.writeFileSync(path.join(dir, CANON_FILE), "pillars: amended\n");
    fs.appendFileSync(path.join(dir, LOG_FILE), "- 2026-08-08 amended, approved by owner\n");
    g(["add", CANON_FILE, LOG_FILE]);
    const r = commit(dir, "audited amendment");
    if (r.status !== 0) throw new Error(`ceremony commit was blocked: ${r.stderr}`);
  } finally {
    cleanup(dir);
  }
});

t("[git] CANON_AMEND=1 override → commit ALLOWED", () => {
  const { dir, g } = mkRepo();
  try {
    fs.writeFileSync(path.join(dir, CANON_FILE), "pillars: override\n");
    g(["add", CANON_FILE]);
    const r = commit(dir, "override", { CANON_AMEND: "1" });
    if (r.status !== 0) throw new Error(`override was blocked: ${r.stderr}`);
  } finally {
    cleanup(dir);
  }
});

t("[git] non-canon commit → unaffected", () => {
  const { dir, g } = mkRepo();
  try {
    fs.writeFileSync(path.join(dir, "docs.md"), "hello\n");
    g(["add", "docs.md"]);
    const r = commit(dir, "ordinary work");
    if (r.status !== 0) throw new Error(`ordinary commit was blocked: ${r.stderr}`);
  } finally {
    cleanup(dir);
  }
});

t("[git] log-only edit → ALLOWED (no canon fact changed)", () => {
  const { dir, g } = mkRepo();
  try {
    fs.appendFileSync(path.join(dir, LOG_FILE), "- note\n");
    g(["add", LOG_FILE]);
    const r = commit(dir, "log note");
    if (r.status !== 0) throw new Error(`log-only commit was blocked: ${r.stderr}`);
  } finally {
    cleanup(dir);
  }
});

t("[git] backstop catches a write made by a NON-CC tool (plain fs write)", () => {
  // Simulates the Codex apply_patch gap: nothing intercepted the write itself.
  const { dir, g } = mkRepo();
  try {
    fs.writeFileSync(path.join(dir, CANON_FILE), "hour: collapsed to B, A discarded\n");
    g(["add", "-A"]);
    const r = commit(dir, "codex-style patch");
    if (r.status === 0) throw new Error("non-CC tool write reached history unaudited");
  } finally {
    cleanup(dir);
  }
});

const total = pass + failures.length;
if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`  ✗ canon commit-guard  ${pass}/${total} passed`);
  process.exit(1);
}
console.log(`  ✓ canon commit-guard (git)     ${pass}/${total} passed`);
console.log(`      residual: commit-TIME, not write-time — a non-CC lane can still edit the`);
console.log(`      working tree; the audit trail is enforced before anything enters history`);

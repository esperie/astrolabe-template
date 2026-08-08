#!/usr/bin/env node
/**
 * install-git-guard.mjs — point git at the version-controlled `.githooks/`.
 *
 * `.git/hooks/` is not version-controlled, so a hook placed there never reaches a
 * clone or a synced instance. Setting `core.hooksPath` to the committed `.githooks/`
 * directory makes the canon backstop travel with the repo.
 *
 * Idempotent, and refuses to clobber a DIFFERENT hooksPath that someone else set —
 * silently repointing another tool's hooks directory would be a rude surprise.
 *
 * Usage: node .claude/bin/install-git-guard.mjs [--root <dir>] [--check]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const ri = args.indexOf("--root");
const ROOT = ri >= 0 ? path.resolve(args[ri + 1]) : process.cwd();
const WANT = ".githooks";

function git(a) {
  try {
    return execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

if (!fs.existsSync(path.join(ROOT, ".git"))) {
  console.log(`  – ${path.basename(ROOT)}: not a git repo, skipping git guard`);
  process.exit(0);
}

const hookFile = path.join(ROOT, WANT, "pre-commit");
if (!fs.existsSync(hookFile)) {
  console.error(`✗ ${WANT}/pre-commit missing in ${ROOT} — nothing to install`);
  process.exit(CHECK ? 1 : 0);
}
fs.chmodSync(hookFile, 0o755);

const current = git(["config", "--local", "core.hooksPath"]);

if (current === WANT) {
  console.log(`  ✓ ${path.basename(ROOT)}: canon commit-guard active (core.hooksPath=${WANT})`);
  process.exit(0);
}

if (CHECK) {
  console.error(`✗ ${path.basename(ROOT)}: core.hooksPath is '${current || "(default)"}', expected '${WANT}'`);
  process.exit(1);
}

if (current && current !== WANT) {
  console.error(
    `⚠ ${path.basename(ROOT)}: core.hooksPath already set to '${current}' by something else — NOT overwriting.\n` +
      `  Chain ${WANT}/pre-commit from that directory manually to keep the canon backstop.`,
  );
  process.exit(0);
}

git(["config", "--local", "core.hooksPath", WANT]);
const now = git(["config", "--local", "core.hooksPath"]);
if (now !== WANT) {
  console.error(`✗ ${path.basename(ROOT)}: failed to set core.hooksPath`);
  process.exit(1);
}
console.log(`  ✓ ${path.basename(ROOT)}: canon commit-guard installed (core.hooksPath=${WANT})`);

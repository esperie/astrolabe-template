#!/usr/bin/env node
/**
 * run.mjs — run ALL benchmark tasks for ONE backend, in an isolated git worktree.
 *   node run.mjs --backend glm [--timeout 360] [--tasks bazi-pillars,ziwei-ming]
 * Writes one result JSON per task to OUT/<backend>/<taskId>.json and a raw transcript.
 * Launch 5 of these in parallel (one per backend) for the full sweep.
 */
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..", "..");
const SP = process.env.BENCH_OUT || path.join(os.tmpdir(), "astrolabe-model-bench");
const WTROOT = path.join(SP, "wt");

// backend registry. cli=claude => Anthropic-compatible JSON; cli=codex => codex exec text.
const BACKENDS = {
  claude:   { slot: 7,  cli: "claude", label: "Claude Code (Opus)", modelFlag: ["--model", "opus"] },
  codex:    { slot: 9,  cli: "codex",  label: "Codex (gpt-5.5)" },
  deepseek: { slot: 11, cli: "claude", label: "DeepSeek V4 Pro" },
  glm:      { slot: 12, cli: "claude", label: "GLM 5.2 [1m]" },
  minimax:  { slot: 13, cli: "claude", label: "MiniMax M3" },
  gemma:    { slot: 14, cli: "ollama", model: "gemma4:31b",  endpoint: (process.env.OLLAMA_ENDPOINT || "http://localhost:11434"), label: "Gemma4 31B (ollama, dual-3090)" },
  qwen:     { slot: 14, cli: "ollama", model: "qwen3.6:35b", endpoint: (process.env.OLLAMA_ENDPOINT || "http://localhost:11434"), label: "Qwen3.6 35B (ollama, dual-3090)" },
};

function arg(name, def) { const i = process.argv.indexOf("--" + name); return i >= 0 ? process.argv[i + 1] : def; }
const backendKey = arg("backend");
const timeoutS = parseInt(arg("timeout", "420"), 10);
const onlyTasks = (arg("tasks", "") || "").split(",").filter(Boolean);
if (!backendKey || !BACKENDS[backendKey]) { console.error("need --backend " + Object.keys(BACKENDS).join("|")); process.exit(2); }
// --slot N overrides the backend's default csq slot (its account binding may be weekly-capped;
// point it at a live one — `csq status`). Only meaningful for csq-driven backends (claude/codex);
// the ollama backend drives the claude binary directly via env and ignores the slot.
const slotOverride = arg("slot");
const be = { ...BACKENDS[backendKey], slot: slotOverride ? parseInt(slotOverride, 10) : BACKENDS[backendKey].slot };

const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, (process.env.BENCH_TASKS || "tasks.template.json")), "utf8")).tasks
  .filter(t => !onlyTasks.length || onlyTasks.includes(t.id));

const outDir = path.join(SP, "results", backendKey);
fs.mkdirSync(outDir, { recursive: true });

// ---- isolated worktree (Stop hook stripped so the headless run can't be trapped) ----
const wt = path.join(WTROOT, backendKey);
function setupWorktree() {
  fs.mkdirSync(WTROOT, { recursive: true });
  if (fs.existsSync(wt)) spawnSync("git", ["-C", REPO, "worktree", "remove", "--force", wt], { encoding: "utf8" });
  const r = spawnSync("git", ["-C", REPO, "worktree", "add", "--force", "--detach", wt, "HEAD"], { encoding: "utf8" });
  if (r.status !== 0) { console.error("worktree add failed:", r.stderr); process.exit(1); }
  // strip the Stop gate hook from the worktree's settings (keep canon-guard + inject-canon)
  const sf = path.join(wt, ".claude", "settings.json");
  try {
    const s = JSON.parse(fs.readFileSync(sf, "utf8"));
    if (s.hooks) { delete s.hooks.Stop; delete s.hooks.SubagentStop; }
    fs.writeFileSync(sf, JSON.stringify(s, null, 2));
  } catch (e) { console.error("warn: could not strip Stop hook:", e.message); }
}
function teardownWorktree() { spawnSync("git", ["-C", REPO, "worktree", "remove", "--force", wt], { encoding: "utf8" }); }

// ---- transcript parsing ----
function jsonFromClaude(stdout) {
  const i = stdout.search(/[\[{]/);
  if (i < 0) return null;
  const body = stdout.slice(i);
  try { return JSON.parse(body); } catch {}
  // NDJSON (stream-json): one JSON object per line -> array
  const objs = [];
  for (const line of body.split("\n")) {
    const s = line.trim(); if (!s) continue;
    try { objs.push(JSON.parse(s)); } catch {}
  }
  return objs.length ? objs : null;
}
function metricsFromClaude(stdout) {
  const j = jsonFromClaude(stdout);
  const arr = Array.isArray(j) ? j : j ? [j] : [];
  const sys = arr.find(x => x.type === "system") || {};
  const res = arr.find(x => x.type === "result") || arr[arr.length - 1] || {};
  // tool-use scan across assistant messages
  let ranCalc = false, readKB = false, calls = 0;
  const blob = JSON.stringify(arr);
  for (const m of arr) {
    const content = m?.message?.content || m?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c.type === "tool_use") {
        calls++;
        const inp = JSON.stringify(c.input || {});
        if (/\.claude\/calc|cast\.mjs|bazi\.js|ziwei\.js|qimen\.js|vedic\.js|node .*calc/.test(inp)) ranCalc = true;
        if (/canon\.md|docs\/|\/canon\//.test(inp)) readKB = true;
      }
    }
  }
  if (/cast\.mjs|\.claude\/calc/.test(blob) && calls === 0) ranCalc = true; // fallback
  const u = res.usage || {};
  return {
    model: sys.model || null,
    text: (res.result || res.subtype || "").toString(),
    isError: !!res.is_error,
    durationMs: res.duration_ms ?? null,
    numTurns: res.num_turns ?? null,
    tokensIn: (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0),
    tokensOut: u.output_tokens ?? null,
    costUsd: res.total_cost_usd ?? null,
    toolCalls: calls, ranCalc, readKB,
  };
}
function metricsFromCodex(stdout) {
  // codex exec prints the final answer after a line "codex", then "tokens used\nN"
  let text = stdout;
  const m = stdout.match(/\bcodex\b\s*\n([\s\S]*?)\n(?:tokens used|$)/);
  if (m) text = m[1].trim();
  const tk = stdout.match(/tokens used\s*\n?\s*([\d,]+)/);
  const ranCalc = /\.claude\/calc|cast\.mjs|node .*calc|bazi\.js|ziwei\.js|qimen\.js|vedic\.js/.test(stdout);
  const readKB = /canon\.md|docs\//.test(stdout);
  return {
    model: (stdout.match(/^model:\s*(.+)$/m) || [])[1] || "gpt-5.5",
    text, isError: /\bERROR\b.*fatal|panicked/.test(stdout) && !text,
    durationMs: null, numTurns: null,
    tokensIn: null, tokensOut: tk ? parseInt(tk[1].replace(/,/g, ""), 10) : null,
    costUsd: null, toolCalls: null, ranCalc, readKB,
  };
}

// ---- invoke one task ----
function runTask(task) {
  const base = ["run", String(be.slot), "--"];
  let bin = "csq", cmd, env = process.env;
  if (be.cli === "claude") {
    cmd = [...base, "-p", task.prompt, "--output-format", "json",
           "--dangerously-skip-permissions", ...(be.modelFlag || [])];
  } else if (be.cli === "ollama") {
    // csq slot #14 keyless identity is unreliable -> drive the claude binary directly with ollama env.
    bin = "claude";
    cmd = ["-p", task.prompt, "--output-format", "json", "--dangerously-skip-permissions", "--model", be.model];
    env = { ...process.env, ANTHROPIC_BASE_URL: be.endpoint, ANTHROPIC_AUTH_TOKEN: "ollama", ANTHROPIC_API_KEY: "",
            ANTHROPIC_MODEL: be.model, ANTHROPIC_SMALL_FAST_MODEL: be.model,
            CLAUDE_CONFIG_DIR: path.join(SP, "ollama-cfg"), API_TIMEOUT_MS: "3000000" };
  } else { // codex
    cmd = [...base, "exec", "--skip-git-repo-check", task.prompt];
  }
  const t0 = Date.now();
  const r = spawnSync(bin, cmd, { cwd: wt, env, encoding: "utf8", timeout: timeoutS * 1000, maxBuffer: 64 * 1024 * 1024 });
  const wallMs = Date.now() - t0;
  const timedOut = (r.error && r.error.code === "ETIMEDOUT") || r.signal === "SIGTERM" || wallMs >= timeoutS * 1000 * 0.97;
  const stdout = (r.stdout || "") + (timedOut ? `\n[TIMEOUT after ${Math.round(wallMs / 1000)}s]` : "");
  fs.writeFileSync(path.join(outDir, task.id + ".raw.txt"), stdout + "\n----STDERR----\n" + (r.stderr || ""));
  const met = be.cli === "codex" ? metricsFromCodex(stdout) : metricsFromClaude(stdout);
  if (timedOut) met.isError = true;
  const result = { backend: backendKey, slot: be.slot, label: be.label, task: task.id, kind: task.kind,
                   timedOut, wallMs, ...met };
  fs.writeFileSync(path.join(outDir, task.id + ".json"), JSON.stringify(result, null, 2));
  console.log(`[${backendKey}] ${task.id}: ${timedOut ? "TIMEOUT" : (met.isError ? "ERR" : "ok")} ` +
              `${Math.round(wallMs/1000)}s model=${met.model} calc=${met.ranCalc} out=${met.tokensOut} $${met.costUsd ?? "?"} ` +
              `text="${(met.text||"").replace(/\s+/g," ").slice(0,60)}"`);
}

console.log(`=== backend ${backendKey} (${be.label}, slot ${be.slot}) — ${tasks.length} tasks, wt=${wt} ===`);
setupWorktree();
try { for (const t of tasks) runTask(t); }
finally { teardownWorktree(); }
console.log(`=== backend ${backendKey} done ===`);

#!/usr/bin/env node
/**
 * score.mjs — score all collected results.
 *   Interpretive tasks (all except factOnly) => claude-opus judge on 3 dims:
 *      completeness, accuracy, quality-of-interpretation (0-5 each) -> overall 0-1.
 *   Oracle tasks ALSO get an independent deterministic FACTUAL cross-check (token match).
 *   factOnly tasks (asme-title) => deterministic only.
 *   DNF (timeout) => excluded (accuracy null).
 * Judge runs OUTSIDE the repo (neutral, no COC overhead). Writes OUT/scored.json.
 */
import fs from "fs";
import path from "path";
import os from "os";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SP = process.env.BENCH_OUT || path.join(os.tmpdir(), "astrolabe-model-bench");
const resultsDir = path.join(SP, "results");
const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, (process.env.BENCH_TASKS || "tasks.template.json")), "utf8")).tasks;
const taskById = Object.fromEntries(tasks.map(t => [t.id, t]));
const JUDGE_SLOT = process.env.JUDGE_SLOT || "8"; // quieter account than #7 (less contention → fewer 500s)

// persistent judge cache: good verdicts survive re-runs; only failures re-judge.
const cacheFile = path.join(SP, "judge-cache.json");
let cache = {};
try { cache = JSON.parse(fs.readFileSync(cacheFile, "utf8")); } catch {}
const cacheKey = (backend, taskId, text) => `${backend}|${taskId}|${(text || "").length}`;
const sleep = (ms) => { try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch {} };

function factualScore(text, oracle) {
  let hits = 0; const detail = [];
  for (const group of oracle) { const ok = group.some(alt => text.includes(alt)); if (ok) hits++; detail.push({ group: group[0], ok }); }
  return { factual: oracle.length ? hits / oracle.length : null, detail };
}

function judge3(backend, task, text) {
  if (!text || text.trim().length < 2) return { completeness: 0, accuracy: 0, quality: 0, overall: 0, reason: "empty answer" };
  const ck = cacheKey(backend, task.id, text);
  if (cache[ck]) return cache[ck];
  let last = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = judgeOnce(task, text);
    if (r && !r._retry) { cache[ck] = r; fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2)); return r; }
    last = r;
    if (attempt < 4) sleep(4000 * attempt);
  }
  return last || { completeness: 0, accuracy: 0, quality: 0, overall: 0, reason: "judge failed after retries" };
}

function judgeOnce(task, text) {
  const prompt = `You are a STRICT, impartial grader of an AI answer in a Chinese-metaphysics / governance knowledge domain. Grade ONLY against the authoritative reference; penalize confident fabrication heavily.

TASK GIVEN TO THE MODEL:
${task.prompt}

GROUND-TRUTH REFERENCE (authoritative):
${task.reference}

RUBRIC (what each dimension means here):
${task.rubric}

Score THREE dimensions, each an integer 0-5:
- "completeness": did it cover everything the task/reference calls for?
- "accuracy": is every stated fact/value correct per the reference (no errors, no hand-computed mistakes)?
- "quality": is the interpretation insightful, coherent, correctly hedged, and grounded (not padded or fabricated)?

CANDIDATE ANSWER TO GRADE:
"""
${text.slice(0, 7000)}
"""

Respond with ONLY a JSON object on one line: {"completeness":<0-5>,"accuracy":<0-5>,"quality":<0-5>,"reason":"<one short sentence>"}`;
  const r = spawnSync("csq", ["run", String(JUDGE_SLOT), "--", "-p", prompt, "--output-format", "json", "--model", "opus"],
    { cwd: SP, encoding: "utf8", timeout: 240000, maxBuffer: 32 * 1024 * 1024 });
  const out = r.stdout || ""; const i = out.search(/[\[{]/);
  let resultText = "";
  try { const j = JSON.parse(out.slice(i)); const a = Array.isArray(j) ? j : [j]; const res = a.find(x => x.type === "result") || a[a.length - 1]; resultText = (res.result || "").toString(); } catch {}
  // transient API/server errors -> signal retry
  if (/API Error|Internal server error|rate limit|overloaded|529|503|500/i.test(resultText) || !resultText) {
    return { _retry: true, reason: "transient: " + (resultText.slice(0, 60) || "empty/no output") };
  }
  const m = resultText.match(/\{[^{}]*"completeness"[\s\S]*?\}/);
  if (!m) return { _retry: true, reason: "parse fail: " + resultText.slice(0, 60) };
  try {
    const v = JSON.parse(m[0]);
    const c = clamp(v.completeness), a = clamp(v.accuracy), q = clamp(v.quality);
    return { completeness: c, accuracy: a, quality: q, overall: (c + a + q) / 15, reason: v.reason || "" };
  } catch { return { _retry: true, reason: "json fail" }; }
}
function clamp(n) { return Math.max(0, Math.min(5, Number(n) || 0)); }

const scored = [];
for (const backend of fs.readdirSync(resultsDir).filter(d => fs.statSync(path.join(resultsDir, d)).isDirectory())) {
  for (const f of fs.readdirSync(path.join(resultsDir, backend)).filter(x => x.endsWith(".json"))) {
    const r = JSON.parse(fs.readFileSync(path.join(resultsDir, backend, f), "utf8"));
    const task = taskById[r.task]; if (!task) continue;
    let status, accuracy = null, judge = null, factual = null, factDetail = null, reason = "";

    if (r.timedOut || (!r.text && r.wallMs >= 350000)) { status = "dnf"; reason = "DNF (timeout — COC orchestration overran budget)"; }
    else if (r.isError) { status = "error"; accuracy = 0; reason = "error"; }
    else {
      status = "ok";
      if (task.oracle) { const fs2 = factualScore(r.text || "", task.oracle); factual = fs2.factual; factDetail = fs2.detail; }
      if (task.factOnly) { accuracy = factual; reason = "fact-only (deterministic)"; }
      else { judge = judge3(backend, task, r.text || ""); accuracy = judge.overall; reason = judge.reason; }
    }
    const followedCalc = task.expectsTools && status !== "dnf" ? (r.ranCalc ? 1 : 0) : null;
    scored.push({ ...r, kind: task.kind, expectsTools: task.expectsTools, status, accuracy, judge, factual, factDetail, followedCalc, scoreReason: reason });
    const dims = judge ? `C${judge.completeness}/A${judge.accuracy}/Q${judge.quality}` : "";
    console.log(`${backend}/${r.task}: ${status} overall=${accuracy == null ? "DNF" : accuracy.toFixed(2)} ${dims} ${factual != null ? `fact=${factual.toFixed(2)}` : ""} ${followedCalc !== null ? `calc=${followedCalc}` : ""} ${reason}`);
  }
}
fs.writeFileSync(path.join(SP, "scored.json"), JSON.stringify(scored, null, 2));
console.log(`\nwrote ${scored.length} scored rows -> ${path.join(SP, "scored.json")}`);

#!/usr/bin/env node
/** report.mjs — build the leaderboard markdown from scored.json. */
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SP = process.env.BENCH_OUT || path.join(os.tmpdir(), "astrolabe-model-bench");
const rows = JSON.parse(fs.readFileSync(path.join(SP, "scored.json"), "utf8"));
const tasks = JSON.parse(fs.readFileSync(path.join(__dirname, (process.env.BENCH_TASKS || "tasks.template.json")), "utf8")).tasks;
const order = ["claude", "codex", "deepseek", "glm", "minimax", "gemma", "qwen"];

const byB = {};
for (const r of rows) (byB[r.backend] ||= []).push(r);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const num = (x) => (x === null || x === undefined ? null : x);

// tasks flagged `heavy` in tasks.json (the four-system orchestration) are excluded from the headline
// rank (not every backend attempts them) and reported separately.
const HEAVY = new Set(tasks.filter(t => t.heavy).map(t => t.id));
function agg(list) {
  // headline ranking uses the COMMON task set (every backend ran these) for apples-to-apples
  const common = list.filter(r => !HEAVY.has(r.task) && r.accuracy != null);
  const accuracy = mean(common.map(r => r.accuracy)) || 0;
  const scored = list.filter(r => r.accuracy != null);
  const dnf = list.filter(r => r.status === "dnf").length;
  const completion = (list.length - dnf) / (list.length || 1);
  const judged = list.filter(r => r.judge);
  const comp = mean(judged.map(r => r.judge.completeness));
  const acc3 = mean(judged.map(r => r.judge.accuracy));
  const qual = mean(judged.map(r => r.judge.quality));
  const fact = mean(list.filter(r => r.factual != null).map(r => r.factual));
  const calcTasks = list.filter(r => r.expectsTools && r.status !== "dnf");
  const calcRate = calcTasks.length ? calcTasks.filter(r => r.followedCalc === 1).length / calcTasks.length : null;
  const costs = list.map(r => num(r.costUsd)).filter(x => x != null);
  const walls = list.filter(r => r.status !== "dnf").map(r => num(r.wallMs)).filter(x => x != null);
  const outs = list.map(r => num(r.tokensOut)).filter(x => x != null);
  return {
    label: list[0].label, n: list.length, accuracy, scoredN: scored.length, dnf, completion,
    comp, acc3, qual, fact, calcRate,
    costTotal: costs.length ? costs.reduce((a, b) => a + b, 0) : null,
    wallAvg: mean(walls), outAvg: outs.length ? Math.round(mean(outs)) : null,
  };
}
const pct = (x) => (x == null ? "—" : (x * 100).toFixed(0) + "%");
const d5 = (x) => (x == null ? "—" : x.toFixed(1));

const summary = Object.entries(byB).map(([k, v]) => ({ key: k, ...agg(v) }))
  .sort((a, b) => (order.indexOf(a.key) - order.indexOf(b.key)));
const ranked = [...summary].sort((a, b) => b.accuracy - a.accuracy);

let md = `# COC-Domain Model Benchmark — Results\n\n`;
md += `_Each model driven multi-turn-agentic via \`csq run <slot> -- -p\` inside an isolated git worktree of this repo, with the full astrolabe COC artifacts loaded (CLAUDE.md, rules, agents, skills, calculators, canon). Every interpretive task is graded by a claude-opus judge on **completeness · accuracy · quality-of-interpretation** (0-5 each); oracle tasks also get an independent deterministic **factual** cross-check (token match vs the calculators/canon)._\n\n`;
md += `## Leaderboard (by overall score)\n\n`;
md += `| Rank | Model | Overall¹ | Completed | Completeness | Accuracy | Interp-quality | Factual² | Calc³ | Avg latency | Cost⁴ |\n`;
md += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
ranked.forEach((s, i) => {
  md += `| ${i + 1} | ${s.label} | **${pct(s.accuracy)}** | ${s.n - s.dnf}/${s.n}${s.dnf ? ` (${s.dnf} DNF)` : ""} | ${d5(s.comp)}/5 | ${d5(s.acc3)}/5 | ${d5(s.qual)}/5 | ${pct(s.fact)} | ${pct(s.calcRate)} | ${s.wallAvg == null ? "—" : (s.wallAvg / 1000).toFixed(0) + "s"} | ${s.costTotal == null ? "n/a" : "$" + s.costTotal.toFixed(2)} |\n`;
});
md += `\n¹ Overall = mean over the **common tasks every backend ran** (the heavy four-system task(s) are excluded — not every backend attempts them — and reported separately below) for an apples-to-apples rank. Judge tasks: mean of the 3 dims; fact-only: deterministic.\n`;
md += `² Factual = independent deterministic token-match of required chart/canon values (objective, bias-free).\n`;
md += `³ Calc = of tasks that should use the repo's calculators, the % where the model actually ran them (COC compliance).\n`;
md += `⁴ Cost: Anthropic-API backends only; codex reports cumulative tokens + no cost; ollama is local/free. DNF rows excluded from latency.\n`;
md += `DNF = the model did not return an answer within budget on the four-analyst orchestration (over-deliberation/throughput, or context blowup) — reported separately, excluded from the accuracy mean.\n\n`;

// heavy four-system orchestration task(s) — reported separately, not in the headline rank (data-driven)
for (const ht of HEAVY) {
  md += `## Four-system orchestration stress test (\`${ht}\`)\n\n`;
  md += `This task asks for a low-regret recommendation using all four systems, which makes capable agents faithfully spawn the COC analyst+advisor+redteamer **subagent fleet** — genuinely slow. Reported separately because it is a throughput/orchestration test as much as an accuracy one; backends that don't attempt it (e.g. local models that would tie up GPUs) are marked accordingly.\n\n`;
  md += `| Model | Result | Score | Wall time |\n|---|---|---|---|\n`;
  for (const s of summary) {
    const r = (byB[s.key] || []).find(x => x.task === ht);
    if (!r) { md += `| ${s.label} | not attempted | — | — |\n`; continue; }
    if (r.status === "dnf") { md += `| ${s.label} | **DNF** (over budget / context blowup) | — | — |\n`; continue; }
    md += `| ${s.label} | completed | ${pct(r.accuracy)} | ${(r.wallMs / 1000).toFixed(0)}s |\n`;
  }
  md += `\nTakeaway: faithful four-system orchestration is the most expensive, highest-variance task — models either reason efficiently in-context or must be fast enough to finish the subagent fleet within budget. Budget generously and treat overruns/blowups as DNF (a throughput signal, not an accuracy failure).\n\n`;
}

// per-task overall matrix
md += `## Per-task overall score\n\n`;
md += `| Task | Kind |` + summary.map(s => ` ${s.key} |`).join("") + `\n`;
md += `|---|---|` + summary.map(() => `---|`).join("") + `\n`;
for (const t of tasks) {
  md += `| ${t.id} | ${t.kind} |`;
  for (const s of summary) {
    const r = (byB[s.key] || []).find(x => x.task === t.id);
    md += ` ${!r ? "—" : r.status === "dnf" ? "DNF" : pct(r.accuracy)} |`;
  }
  md += `\n`;
}

// judge dimension detail per judged task
md += `\n## Judge detail (completeness / accuracy / quality, 0-5)\n\n`;
const judgeTasks = tasks.filter(t => !t.factOnly);
for (const t of judgeTasks) {
  md += `**${t.id}**\n\n| Model | C | A | Q | note |\n|---|---|---|---|---|\n`;
  for (const s of summary) {
    const r = (byB[s.key] || []).find(x => x.task === t.id);
    if (!r) continue;
    if (r.status === "dnf") { md += `| ${s.key} | — | — | — | DNF (timeout) |\n`; continue; }
    const j = r.judge; md += `| ${s.key} | ${j ? j.completeness : "—"} | ${j ? j.accuracy : "—"} | ${j ? j.quality : "—"} | ${(r.scoreReason || "").replace(/\|/g, "/").slice(0, 110)} |\n`;
  }
  md += `\n`;
}

md += `## Notes & caveats\n`;
md += `- **Judge bias:** judge = claude-opus; treat claude's own judged scores with mild caution (self-preference). The Factual column is bias-free.\n`;
md += `- **Cost asymmetry:** the COC system prompt is large (~25-40k input tok/turn), so per-task cost reflects context size as much as the model.\n`;
md += `- **The heavy four-system decision task** triggers the full COC analyst+advisor+redteamer subagent orchestration; budget it generously (1500s+) for the agentic backends and treat a timeout as DNF.\n`;
md += `- **Factual column is a strict CONTIGUOUS token-match** and can under-credit a model that writes the stem and branch in separate table cells (干 | 支) instead of as one 干支 token. The judge's Accuracy dimension is the holistic, format-robust accuracy signal; Factual is a conservative lower bound.\n`;
md += `- **Small suites are noisy** — treat single-task swings with caution, and when the top models group within a few points, don't over-read the ordering.\n`;
md += `- Raw transcripts: \`${path.join(SP, "results")}/<backend>/<task>.raw.txt\`.\n`;

fs.writeFileSync(path.join(SP, "REPORT.md"), md);
console.log(md);

---
description: Benchmark multiple LLM backends (Claude/Codex/DeepSeek/GLM/MiniMax/Ollama) on COC-domain tasks, scored against this instance's own oracle (calculators + canon + docs).
argument-hint: "[backend1,backend2,...] (default: all) — e.g. claude,deepseek,glm"
---

Run the reusable **COC-domain model benchmark** at `eval/model-bench/`. It drives each model
multi-turn-agentic via `csq` inside an isolated git worktree (with the full COC artifacts loaded),
then scores completeness · accuracy · interpretation-quality (a strong judge model) plus an objective
deterministic factual cross-check and calc-authority compliance. Read `eval/model-bench/README.md`
first — it documents the rubric, the backends, the csq/provider gotchas, and how to add models/tasks.

Procedure (the main agent orchestrates; do NOT hand-compute anything):

1. **Make your private tasks file.** `cp eval/model-bench/tasks.template.json eval/model-bench/tasks.json`,
   then fill each task's `oracle`/`reference` from YOUR canon + calculators (never hand-computed). Keep
   `tasks.json` private (it encodes your chart). Run the harness with `BENCH_TASKS=tasks.json`.

2. **Confirm the model IDs** for each backend you intend to test are the intended/strongest ones
   (per-slot live model is `~/.claude/accounts/config-<N>/settings.json` → `ANTHROPIC_MODEL`; off-catalog
   IDs need a direct settings edit — preview the diff first). Smoke-test each backend responds:
   `csq run <slot> -- -p "Reply PONG" --output-format json` (note the `--` separator).

3. **Run the sweep** — one backend per process, in parallel (each gets its own worktree):
   `BENCH_TASKS=tasks.json node eval/model-bench/run.mjs --backend <key> --timeout 360` for each of
   $ARGUMENTS (or all). The heavy four-system decision task triggers the full analyst subagent
   orchestration → give it `--timeout 1500`+, and report a timeout/blowup as **DNF** (a throughput
   result, not an accuracy failure), never as 0.

4. **Score**: `BENCH_TASKS=tasks.json node eval/model-bench/score.mjs` (judge runs on a quiet slot with
   retries + a persistent `judge-cache.json`; re-runs only re-judge failures). Verify no judge rows show
   a transient `API Error`.

5. **Report**: `BENCH_TASKS=tasks.json node eval/model-bench/report.mjs` → writes `REPORT.md` (leaderboard
   + per-task + judge dims) to `$BENCH_OUT`.

6. **Vet/red-team to convergence** (rules/redteam-mandatory.md): re-derive every oracle value from
   `.claude/calc/`; confirm no scoring artifacts (judge 500s, mis-flagged timeouts); state the verdict.

`tasks.json`, raw transcripts, and the report are personal — they quote your chart values. Keep them out
of any shared/public remote.

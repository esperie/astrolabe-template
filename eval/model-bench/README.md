# COC-Domain Model Benchmark

A reusable harness that benchmarks multiple LLM backends **on the work this framework is built for** —
casting/reading the four 命理 systems, standards Q&A, and knowledge-base fidelity — by driving each
model multi-turn-agentic with the full **COC artifacts loaded** (CLAUDE.md, rules, agents, skills,
calculators, canon), then scoring against the instance's own ground truth.

It answers: *given the same COC scaffolding, which model produces the most complete, accurate, and
well-interpreted domain output — and at what latency/cost — while faithfully following the COC rules
(using the calculators, not fabricating)?*

> **Privacy:** the harness *code* is generic and public-safe. The benchmark needs answers from **your**
> chart, so it ships with `tasks.template.json` (prompts only, placeholder answers). Each instance
> copies it to `tasks.json` and fills the `oracle`/`reference` fields **from its own canon + calculators**
> — that filled file, the raw transcripts, and the per-instance report are **personal and never committed
> to the template**. Outputs default to a tmp dir (`BENCH_OUT`), not the repo.

## What it measures

Per task, per model:
- **Completeness · Accuracy · Interpretation-quality** — a strong judge model scores each 0–5 against an
  authoritative per-task reference + rubric.
- **Factual** (oracle tasks) — an independent, bias-free deterministic token-match of the required
  chart/canon values (the calculators are the oracle). A conservative cross-check on the judge.
- **Calc-authority** — did the model actually run the calculators (vs. answering from memory)? A core
  COC-compliance signal, from the tool-use trace.
- **Latency / tokens / cost** — from each run's result JSON.

## Layout

| File | Role |
|---|---|
| `tasks.template.json` | Task structure with placeholder answers. Copy to `tasks.json` (personal, git-ignored) and fill from your canon. |
| `run.mjs` | Runs ALL tasks for ONE backend in an isolated git worktree. Launch one per backend, in parallel. |
| `score.mjs` | Scores results: 3-dim judge (cached, with retries) + deterministic factual. |
| `report.mjs` | Builds `REPORT.md` — leaderboard + per-task matrix + judge-dimension detail. |

## Usage

```sh
# 0. one-time: create your private tasks.json from the template, fill answers from your canon
cp tasks.template.json tasks.json   # then edit oracle/reference fields; keep tasks.json out of git

# 1. ensure each backend's model is the intended/strongest one; smoke-test it:
csq run <slot> -- -p "Reply PONG" --output-format json     # note the `--` (csq's own -p = --profile)

# 2. sweep — one backend per process, in parallel (each gets its own worktree):
for b in claude codex deepseek glm minimax; do
  BENCH_TASKS=tasks.json node run.mjs --backend $b --timeout 360 &   # the heavy decision task needs 1500s+
done; wait

# 3. score, then report:
BENCH_TASKS=tasks.json node score.mjs        # judge on a quiet slot, retries + judge-cache.json
BENCH_TASKS=tasks.json node report.mjs       # writes REPORT.md to $BENCH_OUT
```

Backends are defined in `run.mjs` `BACKENDS` (csq slot + CLI type). The driving notes below cover the
non-obvious bits. Add a model by adding a `BACKENDS` entry and pointing its csq slot's
`config-<N>/settings.json` at the right `ANTHROPIC_MODEL`.

## Methodology & rubric

1. **Same scaffolding for everyone.** Each model runs as the COC agent in an isolated `git worktree` of
   HEAD, so it inherits the identical CLAUDE.md + rules + agents + skills + calculators + canon. The
   Stop/SubagentStop hooks are stripped in the worktree so a headless run isn't trapped by the vet-gate;
   the canon-guard still protects the canon. External models get `--dangerously-skip-permissions` so they
   can use tools — the worktree contains the blast radius.
2. **Three judge dimensions, not one number.** Every interpretive task is graded by a strong judge model
   on **completeness** (did it cover what the task/reference calls for), **accuracy** (is every stated
   value correct per the reference — no hand-computed errors), and **interpretation quality** (insightful,
   coherent, correctly hedged, grounded — not padded or fabricated), each 0–5, overall = their mean.
3. **Bias-free factual cross-check.** Oracle tasks additionally get a deterministic token-match against
   the calculator/canon values — independent of the judge, so judge self-preference can't move it. (It is
   a strict *contiguous* match: a model that splits 干支 across table cells can be under-credited; the
   judge's accuracy dim is the format-robust signal.)
4. **Calc-authority as a first-class metric.** The tool-use trace is scanned to confirm the model actually
   ran the calculators rather than answering from memory — a direct test of COC rule-following.
5. **DNF, not 0.** The heavy four-system decision task makes capable agents spawn the analyst+advisor+
   redteamer **subagent fleet** — genuinely slow. A run that orchestrates faithfully but exceeds the time
   budget (or blows up its context) is recorded **DNF** and excluded from the accuracy mean — a throughput
   result, not an accuracy failure — and reported separately.
6. **Judge robustness.** The judge retries transient provider errors (500/overload) and caches every
   verdict (`judge-cache.json`), so re-scoring only re-judges failures. Run the judge on a quiet account.
7. **Fair ranking + honest caveats.** The headline rank uses the **common task set every backend ran**
   (apples-to-apples). Treat single-task swings as noisy on a small suite, and note the judge-bias caveat
   (the judge is one model family).

## Driving notes (csq + provider gotchas)

- Invoke headless: `csq run <slot> -- -p "PROMPT" --output-format json --dangerously-skip-permissions`.
  The `--` is REQUIRED — csq's own `-p` means `--profile`.
- A 3P slot's **live model** is in `~/.claude/accounts/config-<N>/settings.json` (`ANTHROPIC_MODEL`), not
  the provider profile. `csq models switch` rejects off-catalog IDs, so a new model ID is a direct settings
  edit (preview the diff). `setkey` sets the key, not the model.
- **Codex** uses `exec --skip-git-repo-check`, not `-p`, and prints model + token usage to **stderr**.
- **Ollama** can be driven by the `claude` binary directly with `ANTHROPIC_BASE_URL` at the ollama
  endpoint (set `OLLAMA_ENDPOINT`); ollama 0.21+ serves the Anthropic `/v1/messages` API natively (no
  proxy). For multi-GPU hosts, set `OLLAMA_SCHED_SPREAD=1` so a model spans all GPUs.
- Some providers **ignore `MAX_THINKING_TOKENS`** — you can't always cap a model's deliberation from the
  client side.

## Insights from a reference run

A reference run (2026-06, one instance, 8 COC-domain tasks, 7 backends: Claude-opus / Codex / DeepSeek /
GLM / MiniMax cloud + Gemma / Qwen local on dual-GPU ollama). Small suite — directional, not definitive.

- **The COC scaffolding equalizes factual accuracy.** Once a model runs the calculators, it gets the chart
  values right almost regardless of size — every backend that followed calc-authority hit the oracle
  values. Differentiation shows up in **interpretation quality** and **fabrication resistance**, not raw
  facts.
- **Fabrication is the real separator.** On a "define this standards concept" task, weaker models invented
  plausible terminology and citations not present in the docs; the strongest stayed grounded. This is
  exactly what the 3-dim judge (and the "penalize confident fabrication" rubric) is built to catch.
- **A good local 30B is competitive on the common tasks** — a dual-3090 ollama model matched the cloud
  models on the 7 common tasks (it skipped the heavy orchestration task). Calc-authority varied: the
  weakest local model often answered from memory instead of running the calculators.
- **Faithful four-system orchestration is expensive and high-variance.** The decision task makes models
  spawn the analyst+advisor+redteamer fleet. One frontier model short-circuited it by reasoning
  in-context (~2 min); the thorough cloud models completed in ~15–20 min; one capable model only finished
  on a 60-min retry after first timing out (slow-and-variable, not incapable); one failed outright by
  reading calculator *source files* into context until it hit provider context-limit/overload errors.
- **Over-deliberation is a real failure mode.** Streaming traces showed one model emit thousands of
  thinking tokens between sparse tool calls — it deliberated past the budget rather than acting. The
  client-side thinking cap didn't help (the provider ignored it).
- **Takeaway for picking a model here:** for routine readings, a strong mid-size or even local model is
  plenty (the scaffolding does the heavy lifting). For the deep four-system orchestration, favour models
  that either reason efficiently in-context or are fast enough to finish the subagent fleet — and budget
  generously, with DNF treated as a throughput signal.

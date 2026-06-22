# Astrolabe (template)

_An instrument for reading a life._

Astrolabe is a **decision-support and self-reflection instrument** that reads your life through four
old systems for thinking about timing and circumstance — 八字 BaZi, 紫微斗数 Zi Wei Dou Shu,
奇门遁甲 Qi Men Dun Jia, and 吠陀 Vedic — and triangulates them into one honest, low-regret
recommendation. None of it is treated as literal fact about the future: each system is a structured
lens, every chart value is computed by deterministic, validated code, and every conclusion comes
with its confidence stated plainly. It is built to help you reason carefully about your options when
the future is uncertain — not to predict it.

> **Built in compliance with the [Cognitive Orchestration (CO)](https://terrene.foundation/standards/co/)
> methodology** — the open, anti-drift, institutional-knowledge discipline stewarded by the
> [**Terrene Foundation**](https://terrene.foundation). The hook-protected canon, the eval-harness
> gate, and the red-team-to-convergence mandate below are CO's "preserve what you know across context
> windows" principle applied to a personal advisory.

This is the **template** — the framework source of truth. Each person copies it into their own
private instance and runs onboarding. **It runs _inside_ [Claude Code](https://claude.com/claude-code),
not as a standalone script** — the calculators are plain Node.js, but the advisory itself, the
specialist agents, and the guardrails are Claude Code (see **Setup**, below).

## Who this is for

You, if you have a real question — a venture, a contract, a hire, a relocation, a launch date, or
just "what season is this, and what is it for?" — and you'd rather reason it through four independent
angles than trust one story. You don't need to know astrology, and you don't need to be a developer.
You do need a private place to keep your birth data and a willingness to hold the metaphysics lightly
and make the call yourself.

## Start here

Four steps from zero to your first reading:

1. **Get Claude Code.** Astrolabe runs _inside_ [Claude Code](https://claude.com/claude-code) — the
   desktop app is the easiest on-ramp. (Details under **Setup**.)
2. **Copy the template into your own private repository**, and open that folder in Claude Code.
3. **Run `/onboard` once.** It collects your birth details, casts all four systems, and writes your
   protected _canon_ — the locked, validated record of your chart.
4. **Ask a real question** — `/decision` for a live choice, `/year` for an annual outlook, `/chart`
   to see your raw chart, or just type a plain question.

The rest of this README explains what the four systems are, the thinking that makes this different
from fortune-telling, what people actually use it for, how a reading works, how to set it up, and
how to dial the effort up or down.

---

## What are the four systems?

Astrolabe reads your life through four traditions for thinking about timing and circumstance. Each
is a structured **lens for reflection and decision support**, and the engine states its confidence
honestly. The point of running four is that they were built independently — different cultures,
different sky-models, different math — so where they _agree_ you have a real signal, and where they
_disagree_ you have a flag worth examining.

### 八字 BaZi — "Four Pillars"

**The instrument:** a personality-and-timing map drawn from the calendar.

BaZi (literally "eight characters") converts your birth moment — year, month, day, and hour — into
eight symbols, each carrying one of the **five elements** (wood, fire, earth, metal, water). It needs
your birth date, time, and place (the place fixes the true local time). What it reads is your
**elemental balance**: which elements you have a lot of, which you lack, and — most usefully — which
are _favourable_ to lean into versus _unfavourable_ to avoid. It then projects this forward as a
**life arc**, breaking your life into roughly ten-year chapters (大运, "luck pillars") so you can see
which seasons favour building, consolidating, or holding back.

_Best at:_ "What is my natural temperament, and is this a season to push hard or play defence?"

### 紫微斗数 Zi Wei Dou Shu — "Purple Star"

**The instrument:** a 12-room floor plan of your life.

Zi Wei (named after the Purple Star, its anchor) takes the same birth date, time, and place and lays
out a chart of **twelve palaces** — one for each major life domain: career, wealth, marriage, health,
friends, family, travel, and so on. It places a cast of "stars" into these rooms; which star lands in
which palace colours how that part of life tends to play out. Because it maps domains rather than
elements, it answers _where_ in your life the action and the friction sit.

_Best at:_ "Which area of life — career, relationships, money, health — is most lit up (or most
strained) right now?"

### 奇门遁甲 Qi Men Dun Jia

**The instrument:** a time-and-space chessboard for a specific situation.

Qi Men Dun Jia (奇门遁甲, roughly "the mysterious gates and the hidden Jia") arranges the moment
onto a **nine-square board** — a snapshot of how the "energies" of a particular time and direction are
arranged. It works in two modes. As a **natal** reading (from your birth moment) it describes your
strategic style. More distinctively, as a **divinatory** reading it's cast for the **moment you ask a
question**, giving a board for _this_ decision — useful for direction, timing, and "should I move now
or wait." Of the four, it's the most tactical and situation-specific.

_Best at:_ "I'm facing a concrete choice right now — what's the favourable timing, direction, or
approach?"

### 吠陀 Vedic — "Jyotish"

**The instrument:** an independent second opinion from a different astronomical tradition.

Vedic astrology (Jyotish, "the science of light") comes from India and uses the **sidereal zodiac** —
it measures the planets against the fixed background stars rather than the seasons, so its sky is
genuinely calculated differently from the three Chinese systems. From your birth date, time, and
place it reads the positions of the planets and your rising sign, and — its signature tool — a system
of **planetary periods (大运 / daśā)**: long stretches of years each "ruled" by one planet, an
independent timing layer you can hold up against BaZi's life-arc.

_Best at:_ "Does a completely separate tradition point to the same timing — and what do its planetary
periods say about this stretch of years?"

### Why four, not one?

Because **agreement across independent instruments is the signal.** These four traditions grew up
separately, so they have no reason to agree by construction. When all four point the same way, you can
hold that conclusion with higher confidence. When they diverge, that's not a failure — it's a flag
telling you the situation is genuinely uncertain, and Astrolabe surfaces the split rather than
papering over it (then resolves it by the **lowest-regret** choice). One system can fool you with a
story that fits any outcome; four systems cross-checking each other are much harder to fool. That
triangulation — never a single reading taken on faith — is the core discipline of the framework.

---

## Philosophy & core thinking

Most "destiny" tools tell you a story and ask you to believe it. Astrolabe does the opposite: it
treats your chart as **evidence to reason with**, and builds in the discipline to keep you honest.
The whole point is to think clearly under uncertainty.

Eight ideas make it different from fortune-telling:

- **Deterministic math, never by hand.** Every chart value comes from validated calculators, checked
  against professional reference charts (the "oracles"). Nothing is computed in someone's head. Run it
  twice, or hand the same birth data to two people, and you get the _identical_ chart — no
  improvisation, no drift.

- **Triangulation across four independent systems.** Four distinct traditions read your chart
  separately. Conclusions are built from where they **agree** — that is where confidence is high.
  Where they **diverge**, the divergence is flagged and surfaced, never smoothed over into a tidy
  answer. Disagreement is information, not a problem to hide.

- **Falsifiability first, no retrodiction.** A reading is treated like a hypothesis: it has to make
  checkable predictions about things you can actually observe. A claim that fits _any_ outcome tells
  you nothing. And you're not allowed to take a known result and read it backwards into the chart to
  call it a "match" — that proves nothing except hindsight.

- **Symmetric red-team.** Before you're allowed to believe a reading, it gets an adversarial pass —
  and the flattering interpretation is scrutinized exactly as hard as the unflattering one. The
  pleasant story gets no free pass; if it can't survive a genuine attempt to break it, it doesn't ship.

- **Calibrated confidence, plain language.** Findings come with probabilities or confidence bands, in
  ordinary words — "likely," "roughly even, lean X," "low confidence." Metaphysics is never presented
  as literal fact. You always know how much weight a statement can bear.

- **Low-regret decisions.** The output is not a prophecy; it's an _actionable_ recommendation chosen
  to stay safe across the range of what you can't know — the option you'd least regret if the
  uncertainty broke against you. It comes with **tripwires**: the specific signals that would tell you
  the call has changed and you should switch.

- **Honest uncertainty discipline.** Where something genuinely can't be pinned down — for example a
  birth-time ambiguity that yields two plausible charts — _both_ are kept and carried forward. They
  are never silently collapsed into one convenient version to make the answer look cleaner than it is.

- **Governance against drift.** The verified facts live in a protected "canon" that cannot be edited
  silently — changes require a deliberate, audited ceremony. This is the
  [Cognitive Orchestration (CO)](https://terrene.foundation/standards/co/) principle applied directly:
  preserve what you know across context windows, so a guessed value never quietly hardens into "fact"
  over many sessions.

Every one of these is a guardrail against the failure modes of ordinary fortune-telling — vagueness,
hindsight, wishful thinking, and confident drift. What's left is an instrument for **reasoning
carefully about your options when the future is uncertain**, with its confidence stated, its
assumptions exposed, and its conclusions built to be challenged.

---

## What is it useful for?

Here is what people actually bring to it.

### Self-understanding — know your own operating system

Get a structured read on your temperament, your core strengths, and the **central tension** of your
chart — the thing that both drives you and trips you up. It names what _energises_ you versus what
quietly _drains_ you, so you stop fighting your own wiring.

> _"What's the recurring friction in how I work, and is it a strength I'm mismanaging or a real limit
> I should design around?"_

When all four systems point the same way, that's a high-confidence read on who you are. Where they
split, you get an honest "this part is uncertain" instead of a confident fiction.

### Vocation & work design — fit the work to the wiring

It maps what _kind_ of work suits you, how to **position** yourself, and — just as important — which
roles and structures to **avoid**. Builder or finisher? Solo operator or coalition-builder?
Front-of-house or behind the engine? The chart gives priors; you make the call.

> _"I can take a senior role at an established firm or start something of my own. Which structure plays
> to my strengths instead of my failure modes?"_

### Timing — know what each season is _for_

Different years and decades are for different moves. Astrolabe plans on two clocks: the **annual**
layer (流年) and the **decade / long-wave** layer (大运 / Vimśottari daśā), cross-checked against each
other.

- **Shipping & locking-in years** — launch, sign, lock terms, plant the flag.
- **Defensive years** — consolidate, cut exposure, don't expand; flagged so you don't pick a fight in
  a bad season.
- **Scaling years** — build out, hire, raise, widen the footprint.

> _"Over the next three years, which window is for going hard and which is for keeping my powder dry?"_

You get a year-by-year shape with the risky stretches called out in advance — so timing becomes a
plan, not a guess.

### Live decisions — cast, triangulate, decide

This is the core loop. Bring a _specific_ fork — a venture, a contract, a hire, a partnership, a
relationship, a relocation, a launch date — and the tool **casts all four systems for the moment**,
triangulates them with your strategic priors, and returns **one low-regret recommendation plus the
tripwires that would flip it.** No fence-sitting.

> _"I've been offered a partnership on these terms — take it, renegotiate, or walk?"_
> → One recommendation · the four-system + strategic rationale · the hedge · and the concrete signals
> ("if X happens by month three, reverse") that tell you when the answer has changed.

The tripwires matter as much as the answer: you leave with a decision _and_ a way to know if it stops
being right.

### Relationship & partnership risk — spot the pattern before it repeats

Some failure modes recur on a cycle — a type of partner or peer dynamic that keeps showing up, a way
co-founder or collaborator relationships tend to fracture. Astrolabe surfaces those **recurring
patterns** so you can screen for them up front instead of re-living them.

> _"What's the partnership trap I keep falling into, and what should I check for before I sign with
> someone new?"_

### Standing red lines — turn a recurring risk into a permanent rule

The highest-leverage output: convert a risk that _keeps_ surfacing in your chart into a **permanent
personal rule** you never relitigate under pressure. Ownership and control thresholds, dependency
limits, time-allocation caps, the deal structures you've learned to refuse — once a pattern is real,
you don't re-decide it every time; you make it a red line and let it protect you.

> _"Given how this keeps biting me, what's the rule I should adopt once and never break — even when a
> great-looking offer tempts me to?"_

Across all six, the discipline is the same: deterministic chart math (never hand-computed), four
systems triangulated, every reading red-teamed and verified before you act on it, and confidence
stated honestly. It won't tell you the future — it helps you make a **better, more self-aware,
lower-regret decision** with the time you've got.

---

## How to use it — the reading workflow

You ask a real question. The system does the rest — casting four independent charts, having four
analysts interpret them, synthesizing one recommendation, then stress-testing that recommendation
before it ever reaches you. Here is the full loop.

### The loop, end to end

**1. Onboard once.** Before your first reading, you set up your instance: collect your birth data
(date, exact clock time, birthplace), cast all four systems, and write your _canon_ — the protected,
validated record of your chart. The calculators check themselves against it so every later reading
rests on the same locked foundation. You do this one time with **`/onboard`**. (The deep setup
mechanics are under **Setup** — you don't need them to use the tool day to day.)

**2. Ask a real question.** Not "tell me my fortune" — a concrete decision or window. _Should I take
this offer? Is this a year to expand or consolidate? When is the better month to launch?_ Use
**`/decision`** for a live choice, **`/year`** for an annual outlook, **`/qimen`** for a situational
divination, **`/vedic`** for the Jyotish view, or **`/cast`** / **`/chart`** to see the raw chart.

**3. The system casts, routes, synthesizes, and stress-tests — before you see anything.** Under the
hood:

- **Casts all four** systems deterministically (`cast.mjs`) — same inputs always give the same chart,
  no hand-math.
- **Routes to four analysts** — one each for 八字, 紫微斗数, 奇门遁甲, and 吠陀 (Vedic) — who
  interpret their own system independently.
- **The decision-advisor synthesizes** their four reads into **one** low-regret recommendation,
  building from where the systems agree and explicitly flagging where they don't.
- **Red-teamed AND vetted to convergence.** An adversarial pass (**`/redteam`**) hunts for
  confirmation bias, retrodiction, non-falsifiable claims, and any over-collapsed birth-time hedge; a
  verification pass (**`/vet`**) re-derives every quoted chart value from the calculators. They repeat
  until a round turns up nothing new. Nothing ships unconverged.

**4. You receive a structured answer**, not a fortune-cookie line:

- **The recommendation** — one clear call, never a fence-sit.
- **The convergences** — what all four systems agree on (this is where confidence is highest).
- **The divergences** — where systems disagree, flagged openly, never hidden or averaged away.
- **Confidence bands** — how sure the call is, stated as a probability or band, not as certainty.
- **The tripwires** — the specific things that, if they happened, would change the recommendation.

### How to read a reading

- **Trust convergence most.** When all four systems point the same way, that's your strongest signal.
  Weight it accordingly.
- **Treat single-system claims with caution.** A striking detail that only one system produces is a
  hypothesis, not a verdict. Hold it lightly until something corroborates it.
- **Respect the confidence band.** "Likely" is not "certain." A 60% call is genuine information _and_
  a coin that lands the other way two times in five — size your commitment to the band.
- **Where a birth-time hedge exists, note both.** If your exact time is uncertain, your chart may carry
  an A/B fork. A good reading surfaces the working-default _and_ the alternative for any conclusion
  that hinges on the time — it never silently picks one.

### What this is NOT

> - **Not fatalism.** Nothing here says the future is fixed. It maps tendencies and timing, not a
>   script.
> - **Not certainty.** Every call comes with a confidence band, and the bands are honest. Surprises are
>   allowed by design.
> - **Not a substitute for your own judgement.** It is a decision-support and self-reflection
>   instrument. You make the call.
> - **Not professional advice.** It does not replace qualified legal, medical, or financial counsel.
>   For those, see a professional.
>
> Hold the metaphysics lightly; make the decision on low-regret reasoning. The four systems are a
> structured way to look at a question from four angles and find what survives scrutiny — the value is
> in the convergence, the flagged divergence, and the discipline, not in any claim to read the future.

---

## Setup — run it _inside_ Claude Code

**The one thing to get right first:** Astrolabe is a **Claude Code application, not a script you run in
a terminal.** The four calculators are plain Node.js and will happily print chart math on their own —
but that's all you'd get. The actual _advisory_ (cast the chart → four specialist analysts interpret
it → a synthesis step reconciles them into one low-regret call → an adversarial red-team pass before
you see it) is **orchestrated by Claude Code agents**, and the guardrails that keep it honest are
**Claude Code hooks** that only fire inside Claude Code. Run the Node scripts alone and you have a
calculator. Run it inside Claude Code and you have the advisor.

### Use Claude Code — the desktop app is the easy on-ramp

You need [Claude Code](https://claude.com/claude-code). If you're not a developer, **install the
desktop app** — it's the most approachable way in: open a folder, type, done. (The CLI and the IDE
extensions work too and run the identical setup — pick whichever you like; nothing below changes.)

### What's inside `.claude/` — the "operating system" for the advisory

Everything lives under one `.claude/` folder. Think of it as a small operating system: the calculators
are the _facts engine_, the canon is _your data_, the hooks are _guardrails_, and the agents / skills /
commands are the _advisor_ that drives it all.

| Piece | Where | What it does |
|---|---|---|
| **Calculators** | `.claude/calc/` | Deterministic Node math — `astro.js`, `bazi.js`, `lunar.js`, `ziwei.js`, `qimen.js`, `vedic.js`. `cast.mjs` casts the full four-system chart; `eval.mjs` runs the whole test gate. Validated against professional reference charts and astronomical ephemerides. |
| **Protected canon** | `.claude/canon/canon.md` | Your single source of truth (birth data + the locked, oracle-verified chart facts). Also serves as the calculators' validation oracle. Edited only through an audited ceremony — never silently. |
| **Hooks (guardrails)** | `.claude/hooks/` | Four guards, wired in `settings.json` (see below). They prevent the model from drifting, silently rewriting your canon, or calling a turn "done" without checking its work. |
| **Agents** | `.claude/agents/` | The advisor itself: `destiny/{bazi,ziwei,qimen,vedic}-analyst` each cast + interpret one system; `destiny/decision-advisor` synthesizes all four into one low-regret recommendation; `destiny/destiny-redteamer` attacks it before delivery. Plus `intermediate-reviewer`, `security-reviewer`, `requirements-analyst`, `deep-analyst`, and `management/{gh-manager,todo-manager}`. |
| **Skills** | `.claude/skills/` | `01-personal-profile` (your profile — filled at onboarding), `03-destiny-systems` (the reading reference), `04-decision-method` (the decision methodology). |
| **Commands** | `.claude/commands/` | Type `/name` to run: `/onboard`, `/cast`, `/chart`, `/year`, `/decision`, `/qimen`, `/vedic`, `/destiny-redteam`, plus the work-cycle commands `/redteam`, `/vet`, `/start`, `/analyze`, `/todos`, `/implement`, `/codify`, `/wrapup`, `/ws`. |
| **Rules** | `.claude/rules/` | The standing instructions the model always follows — `calc-authority`, `canon-protection`, `destiny-advisory`, `redteam-mandatory`, `communication`, `agents`, `git`, `no-stubs`, `security`, `framework-rollout`, and the auto-generated `learned-instincts`. |
| **`bin/` tools** | `.claude/bin/` | `onboard.mjs` (first-run setup), `canon-amend.mjs` (the audited way to change your canon), and `sync.mjs` / `promote.mjs` / `rollout.mjs` (framework update plumbing). |
| **`settings.json`** | `.claude/` | Wires the four hooks and denies direct edits to `.claude/canon/**`. |

**The four hooks, and what each one enforces:**

- **`canon-guard.js`** (PreToolUse, on Edit / Write / NotebookEdit **and** Bash) — blocks silent edits
  to your canon, _and_ blocks the obvious shell end-runs (`>>`, `sed -i`, `rm`, `mv`, `cp`, `tee`,
  `dd`). It
  deliberately exempts the one audited path: the `canon-amend` ceremony.
- **`inject-canon.js`** (UserPromptSubmit) — injects your canon's guardrails into **every** turn, so
  the model _verifies against your locked facts_ instead of re-deriving them from memory (which is how
  drift creeps in).
- **`vet-gate.js`** (Stop) — won't let a turn that changed something finish until it has actually been
  verified or red-teamed. "I'll check later" becomes impossible.
- **`calc-reminder.js`** (UserPromptSubmit) — keeps nudging: use the calculators, never mental math.

### Setup, in order

```bash
# 1. copy this template into your OWN PRIVATE repo (it will hold your birth data)
cp -r template ~/my-astrolabe && cd ~/my-astrolabe && git init

# 2. open that folder in Claude Code (desktop app recommended), then onboard —
#    collects birth data, casts all four systems, writes your protected canon, validates:
/onboard                          # or:  node .claude/bin/onboard.mjs

# 3. confirm the gate is green  (every test suite + your canon-consistency check)
node .claude/calc/eval.mjs        # → VERDICT: PASS

# 4. read your chart / ask a question
node .claude/calc/cast.mjs        # or, in Claude Code:  /chart  /cast  /year  /decision
```

`VERDICT: PASS` means your chart reproduces, the guards work, and the canon is internally consistent.
**Keep the repo private** — it holds your birth data; never push it to a public remote.

### Why Claude Code and not a plain script

A standalone script could print pillars. It can't do the part that matters:

- **Subagents** — the four analysts, the synthesis step, and the red-team pass are separate Claude Code
  agents that hand off to each other. That orchestration _is_ the advisory; without it you have raw
  numbers and no reading.
- **Hooks that hold the line** — they stop the model from silently editing your canon, stop it from
  re-deriving facts and drifting, and force every substantive turn to be vetted to convergence before
  it can finish. None of that exists outside Claude Code.
- **Skills and commands** — the reading reference, the decision methodology, and one-word commands like
  `/decision` and `/year` are what make it usable without you having to remember the procedure.

Run the calculators alone and you get chart math. Run it inside Claude Code and you get the advisor,
the guardrails, and the discipline.

---

## Choosing your effort level — high / xhigh / ultracode

Claude Code lets you set how hard the model works on a task (the reasoning / effort level — set it with
`/effort`). Higher tiers think more deeply and, at the top, coordinate multiple agents that check each
other. They also cost more time and tokens, so match the tier to the stakes.

**One-line heuristic:** the more consequential the task — and the more it absolutely has to be right —
the higher you go. Reach for `ultracode` when you want independent agents to verify each other rather
than trusting a single pass.

| Tier | When to use it | Example in this framework |
| --- | --- | --- |
| **high** | Routine, quick, low-stakes — one capable pass is plenty | A single-system glance, a `/chart` or `/year` skim, a quick factual question, light content edits, a status check |
| **xhigh** | Real depth in a single pass — gets it right the first time, one capable agent is enough | A full four-system reading, ONE consequential decision (`/decision`), a careful canon amendment, harder analysis |
| **ultracode** (= xhigh + multi-agent orchestration) | Heavy, must-be-right work where correctness matters more than speed or cost | A comprehensive deep-dive reading red-teamed to convergence, building or validating a new calculator/system, large framework changes, an exhaustive audit |

### How to think about each tier

- **high — the everyday default.** Use it when you just want a fast, capable answer and the cost of
  being slightly off is low: looking up a chart fact, skimming the year ahead, tidying a paragraph,
  checking where a workspace stands.
- **xhigh — depth in one pass.** Step up when the task needs careful, sustained reasoning but a single
  strong agent can carry it: synthesizing all four systems into one reading, weighing one consequential
  decision, or editing the protected canon (where a quiet mistake is expensive). This is the right home
  for most real advisory work.
- **ultracode — multiple agents that adversarially check each other.** This is `xhigh` plus
  orchestration: several independent agents do the work and stress-test each other to convergence. Use
  it for the heavy, high-stakes jobs — a deep-dive reading red-teamed until a clean round, standing up
  or validating a new calculator against its oracle, a large change that fans out across the framework,
  or an exhaustive audit. Slower and more expensive by design; you're buying independent verification,
  not just more thinking.

> Whatever the tier, treat every reading as decision-support and self-reflection with calibrated
> confidence — not literal prediction. Higher effort buys more rigor and cross-checking; it does not
> turn an interpretive instrument into fact.

---

## Updating an instance

Framework improvements are made in the template and rolled out to an instance with the sync tool. Your
personal files (canon, docs, profile, learning, workspaces) are **never** overwritten by a sync.

```bash
node .claude/bin/sync.mjs ~/my-astrolabe            # additive; never touches your personal files
node .claude/bin/sync.mjs ~/my-astrolabe --dry-run  # preview
node .claude/bin/sync.mjs ~/my-astrolabe --check    # report drift only
```

---

## Privacy & honest framing

Your instance holds your birth data and your most personal questions, so it is built to be **private by
default**: you copy the template into your own repository and keep it private — never make it public.
The canon is guarded against silent edits, and nothing leaves your machine. See `.claude/rules/security.md`.

And the honest framing, one more time: Astrolabe is a **decision-support and self-reflection
instrument** with calibrated confidence. It does not predict the future and it never presents
metaphysics as literal fact. It is a disciplined way to look at a real question from four independent
angles, find what survives scrutiny, and walk away with a lower-regret decision — plus the tripwires
that tell you when to change your mind.

---

_Built in compliance with the [Cognitive Orchestration (CO)](https://terrene.foundation/standards/co/)
methodology, stewarded by the [Terrene Foundation](https://terrene.foundation). New here? Follow
**Start here** above, then run `/onboard` to set up your instance._

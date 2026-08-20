---
name: 06-report-design
description: The Astrolabe report design system — the canonical section index every reading must cover, the reader-derived colour and language systems, the jargon/gloss discipline, and the tone contract (professional, non-hedging, transparent instead of disclaiming). Use when writing, formatting, reviewing, or rendering ANY reading, decision memo, or advisory artifact for a reader.
---

# Astrolabe Report Design System

> **What this is.** A reading is not a chart dump and not a horoscope. It is a **decision document with
> an audit trail**. This system specifies what it must contain, how it must speak, and how it must look —
> so that any reading produced by any instance is recognisably the same instrument.
>
> **Framework-level.** Nothing here encodes a specific person. The colour and language systems are
> *derived at render time* from that reader's own chart facts (canon + calculators). Per-person values
> never get hardcoded into this skill (`rules/framework-rollout.md` §3).

---

## 0. The three non-negotiables

**0a. A reading is a STANDALONE document. No project context leaks into it.**

The report is about its subject. It is not about the work that produced it, the conversation that
prompted it, or any other document in the repository. **Every one of these is a leak and must be cut:**

| Leak | Instead |
|---|---|
| "this is X, not the Y pairing" | Just be X. Never define a document by what it isn't |
| "see the other reading for…" | Restate what this reader needs; do not cross-reference internal files |
| "carried over from the four legs / the analyst / the agent" | Provenance is *the calculators*. Who or what performed the analysis is not content |
| "for you" · "give him" · "the owner" | **Individual readings**: name the subject or write neutrally. **Decision memos** (the partnership type, §1) properly address their decision-maker — that is their function, not a leak |
| "owner-confirmed", "you asked about" | State the fact. How it was obtained is not the reader's business |
| Internal tooling, agents, session history | Silence |

**Test before shipping: could this document be handed to someone who has never seen the repository, and
still read as complete and coherent?** If not, it is leaking. *(Residuals and method are NOT leaks —
they are the subject's own evidentiary status and must stay.)*

**A document's OWN verification status is not a leak.** Convergence rounds, corrections, withdrawn
claims and residuals (§6.9, §12–13) describe *this document's* evidentiary standing and are required.
What is banned is narrating the machinery that produced it — named agents, sessions, tooling, other
files. **"This claim was withdrawn and here is why" belongs. "The red-team agent found it in round 6"
does not.**

**The other carve-out, because §0a and §6.1 otherwise contradict each other.** §6.1 requires that every
chart value show the command that reproduces it — that is the provenance layer, and it is the reason a
reader can check the document rather than trust it. **Reproduction commands are therefore permitted,
and only at `private` tier**, where the reader has the repository and the command is genuinely useful
to them. **At `shareable` and `counterparty` tier they are leakage and must be stripped**, replaced by
a plain statement that values are calculator-derived. The distinction is not aesthetic: a command is
*verification* for someone who can run it and *noise about someone else's tooling* for everyone else.

1. **Every quantitative claim is calculator-derived and traceable.** No hand-math, ever
   (`rules/calc-authority.md`). If a number cannot be re-derived by the reader running a command, it does
   not appear as a number.
2. **Every classical term is glossed at first use.** Quote the classics freely — then say what it means
   and what to do about it. A reader who does not read Chinese or Sanskrit must lose *nothing*.
3. **Every finding carries an action or a test.** A finding the reader cannot act on, verify, or falsify
   is decoration. Cut it or convert it.

---

## 1. Two report types — decide this FIRST

**A reading is either about ONE person or about a RELATIONSHIP between two, and they are different
documents.** Choosing wrongly produces a report that answers a question nobody asked.

| | **INDIVIDUAL** (the default) | **PARTNERSHIP / SYNASTRY** |
|---|---|---|
| Subject | The owner's own chart — a life question, a 流年, a domain | The owner **and** a named counterparty |
| Question shape | "How do I work / what should I do / when?" | "Should I do this **with them**, and in what structure?" |
| Charts shown | One | Two, side by side |
| Distinctive sections | Life domains; the 用神 mechanism; the timing spine | Cross-chart mechanics; the structure/ownership call; **the symmetric reverse** |
| Palette | Derived from the owner (§2) | **Also derived from the OWNER** — they are the reader, not the subject |

**Default to INDIVIDUAL.** Most requests are the owner asking about themselves. Only go to partnership
when a second named person is genuinely the subject — and say which you chose before rendering.

**Two rules specific to the partnership type, because both were learned the hard way:**
- **The symmetric reverse is mandatory.** State what the owner *costs* the other party, not just what
  the other party offers. A synastry that only reads one direction is a sales document.
- **Never bundle two decisions.** "Work with them" and "own something with them" are separate calls
  with separate confidences, and the bundling is usually where the risk actually lives.

## 1a. The canonical index — what every reading must cover

Sections are ordered by **what the reader needs first**, not by how the analysis was produced. A reader
in a hurry must be able to stop after §1 and still act correctly.

| # | Section | Purpose | Mandatory? |
|---|---|---|---|
| **0** | **Decision card** | The answer, in ≤5 lines, with confidence. What to do, by when, and the single gate that blocks it. | **Always** |
| **1** | **The recommendation(s)** | One per decision, never bundled. Confidence band + what it rests on. | **Always** |
| **2** | **Why — the argument count** | The reasons, honestly counted: which are independent, which are echoes of each other, which are non-chart. | **Always** |
| **3** | **The case against / the positive case** | The other side argued at full strength, not as a token. | **Always** |
| **4** | **The reader's own chart facts** | Pillars/placements actually used, with the calculator command that reproduces them. | **Always** |
| **5** | **Timing** | Phases with dates and hinges — not a list of years. Say what changes at each boundary. | When the question has a clock |
| **6** | **Structure / mechanism** | How the thing actually works: the chain, the drain, the bridge. Plain-language mechanism, not vocabulary. | When advising on structure |
| **6i** | *Individual only* — **Life domains** | Only the domains actually asked about. Career / money / relationships / health / mind. Never a full sweep by default. | Individual |
| **6p** | *Partnership only* — **Cross-chart + the symmetric reverse** | What passes between the two charts, in both directions, including what the owner costs the other party. | Partnership |
| **7** | **Forks & branches** | Every unresolved ambiguity (hour forks, competing structures), carried, never collapsed. | When any fork exists |
| **8** | **Tests worth running** | Dated, cheap, opposite-signed. Each with its falsifier. | **Always** |
| **9** | **What would most change this** | Ranked. State whether each would change the *reasoning* or the *call*. | **Always** |
| **10** | **The next 30 days** | Concrete actions, correctly gated. The reader should need no further interpretation. | **Always** |
| **11** | **Windows / scheduling** | Only where a real constraint exists. If error bars exceed the window, say the window is not usable. | Optional |
| **12** | **Convergence & residuals** | Verification status, what was checked in which round, and every residual stated plainly. | **Always** |
| **13** | **What earlier versions got wrong** | The error log. Kept, never quietly deleted. | If revised |

**Two structural rules:**
- **§0 must be writable before §1–§13 exist.** If you cannot state the decision card, you do not yet have
  a reading — you have notes.
- **§12 and §13 are not optional politeness.** A reading that reports only what survived is not auditable.
  The corrections *are* the credibility.

---

## 2. Colour — derived from the reader's 用神, not from taste

**The idea:** the palette is not decorative. **The reader's favourable elements carry action and
emphasis; their unfavourable elements carry risk and caution.** The document is literally coloured by
what helps and what drains that person.

### 2.1 Element → hue anchors

| Element | Hue family | Light-mode accent | Dark-mode accent | Notes |
|---|---|---|---|---|
| 木 Wood | green | `#1F6F4A` | `#5FD39B` | growth, peers |
| 火 Fire | red-orange | `#C2410C` | `#FF9E64` | output, visibility |
| 土 Earth | ochre / amber | `#9A6B1E` | `#E7B85C` | wealth, ground |
| 金 Metal | steel / slate | `#4A5A6A` | `#A9BDD1` | authority, structure. *Never literal white — unusable as an accent* |
| 水 Water | blue / indigo | `#1F5FA8` | `#7FB4F5` | resource, institution |

### 2.2 The derivation rule

```
primary accent   := 用神 #1  (the favourable element the chart most needs)
secondary accent := 用神 #2
risk / caution   := 忌神 #1  (the unfavourable element)
neutral ink      := near-black in light mode, near-white in dark; never a hue
```

- **Semantic pairing is the point.** When a report tells the reader to *ship and teach*, that call is in
  their 用神 colour. When it warns about the drain, the warning wears the 忌神 colour. The reader learns
  the palette without being taught it.
- **Do not use more than two accents plus one risk colour.** A five-element rainbow reads as a chart
  legend, not a document.

### 2.3 Accessibility (hard requirements, not preferences)

- **Contrast ≥ 4.5:1** for body text, **≥ 3:1** for large text and UI edges, in **both** modes.
- **Never encode meaning in hue alone.** Every colour-coded state also carries a label, a weight, or a
  glyph. Red/green pairs are the most common failure — a 木/火 palette must not rely on the two being
  distinguishable.
- **Risk colour must not be the only signal of risk.** Prefix with a word: `Risk —`, `Caution —`.
- Test both modes and one colour-blind simulation before shipping a rendered report.

### 2.4 When the reader has no chart

Framework default (template, first-run, or a report about something other than a person): **steel
primary, amber secondary, deep red risk.** Neutral, professional, no element claim.

---

## 3. Language — register adapts, findings never do

**The guardrail first, because this is the part that can go wrong:** register selection is a
**presentation heuristic to reduce friction**, not a claim about the person's psychology and **never a
licence to change what a finding says**. Two readers with opposite charts must receive the *same
conclusions* in different clothing. If adapting the register would change the substance, do not adapt it.

### 3.1 Register mapping

Read the dominant structure from the chart (十神 emphasis, and Vedic AK as a secondary flavour):

| Dominant | Register that lands | Open with | Avoid |
|---|---|---|---|
| **食伤 Output** (creator/teacher) | Concrete, vivid, built-thing language. Show the mechanism. | What to make or ship | Abstraction stacks, governance vocabulary |
| **印 Resource** (scholar/institutional) | Systematic. Frameworks, why-it-works, sourcing. | The model | Breezy assertion without provenance |
| **财 Wealth** (operator/merchant) | Quantities. Throughput, cost, conversion, time-to-money. | The number | Poetic framing, long preamble |
| **官杀 Authority** (executive/regulated) | Structure, consequence, exposure, control. | The risk and the rule | Informality, unbounded optionality |
| **比劫 Peer** (competitor/founder-peer) | Comparative. Benchmarks, positions, who-gets-what. | The comparison | Consensus-seeking mush |

**Pace and length also adapt:** an 官杀/财 reader gets the decision card and a table; a 印 reader gets the
same decision card *and* the derivation. Same content, different depth-first ordering.

### 3.2 The jargon contract

**Quote the classics — always explain them.** The pattern, every time:

> **财多身弱** — "much wealth, weak self."
> *Plain meaning:* the chart has far more money-energy than the person has capacity to carry it.
> *What it predicts:* he earns through a structure, not alone; strip the structure and the earnings
> destabilise.
> *What to do:* give him a container — a firm, a brand, a team — never a solo P&L.

Three lines: **term → meaning → consequence.** Never the term alone. Never the term with a vague
adjective. If a term cannot survive that treatment, it was ornament — delete it.

- **First use gets the full gloss**; later uses may run bare, with the term linked to the glossary.
- **Footnotes carry provenance** (which classic, which school, whether schools disagree) so the body stays
  readable. Where sources genuinely conflict, **say so** and say which you took.
- **Romanisation + characters on first use**, characters alone thereafter.
- **A reader with zero background must be able to act on the report without looking anything up.**

---

## 4. Understand, then intervene

Every finding is written as a **three-part move**:

1. **What is true** (calculator-derived, sourced).
2. **What it means for this decision** (mechanism in plain language).
3. **What to do about it** — an action, a rail, a decision rule, or a test.

**Prefer decision rules to static verdicts.** A verdict ages; a rule survives contact with new facts:

> ❌ "Do not grant equity."
> ✅ "No equity while he is a serving partner. **That reason can lapse:** if he exits early, the block
> falls away and the question reopens — decided then on asset decay, which does not lapse."

**Interventions must be sized.** Say the cost: free, one email, a half-day a month, a lawyer. An
unpriced recommendation is not actionable.

---

## 5. Tone — professional, non-hedging, transparent

**The distinction that governs this whole section: uncertainty is honest; hedging is evasive.**

| Do | Don't |
|---|---|
| "~85%, and here is what it rests on" | "It may be that, in some cases, one might consider…" |
| "This is `[UNVERIFIED]` — here is the one fact that would settle it" | "This is for entertainment purposes only" |
| "I got this wrong in the earlier version; here is the correction" | Quietly deleting the error |
| "Route this to counsel — it is a tax question and I should not adjudicate it" | A blanket liability disclaimer |
| "The chart does not settle this" | Padding the ambiguity into false balance |

**Specifically banned:**
- **Boilerplate disclaimers.** "Entertainment purposes," "not professional advice," "results may vary."
  They protect the author and cost the reader. **Transparency replaces them:** show the derivation, name
  the convention, state the confidence, list the residuals.
- **Fatalism.** Nothing is fated. Charts describe tendency and timing; the reader acts.
- **Adjudicating law, medicine, or tax.** Name the question, state that it is out of scope, route it.
  That is not hedging — it is scope honesty, and it is *more* useful than a guess.
- **Flattery.** A reading that only confirms what the reader wanted is a failed reading.

**Confidence notation (standard):** a percentage or band, plus what it rests on. Bare adverbs — "likely,"
"strongly," "clearly" — are not confidence, and a number without a basis is worse than a word.

---

## 6. What else belongs in the system — the additions

These are the parts a first draft of a design system usually misses, and each one has already earned its
place by catching a real error.

### 6.1 The provenance layer
Every chart value shows the command that reproduces it. Every factual claim traces to a source document
or is marked `[UNVERIFIED]`. **A reading is a claim about reality; it must be checkable by the person
acting on it.**

### 6.2 The falsifiability ledger
Predictions are **dated, opposite-signed, and cheap to observe.** A prediction that fits any outcome is
struck. Include the falsifier *in the prediction*: "if X instead of Y, this branch is wrong."
**Pre-register the criterion** — a test invented after the fact scores nothing.

### 6.3 Base-rate discipline, surfaced
When a configuration is common, **say how common**. "Rare — ~0.5% of births" and "this fires for
everyone at 60" are different claims and the reader cannot tell them apart otherwise. Apply base rates
**symmetrically** — the most common failure is base-rating only the findings that cut one way.

### 6.4 Fork discipline
Any genuine ambiguity — an uncertain birth hour, two live structures — is **carried in both branches to
the end**, with a stated probability, and the recommendation tested against both. **Never silently
collapse a fork.** Say explicitly when a fork does *not* discriminate: a conclusion reachable from either
branch is not confirmed by the fork, it is unconstrained by it.

### 6.5 The redaction tiers
Every reading exists at three sensitivities, and the tier is declared in the header:
- **Private** — full detail, birth data, named third parties, strategy.
- **Shareable** — findings and actions; birth data and third-party specifics stripped.
- **Counterparty-facing** — must not telegraph the reader's own red lines or negotiating position.
Ask before a reading crosses tiers; a forwardable document leaks differently than a private one.

### 6.6 What the report must never do
No fatalism · no retrodiction (reading a known outcome back into the chart and calling it confirmation) ·
no place-prescription (the chart says *when* and *what*, never *where* — `rules/destiny-advisory.md` §10)
· no single-system verdicts where the method requires triangulation · no diagnosis, legal opinion, or
investment advice.

### 6.7 Visual conventions
- **Timelines** for 大运/流年 and daśā: one horizontal track per system, aligned on a shared year axis,
  with hinges marked. Boundary years are the information; the spans are context.
- **Chart diagrams**: each system has one canonical rendering (four-pillar grid, twelve-palace wheel,
  nine-palace 3×3, twelve-house square/circle). Never invent a new layout for familiarity's sake.
- **Tables over prose** for anything with more than three parallel items.
- **Wide content scrolls inside its own container** — the page never scrolls sideways.

### 6.8 Typography & length budget
Body 16–18px, measure 65–80 characters, generous leading. **Decision card ≤ 5 lines. §1 ≤ 1 screen.**
Total length is unbounded *below* §1 — depth is fine as long as the top is short. Headings carry
information ("2031 is the trough, and here is why"), never labels ("Section 5").

### 6.9 Version & convergence block
State the version, how many adversarial rounds, what was checked in which round, and whether it has
converged. **Convergence means a review round that found nothing critical or major** — never claim it
before such a round exists, and name the round when you do.

### 6.10 The worked example
Ship at least one complete reference report rendered in the system. A design system without an exemplar
degrades within three documents.

### 6.11 Build a designed report INCREMENTALLY, section by section
A full report is a large single file, and generating one in a single pass is fragile — two separate
attempts at the same document died mid-generation and lost everything. **Write the skeleton and
stylesheet first, then insert one section at a time**, each as its own edit, leaving a marker at the
insertion point. Every completed section is then durable on disk and a failure costs one section rather
than the document.

**The specific hazard to guard against: a truncated report that still closes its tags looks finished.**
It will open cleanly in a browser and read as complete while missing the sections that get acted on.
**Verify by section coverage, never by "it renders."** A quick heading-list check against the source's
section index catches it in seconds.

---

## 7. Rendering targets

| Target | Use | Constraints |
|---|---|---|
| **Markdown** (default) | The canonical stored reading in `readings/` | Must be readable raw; no HTML-only meaning |
| **HTML** | Rendered/shared reports | Self-contained, theme-aware, both modes, no external requests |
| | | ⚠ **`render-reading.mjs` is a CONVERTER, not a designer.** It pipes markdown through pandoc and applies the stylesheet — which yields a *styled document*, not a designed report: no decision card, no finding blocks, no timeline. It is the right tool for a quick readable copy. **A report that matters is hand-authored HTML against these components**, using the markdown as its content source. Do not mistake the converter's output for the system being applied. |
| **Print / PDF** | Counterparty or archive | Palette degrades to grayscale legibly; footnotes on-page |

**Privacy rail:** the instance repo is private (`rules/security.md`). A rendered reading containing birth
data, named third parties, or venture specifics **stays local** — do not publish it to any external
surface without an explicit instruction and a redaction pass.

---

## 8. Checklist before any reading ships

- [ ] Decision card is ≤5 lines and correct on its own
- [ ] Every recommendation has a confidence band and a stated basis
- [ ] Independent arguments counted honestly; echoes labelled as echoes
- [ ] Every classical term glossed term → meaning → consequence
- [ ] Every finding has an action or a test
- [ ] Predictions dated, opposite-signed, with falsifiers pre-registered
- [ ] Base rates stated, and stated symmetrically
- [ ] Every fork carried, none collapsed; non-discriminating forks named as such
- [ ] Palette derived from this reader's 用神; contrast checked in both modes
- [ ] Register matched to the reader; **content identical to what any other reader would get**
- [ ] No boilerplate disclaimer anywhere; scope-outs routed explicitly
- [ ] Residuals stated, not buried; `[UNVERIFIED]` used where it belongs
- [ ] Corrections kept in the error log, not deleted
- [ ] Convergence status accurate and names its round
- [ ] Redaction tier declared

---

## References

- `references/palette.md` — full token set, both modes, contrast table, derivation worked examples
- `references/language.md` — register patterns, the gloss template, glossary architecture
- `references/report-template.md` — the section skeleton with prompts for each part
- `references/showcase.html` — the rendered exemplar (local only)

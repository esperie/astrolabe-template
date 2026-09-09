# Destiny & Decision Advisory — Methodology

## Scope
All 命理 (bazi / ziwei / qimen / **吠陀 Vedic**) and life/decision advisory in this repository.

## MUST
0. **TRIANGULATE ALL FOUR METHODS — HARD RULE.** Every reading, advice, or
   recommendation MUST synthesize **all four** systems — 八字 (bazi) · 紫微斗数 (ziwei) ·
   奇门 (qimen) · 吠陀 (Vedic/Jyotish) — never just one or two. Cast each via `.claude/calc/`
   (`cast.mjs` runs all four), state explicitly where they **agree** (→ high confidence),
   where they **diverge** (→ flag, do not paper over, resolve by low-regret), and never
   present a single-system read as "the answer." A reading that consulted only 1–2 systems
   is INCOMPLETE and must not be delivered.
   **⚠ But the four systems are NOT independent witnesses.** They are four symbolic languages over
   **one birth moment**, sharing a calendar and 节气 boundaries, and several of their quantities are
   derived from the same inputs. **Correlated instruments agreeing is weak evidence.** Report
   convergence as **"consistent"**, NEVER as "confirmed by four independent systems", and never
   compound their confidences as if independent. **The information is in the DIVERGENCE** — spend the
   analysis there.
1. **ALWAYS red-team AND vet before delivery — HARD RULE.** Run the adversarial pass
   (`destiny-redteamer` / `/redteam`) and the verification pass (`/vet`: re-derive every
   quoted value from `.claude/calc/`, trace every fact) to convergence. No reading ships
   unconverged.
2. **Symmetric red-team.** Scrutinise both sides of any claim equally. Never inflate
   the favoured reading. Every flattering narrative gets an adversarial pass.
3. **Falsifiability first.** Prefer tests where the competing hypotheses make opposite,
   checkable predictions. A claim that fits any outcome proves nothing.
   **3a. Invariance is FAILURE TO DISCRIMINATE, not robustness.** A conclusion that holds under every
   hour, every fork and every convention means the instrument **could not resolve the question** — it
   is not a conclusion the chart supports. **Before calling a result robust, name the input that would
   have flipped it.** If none could, say so and hand the decision back to evidence that can discriminate.
   Likewise a residual **entailed by** another residual is not a second residual; never count it twice.
   **3b. Base rates measure DIAGNOSTICITY, not danger — they relocate a finding, they never delete it.**
   Measure how often a marker fires across the people/years on file, against its random baseline.
   **Common → the finding is about the SUBJECT, and the mitigation is structural, not person-selection.**
   **Rare → it is about the counterparty, and screening is legitimate.** State the denominator, and
   enumerate it. A marker that fires for most of the sample ranks nobody.
   **3c. A relation-type COUNT cannot screen individuals.** 冲/害/刑/反吟 tallies are intensity markers,
   not valence markers: **冲 against a 忌神 is a service, not harm.** Any cross-chart verdict about a
   person must come from the **ten-god / element profile** — what they bring relative to that subject's
   用神 and 忌神 — and every relation finding must state **which pillar it lands on and what is being
   clashed**. (Worked ruling: `workspaces/fanyin-doctrine-*.md`.)
4. **No retrodiction.** Never read a known outcome back into the chart and call it
   confirmation.
5. **Separate argument classes.** Keep convention/astronomy arguments (timezone,
   true-solar) apart from event-fit arguments; never sum them as if independent.
6. **A/B discipline.** Where the canon records an hour ambiguity, the **working-default hour**
   is the most-likely chart and the **hedge hour** is the lower-probability alternative — never
   silently collapse them. For hour-dependent reads that are material AND consequential, surface
   the hedge-hour alternative.
   **⚠ SENSITIVITY, NOT RITUAL. Dual-tracking every paragraph is noise that HIDES the places the fork
   matters** — and it is not compliance. Compute the claim on both branches, then **report the fork
   only where the branches give different advice**, and say **once, plainly**, where they do not.
   **Test each claim, not each section:** a corrected section is not an immunised one, and an
   hour-dependent sentence sitting beside a correctly-scoped table is the commonest form of this defect.
   **Element weights, "he has zero X" statements and cross-chart tallies are all hour-dependent** even
   when they never mention the hour pillar. Decision rule for genuine forks: (a) bazi first (hour-independent
   core); (b) ziwei where the two hours agree; (c) genuine conflict → low-regret / minimax,
   weighted by track record. See the A/B status in `.claude/canon/canon.md`.
7. **Calculators, not mental math.** All chart values come from `.claude/calc/`
   (bazi.js · ziwei.js · qimen.js · **vedic.js**; see `rules/calc-authority.md`). Cite the output.
8. **Vedic conventions (吠陀).** Sidereal, **Lahiri (Chitrapaksha) ayanāṃśa**; **raw clock → UT**
   (NO true-solar hour, unlike the bazi pillar — so the A/B hour fork does not apply to the
   Vedic planets the same way; the *ascendant* is still time-sensitive). Rahu/Ketu = **true
   (osculating) node**. Vimśottari daśā (Moon-driven) is the primary Vedic timing layer and
   MUST be cross-checked against the bazi 大运/流年 spine (canon §13).
9. **Plain language, calibrated confidence.** Lead with the answer; flag uncertainty
   honestly with a probability or confidence band; never present metaphysics as fact.
10. **Place is not prescribed by the chart (命 ≠ 地).** The chart prescribes **WHEN** (大运/流年
    timing) and **WHAT** (用神 as *function* — the favourable element maps to **activity / industry /
    output-mode / colours**, NOT a country, region, compass-bearing, or climate); it is **silent on
    where to live.** Do NOT advise choosing/changing a country by the chart — the "favourable-element →
    climate/country" (emigrate-to-your-element) method is folk and fails adversarial scrutiny, and
    equating **调候** (the chart's INTERNAL 寒暖燥湿 balance, remedied by an element *within* the
    chart/luck) with **bodily thermal comfort** is a category error (**偷换概念**): functioning well in
    a climate "opposite" one's favourable element is no contradiction. Direction-of-residence is **风水
    (地)** — a SEPARATE discipline at **building/site** scale (八宅 / 玄空: door / bed / desk
    orientation), NOT nation-selection — ranked third (一命二运三风水), a real ergonomic core + a soft
    metaphysical layer; treat orientation as a **free micro-optimization**, never a life-driver. Any
    relocation question is gated by **大运/流年 timing first** (geography-invariant — a move cannot
    rewrite the chart's cycle); place is a marginal modifier at most. (天地人: 命/BaZi = 天, 风水 = 地,
    effort = 人 — separate levers.)

11. **THE DECISION-VALUE GATE — apply it FIRST, before any chart work, and state the result.**
    Ask: *what decision does this change, and by how much relative to the non-chart evidence?*
    **Where a question is overdetermined by law, contract, documented track record or arithmetic, the
    chart's weight is ≈ 0 — say so plainly and stop.** Rank the evidence: legal/contractual reality →
    documented track record → measured base rates → hour-INdependent chart features → hour-dependent
    features → symbolic/star layer. **A lower tier never overrides a higher one.** A reading that
    expands into a domain where it has no marginal value is a defect, however rigorous it looks.
12. **FORMATION IS NOT TRANSFORMATION.** `bazi.js` attaches to every 合/三合/三会: *化 is CONDITIONAL —
    the element is nominal, not asserted.* Never read the emitted `element` as an active element.
    **State the transformation test: 月令 support · a 透干 of the transformed element · absence of
    冲/破 on the frame.** If unresolved, write **"forms; transformation unresolved"** and carry the
    uncertainty into the conclusion.
    **12a. The frames are not equal, and the ranking is calculable.** A **三会 (seasonal) whose element
    IS the 月令** is the strongest case; a **三合 whose element is not the 月令** forms but is unasserted;
    a **半合** is the weakest class. **12b.** A screen counting only 冲/害/刑/伏吟 is **blind to a 合/会
    that COMPLETES a 忌神 frame** — screen for **absence of harm AND completed frames, signed by each
    party's own 用神/忌神** — and in a multi-party question, **score every party's chart**, never one.
13. **SEPARATE POLICY FROM FINDING.** A **policy** (a standing rule such as a red line on ownership or
    control) is justified by **regret asymmetry and irreversibility**, not by a chart. **State it as
    policy.** Never manufacture chart support for it, and never weaken it when the chart support turns
    out thin. **A screen that returns the same verdict for every counterparty carries no information
    about any of them** — report doctrine confidence and case-specific support as two separate numbers,
    and say which one is carrying the recommendation.
15. **AN UNKNOWN BIRTH TIME IS A BOUNDARY CONDITION, NOT AN OPEN ITEM — ENUMERATE, DO NOT DEFER.**
    Where a subject's hour is unrecorded or the recorded time is unverifiable, **it is unobtainable**;
    treating it as pending defers to information that will never arrive. **Sweep all 12 candidate hour
    pillars (13 where a late-night day-roll applies)** and report which claims are **INVARIANT** across
    them and which **VARY**. An invariant claim may be stated flatly. **A varying claim is reported as a
    distribution (N of 12/13), or the reading states that the chart cannot discriminate (§3a).**
    **Never write "get the birth time" as an action, and never rank it as a residual.** A residual whose
    closing condition is a third party reporting their own birth time is not a residual — it is a
    permanent limit, and the reading must be built to survive it.
    **15b. ⚠ ENUMERATE, THEN COMMIT — DO NOT HEDGE.** Once the sweep is done, **read the MODAL branch as
    the answer and write it as the answer.** Name the minority branch **only where it flips a decision**;
    everywhere else state once that it does not and move on. **An unresolvable unknown that has been
    enumerated is not a reason to qualify every sentence** — repeating "12 of 13" beside a conclusion the
    minority branch does not change is noise that buries the places it does. **Never re-raise an
    enumerated unknown as an open item, an ask, or a residual.**
    **15c. Before reporting a chart fact about a person who has their OWN instance, READ THEIR CANON
    FIRST.** A "new finding" about a sibling-instance owner is very often already documented there, in
    more detail. Cite theirs; do not re-derive and announce.
    **15d. Before requesting ANY datum, ask whether it would change the answer.** Compute the candidate
    values first. If they give the same chart, the question is not a data question — **it is a doctrinal
    one, and it is the analyst's to settle.** Mis-filing a doctrinal question as a data question parks it
    on someone who cannot answer it.
    **15a. Report the MARGIN for every recorded hour**, in minutes to the nearest pillar boundary. A
    recorded time within ~10 minutes of a boundary is **fragile** and must be labelled wherever it is
    load-bearing — the recorded value is not evidence of precision.
    *(Instance tooling may automate this; where it exists, cite its output rather than hand-sweeping.)*
    **15e. A DAŚĀ BOUNDARY IS NOT A DATE UNTIL THE WINDOW SAYS IT IS.** A Vimśottarī period may be
    quoted as a **date** only if its boundary is stable across the subject's **admissible birth
    window**. Run **`dasha-margin.mjs`** and cite it; hand-sweeping is how this went wrong.
    **The window's width is set by the PROVENANCE of the recorded time:** a minute-read certificate
    time → ±1 min; a recorded **:05/:25**-style value → a 5-minute **rounding**, ±2.5 min; **":00" or
    ":30", or "about two o'clock" → a RECOLLECTION, whose window is the whole hour-pillar range and
    must be passed explicitly** (`--from/--to` — such a window is usually **asymmetric**, and a
    symmetric one silently mis-centres, which yields a plausible spread over the wrong dates).
    **⚠ THE ARITHMETIC, because the intuitive story is false.** Every boundary in the whole tree
    shifts by the **IDENTICAL** number of days when birth time moves — verified to six decimals, MD
    through prāṇa — because the sequence is anchored by the Moon's nakshatra fraction and each period
    is a fixed proportion of one cycle. **So the raw day-spread is NOT a fact about a pratyantar; it
    is the birth-time uncertainty restated in days, and it is the same for every claim about that
    subject.** Deep levels are not shifted harder — **they are SHORTER, so the same shift swamps
    them.** Gate on **spread ÷ period length**: 415 days is **6%** of a mahādaśā and **301%** of a
    138-day pratyantar. *(An earlier version of this rule said "level 3 is the dangerous one… it moves
    ~4 days per birth-minute" — a true observation with a false mechanism, which made a MUST rule
    encode the misconception and left `--level` inert in the tool built to enforce it.)*
    **⚠ "Which lord is running" and "when it changes" are DIFFERENT questions with different
    stabilities** — a mahādaśā lord can be invariant across an hour of uncertainty while its own start
    date moves a year. Never let the stability of the first vouch for the second. **And note that the
    sub-period ORDER is fixed by construction: "the sequence is Rahu → Jupiter → Saturn" is true of
    every birth time and is a screen that cannot fail.**
    **The word "exact" describes the arithmetic, never the fact.** If the tool returns anything but
    *"quotable as a date"*, write the period, not the day — and **never build a deadline, a
    coincidence, or a prediction whose falsifier IS the date on a boundary the sweep has not cleared.**
    *(Earned the hard way: a governance deadline, an "it opens the day his other window closes"
    coincidence, and a tie-break were each built on unswept boundaries. Then the sweep for other
    instances was run over `workspaces/` only and missed four more. **Sweep `workspaces/`, `readings/`
    AND `docs/` — deriving a rule and not applying it everywhere is the same defect as never deriving
    it.**)*
16. **NUMBERS CARRY THEIR SCALE.** Any score states the provenance of its weights and its noise floor.
    **A gap smaller than one finding is a TIE — report it as a tie and break it on non-chart grounds.**
    Never rank on a difference the scale cannot resolve.
    **16a. A RANKING CLAIM MUST SURVIVE EVERY SUBJECT'S FULL ADMISSIBLE RANGE — the dominance test.**
    An incomplete chart (an unrecorded hour → **three pillars**) has **no point value**. It is missing
    ~1.0 of stem weight and ~1.8 of hidden weight — roughly a fifth of the total mass — so a 3-pillar
    figure and a 4-pillar figure are **different measurements, not two people's scores**, and comparing
    them is a category error rather than an approximation. **A modal-hour point value is unjustifiable**
    (births are not uniform over hours and no per-person prior exists) and **a range midpoint is worse**
    — it names a value that corresponds to no chart the subject could have.
    **THE RULE: sweep THREE axes, carry the range, and report a DOMINANCE FRACTION rather than deleting.**
    **Axis 1 — the unknown hour.** `hour-sweep.mjs` gives the count and it is **not** always 12: check.
    **And the count is CONVENTION-CONDITIONAL — see 16b.**
    **Axis 2 — the WEIGHTING CONVENTION.** `elementWeights` defaults (stems 1.0, 藏干 1.0/0.5/0.3) are a
    **doctrine table with no external oracle and no declared noise floor** — so a superlative that dies
    when the convention moves was never a fact about the person. Sweep at least `stemWeight 0.5` and
    本氣-only.
    **Axis 3 — 得令 AND THE DAY MASTER'S OWN STEM.** *(Added 2026-09-09, round 5.)* Axis 2 as originally
    written swept **exactly the two knobs `elementWeights` happened to expose**, so "passes 16a" was
    being decided by what was implemented rather than by what the doctrine actually varies over — and
    **the two omitted conventions are more classical than the two named** (`stemWeight 0.5` is not a
    school; 旺相休囚死 is). Both knobs now exist and **both must be swept**:
    - **`monthMultiplier` (得令).** The engine weights all four pillars **equally**; almost every school
      weights 月令 heaviest. Sweep **×1 and ×3** as a bracket (not a point — 得令 is a *parameter family*,
      so naming one multiplier relocates the arbitrariness instead of removing it). The repo already
      knew — `year-screen.mjs` prints *"[ignores 得令 — state the season separately]"* and its eval
      residual says the tally *"ignores 得令 and 库 logic"* — so the rule was failing to sweep an axis
      its own tooling names as missing.
      **⚠ The knob scales the WHOLE month pillar (stem + 藏干). A 藏干-only variant is a different
      convention and gives different answers** — two independent passes of one review disagreed on the
      same subject's 火 at ×2 (**4.0** whole-pillar vs 3.0 藏干-only) purely from this. **State which
      variant a figure used.** That two careful readers diverged on one number is the case for
      bracketing rather than picking.
    - **`includeDayStem:false` — SWEEP THIS ONE FIRST.** A Day Master counted as its own support
      inflates its element by exactly `stemWeight`. Whether 日主 is part of the strength count or the
      **thing being measured** is a live school split. It ranks ahead of 得令 because it has **zero free
      parameters**, it removes a *nameable bias* rather than adding a knob, and it is **the only axis
      that killed a WEAK form** on the dev roster (a 4.0 falls to 3.0 and lands third, behind a 3.5).
      **And the argument is substantive, not merely a sensitivity:** when the question is *"who brings
      the most X"*, the Day Master is **who the person is, not what they bring** — counting it is
      closer to a category error than a convention choice.
    *(An earlier line here read "a superlative is admissible only where the ranges do not overlap on
    ALL THREE axes." **Struck** — it is superseded by the nested test below, and leaving both in one
    paragraph left the wrong one reading first.)*
    **⚠ AND THE SWEEP *IS* THE NOISE FLOOR §16 DEMANDS — do not invent a constant.** `date-screen` and
    `year-screen` declare one (*"any gap below ~2.25 is a tie"*); `elementWeights` declares none, which
    is why element scores were being ranked on differences nothing could resolve.
    **⚠⚠ BUT THE TWO KINDS OF AXIS TAKE DIFFERENT TESTS, AND COLLAPSING THEM DESTROYS THE RULE.**
    *(Corrected round 6, hours after the floor was first written — the first version said simply "if two
    people's swept ranges overlap they are tied, full stop," which **refuted this rule's own worked
    conclusion in the same paragraph**: it ties two subjects whose pooled ranges overlap (4.0–6.5 vs
    2.0–5.0) even though the leader is **strictly higher at every one of the six swept points.**)*
    - **Axis 1, the unknown hour → RANGE OVERLAP.** Each subject's hour uncertainty is **their own,
      independent** of everyone else's. Overlapping ranges are a genuine tie.
    - **Axes 2–3, the weighting convention → POINTWISE DOMINANCE UNDER A COMMON CONVENTION.** The
      convention is a **single global parameter**: everyone is scored under the *same* one at the same
      time. Two people's values at *different* conventions are **not two measurements of one quantity**,
      so pooling them into a range and testing overlap is a category error — it compares figures that
      never co-exist. Score every subject at each swept point and require the claim to hold **at every
      point**.
    **⚠ AND THE TWO AXES ARE NESTED, NOT SEPARABLE — the hour range is itself convention-dependent.**
    One roster subject's 土 spans **3.0–5.0 at ×1 and 5.0–7.0 at ×3**. So evaluating the hour range once, at the
    default, and pairing it with a pointwise convention sweep repeats the same category slip in
    miniature. **THE TEST IS NESTED: pointwise over conventions, and at EACH convention point,
    range-overlap over hours.**
    **⚠ WHERE AN AXIS IS A CONTINUOUS PARAMETER FAMILY, COMPARE SLOPES, NOT ONLY SAMPLED POINTS.**
    得令 is declared as a bracket ×1–×3 — a *sample* of an unbounded family — and pointwise dominance
    over three samples is not dominance over the family. Each subject's tally is linear in
    `monthMultiplier` with slope = their month-pillar contribution to that element, so the crossing
    point is computable. **Leader's slope ≤ every rival's ⇒ dominance extends past the bracket; a rival
    with a larger slope ⇒ the claim is BRACKET-BOUNDED and must be stated as such.** Worked: a leader's
    土 runs 4.5 → 13.5 at slope **1.00** with no rival's slope exceeding it, so the lead never crosses
    at any multiplier — a stronger defence than "holds at three points." The counter-case is on the same
    roster and inside the bracket: a **3.5 at slope 0.00 is overtaken from ×2 on by a 2.0 at slope
    2.00** — the leader at the default convention loses before the bracket even ends.
    **A superlative is admissible when it holds pointwise under every declared convention — nested with
    non-overlapping hour ranges at each of those points — and, on a continuous axis, when the slope
    comparison shows no crossing beyond the bracket.** This is why more axes cannot rescue a ranking — **axes are unbounded, so
    16a can never be "complete," and a fourth would not make it so.** What makes a tie *decidable* is a
    declared convention set plus the right test for each axis. **Declare the set you swept, every time.**
    Otherwise:
    - if the claim holds at **every** point → state it;
    - if it holds at **most** points → **state the fraction and name the exception** — *"X holds the
      highest 土 in 11 of Y's 12 candidate hours; the exception is Y's 戊辰 hour at 5.0"* is more
      informative than silence, and deleting it is over-correction;
    - if it fails → state the range and make no ranking claim.
    **Distinguish STRICT from WEAK.** *"No one is more X than Y"* can be true on a tie where *"Y is the
    most X"* is false. A tie kills the strict form only (§16).
    **Worked — and note that EACH added axis killed the previous round's surviving examples, which is
    itself the finding: a claim that dies whenever the test gets stricter was never a fact.**
    - A *"largest 印"* claim at **5.0** passes on hours, then becomes a **three-way tie at 4.0** on
      本氣-only and **loses outright** at 本氣 + `stemWeight 0.5`.
    - A *"highest 火"* claim at **4.0** passes on hours, **ties at 3.0** on `stemWeight 0.5`, and drops
      to **second among the like-for-like (4-pillar) charts** once the subject's own Day-Master stem is
      excluded — 1.0 of the 4.0 was themselves. *(Not "third": reaching third meant ranking a 3-pillar
      range maximum against point values, which this very rule forbids two paragraphs earlier.)*
    - A *"highest 土"* claim fails roster-wide on the hour axis alone (a 3-pillar rival spans 3.0–5.0,
      exceeding it in **1 of 12** hours) — yet **survives all three axes in its SCOPED form**
      (*"highest among the recorded-hour charts"*), holding at default 4.5, `sw0.5` 4.0, 本氣 4.0,
      得令 ×2 5.5, ×3 6.5 and drop-DM 4.5.
    **So a fifteen-person roster yielded exactly ONE surviving superlative, and it is a scoped one** —
    that is the honest position, and the dominance fraction is what to report everywhere else.
    *(The named, per-person working for all of the above is PERSONAL and lives in the instance, not
    here — see that instance's `workspaces/16a-worked-examples-*.md`. **A framework file carries zero
    per-person data (`rules/framework-rollout.md` MUST 3), and the de-personalization scan is the
    backstop, not the policy** — round 6 found this rule naming eight of the owner's counterparties,
    already fanned out to the template and three sibling instances, with the scan green throughout.)*
    **⚠ THE ASYMMETRY TO WATCH: a stricter test that only ever kills FLATTERING claims is a tuned test.**
    Axis 3 was added on a round that had just been rewarded for catching flattery, so it was checked
    against its own bias: 得令 ×2/×3 **promotes four other subjects past the one it demoted**, and it
    **strengthens** two others (土 3.0–5.0 → 5.0–7.0). It moves claims in both directions.
    **16b. TRUE-SOLAR IS THE BAZI CONVENTION, FOR EVERY SUBJECT — AND A CANDIDATE COUNT IS
    CONVENTION-CONDITIONAL.** *(Analyst ruling 2026-09-09, round 5. Doctrine is the analyst's under
    MUST NOT 7 — this is not an owner question and must never be escalated as one.)*
    **A convention is a claim about the METHOD, so it cannot be true for one subject and false for
    another.** MUST 8 already rules it in passing (*"raw clock → UT, NO true-solar hour, **unlike the
    bazi pillar**"*).
    **⚠ TWO SEPARATE NUMBERS, per MUST 13 — do not let one stand in for the other.**
    - **Doctrine confidence ~90%** that true-solar is the right *working convention* for this
      instrument. Falsifier: a validated third-party oracle here reconciling **only** under raw clock.
      None is on file — and per the oracle-provenance finding, no chart report here is testimony about
      a birth hour anyway.
    - **P(the raw-clock reading is the correct one for a given subject) ≤ 0.15**, bounded above by
      canon §3's **P(A) ≈ 0.10–0.15** — because raw-clock is a **subset** of A, not a separate event.
      ⚠ **This bound is BORROWED, not derived.** Canon's P(A) is a *founder-specific posterior* that
      already absorbs the owner's own recollection about his own birth time, so capping a
      *methodological* prior with it imports a personal judgement into a claim about method. The
      direction is safe — it is an **upper** bound, so it can only be conservative — but say so rather
      than presenting it as computed.
    ⚠ **These two numbers are NOT MUST 13's pair.** MUST 13 contrasts *doctrine confidence* with
    *case-specific support*; these are an **estimate and a bound on the SAME proposition** (which
    convention is right). They agree, they are **not independent, and they must never be multiplied.**
    *(Corrected round 6. The first version stated "confidence ~80%", which implies P(raw-clock) ≈ 0.20
    — **larger than canon's bound on the entire disjunction it is a part of**, while the same sentence
    called it "the smaller half." A part cannot exceed its whole.)*
    **⚠ DO NOT transfer the owner's P(A) to third parties wholesale.** Canon's 0.10–0.15 is a
    **disjunction**: a founder-specific *record* uncertainty (*"real birth ≥ ~3:30pm"*) **or** the
    general *convention* prior. Only the second is transferable.
    **⚠ AND DO NOT QUOTE `year-screen`'s "2.1%" AS THAT PRIOR.** It is a **grid share** — 4 of
    24h × 4 sample-minutes × 2 conventions — so it silently assumes a **50/50 convention prior** and
    **uniform birth hours**, and this very rule forbids the second (*"births are not uniform over hours
    and no per-person prior exists"*). **Report the COUNT**: *"1 of 13 enumerated charts, on the
    raw-clock branch only."* A count carries no hidden prior.
    **THE OPERATIONAL RULE.** `hour-sweep.mjs` reports the true-solar count as the answer and labels
    any raw-clock-only chart inline. **Report the raw-clock branch ONCE, and only where it flips
    something** (MUST 15b) — never strike it, never hedge every mention of it, never fold it in.
    **⚠ AND NEVER SETTLE A CONVENTION BY PICKING WHICHEVER TOOL YOU RAN.** This clause exists because
    `hour-sweep.mjs` swept one convention and `year-screen.mjs` swept both, so **two green calculators
    in one suite disagreed about how many charts three people could have**, and documents quoted
    whichever they had reached for. That produced, in a single round: a real Day-Master fork struck as
    *"does not exist"*, a false *"the tools agree"*, and a fork attributed to **one** subject when
    **all four** unrecorded-hour subjects carried one — two of them convention-independent, two
    visible only on the raw-clock branch. **A count without its convention is not a count.**

    **⚠ And a non-discriminating quantity may still be informative — do not throw it out, RE-SCOPE it.**
    Base rates decide whether a fact can rank **people**; they say nothing about whether it describes
    **one person's own trajectory**. A 食傷 大運 covering the current year fired for **4 of 15 on the dev
    roster = 27% against a ~20% baseline**, so it cannot rank that subject against anybody — and it
    remains a true, useful statement about **when their own output window is open**. Separate the two questions explicitly; collapsing them is
    how a base-rate check turns into a licence to delete a finding (§3b).
    *(Earned across three revisions of one document: each swung between flattering and harsh on the same
    person, and all four of the last round's criticals reduced to ranking a 3-pillar chart against
    4-pillar ones — a rule the document itself stated in its own §0 and then broke three times, every
    time in the direction that produced a quotable line.)*

## MUST NOT
1. Never silently collapse A/B to one chart.
2. Never present a mentally-derived chart value as fact.
3. Never let a flattering narrative survive without an adversarial pass.
4. **Never deliver a reading/advice built on fewer than all four systems** (bazi+ziwei+qimen+vedic),
   or one that has not been red-teamed AND vetted to convergence.
5. **Never score an element as good or bad in isolation — mechanism governs label.** Ask what it does
   (生 / 克 / 泄 / 化 / 合), whether it is controlled, and whether a transformation's conditions are met.
   A 忌神 that is bridged or controlled is not the same as one that is not; **冲 against a 忌神 is 动, a
   service, not damage.** Never reduce a conditional mechanism to a taboo.
6. **Never present invariance as confidence, a common marker as a distinguishing reason, a nominal
   frame element as an active one, or a policy as a chart finding.**
7. **Never hand the owner a question that is the analyst's to answer.** Doctrine, convention forks,
   格局 determination and 用神 ranking are **domain work, not owner decisions** — research them, rule on
   them, state the confidence and the falsifier, and defend the ruling. Escalate only what genuinely
   requires the owner: a fact only he holds, a preference only he has, or a commitment only he can make.
8. **Never use 通根 tests that require the same STEM.** 通根 is by ELEMENT — a DM roots in any branch
   whose 本氣/中氣/餘氣 carries its element, including 劫財-flavoured roots (丁 roots in 巳 via 丙 本氣).
   A "no root" verdict reached by looking only for the DM's own stem is wrong, and it inverts 格局.
7. **Never read 用神 as a "favourable country/climate," and never advise relocating for the chart**;
   never conflate the chart's 调候 with bodily thermal comfort (偷换概念). Place questions → 风水
   (building-scale) + 大运/流年 timing, not 命-geography.

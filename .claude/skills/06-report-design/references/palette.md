# Palette — element tokens, derivation, contrast

> The palette is **derived per reader**, not chosen. See `SKILL.md` §2 for the rule. This file holds the
> tokens, the worked derivations, and the contrast obligations.

## 1. Element hue anchors

Each element has an **accent** (emphasis, links, rules, chart marks), a **tint** (backgrounds, callout
fills), and an **ink** (text on that tint). Two modes.

### Light mode

| Element | Accent | Tint | Ink on tint |
|---|---|---|---|
| 木 Wood | `#1F6F4A` | `#E8F4EE` | `#12452E` |
| 火 Fire | `#C2410C` | `#FDECE3` | `#7A2908` |
| 土 Earth | `#9A6B1E` | `#FBF1DC` | `#5E4112` |
| 金 Metal | `#4A5A6A` | `#EDF1F5` | `#2C3641` |
| 水 Water | `#1F5FA8` | `#E6EFFA` | `#143C6B` |

### Dark mode

| Element | Accent | Tint | Ink on tint |
|---|---|---|---|
| 木 Wood | `#5FD39B` | `#123227` | `#BFEBD6` |
| 火 Fire | `#FF9E64` | `#3A1E10` | `#FFD9C2` |
| 土 Earth | `#E7B85C` | `#33280F` | `#F6E3BA` |
| 金 Metal | `#A9BDD1` | `#1E262E` | `#DCE6EF` |
| 水 Water | `#7FB4F5` | `#12243A` | `#CFE2FA` |

### Neutrals (mode-fixed, never hued)

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FFFFFF` | `#0F1418` |
| `--surface` | `#F7F8FA` | `#161C22` |
| `--ink` | `#14181C` | `#E9EDF1` |
| `--ink-muted` | `#5A646E` | `#A0AAB4` |
| `--rule` | `#DDE2E8` | `#2A333B` |

> **金 is never literal white.** The classical colour of Metal is white, which is unusable as an accent
> on a white page. It is rendered as steel/slate — the *function* (structure, edge, authority) survives;
> the literal hue does not. This substitution is deliberate and should be stated if a reader asks.

## 2. Derivation

```
primary accent   := element of 用神 #1
secondary accent := element of 用神 #2
risk / caution   := element of 忌神 #1
ink / surface    := neutrals (never an element hue)
```

Cap: **two accents + one risk colour.** More reads as a legend, not a document.

### Worked example A — a 乙木 reader, 用神 火 then 土, 忌神 水

| Role | Element | Light | Dark |
|---|---|---|---|
| Primary (actions, "do this") | 火 | `#C2410C` | `#FF9E64` |
| Secondary (money, outcomes) | 土 | `#9A6B1E` | `#E7B85C` |
| **Risk** | 水 | `#1F5FA8` | `#7FB4F5` |

**Note what happened: risk is BLUE, and red is the encouraging colour.** That inverts the usual
convention — and it is correct for this reader, because Fire is what they need and Water is what smothers
their output. **This is precisely why `SKILL.md` §2.3 forbids hue-only meaning:** the reader's
convention-trained eye will read red as danger unless every risk callout is also prefixed `Risk —`.
Follow the rule and the palette teaches itself; break it and the palette actively misleads.

### Worked example B — a 己土 reader, 用神 火 then 土, 忌神 水 then 金

Same primary and risk as A. Where a **second** unfavourable element must be shown (a secondary drain),
use the risk colour at reduced emphasis — a left rule rather than a filled callout — **never a fourth
hue.**

### Worked example C — no chart available (template default)

Primary 金 `#4A5A6A`, secondary 土 `#9A6B1E`, risk `#B3261E` (a plain functional red, not an element
claim). Used for framework docs, first-run, and any report not about a person.

## 3. Contrast obligations

- Body text on its background: **≥ 4.5:1**
- Large text (≥ 24px, or ≥ 19px bold) and UI edges: **≥ 3:1**
- Both light and dark modes, independently
- **Compute the ratios; never assume them.** Accents that pass on white frequently fail on a tint.

Recompute whenever a token changes. The rendered exemplar
(`references/showcase.html`) carries a live contrast table — keep it in sync.

## 4. Semantic use

| Use | Colour |
|---|---|
| Recommended action, "do this" | Primary accent |
| Money, throughput, outcome figures | Secondary accent |
| Risk, drain, the thing to avoid | Risk colour **+ the word `Risk —`** |
| Uncertainty, `[UNVERIFIED]`, residuals | `--ink-muted` + italic — **never a hue** |
| Corrections and error-log entries | `--ink` on `--surface`, with a rule in the risk colour |
| Chart diagrams | Element hues **literally** (a Fire palace is Fire-coloured), independent of the reader's derived palette — this is the one place hue means element rather than valence. **Label it as such** so the two systems are not confused. |

## 5. Print / grayscale

The palette must survive going grey: primary and risk have to differ in **lightness**, not only hue.
Check by desaturating. If primary and risk collapse to the same grey, darken the risk colour until they
separate — the risk signal is the one that must never be lost.

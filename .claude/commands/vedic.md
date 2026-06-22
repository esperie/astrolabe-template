---
description: Cast the Vedic (Jyotish) chart — sidereal grahas, lagna, nakshatras, D9, karakas, Vimśottari dasha. Deterministic (vedic.js), validated vs Jagannatha Hora.
argument-hint: "[YYYY-MM-DD HH:MM tz lon gender] [--both]"
---

Full chart (the 吠陀 Vedic block is near the end):

!`node "$CLAUDE_PROJECT_DIR/.claude/calc/cast.mjs" $ARGUMENTS`

Give a plain-language Vedic reading anchored on the cast above (cite values, never recompute):

- **Lagna + Moon nakshatra** — the rising sign and the Moon's nakshatra/pada set the chart's spine and the Vimśottari sequence.
- **Current Mahā/Antar dasha** — locate today within the MD timeline; name the active MD→AD lords and what they govern (the dasha lord's house/sign placement).
- **Karakas** (Atmakāraka = soul/career theme) and any tight conjunctions.
- **D9 (Navāṁśa)** — strength check: note grahas that gain/lose dignity vs D1.

Conventions (state if material): **sidereal, Lahiri ayanāṁśa**; **raw clock → UT** (no true-solar hour, unlike the bazi hour-pillar); Rahu/Ketu = **true node** (matches Jagannatha Hora). This calculator is validated star-by-star + dasha-dates against a reference JHora chart — flag any value that looks off rather than trusting it blindly.

Cross-system note: where the question is consequential, sanity-check the Vedic indication against the bazi 用神/喜忌 (from the canon) and the ziwei reading — surface agreement or genuine conflict, don't force a match.

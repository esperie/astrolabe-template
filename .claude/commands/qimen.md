---
description: 奇门遁甲 — natal 命局 reading, or a 时家 divination for a specific question/time.
argument-hint: "[question] [at YYYY-MM-DD HH:MM]"
---

Request: **$ARGUMENTS**

Use **qimen-analyst**. It MUST cast via `.claude/calc/qimen.js` (never hand-cast — that is where 阴遁↔阳遁 and 值使门 errors occurred).

- **No time given** → read the natal 命局 (canon §8: [redacted], Destiny Palace 乾6/西北, 天任·九地·门开值使). Remember: the "Door of Destiny 开" is the **值使门**; the rotated 八门 at 乾6 is 休门 — do not conflate.
- **A time given** → cast 时家奇门 for that moment's 四柱, state the 定局 and 旬空 used, locate the 用神宫 for the question, then read 格局 / 旺相 / 空亡 / 击刑.

State the question framing and the time explicitly. Calibrated confidence.

**Scope note:** `/qimen` is a single-system situational/divinatory snapshot — useful on its own for a quick directional read. But per the HARD RULE (`rules/destiny-advisory.md` §0–1), any **life decision or advice** must triangulate all four systems and be redteamed + vetted — for those, use **`/decision`** (four-system), not a standalone qimen read. Always route the qimen draft to **destiny-redteamer** before presenting.

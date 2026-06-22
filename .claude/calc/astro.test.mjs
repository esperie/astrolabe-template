#!/usr/bin/env node
/** astro.test.mjs — locks the wrap-seam fix (red-team round 1) + far-year pillar accuracy. */
import astro from "./astro.js";
let pass = 0, fail = 0;
const ok = (n, c, g = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  got=" + g}`); c ? pass++ : fail++; };

// 春分 (L=0) straddles the 360/0 seam — must land in the REQUESTED year (was ~5y early before the fix).
for (const [y, m, d] of [[1900, 3, 21], [1979, 3, 21], [2000, 3, 20], [2100, 3, 20]]) {
  const g = astro.jdnToGregorian(Math.floor(astro.solarTermUT(y, 0) + 0.5));
  ok(`春分 ${y}`, g.y === y && g.m === m && Math.abs(g.d - d) <= 1, `${g.y}-${g.m}-${g.d}`);
}
// 立春 (L=315) far-year pillar-level guarantee
const lc = astro.jdnToGregorian(Math.floor(astro.solarTermUT(1900, 315) + 0.5));
ok("立春 1900 ≈ Feb 4", lc.y === 1900 && lc.m === 2 && Math.abs(lc.d - 4) <= 1, `${lc.y}-${lc.m}-${lc.d}`);
// canon 大雪 1979 regression (seeded via next year per the autumn/winter convention)
const dx = astro.jdnToGregorian(Math.floor(astro.solarTermUT(1980, 255) + 0.5));
ok("大雪 1979 ≈ Dec 7 (canon unchanged)", dx.y === 1979 && dx.m === 12 && Math.abs(dx.d - 7) <= 1, `${dx.y}-${dx.m}-${dx.d}`);

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);

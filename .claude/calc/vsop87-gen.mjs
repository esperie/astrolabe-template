// gen.mjs — parse VSOP87D files (CDS VizieR VI/81) and emit a truncated coefficient
// module. Term model: series_k(T) = sum A * cos(B + C*T), result = sum_n series_n * T^n.
// Variable 1=L (rad), 2=B (rad), 3=R (AU). Threshold cut keeps terms with |A| above a
// per-variable floor so heliocentric L/B reach sub-arcmin.
import fs from "node:fs";

const FILES = {
  earth: "VSOP87D.ear",
  mercury: "VSOP87D.mer",
  venus: "VSOP87D.ven",
  mars: "VSOP87D.mar",
  jupiter: "VSOP87D.jup",
  saturn: "VSOP87D.sat",
};
// Amplitude floors. L/B in rad, R in AU. T^n powers scale by ~ (T~0.26 in 2026) so
// higher powers contribute less; keep the same floor but they are few.
const FLOOR = { 1: 5e-8, 2: 5e-8, 3: 5e-8 };

function parse(path) {
  const lines = fs.readFileSync(path, "utf8").split("\n");
  // series[variable][power] = array of [A,B,C]
  const series = { 1: {}, 2: {}, 3: {} };
  let curVar = null,
    curPow = null;
  for (const raw of lines) {
    if (!raw.trim()) continue;
    if (raw.includes("VARIABLE")) {
      const m = raw.match(/VARIABLE\s+(\d)\s+\(LBR\)\s+\*T\*\*(\d)/);
      curVar = +m[1];
      curPow = +m[2];
      if (!series[curVar][curPow]) series[curVar][curPow] = [];
      continue;
    }
    const t = raw.trim().split(/\s+/);
    const C = +t[t.length - 1];
    const B = +t[t.length - 2];
    const A = +t[t.length - 3];
    series[curVar][curPow].push([A, B, C]);
  }
  return series;
}

function truncate(series) {
  const out = {};
  for (const v of [1, 2, 3]) {
    out[v] = {};
    for (const p of Object.keys(series[v])) {
      const kept = series[v][p].filter((t) => Math.abs(t[0]) >= FLOOR[v]);
      if (kept.length) out[v][p] = kept;
    }
  }
  return out;
}

function fmt(x) {
  // compact but full double precision
  return x.toPrecision(15).replace(/\.?0+$/, "").replace(/(\.\d*?)0+($|e)/i, "$1$2");
}

const all = {};
let counts = {};
for (const [body, file] of Object.entries(FILES)) {
  const trunc = truncate(parse(file));
  all[body] = trunc;
  let n = 0;
  for (const v of [1, 2, 3])
    for (const p of Object.keys(trunc[v])) n += trunc[v][p].length;
  counts[body] = n;
}

// emit data file
let s = `"use strict";\n`;
s += `/**\n * vsop87-data.js — AUTO-GENERATED truncated VSOP87D coefficients.\n`;
s += ` * Source: CDS VizieR catalogue VI/81 (Bretagnon & Francou 1988),\n`;
s += ` *   files VSOP87D.{ear,mer,ven,mar,jup,sat}, fetched via\n`;
s += ` *   https://cdsarc.cds.unistra.fr/ftp/VI/81/\n`;
s += ` * Parsed and amplitude-truncated by gen.mjs (floor L/B=${FLOOR[1]} rad, R=${FLOOR[3]} AU).\n`;
s += ` * Term model: var_k(T) = SUM A*cos(B + C*T); value = SUM_n var_n * T^n (T in Julian millennia from J2000 TT).\n`;
s += ` * Variable 1=L (rad), 2=B (rad), 3=R (AU). Do NOT hand-edit; regenerate from source.\n`;
s += ` * Term counts (kept): ${JSON.stringify(counts)}\n */\n`;
s += `module.exports = ${JSON.stringify(all)};\n`;
fs.writeFileSync("vsop87-data.js", s);
console.error("counts:", JSON.stringify(counts));
console.error("bytes:", s.length);

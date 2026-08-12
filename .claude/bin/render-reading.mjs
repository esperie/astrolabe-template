#!/usr/bin/env node
/**
 * render-reading.mjs — render a markdown reading through the Astrolabe report design system
 * (`.claude/skills/06-report-design/`) to HTML, PDF and DOCX.
 *
 *   node .claude/bin/render-reading.mjs <reading.md> [--out DIR] [--formats html,pdf,docx]
 *                                       [--accent1 火] [--accent2 土] [--risk 水]
 *                                       [--tier private|shareable|counterparty]
 *
 * PALETTE IS DERIVED, NOT CHOSEN (SKILL.md §2): pass the reader's 用神 #1, 用神 #2 and 忌神 #1 as
 * elements and the element→hue anchors in references/palette.md are applied. Omit them and the
 * framework default (steel/earth/red) is used. Per-person values are NEVER hardcoded here.
 *
 * PRIVACY (rules/security.md): output is written LOCALLY and is never uploaded. A reading carrying
 * birth data, third-party names or venture specifics is `private` tier — the tier is stamped into
 * the rendered header so a forwarded file declares what it is.
 *
 * Requires: pandoc (html, docx). Optional: weasyprint (pdf), soffice (docx fallback / pdf fallback).
 */
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const SKILL = path.join(ROOT, ".claude/skills/06-report-design/references");

// ── Element → hue anchors (references/palette.md §1). 金 is steel, never literal white. ──────────
const ELEMENTS = {
  木: { accent: "#1F6F4A", tint: "#E8F4EE", ink: "#12452E", dark: "#5FD39B" },
  火: { accent: "#C2410C", tint: "#FDECE3", ink: "#7A2908", dark: "#FF9E64" },
  土: { accent: "#9A6B1E", tint: "#FBF1DC", ink: "#5E4112", dark: "#E7B85C" },
  金: { accent: "#4A5A6A", tint: "#EDF1F5", ink: "#2C3641", dark: "#A9BDD1" },
  水: { accent: "#1F5FA8", tint: "#E6EFFA", ink: "#143C6B", dark: "#7FB4F5" },
};
const ALIAS = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const el = (v) => (v ? ELEMENTS[ALIAS[String(v).toLowerCase()] || v] : null);

// ── args ────────────────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : dflt;
};
const src = argv.find((a) => !a.startsWith("--") && a.endsWith(".md"));
if (!src) {
  console.error("usage: render-reading.mjs <reading.md> [--out DIR] [--formats html,pdf,docx]\n" +
                "                          [--accent1 火] [--accent2 土] [--risk 水] [--tier private]");
  process.exit(2);
}
const srcPath = path.resolve(src);
if (!fs.existsSync(srcPath)) { console.error(`not found: ${srcPath}`); process.exit(2); }

const outDir = path.resolve(flag("out", path.join(path.dirname(srcPath), "rendered")));
const formats = flag("formats", "html,pdf,docx").split(",").map((s) => s.trim()).filter(Boolean);
const tier = flag("tier", "private");
const base = path.basename(srcPath, ".md");
fs.mkdirSync(outDir, { recursive: true });

const has = (bin) => { try { execSync(`command -v ${bin}`, { stdio: "ignore" }); return true; } catch { return false; } };
if (!has("pandoc")) { console.error("pandoc is required (brew install pandoc)"); process.exit(3); }

// ── derived palette → a :root override appended after the stylesheet ────────────────────────────
const a1 = el(flag("accent1")), a2 = el(flag("accent2")), rk = el(flag("risk"));
const derived = (a1 || a2 || rk) ? `
/* Derived palette — accent1=${flag("accent1") || "default"} accent2=${flag("accent2") || "default"} risk=${flag("risk") || "default"} */
:root{
${a1 ? `  --accent-1:${a1.accent}; --accent-1-tint:${a1.tint}; --accent-1-ink:${a1.ink};` : ""}
${a2 ? `  --accent-2:${a2.accent}; --accent-2-tint:${a2.tint}; --accent-2-ink:${a2.ink};` : ""}
${rk ? `  --risk:${rk.accent}; --risk-tint:${rk.tint}; --risk-ink:${rk.ink};` : ""}
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
${a1 ? `  --accent-1:${a1.dark};` : ""}${a2 ? `  --accent-2:${a2.dark};` : ""}${rk ? `  --risk:${rk.dark};` : ""}
}}
:root[data-theme="dark"]{
${a1 ? `  --accent-1:${a1.dark};` : ""}${a2 ? `  --accent-2:${a2.dark};` : ""}${rk ? `  --risk:${rk.dark};` : ""}
}` : "";

const css = fs.readFileSync(path.join(SKILL, "report.css"), "utf8") + derived;
const cssTmp = path.join(outDir, `.${base}.css`);
fs.writeFileSync(cssTmp, css);

// Tier banner — a rendered file must declare what it is (SKILL §6.5).
const TIERS = {
  private: "PRIVATE — contains birth data and third-party detail. Do not forward.",
  shareable: "SHAREABLE — findings and actions only.",
  counterparty: "COUNTERPARTY-FACING — must not telegraph internal red lines.",
};
const banner = `<div class="tier-banner">${TIERS[tier] || TIERS.private}</div>\n`;
const bannerCss = `.tier-banner{max-width:var(--measure);margin:0 auto 2rem;padding:.5rem .8rem;
border:1px solid var(--risk);border-radius:4px;background:var(--risk-tint);color:var(--risk-ink);
font:600 12px/1.4 var(--font-ui);letter-spacing:.06em;text-transform:uppercase}
@media print{.tier-banner{border-width:2px}}`;
fs.appendFileSync(cssTmp, "\n" + bannerCss + "\n");

const htmlOut = path.join(outDir, `${base}.html`);
const wrote = [];

// ── HTML ────────────────────────────────────────────────────────────────────────────────────────
const buildHtml = () => {
  execFileSync("pandoc", [
    srcPath, "-f", "gfm", "-t", "html5", "--standalone", "--toc", "--toc-depth=2",
    "--metadata", `title=${base}`, "--css", path.basename(cssTmp), "-o", htmlOut,
  ], { cwd: outDir, stdio: "inherit" });

  let h = fs.readFileSync(htmlOut, "utf8");
  // Inline the CSS so the file is self-contained (SKILL §7), wrap tables for horizontal scroll,
  // and tag risk callouts so hue is never the only signal.
  h = h.replace(/<link rel="stylesheet" href="[^"]*"\s*\/?>/, `<style>\n${fs.readFileSync(cssTmp, "utf8")}\n</style>`);
  h = h.replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  h = h.replace(/<blockquote>\s*<p>(\s*(?:<strong>)?\s*(?:⚠|Risk —|RISK))/g, '<blockquote class="risk"><p>$1');
  h = h.replace(/<body>/, `<body>\n${banner}`);
  fs.writeFileSync(htmlOut, h);
  wrote.push(htmlOut);
};

// ── PDF (weasyprint preferred — honours @page and the print palette) ────────────────────────────
const buildPdf = () => {
  const pdfOut = path.join(outDir, `${base}.pdf`);
  if (has("weasyprint")) {
    execFileSync("weasyprint", ["-e", "utf-8", htmlOut, pdfOut], { stdio: "inherit" });
  } else if (has("soffice")) {
    execFileSync("soffice", ["--headless", "--convert-to", "pdf", "--outdir", outDir, htmlOut], { stdio: "inherit" });
  } else {
    console.warn("  ⚠ no weasyprint or soffice — skipping PDF");
    return;
  }
  wrote.push(pdfOut);
};

// ── DOCX (pandoc direct from markdown keeps clean, editable Word styles) ────────────────────────
const buildDocx = () => {
  const docxOut = path.join(outDir, `${base}.docx`);
  execFileSync("pandoc", [
    srcPath, "-f", "gfm", "-t", "docx", "--toc", "--toc-depth=2",
    "--metadata", `title=${base}`, "-o", docxOut,
  ], { stdio: "inherit" });
  wrote.push(docxOut);
};

if (formats.includes("html") || formats.includes("pdf")) buildHtml();
if (formats.includes("pdf")) buildPdf();
if (formats.includes("docx")) buildDocx();
if (!formats.includes("html") && fs.existsSync(htmlOut) && !wrote.includes(htmlOut)) fs.rmSync(htmlOut);
fs.rmSync(cssTmp, { force: true });

console.log(`\n✓ rendered [${tier}] ${path.basename(srcPath)}`);
for (const w of wrote) console.log(`    ${path.relative(ROOT, w)}  (${(fs.statSync(w).size / 1024).toFixed(0)} KB)`);
console.log(`\n  Privacy: local only. Do not upload a '${tier}' render (rules/security.md).`);

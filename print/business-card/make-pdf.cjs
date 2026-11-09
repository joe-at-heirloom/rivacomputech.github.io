/* Builds riva-business-card.pdf (2 pages: front, back) from the two editable SVGs.
   INTER_DIR=<folder with inter-latin-{500,600,700}-normal.woff> node print/business-card/make-pdf.cjs
   (needs Playwright). Static Inter files (e.g. from the @fontsource/inter npm package) embed as normal
   TrueType fonts, which print preflight prefers; without INTER_DIR it falls back to Google Fonts.
   Then run set-boxes.py to add the TrimBox/BleedBox and metadata. */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const dir = __dirname;
const svg = f => fs.readFileSync(path.join(dir, f), "utf8");
function fontCSS() {
  const d = process.env.INTER_DIR;
  if (!d) return '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&display=block">';
  return "<style>" + [500, 600, 700].map(w => `@font-face{font-family:Inter;font-weight:${w};font-display:block;src:url(data:font/woff;base64,${
    fs.readFileSync(path.join(d, `inter-latin-${w}-normal.woff`)).toString("base64")}) format("woff")}`).join("") + "</style>";
}

(async () => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Riva Computech business card</title>
  ${fontCSS()}
  <style>@page{size:3.75in 2.25in;margin:0}html,body{margin:0}.pg{width:3.75in;height:2.25in;overflow:hidden;break-after:page}.pg:last-child{break-after:auto}.pg svg{display:block;width:3.75in;height:2.25in}</style>
  </head><body><div class="pg">${svg("riva-business-card-front.svg")}</div><div class="pg">${svg("riva-business-card-back.svg")}</div></body></html>`;
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(html, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const loaded = await p.evaluate(() => [...document.fonts].filter(f => f.status === "loaded").map(f => f.family + " " + f.weight));
  if (!loaded.some(f => f.startsWith("Inter"))) throw new Error("Inter didn't load, so the PDF would use a fallback font. Check your connection.");
  await p.pdf({ path: path.join(dir, "riva-business-card.pdf"), width: "3.75in", height: "2.25in", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, preferCSSPageSize: true });
  console.log("fonts:", loaded.join(", "));
  await b.close();
})();

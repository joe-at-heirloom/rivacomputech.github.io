/* Browser: a small web browser. Many sites refuse to be shown inside other pages (X-Frame-Options /
   CSP frame-ancestors) and a browser can't detect that, so every page offers "Open in a new tab". */
import { h, $, esc, glyph, injectCSS, os, WORDMARK } from "../core.js";
import * as fs from "../fs.js";
import { appIcon } from "../icons.js";

injectCSS("browser", `
.br-bar{display:flex;align-items:center;gap:4px;padding:6px 8px;border-bottom:1px solid var(--divider)}
.br-url{flex:1;min-width:0;height:32px;border-radius:999px!important;font-size:13px;padding-left:14px}
.br-url:focus{border-radius:999px}
.br-main{flex:1;min-height:0;position:relative;background:#fff}
.br-main iframe{width:100%;height:100%;border:0;display:block;background:#fff}
.br-info{display:flex;align-items:center;gap:10px;padding:6px 12px;font-size:12.5px;background:var(--accent-soft);border-bottom:1px solid var(--divider)}
.br-info .i{width:14px;height:14px;flex:none}
.br-info .btn{min-height:26px;padding:2px 10px;font-size:12px;margin-left:auto}
.br-start{position:absolute;inset:0;overflow:auto;background:var(--layer-2);color:var(--text);display:flex;flex-direction:column;align-items:center;padding:8vh 24px 40px}
.br-start .logo{margin-bottom:28px}
.br-start .logo .bword{height:52px}
.br-q{width:min(560px,100%);position:relative}
.br-q .field{height:44px;border-radius:999px;padding-left:44px;font-size:15px;box-shadow:0 4px 16px -8px rgba(0,0,0,.3)}
.br-q .i{position:absolute;left:16px;top:14px;width:16px;height:16px;color:var(--text-2)}
.br-tiles{display:grid;grid-template-columns:repeat(auto-fill,96px);gap:10px;justify-content:center;width:min(640px,100%);margin-top:30px}
.br-tile{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 4px;border:0;border-radius:8px;background:transparent;font-size:12px;color:var(--text)}
.br-tile:hover{background:var(--subtle-hover)}
.br-tile .fav{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;background:var(--card);box-shadow:0 0 0 1px var(--stroke);font:700 18px var(--font-display)}
.br-tile .fav .app-ico{--s:30px}
.br-note{margin-top:28px;font-size:12px;color:var(--text-3);max-width:520px;text-align:center;line-height:1.5}
`);

export const winOpts = { w: 1040, h: 700, minW: 420, minH: 320 };
const TILES = [
  { t: "Services", app: "services" }, { t: "Health check", app: "health" }, { t: "About Devik", app: "about" }, { t: "Contact", app: "mail" },
  { t: "Wikipedia", url: "https://en.wikipedia.org/wiki/Special:Random", l: "W", c: "#333" },
  { t: "Example", url: "https://example.com/", l: "E", c: "#0a6fc2" }
];

export default function browser(win, args) {
  const hist = [], fut = []; let cur = "riva://start";
  const B = (g, l, fn) => h("button", { class: "ibtn", type: "button", "aria-label": l, "data-tip": l, html: glyph(g), onclick: fn });
  const url = h("input", { class: "field br-url", "aria-label": "Address", placeholder: "Search or enter web address", spellcheck: "false", autocapitalize: "off" });
  const back = B("back", "Back", () => { if (hist.length) { fut.push(cur); nav(hist.pop(), false); } });
  const fwd = B("arrow", "Forward", () => { if (fut.length) { hist.push(cur); nav(fut.pop(), false); } });
  const bar = h("div", { class: "br-bar" }, back, fwd, B("refresh", "Refresh", () => nav(cur, false)), B("home", "Home", () => nav("riva://start")), url, B("external", "Open in a new tab", () => { if (/^https?:/.test(cur)) window.open(cur, "_blank", "noopener"); }));
  const info = h("div", { class: "br-info", hidden: true });
  const main = h("div", { class: "br-main" });
  win.body.append(bar, info, main);

  function start() {
    const s = h("div", { class: "br-start" });
    s.innerHTML = `<div class="logo">${WORDMARK}</div>
      <form class="br-q">${glyph("search")}<input class="field" name="q" placeholder="Search the web" aria-label="Search the web" autocomplete="off"></form>
      <div class="br-tiles">${TILES.map((t, i) => `<button class="br-tile" type="button" data-i="${i}"><span class="fav" ${t.c ? `style="color:${t.c}"` : ""}>${t.app ? appIcon(t.app, 30) : esc(t.l)}</span>${esc(t.t)}</button>`).join("")}</div>
      <p class="br-note">Searches open in a new tab.</p>`;
    s.querySelector("form").addEventListener("submit", e => { e.preventDefault(); const q = e.target.q.value.trim(); if (q) window.open("https://duckduckgo.com/?q=" + encodeURIComponent(q), "_blank", "noopener"); });
    s.addEventListener("click", e => { const b = e.target.closest("[data-i]"); if (!b) return; const t = TILES[+b.dataset.i]; t.app ? os.launch(t.app) : nav(t.url); });
    return s;
  }
  function nav(u, push = true) {
    u = String(u || "").trim(); if (!u) return;
    if (!/^(https?:|riva:)/i.test(u)) {
      if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(u) && !/\s/.test(u)) u = "https://" + u;
      else { window.open("https://duckduckgo.com/?q=" + encodeURIComponent(u), "_blank", "noopener"); url.value = cur.startsWith("riva:") ? "" : cur; return; }
    }
    if (push && cur !== u) { hist.push(cur); fut.length = 0; }
    cur = u; main.innerHTML = ""; info.hidden = true;
    back.disabled = !hist.length; fwd.disabled = !fut.length;
    if (u.startsWith("riva:")) {
      url.value = ""; win.setTitle("New tab — Browser");
      const m = u.match(/^riva:\/\/(\w+)/); const app = m && m[1] !== "start" && m[1];
      if (app && os.launch) { os.launch(app === "contact" ? "mail" : app); }
      main.append(start()); setTimeout(() => $(".br-q input", main)?.focus(), 30); return;
    }
    url.value = u;
    let host = u; try { host = new URL(u).hostname; } catch {}
    win.setTitle(host + " — Browser");
    info.hidden = false;
    info.innerHTML = `${glyph("info")}<span>Blank page? ${esc(host)} may block embedding.</span><button class="btn" type="button">${glyph("external")}Open in new tab</button>`;
    info.querySelector("button").onclick = () => window.open(u, "_blank", "noopener");
    const f = h("iframe", { src: u, title: host, referrerpolicy: "strict-origin-when-cross-origin", sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox", loading: "eager" });
    main.append(f);
  }
  url.addEventListener("keydown", e => { if (e.key === "Enter") nav(url.value); });
  url.addEventListener("focus", () => url.select());
  let target = args.url;
  if (!target && args.path && fs.extOf(args.path) === "url") fs.text(args.path).then(t => { const m = t.match(/URL=(.+)/i) || t.match(/https?:\S+/); nav(m ? (m[1] || m[0]).trim() : "riva://start"); });
  else nav(target || "riva://start");
  return { onArgs(a) { if (a.url) nav(a.url); } };
}

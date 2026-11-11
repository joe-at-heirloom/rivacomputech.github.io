/* Riva Services: what Riva Computech looks after, why it's different, and how working together goes. */
import { h, $, $$, esc, glyph, injectCSS, os } from "../core.js";
import { SERVICES, ENGAGE, COMPARE, STEPS } from "../content.js";
import "./common.js";

injectCSS("services", `
.svc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:10px}
.svc{position:relative;display:flex;flex-direction:column;gap:10px;padding:18px;border-radius:10px;background:var(--card);border:1px solid var(--stroke);transition:background .15s,box-shadow .3s}
.svc:hover{background:var(--card-hover)}
.svc.flash{box-shadow:0 0 0 2px var(--accent);animation:svcFlash 1.4s var(--ease)}
@keyframes svcFlash{0%,40%{box-shadow:0 0 0 2px var(--accent),0 0 0 8px var(--accent-soft)}}
.svc-top{display:flex;align-items:center;justify-content:space-between}
.svc .app-ico{--s:40px}
.run{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--ok)}
.run::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.svc h3{font-size:16px}
.svc p{margin:0;color:var(--text-2);font-size:13.5px;line-height:1.5}
.svc code{margin-top:auto;font:12.5px var(--mono);color:var(--accent-ink);background:var(--accent-soft);padding:3px 8px;border-radius:4px;align-self:flex-start}
.svc .ask{align-self:flex-start;margin-top:2px}
.engage{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.engage .row{align-items:flex-start;min-height:0}
.engage .row .i{margin-top:2px;color:var(--accent-ink)}
.cmp{border-radius:10px;border:1px solid var(--stroke);overflow:hidden;background:var(--card)}
.cmp-cap{font:13px var(--mono);padding:12px 16px;border-bottom:1px solid var(--divider);background:var(--layer);color:var(--text-2);overflow-x:auto;white-space:nowrap}
.cmp-cap .tk-fn{color:var(--accent-ink)}.cmp-cap .tk-va{color:#7a5cd6}
:root[data-theme=dark] .cmp-cap .tk-va{color:#b9a6ff}
.cmp-grid{display:grid;grid-template-columns:1fr 1fr}
.cmp-h{padding:12px 16px;font-weight:600;font-size:13px;border-bottom:1px solid var(--divider)}
.cmp-h code{font-family:var(--mono);margin-right:6px;opacity:.7}
.cmp-h.us{background:var(--accent-soft);color:var(--accent-ink)}
.cmp-c{display:flex;gap:10px;padding:12px 16px;font-size:13.5px;line-height:1.45;border-bottom:1px solid var(--divider)}
.cmp-c:nth-last-child(-n+2){border-bottom:0}
.cmp-c.them{color:var(--text-2)}
.cmp-c.them .i{color:var(--bad);width:16px;height:16px;margin-top:2px}
.cmp-c.us{background:color-mix(in srgb,var(--accent) 5%,transparent)}
.cmp-c.us .i{color:var(--ok);width:16px;height:16px;margin-top:2px;stroke-width:2.2}
.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;counter-reset:s}
.steps li{counter-increment:s;padding:18px;border-radius:10px;background:var(--card);border:1px solid var(--stroke)}
.steps li::before{content:counter(s);display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--accent);color:var(--on-accent);font-weight:700;margin-bottom:12px}
.steps b{display:block;margin-bottom:4px}
.steps span{color:var(--text-2);font-size:13.5px}
@media (max-width:640px){.engage,.cmp-grid{grid-template-columns:1fr}.cmp-h.them,.cmp-c.them{display:none}}
:root.compact .svc{padding:16px;gap:8px}
:root.compact .svc .app-ico{--s:34px}
:root.compact .svc h3{font-size:15px}
`);

export const winOpts = { w: 1020, h: 700, minW: 360, minH: 320 };

export default function services(win, args) {
  const tabs = h("div", { class: "tabs", role: "tablist" });
  const page = h("div", { class: "page" });
  const views = {
    services: () => `<div class="page-in">
      <p class="kicker"><b>PS&gt;</b> Get-Service</p>
      <h2 class="ph">Your Microsoft stack, looked after end to end.</h2>
      <p class="lede">The everyday Microsoft and infrastructure work that keeps a small business running — as a one-off project or ongoing, proactive support.</p>
      <div class="svc-grid">${SERVICES.map(s => `<article class="svc" id="svc-${s.id}" data-id="${s.id}">
        <div class="svc-top"><span class="app-ico" style="--g1:${s.g[0]};--g2:${s.g[1]}">${glyph(s.glyph)}</span><span class="run">Running</span></div>
        <h3>${esc(s.name)}</h3><p>${esc(s.blurb)}</p>
        <ul class="ticks">${s.ticks.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
        <code>${esc(s.cmdlet)}</code>
        <button class="btn ask" type="button" data-ask="${esc(s.name)}">${glyph("chat")}Ask about this</button>
      </article>`).join("")}</div>
      <div class="engage">${ENGAGE.map(e => `<div class="row">${glyph(e.glyph)}<span class="row-t"><b style="font-weight:600">${esc(e.title)}</b><small style="font-size:13px">${esc(e.text)}</small></span></div>`).join("")}</div>
    </div>`,
    why: () => `<div class="page-in">
      <p class="kicker"><b>PS&gt;</b> Compare-Object</p>
      <h2 class="ph">Personal IT, not a ticket number.</h2>
      <p class="lede">Bigger providers often work through ticket queues and whoever is on shift. With Riva Computech you get one engineer who knows your setup — and sees the job through.</p>
      <div class="cmp"><div class="cmp-cap"><span style="opacity:.7">PS C:\\Riva&gt;</span> <span class="tk-fn">Compare-Object</span> <span class="tk-va">$TypicalProvider</span> <span class="tk-va">$RivaComputech</span></div>
        <div class="cmp-grid"><div class="cmp-h them"><code>&lt;=</code>Typical IT provider</div><div class="cmp-h us"><code>=&gt;</code>Riva Computech</div>
        ${COMPARE.map(([a, b]) => `<div class="cmp-c them">${glyph("x")}<span>${esc(a)}</span></div><div class="cmp-c us">${glyph("check")}<span>${b}</span></div>`).join("")}</div></div>
      <div class="cta" style="margin-top:22px"><button class="btn accent lg" type="button" data-go="mail">${glyph("chat")}Book a free 30-min chat</button></div>
    </div>`,
    how: () => `<div class="page-in">
      <p class="kicker"><b>PS&gt;</b> Start-Project</p>
      <h2 class="ph">How working together goes.</h2>
      <p class="lede">No sales team, no hand-offs. The person who scopes the job is the person who does it.</p>
      <ol class="steps">${STEPS.map(([b, s]) => `<li><b>${esc(b)}</b><span>${esc(s)}</span></li>`).join("")}</ol>
      <div class="engage">${ENGAGE.map(e => `<div class="row">${glyph(e.glyph)}<span class="row-t"><b style="font-weight:600">${esc(e.title)}</b><small style="font-size:13px">${esc(e.text)}</small></span></div>`).join("")}</div>
      <div class="cta" style="margin-top:22px"><button class="btn accent lg" type="button" data-go="mail">${glyph("chat")}Send a message</button><button class="btn lg" type="button" data-go="health">Run the health check first</button></div>
    </div>`
  };
  const names = { services: "Services", why: "Why Riva", how: "How it works" };
  Object.keys(views).forEach(k => tabs.append(h("button", { type: "button", role: "tab", "data-tab": k }, names[k])));
  let cur = null;
  function show(k, focus) {
    if (!views[k]) k = "services";
    if (cur !== k) { cur = k; page.innerHTML = views[k](); page.scrollTop = 0; }
    $$("[data-tab]", tabs).forEach(b => { b.classList.toggle("on", b.dataset.tab === k); b.setAttribute("aria-selected", b.dataset.tab === k); });
    win.setTitle("Riva Services" + (k === "services" ? "" : " — " + names[k]));
    if (focus) { const el = $("#svc-" + focus, page); if (el) { setTimeout(() => { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash"); }, 60); } }
  }
  tabs.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) show(b.dataset.tab); });
  page.addEventListener("click", e => {
    const a = e.target.closest("[data-ask]"); if (a) { os.launch("mail", { subject: a.dataset.ask, focus: "msg" }); return; }
    const g = e.target.closest("[data-go]"); if (g) os.launch(g.dataset.go);
  });
  win.body.append(tabs, page);
  show(args.tab || "services", args.focus);
  return { onArgs(a) { show(a.tab || (a.focus ? "services" : cur), a.focus); } };
}

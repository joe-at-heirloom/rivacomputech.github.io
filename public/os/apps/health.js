/* Health Check: eight Settings-style toggles → a live score and "fix these first". Nothing leaves the browser. */
import { h, $, $$, esc, glyph, injectCSS, os, store } from "../core.js";
import { HEALTH } from "../content.js";
import "./common.js";

injectCSS("health", `
.hc{display:flex;flex:1;min-height:0}
.hc-score{width:330px;flex:none;padding:28px 26px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;border-right:1px solid var(--divider);background:var(--layer);overflow:auto}
.ring{position:relative;width:150px;height:150px}
.ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring circle{fill:none;stroke-width:10}
.ring .trk{stroke:var(--stroke-2)}
.ring .val{stroke:var(--ring,var(--accent));stroke-linecap:round;stroke-dasharray:339.3;stroke-dashoffset:339.3;transition:stroke-dashoffset .6s var(--ease),stroke .3s}
.ring-n{position:absolute;inset:0;display:grid;place-items:center;align-content:center}
.ring-n b{font:600 44px/1 var(--font-display)}
.ring-n small{color:var(--text-2);font-size:12px}
.hc-score h3{font-size:18px;margin-top:4px}
.hc-score > p{margin:0;color:var(--text-2);font-size:13.5px;line-height:1.5}
.hc-fixes{width:100%;text-align:left;padding:14px 16px;border-radius:var(--r-card);background:var(--card);border:1px solid var(--stroke)}
.hc-fixes h4{font-size:13px;margin-bottom:8px}
.hc-fixes ol{margin:0;padding-left:18px;font-size:13px;line-height:1.5;color:var(--text-2)}
.hc-fixes li + li{margin-top:6px}
.hc-note{display:flex;gap:8px;font-size:12px;color:var(--text-3);text-align:left;align-items:flex-start;margin-top:auto}
.hc-note .i{width:14px;height:14px;margin-top:2px;flex:none}
.hc-list{flex:1;overflow:auto;padding:24px 26px;background:var(--layer-2)}
.hc-list h2{font:600 22px var(--font-display);margin-bottom:4px}
.hc-list > p{color:var(--text-2);margin:0 0 16px;font-size:13.5px}
.hc-row{cursor:pointer}
.hc-row .hc-ico{width:36px;height:36px;border-radius:8px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-ink);flex:none}
.hc-row .hc-ico .i{width:18px;height:18px}
.hc[data-state=good]{--ring:var(--ok)}
.hc[data-state=warn]{--ring:#e19b00}
.hc[data-state=bad]{--ring:var(--bad)}
@media (max-width:760px){.hc{flex-direction:column;overflow:auto}.hc-score{width:auto;border-right:0;border-bottom:1px solid var(--divider)}.hc-list{overflow:visible}}
:root.compact .hc{flex-direction:column;overflow:auto}
:root.compact .hc-score{width:auto;border-right:0;border-bottom:1px solid var(--divider);overflow:visible}
:root.compact .hc-list{overflow:visible;padding:18px 14px}
:root.compact .hc-score{padding:20px 16px;gap:10px}
:root.compact .ring{width:116px;height:116px}
:root.compact .ring-n b{font-size:34px}
`);

export const winOpts = { w: 980, h: 660, minW: 360, minH: 360 };

export default function health(win) {
  const saved = store.get("health", []);
  const wrap = h("div", { class: "hc", "data-state": "none" });
  wrap.innerHTML = `<aside class="hc-score" aria-live="polite">
      <div class="ring" aria-hidden="true"><svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="54"/><circle class="val" cx="60" cy="60" r="54"/></svg><div class="ring-n"><b>0</b><small>of 8 checks</small></div></div>
      <h3 id="hc-t">Let's see where you stand</h3><p id="hc-p">Switch on each item that's true for your business today.</p>
      <div class="hc-fixes" hidden><h4>Fix these first</h4><ol></ol></div>
      <button class="btn accent lg" type="button" id="hc-cta">${glyph("chat")}Talk it through with Devik</button>
      <p class="hc-note">${glyph("lock")}<span>Private: runs in your browser. A quick self-check, not an audit.</span></p>
    </aside>
    <div class="hc-list"><p class="kicker"><b>PS&gt;</b> Test-ITHealth</p><h2>How healthy is your setup?</h2><p>Eight quick checks covering the gaps that cause the most pain.</p>
      ${HEALTH.map((q, i) => `<label class="row hc-row"><span class="hc-ico">${glyph(q.glyph)}</span><span class="row-t"><b>${esc(q.t)}</b><small>${esc(q.s)}</small></span><span class="tgl"><input type="checkbox" role="switch" data-i="${i}" ${saved.includes(i) ? "checked" : ""} aria-label="${esc(q.t)}"></span></label>`).join("")}
    </div>`;
  win.body.append(wrap);
  const boxes = $$("input[data-i]", wrap), ring = $(".val", wrap);
  function update() {
    const on = boxes.filter(b => b.checked).map(b => +b.dataset.i), n = on.length, miss = HEALTH.map((q, i) => i).filter(i => !on.includes(i));
    store.set("health", on);
    $(".ring-n b", wrap).textContent = n;
    ring.style.strokeDashoffset = String(339.3 * (1 - n / 8));
    const any = boxes.some(b => b.dataset.touched) || n > 0;
    wrap.dataset.state = !any ? "none" : n >= 7 ? "good" : n >= 4 ? "warn" : "bad";
    const [t, p] = !any ? ["Let's see where you stand", "Switch on each item that's true for your business today."]
      : n === 8 ? ["Excellent. Genuinely rare.", "You've covered the basics most businesses miss. Worth a second opinion on the details?"]
      : n >= 6 ? ["In good shape", "A couple of gaps worth closing before they matter."]
      : n >= 4 ? ["Some real gaps", "Nothing unusual, but these are the ones that cause the bad days."]
      : ["Let's fix this together", "Most small businesses start here. The good news: these are quick wins."];
    $("#hc-t", wrap).textContent = t; $("#hc-p", wrap).textContent = p;
    const fx = $(".hc-fixes", wrap); fx.hidden = !any || !miss.length;
    $("ol", fx).innerHTML = miss.slice(0, 3).map(i => `<li>${esc(HEALTH[i].fix)}</li>`).join("");
    return { n, miss };
  }
  wrap.addEventListener("change", e => { if (e.target.dataset.i != null) { e.target.dataset.touched = 1; update(); } });
  $("#hc-cta", wrap).addEventListener("click", () => {
    const { n, miss } = update();
    const msg = `I ran the rivaOS health check: ${n}/8.\n` + (miss.length ? `Gaps:\n${miss.map(i => "- " + HEALTH[i].short).join("\n")}\n\n` : "\n") + "What's going on with our setup: ";
    os.launch("mail", { subject: `Health check: ${n}/8`, message: msg, focus: "msg" });
  });
  update();
}

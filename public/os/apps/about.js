/* About Devik: who you'll be working with. */
import { h, esc, glyph, injectCSS, os, EMAIL, PHONE } from "../core.js";
import { PROFILE, BIO, STATUS } from "../content.js";
import "./common.js";

injectCSS("about", `
.ab{display:grid;grid-template-columns:minmax(280px,400px) 1fr;gap:28px;align-items:start}
.ab-card{padding:22px;border-radius:12px;background:var(--card);border:1px solid var(--stroke);display:flex;flex-direction:column;gap:16px}
.ab-id{display:flex;align-items:center;gap:14px}
.ab-id h3{font-size:20px}
.ab-id p{margin:2px 0 0;color:var(--text-2);font-size:13px}
.adout{margin:0;padding:14px;border-radius:8px;background:#0c0c0c;color:#ccc;font:12px/1.6 var(--mono);white-space:pre;overflow-x:auto}
.adout .c-gr{color:#808080}.adout .c-y{color:#F9F1A5}.adout .c-h{color:#16C60C;font-weight:700}.adout .c-g{color:#16C60C}
.ab-copy p{font-size:15px;line-height:1.7;margin:0 0 14px;max-width:62ch;color:var(--text)}
.ab-copy p:first-of-type{font-size:17px}
.sign{display:flex;align-items:center;gap:12px;margin:22px 0}
.sign b{display:block}
.sign small{color:var(--text-2)}
.ab > *{min-width:0}
@media (max-width:760px){.ab{grid-template-columns:1fr}}
:root.compact .adout{font-size:11px;padding:12px}
:root.compact .ab-copy p,:root.compact .ab-copy p:first-of-type{font-size:15px}
:root.compact .ab{grid-template-columns:1fr}
`);

export const winOpts = { w: 940, h: 660, minW: 360, minH: 320 };

export default function about(win) {
  const page = h("div", { class: "page" });
  // TODO(Devik): swap the DP initials for a real square photo, e.g. <img src="/devik.jpg" alt="Devik Patel">
  page.innerHTML = `<div class="page-in"><div class="ab">
    <div class="ab-card">
      <div class="ab-id"><div class="avatar" aria-hidden="true">DP</div><div><h3>Devik Patel</h3><p>Owner · Riva Computech</p></div></div>
<pre class="adout" aria-label="Devik's profile, formatted as PowerShell output"><span class="c-gr">PS C:\\Riva&gt;</span> <span class="c-y">Get-ADUser</span> devik <span class="c-gr">-Properties</span> *

${PROFILE.map(([k, v]) => `<span class="c-h">${esc((k + "           ").slice(0, 11))}</span>: ${esc(v)}`).join("\n")}
<span class="c-h">Enabled    </span>: <span class="c-g">True</span></pre>
      <span class="pill" style="align-self:flex-start"><span class="dot"></span>${esc(STATUS)}</span>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:13px">
        <a href="mailto:${EMAIL}" style="display:flex;gap:8px;align-items:center;text-decoration:none">${glyph("mail", "i sm")}${EMAIL}</a>
        <a href="tel:${PHONE.replace(/[^\d+]/g, "")}" style="display:flex;gap:8px;align-items:center;text-decoration:none">${glyph("phone", "i sm")}${PHONE}</a>
      </div>
    </div>
    <div class="ab-copy">
      <p class="kicker"><b>PS&gt;</b> Get-ADUser devik</p>
      <h2 class="ph">Hi, I'm Devik.</h2>
      ${BIO.map(p => `<p>${esc(p)}</p>`).join("")}
      <div class="sign"><span class="avatar sm" aria-hidden="true">DP</span><span><b>Devik Patel</b><small>Owner, Riva Computech</small></span></div>
      <div class="cta"><button class="btn accent lg" type="button" data-go="mail">${glyph("chat")}Book a free 30-min chat</button><button class="btn lg" type="button" data-go="services">See services</button></div>
    </div>
  </div></div>`;
  page.addEventListener("click", e => { const b = e.target.closest("[data-go]"); if (b) os.launch(b.dataset.go); });
  win.body.append(page);
}

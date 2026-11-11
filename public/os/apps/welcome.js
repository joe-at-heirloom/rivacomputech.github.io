/* Welcome: Riva Computech at a glance. The first window every visitor sees. */
import { h, $, esc, glyph, injectCSS, os, WORDMARK, settings } from "../core.js";
import { appIcon } from "../icons.js";
import { SLOGAN, LEDE, STATUS } from "../content.js";
import "./common.js";

injectCSS("welcome", `
.wel-hero{position:relative;overflow:hidden;border-radius:12px;padding:30px 32px 28px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 12%,var(--card)),var(--card) 55%);border:1px solid var(--stroke)}
.wel-hero::after{content:"";position:absolute;right:-90px;top:-110px;width:340px;height:340px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) 28%,transparent),transparent);pointer-events:none}
.wel-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:26px;flex-wrap:wrap}
.wel-brand{display:flex;flex-direction:column;align-items:flex-start;gap:7px}
.wel-brand .bword{height:44px}
.wel-sub{font:600 10px/1 var(--font);letter-spacing:.3em;text-transform:uppercase;color:var(--text-2);padding-left:1px}
.wel-hero .ph{font-size:clamp(26px,3vw,36px)}
.wel-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:18px}
.wel-foot label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-2)}
:root.compact .wel-hero{padding:20px 18px;border-radius:10px}
:root.compact .wel-hero .ph{font-size:26px}
:root.compact .wel-top{margin-bottom:18px}
:root.compact .wel-brand .bword{height:36px}
:root.compact .wel-sub{font-size:8.5px}
:root.compact .meta-row{gap:6px 14px;font-size:12.5px}
`);

export const winOpts = { w: 860, h: 620, minW: 360, minH: 320 };

export default function welcome(win) {
  const page = h("div", { class: "page" });
  page.innerHTML = `<div class="page-in">
    <section class="wel-hero">
      <div class="wel-top"><span class="wel-brand">${WORDMARK}<span class="wel-sub" aria-hidden="true">Computech</span><span class="sr-only">Riva Computech</span></span>
        <span class="pill"><span class="dot"></span>${esc(STATUS)}</span></div>
      <p class="kicker">Microsoft 365 · Azure · Infrastructure</p>
      <h2 class="ph">${esc(SLOGAN[0])}<br><span class="hl">${esc(SLOGAN[1])}</span></h2>
      <p class="lede">${esc(LEDE)}</p>
      <div class="cta">
        <button class="btn accent lg" type="button" data-go="mail">${glyph("chat")}Book a free 30-min chat</button>
        <button class="btn lg" type="button" data-go="services">See services</button>
      </div>
      <ul class="meta-row"><li>${glyph("check")}10+ years hands-on</li><li>${glyph("check")}One engineer, start to finish</li><li>${glyph("check")}Evenings &amp; weekends too</li></ul>
    </section>

    <h3 class="sec-t">Explore</h3>
    <p class="sec-s">Every tile opens a real app.</p>
    <div class="tiles">
      ${[["services", "Services", "Microsoft 365, Azure, migrations and more."],
         ["health", "IT health check", "Eight quick checks, one score."],
         ["code", "Automation", "A real script you can run.", { path: "C:\\Riva\\Scripts\\Offboard-User.ps1" }],
         ["about", "About Devik", "The senior engineer you'll actually work with."],
         ["mail", "Contact", "Straight answers, usually within a day."],
         ["terminal", "Terminal", "Type help. Yes, it's PowerShell."]]
        .map(([id, t, s, a]) => `<button class="tile" type="button" data-go="${id}"${a ? ` data-args='${esc(JSON.stringify(a))}'` : ""}>${appIcon(id, 36)}<span><b>${esc(t)}</b><small>${esc(s)}</small></span></button>`).join("")}
    </div>

    <div class="techs"><span class="l">Hands-on with</span>
      <img src="/assets/logos/microsoft.svg" alt="Microsoft" width="110" height="24" loading="lazy" />
      <img src="/assets/logos/azure.svg" alt="Microsoft Azure" width="92" height="24" loading="lazy" />
      <img src="/assets/logos/windows.svg" alt="Windows" width="110" height="24" loading="lazy" />
      <img src="/assets/logos/vmware.svg" alt="VMware" width="100" height="24" loading="lazy" />
      <span class="citrix"><img src="/assets/logos/citrix.svg" alt="" width="20" height="20" loading="lazy" />citrix</span>
    </div>

    <div class="wel-foot">
      <label><input type="checkbox" id="wel-start" ${settings.get("showWelcome") === false ? "" : "checked"}> Show Welcome when rivaOS starts</label>
      <a class="legal" style="margin:0" href="/">Back to the main site</a>
    </div>
    <p class="legal">Microsoft, Microsoft 365, Azure, Windows, Intune, VMware and Citrix are trademarks of their respective owners. Riva Computech is independent and not affiliated with or endorsed by them. © ${new Date().getFullYear()} Riva Computech.</p>
  </div>`;
  win.body.append(page);
  page.addEventListener("click", e => {
    const b = e.target.closest("[data-go]"); if (!b) return;
    os.launch(b.dataset.go, b.dataset.args ? JSON.parse(b.dataset.args) : {});
  });
  $("#wel-start", page).addEventListener("change", e => settings.set("showWelcome", e.target.checked));
}

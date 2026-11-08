/* Welcome: Riva Computech at a glance. The first window every visitor sees. */
import { h, $, esc, glyph, injectCSS, os, WORDMARK, settings } from "../core.js";
import { appIcon } from "../icons.js";
import { TAGLINE, LEDE, STATUS } from "../content.js";
import "./common.js";

injectCSS("welcome", `
.wel-hero{position:relative;overflow:hidden;border-radius:12px;padding:30px 32px 28px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 12%,var(--card)),var(--card) 55%);border:1px solid var(--stroke)}
.wel-hero::after{content:"";position:absolute;right:-90px;top:-110px;width:340px;height:340px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--accent) 28%,transparent),transparent);pointer-events:none}
.wel-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:26px;flex-wrap:wrap}
.wel-brand{display:flex;align-items:center;gap:10px;color:var(--text)}
.wel-brand .bmark{width:42px;height:42px}
.wel-brand .bword{height:36px;width:auto}
.wel-hero .ph{font-size:clamp(28px,4vw,42px);max-width:16ch}
.wel-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:18px}
.wel-foot label{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-2)}
:root.compact .wel-hero{padding:20px 18px;border-radius:10px}
:root.compact .wel-hero .ph{font-size:28px}
:root.compact .wel-top{margin-bottom:18px}
:root.compact .wel-brand .bmark{width:34px;height:34px}
:root.compact .wel-brand .bword{height:28px}
:root.compact .meta-row{gap:6px 14px;font-size:12.5px}
`);

export const winOpts = { w: 860, h: 620, minW: 360, minH: 320 };

export default function welcome(win) {
  const page = h("div", { class: "page" });
  page.innerHTML = `<div class="page-in">
    <section class="wel-hero">
      <div class="wel-top"><span class="wel-brand"><svg class="bmark" viewBox="0 0 64 64" aria-hidden="true"><use href="#rivaMarkG"/></svg>${WORDMARK}<span class="sr-only">Riva Computech</span></span>
        <span class="pill"><span class="dot"></span>${esc(STATUS)}</span></div>
      <p class="kicker">Microsoft 365 · Azure · Infrastructure</p>
      <h2 class="ph">${esc(TAGLINE).replace("picks up the phone.", '<span class="hl">picks up the phone.</span>')}</h2>
      <p class="lede">${esc(LEDE)}</p>
      <div class="cta">
        <button class="btn accent lg" type="button" data-go="mail">${glyph("chat")}Book a free 30-min chat</button>
        <button class="btn lg" type="button" data-go="services">See services</button>
      </div>
      <ul class="meta-row"><li>${glyph("check")}10+ years hands-on</li><li>${glyph("check")}One engineer, start to finish</li><li>${glyph("check")}Evenings &amp; weekends too</li></ul>
    </section>

    <h3 class="sec-t">Explore</h3>
    <p class="sec-s">This whole site is a working desktop. Every tile opens a real app.</p>
    <div class="tiles">
      ${[["services", "Services", "Microsoft 365, Azure, migrations, backup, security and infrastructure."],
         ["health", "IT health check", "Eight quick checks and a score. Runs in your browser."],
         ["code", "Automation", "A real PowerShell offboarding script you can run.", { path: "C:\\Riva\\Scripts\\Offboard-User.ps1" }],
         ["about", "About Devik", "The senior engineer you'll actually work with."],
         ["mail", "Contact", "Tell us what's going on. Straight answers, usually within a day."],
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
      <span class="legal" style="margin:0">rivaOS is an original design by Riva Computech.</span>
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

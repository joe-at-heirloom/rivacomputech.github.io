/* Contact: a mail-compose window.
   Delivery order: Formspree (primary) → the Cloudflare Worker's /api/contact (if email is configured there)
   → the visitor's own email app (mailto:), so a message can always get through. */
import { h, $, $$, esc, glyph, injectCSS, os, api, EMAIL, PHONE, PHONE_TEL, FORMSPREE, copyText, track, sound } from "../core.js";
import * as fs from "../fs.js";
import { STEPS, HOURS } from "../content.js";
import "./common.js";

injectCSS("mail", `
.ml{display:flex;flex:1;min-height:0}
.ml-side{width:330px;flex:none;overflow:auto;padding:26px 24px;border-right:1px solid var(--divider);background:var(--layer)}
.ml-side .ph{font-size:24px}
.ml-side .lede{font-size:14px;margin-bottom:18px}
.ml-steps{list-style:none;margin:0 0 18px;padding:0;counter-reset:s;display:flex;flex-direction:column;gap:10px}
.ml-steps li{counter-increment:s;display:flex;gap:12px;font-size:13px;line-height:1.4}
.ml-steps li::before{content:counter(s);flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent-ink);font-weight:700;font-size:12px}
.ml-steps b{display:block}
.ml-steps span{color:var(--text-2)}
.direct{display:flex;flex-direction:column;gap:4px}
.direct .row{min-height:56px;padding:10px 12px;gap:12px}
.direct .row .i{color:var(--accent-ink)}
.direct a{color:var(--text);text-decoration:none;font-size:14px}
.direct a:hover{text-decoration:underline}
.ml-main{flex:1;min-width:0;display:flex;flex-direction:column;background:var(--layer-2)}
.ml-form{flex:1;display:flex;flex-direction:column;min-height:0;overflow:auto}
.m-row{display:flex;align-items:center;gap:12px;padding:8px 22px;border-bottom:1px solid var(--divider);min-height:48px}
.m-lbl{width:62px;flex:none;color:var(--text-2);font-size:13px}
.m-to{display:flex;align-items:center;gap:8px;padding:3px 10px 3px 3px;border-radius:999px;background:var(--accent-soft);font-size:13px}
.m-to em{font-style:normal;color:var(--text-2)}
.m-row .field{border-color:transparent;background:transparent;border-bottom:1px solid transparent}
.m-row .field:hover{background:var(--subtle-hover)}
.m-row .field:focus{background:var(--field-focus);border-bottom:2px solid var(--accent)}
.m-from{gap:8px}
.m-chips{display:flex;flex-wrap:wrap;gap:6px;padding:12px 22px;border-bottom:1px solid var(--divider)}
.chip{border:1px solid var(--stroke-2);background:var(--ctl);border-radius:999px;padding:4px 12px;font-size:12.5px;color:var(--text)}
.chip:hover{background:var(--ctl-hover)}
.chip[aria-pressed=true]{background:var(--accent);color:var(--on-accent);border-color:transparent}
.m-msg{flex:1;display:flex;padding:14px 22px;min-height:180px}
.m-msg textarea{flex:1;resize:none;border:0;background:transparent;font-size:14.5px;line-height:1.6}
.m-msg textarea:focus{border:0;padding-bottom:8px;background:transparent}
.m-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 22px;border-top:1px solid var(--divider);background:var(--mica);flex-wrap:wrap}
.m-status{font-size:13px;color:var(--text-2)}
.m-status.bad{color:var(--bad)}
.m-status.ok{color:var(--ok)}
.hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.m-sent{flex:1;display:grid;place-items:center;align-content:center;gap:12px;text-align:center;padding:30px}
.m-sent .tick{width:64px;height:64px;border-radius:50%;background:var(--ok);color:#fff;display:grid;place-items:center;animation:pop .4s var(--ease)}
.m-sent .tick .i{width:32px;height:32px;stroke-width:2.4}
@keyframes pop{from{transform:scale(.5);opacity:0}}
.m-sent p{color:var(--text-2);max-width:42ch;margin:0}
.field.invalid{border-bottom-color:var(--bad)!important}
@media (max-width:820px){.ml{flex-direction:column-reverse;overflow:auto}.ml-side{width:auto;border-right:0;border-top:1px solid var(--divider);overflow:visible}.ml-form{overflow:visible}}
:root.compact .ml{flex-direction:column-reverse;overflow:auto}
:root.compact .ml-side{width:auto;border-right:0;border-top:1px solid var(--divider);overflow:visible}
:root.compact .ml-form{overflow:visible}
:root.compact .m-from{flex-wrap:wrap}
:root.compact .m-row{padding:6px 14px;min-height:44px}
:root.compact .m-lbl{width:52px}
:root.compact .m-chips{padding:10px 14px}
:root.compact .m-msg{padding:10px 14px;min-height:160px}
:root.compact .m-foot{padding:10px 14px}
:root.compact .ml-side{padding:20px 16px}
:root.compact .m-to{font-size:12.5px}
:root.compact .m-to em{display:block}
`);

export const winOpts = { w: 940, h: 680, minW: 360, minH: 360 };
const CHIPS = ["Migration", "Microsoft 365 setup", "Backup & recovery", "Security", "Infrastructure", "Automation"];
const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export default function mail(win, args) {
  const wrap = h("div", { class: "ml" });
  wrap.innerHTML = `
  <aside class="ml-side">
    <p class="kicker"><b>PS&gt;</b> Send-MailMessage</p>
    <h2 class="ph">Let's scope your project.</h2>
    <p class="lede">Tell us what you're running and what's giving you trouble. You'll get a straight answer from Devik — usually within one business day.</p>
    <ol class="ml-steps">${STEPS.map(([b, s]) => `<li><div><b>${esc(b)}</b><span>${esc(s)}</span></div></li>`).join("")}</ol>
    <div class="direct">
      <div class="row">${glyph("mail")}<span class="row-t"><small>Email</small><a href="mailto:${EMAIL}">${EMAIL}</a></span><button class="ibtn" type="button" data-copy="${EMAIL}" aria-label="Copy email" data-tip="Copy">${glyph("copy")}</button></div>
      <div class="row">${glyph("phone")}<span class="row-t"><small>Phone</small><a href="tel:${PHONE_TEL}">${PHONE}</a></span><button class="ibtn" type="button" data-copy="${PHONE}" aria-label="Copy phone number" data-tip="Copy">${glyph("copy")}</button></div>
      <div class="row">${glyph("clock")}<span class="row-t"><small>Hours</small><b>${esc(HOURS)}</b></span></div>
    </div>
  </aside>
  <div class="ml-main">
    <form class="ml-form" novalidate>
      <input type="text" name="company_website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="m-row"><span class="m-lbl">To</span><span class="m-to"><span class="avatar xs" aria-hidden="true">DP</span><span>Devik Patel <em>&lt;${EMAIL}&gt;</em></span></span></div>
      <div class="m-row m-from"><label class="m-lbl" for="m-name-${win.id}">From</label>
        <input class="field" id="m-name-${win.id}" name="name" placeholder="Your name" autocomplete="name" required>
        <input class="field" name="email" type="email" placeholder="you@company.com" autocomplete="email" aria-label="Your email" required></div>
      <div class="m-row"><label class="m-lbl" for="m-sub-${win.id}">Subject</label><input class="field" id="m-sub-${win.id}" name="subject" placeholder="Tenant migration, M365 setup, backups…"></div>
      <div class="m-chips" role="group" aria-label="Quick subjects">${CHIPS.map(c => `<button class="chip" type="button" aria-pressed="false">${esc(c)}</button>`).join("")}</div>
      <div class="m-msg"><textarea class="field" name="message" required aria-label="Message" placeholder="What are you running, and what's giving you trouble?"></textarea></div>
      <div class="m-foot"><span class="m-status" role="status" aria-live="polite"></span><button class="btn accent lg" type="submit">${glyph("send")}<span>Send</span></button></div>
    </form>
    <div class="m-sent" hidden><div class="tick">${glyph("check")}</div><h3>Message sent</h3><p>Devik usually replies within one business day.</p><p style="font-size:12.5px">A copy is in Documents › Sent.</p><button class="btn" type="button" id="m-again">Write another</button></div>
  </div>`;
  win.body.append(wrap);
  const form = $("form", wrap), F = n => form.elements[n], status = $(".m-status", wrap), sendB = $("[type=submit]", form);
  const set = (t, cls = "") => { status.textContent = t; status.className = "m-status " + cls; };
  function prefill(a = {}) {
    if (a.subject) { F("subject").value = a.subject; syncChips(); }
    if (a.message) F("message").value = a.message;
    $(".m-sent", wrap).hidden = true; form.hidden = false;
    setTimeout(() => (a.focus === "msg" && F("name").value ? F("message") : F("name")).focus(), 60);
  }
  function syncChips() { $$(".chip", wrap).forEach(c => c.setAttribute("aria-pressed", F("subject").value.split(", ").includes(c.textContent))); }
  $(".m-chips", wrap).addEventListener("click", e => {
    const c = e.target.closest(".chip"); if (!c) return;
    const list = F("subject").value ? F("subject").value.split(", ").filter(Boolean) : [];
    const i = list.indexOf(c.textContent); i > -1 ? list.splice(i, 1) : list.push(c.textContent);
    F("subject").value = list.join(", "); syncChips();
  });
  F("subject").addEventListener("input", syncChips);
  wrap.addEventListener("click", async e => {
    const c = e.target.closest("[data-copy]"); if (!c) return;
    const ok = await copyText(c.dataset.copy);
    os.notify({ title: ok ? "Copied" : "Copy this", body: c.dataset.copy, app: "mail", silent: true });
  });
  $("#m-again", wrap).addEventListener("click", () => { form.reset(); syncChips(); set(""); prefill({}); });
  form.addEventListener("input", e => e.target.classList?.remove("invalid"));
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const d = { name: F("name").value.trim(), email: F("email").value.trim(), subject: F("subject").value.trim(), message: F("message").value.trim(), company_website: F("company_website").value };
    const bad = [!d.name && "name", !isEmail(d.email) && "email", !d.message && "message"].filter(Boolean);
    bad.forEach(n => F(n).classList.add("invalid"));
    if (bad.length) { set(bad.includes("email") && d.email ? "That email address doesn't look right." : "Please add your name, email and a message.", "bad"); F(bad[0]).focus(); sound("error"); return; }
    sendB.disabled = true; set("Sending…");
    // 1. Formspree
    try {
      const r = await viaFormspree(d);
      if (r.ok) { sent(d, "formspree"); return; }
      if (r.status === 422 || r.status === 400) { set(r.error || "Please check the form and try again.", "bad"); sendB.disabled = false; return; }
    } catch { /* network or blocked: try the next route */ }
    // 2. The Cloudflare Worker (only answers 200 when an email binding or KV inbox is configured)
    try {
      await api("contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d) }, 15000);
      sent(d, "worker");
    } catch (err) {
      if (err.status === 429) { set("You've sent a few already — please wait a minute and try again.", "bad"); sendB.disabled = false; return; }
      if (err.status === 400) { set(err.body?.error || "Please check the form and try again.", "bad"); sendB.disabled = false; return; }
      // 3. Nothing else worked: hand off to the visitor's email app.
      const body = `${d.message}\n\n— ${d.name} <${d.email}>`;
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(d.subject || "New enquiry from rivacomputech.com")}&body=${encodeURIComponent(body)}`;
      set("Opening your email app… If nothing happens, email " + EMAIL + " directly.", "ok");
      sendB.disabled = false;
      track("contact_mailto", {});
      return;
    }
  });
  async function viaFormspree(d) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(FORMSPREE, {
        method: "POST", signal: ctl.signal,
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ name: d.name, email: d.email, subject: d.subject, message: d.message, _subject: `Riva enquiry: ${d.subject || d.name}`, _gotcha: d.company_website })
      });
      let body = {}; try { body = await r.json(); } catch {}
      return { ok: r.ok, status: r.status, error: body.errors?.map(e => e.message).join(" ") };
    } finally { clearTimeout(t); }
  }
  function sent(d, how) {
    sendB.disabled = false; set("");
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace("T", " ").replace(":", ".");
      fs.write(fs.join(fs.DOCS, `Sent\\${stamp} ${(d.subject || "Message").replace(/[<>:"/\\|?*]/g, "").slice(0, 60)}.txt`),
        `To: Devik Patel <${EMAIL}>\nFrom: ${d.name} <${d.email}>\nSubject: ${d.subject}\nDate: ${new Date().toString()}\n\n${d.message}\n`, { parents: true });
    } catch {}
    form.hidden = true; $(".m-sent", wrap).hidden = false;
    track("generate_lead", { method: how });
    sound("chime");
  }
  prefill(args);
  return { onArgs: prefill };
}

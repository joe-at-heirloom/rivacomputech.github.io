/* Settings */
import { h, $, $$, esc, glyph, injectCSS, os, settings, store, ACCENTS, VERSION, system, api, fmtBytes, copyText, EMAIL, PHONE, sleep } from "../core.js";
import * as fs from "../fs.js";
import { APPS, START_PINS } from "../apps.js";
import { appIcon } from "../icons.js";
import { WALLPAPERS, wallpaperURL } from "../wallpapers.js";
import { pickFile, confirm } from "../ui.js";
import { uaName } from "../ps.js";

injectCSS("settings", `
.st{display:flex;flex:1;min-height:0}
.st-nav{width:280px;flex:none;overflow:auto;padding:6px 8px 16px}
.st-me{display:flex;align-items:center;gap:14px;padding:14px 12px 18px}
.st-me .av{width:60px;height:60px}
.st-me .av .i{width:30px;height:30px}
.st-me b{display:block;font-size:14px}
.st-me small{display:block;font-size:12px;color:var(--text-2)}
.st-nav .navi .app-ico{--s:20px}
.st-page{flex:1;overflow:auto;padding:22px 36px 40px;background:var(--layer-2);border-radius:8px 0 0 0;border-top:1px solid var(--stroke);border-left:1px solid var(--stroke)}
.st-page h2{font:600 28px var(--font-display);margin:4px 0 22px}
.st-page h3{font-size:14px;font-weight:600;margin:24px 0 8px}
.st-page .row{min-height:68px}
.st-page .row select.field{width:auto;min-width:160px}
.wall-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;padding:16px 18px;border:1px solid var(--stroke);border-top:0;border-radius:0 0 var(--r-card) var(--r-card);background:var(--card);margin-top:-4px}
.wall-pick button{aspect-ratio:16/10;border-radius:6px;border:2px solid transparent;background:center/cover no-repeat;padding:0;position:relative;box-shadow:0 0 0 1px var(--stroke)}
.wall-pick button.on{border-color:var(--accent);box-shadow:0 0 0 2px var(--mica) inset}
.wall-pick button span{position:absolute;left:5px;bottom:5px;font-size:11px;color:#fff;background:rgba(0,0,0,.5);padding:1px 6px;border-radius:4px}
.wall-pick .browse{display:grid;place-items:center;background:var(--ctl);color:var(--text);font-size:12px;gap:4px;align-content:center}
.wall-prev{width:100%;max-width:420px;aspect-ratio:16/9;border-radius:10px;background:center/cover;margin:0 0 18px;box-shadow:0 0 0 1px var(--stroke),0 8px 24px -12px rgba(0,0,0,.4);position:relative;overflow:hidden}
.wall-prev::after{content:"";position:absolute;left:0;right:0;bottom:0;height:9%;background:var(--taskbar)}
.wall-prev i{position:absolute;left:30%;top:22%;width:40%;height:46%;border-radius:4px;background:var(--mica);box-shadow:0 4px 12px rgba(0,0,0,.25)}
.swatches{display:flex;flex-wrap:wrap;gap:8px;padding:16px 18px;border:1px solid var(--stroke);border-top:0;border-radius:0 0 var(--r-card) var(--r-card);background:var(--card);margin-top:-4px}
.swatches button{width:40px;height:40px;border-radius:6px;border:0;padding:0;position:relative}
.swatches button.on::after{content:"";position:absolute;inset:-4px;border-radius:9px;border:2px solid var(--text)}
.kv{display:grid;grid-template-columns:minmax(120px,200px) 1fr;gap:8px 16px;padding:16px 18px;border:1px solid var(--stroke);border-radius:var(--r-card);background:var(--card);font-size:13.5px}
.kv dt{color:var(--text-2)}.kv dd{margin:0;user-select:text;word-break:break-word}
.st-hero{display:flex;align-items:center;gap:20px;padding:20px;border:1px solid var(--stroke);border-radius:var(--r-card);background:var(--card);margin-bottom:6px}
.st-hero .ico{width:72px;height:72px;display:grid;place-items:center;border-radius:50%;background:var(--accent-soft);color:var(--accent-ink)}
.st-hero .ico .i{width:36px;height:36px}
.st-hero b{display:block;font:600 18px var(--font-display)}
.st-hero small{display:block;color:var(--text-2)}
.st-bar{height:8px;border-radius:4px;background:var(--stroke-2);overflow:hidden;margin-top:8px}
.st-bar i{display:block;height:100%;background:var(--accent)}
:root.compact .st{flex-direction:column}
:root.compact .st-nav{width:auto;display:flex;overflow-x:auto;padding:4px 8px;flex:none;border-bottom:1px solid var(--divider)}
:root.compact .st-nav .st-me{display:none}
:root.compact .st-nav .navi{width:auto;white-space:nowrap;flex:none}
:root.compact .st-page{padding:16px 16px 30px;border-radius:0;border-left:0}
:root.compact .kv{grid-template-columns:1fr;gap:2px 0}
:root.compact .kv dd{margin-bottom:8px}
:root.compact .st-page .row{flex-wrap:wrap;row-gap:10px}
:root.compact .st-page .row .row-t{flex:1 1 50%}
:root.compact .st-page .row select.field{flex:1 1 100%;margin-left:36px}
:root.compact .st-page h2{font-size:24px;margin-bottom:16px}
:root.compact .st-hero{padding:16px;gap:14px}
:root.compact .st-hero .ico{width:52px;height:52px}
:root.compact .wall-pick{grid-template-columns:repeat(2,1fr);padding:12px}
`);

export const winOpts = { w: 1040, h: 700, minW: 360, minH: 360 };
const PAGES = [["system", "System", "monitor", ["#41a0ff", "#0a5cbf"]], ["personalization", "Personalization", "palette", ["#ff9a6b", "#d4471f"]], ["apps", "Apps", "apps", ["#a184ff", "#5b3cd4"]],
  ["accounts", "Accounts", "user", ["#43d283", "#118c50"]], ["time", "Time & language", "globe", ["#33cbd5", "#0a6fc2"]], ["accessibility", "Accessibility", "access", ["#55b0ff", "#0b66c4"]],
  ["privacy", "Privacy & storage", "shield", ["#7d8ca3", "#3c495c"]], ["update", "rivaOS Update", "update", ["#41a0ff", "#0a5cbf"]]];

const toggle = (key, label, sub, g, val = settings.get(key)) => `<label class="row">${glyph(g)}<span class="row-t"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span><span class="tgl"><span class="tgl-lbl">${val ? "On" : "Off"}</span><input type="checkbox" role="switch" data-set="${key}" ${val ? "checked" : ""} aria-label="${esc(label)}"></span></label>`;
const select = (key, label, sub, g, opts, val = settings.get(key)) => `<div class="row">${glyph(g)}<span class="row-t"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span><select class="field" data-set="${key}" aria-label="${esc(label)}">${opts.map(([v, l]) => `<option value="${v}" ${String(val) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select></div>`;
const range = (key, label, sub, g, min, max, val = settings.get(key), unit = "") => `<div class="row">${glyph(g)}<span class="row-t"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span><span style="display:flex;align-items:center;gap:10px;width:min(240px,40%)"><input class="slider" type="range" min="${min}" max="${max}" value="${val}" data-set="${key}" data-num="1" style="--p:${(val - min) / (max - min) * 100}%" aria-label="${esc(label)}"><span style="min-width:44px;font-size:13px">${val}${unit}</span></span></div>`;
const link = (page, label, sub, g) => `<button class="row" type="button" data-page="${page}">${glyph(g)}<span class="row-t"><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span>${glyph("chev-r", "i sm")}</button>`;

export default function settingsApp(win, args) {
  const nav = h("nav", { class: "st-nav", "aria-label": "Settings pages" });
  nav.innerHTML = `<div class="st-me"><span class="av">${glyph("user")}</span><span><b>Guest</b><small>Local account</small></span></div>` +
    PAGES.map(([id, l, g, c]) => `<button class="navi" type="button" data-page="${id}"><span class="app-ico" style="--g1:${c[0]};--g2:${c[1]}">${glyph(g)}</span>${l}</button>`).join("");
  const page = h("div", { class: "st-page" });
  win.body.append(h("div", { class: "st" }, nav, page));
  let cur = "system";

  const render = {
    system: () => `<h2>System</h2>
      <div class="st-hero"><span class="ico">${glyph("desktop")}</span><span><b>RIVAOS-${esc(settings.get("deviceId"))}</b><small>rivaOS ${VERSION} · ${esc(uaName())}</small></span></div>
      <h3>Display</h3>
      ${select("theme", "Mode", "", "moon", [["auto", "Use my device setting"], ["light", "Light"], ["dark", "Dark"]])}
      ${range("brightness", "Brightness", "Dims rivaOS, not your screen", "sun", 30, 100, settings.get("brightness"), "%")}
      ${toggle("nightlight", "Night light", "Warmer colours at night", "nightlight")}
      <h3>Sound & notifications</h3>
      ${range("volume", "Volume", "Notification chimes and clicks", "volume", 0, 100)}
      ${toggle("dnd", "Do not disturb", "Hide pop-up notifications", "bell-off")}
      <h3>More</h3>
      ${link("privacy", "Storage", "How much space your files use", "disk")}
      ${link("about", "About", "Device specs and edge location", "info")}`,
    about: () => `<h2>System › About</h2>
      <div class="st-hero"><span class="ico">${glyph("desktop")}</span><span><b>RIVAOS-${esc(settings.get("deviceId"))}</b><small>rivaOS ${VERSION}</small></span><button class="btn" type="button" id="st-copy" style="margin-left:auto">${glyph("copy")}Copy</button></div>
      <h3>Device specifications</h3><dl class="kv" id="st-dev">${kv(device())}</dl>
      <h3>Served from</h3><dl class="kv" id="st-edge"><dt>Status</dt><dd><span class="spin" style="display:inline-block;vertical-align:middle"></span> Asking the Cloudflare edge…</dd></dl>
      <h3>Support</h3><dl class="kv"><dt>Built by</dt><dd>Riva Computech</dd><dt>Email</dt><dd><a href="mailto:${EMAIL}">${EMAIL}</a></dd><dt>Phone</dt><dd><a href="tel:${PHONE.replace(/[^\d+]/g, "")}">${PHONE}</a></dd></dl>`,
    personalization: () => {
      const wp = settings.get("wallpaper"), t = settings.theme(), file = String(wp).startsWith("file:");
      return `<h2>Personalization</h2>
      <div class="wall-prev" style="background-image:url(&quot;${file ? fs.url(wp.slice(5)) : wallpaperURL(wp, t)}&quot;)"><i></i></div>
      <div class="row">${glyph("image")}<span class="row-t"><b>Background</b></span></div>
      <div class="wall-pick">${WALLPAPERS.map(w => `<button type="button" class="${wp === w.id ? "on" : ""}" data-wall="${w.id}" style="background-image:url(&quot;${wallpaperURL(w.id, t)}&quot;)" aria-label="${w.name}"><span>${w.name}</span></button>`).join("")}
        <button type="button" class="browse ${file ? "on" : ""}" data-wall="browse">${glyph("folder")}Browse photos</button></div>
      <h3>Colors</h3>
      ${select("theme", "Mode", "", "moon", [["auto", "Use my device setting"], ["light", "Light"], ["dark", "Dark"]])}
      ${toggle("transparency", "Transparency effects", "Frosted-glass taskbar, Start and menus", "layers")}
      <div class="row">${glyph("palette")}<span class="row-t"><b>Accent color</b><small>${esc(ACCENTS[settings.get("accent")]?.name || "")}</small></span></div>
      <div class="swatches">${Object.entries(ACCENTS).map(([k, a]) => `<button type="button" data-accent="${k}" class="${settings.get("accent") === k ? "on" : ""}" style="background:${t === "dark" ? a.d : a.l}" aria-label="${a.name}" data-tip="${a.name}"></button>`).join("")}</div>
      <h3>Taskbar</h3>
      ${select("tbAlign", "Taskbar alignment", "", "desktop", [["center", "Center"], ["left", "Left"]])}
      ${toggle("tbWidgets", "Widgets", "Weather on the taskbar", "weather")}
      ${toggle("tbSearch", "Search box", "", "search")}
      <h3>Start & desktop</h3>
      ${toggle("showRecent", "Show recently opened items in Start", "", "clock")}
      ${select("iconSize", "Desktop icon size", "", "grid", [["small", "Small"], ["medium", "Medium"], ["large", "Large"]])}
      ${toggle("showIcons", "Show desktop icons", "", "desktop")}`;
    },
    apps: () => `<h2>Apps</h2><h3>Installed apps</h3>` + Object.keys(APPS).sort((a, b) => APPS[a].name.localeCompare(APPS[b].name)).map(id => {
      const pinned = settings.get("pinned").includes(id);
      return `<div class="row">${appIcon(id, 32)}<span class="row-t"><b>${esc(APPS[id].name)}</b><small>${esc(APPS[id].desc || "")}</small></span><button class="btn subtle" type="button" data-pin="${id}">${glyph("pin")}${pinned ? "Unpin" : "Pin"}</button><button class="btn" type="button" data-open="${id}">Open</button></div>`;
    }).join(""),
    accounts: () => `<h2>Accounts</h2>
      <div class="st-hero"><span class="ico">${glyph("user")}</span><span><b>Guest</b><small>Local account</small></span></div>
      <h3>Sign-in options</h3>
      <div class="row">${glyph("lock")}<span class="row-t"><b>Password</b><small>None needed</small></span></div>
      <div class="row">${glyph("id")}<span class="row-t"><b>Work or school account</b><small>Setting up MFA for your business?</small></span><button class="btn" type="button" data-open="mail">Ask Devik</button></div>`,
    time: () => `<h2>Time & language</h2>
      <div class="row">${glyph("clock")}<span class="row-t"><b>Current time</b><small id="st-now"></small></span></div>
      <div class="row">${glyph("globe")}<span class="row-t"><b>Time zone</b><small>${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)} (from your device)</small></span></div>
      ${toggle("clock24", "24-hour clock", "", "clock")}
      <div class="row">${glyph("textsize")}<span class="row-t"><b>Language</b><small>${esc(navigator.language)}</small></span></div>`,
    accessibility: () => {
      const rm = document.documentElement.classList.contains("rm");
      return `<h2>Accessibility</h2>
      ${range("textScale", "Text size", "Scales the contents of every window", "textsize", 90, 140, settings.get("textScale"), "%")}
      <label class="row">${glyph("motion")}<span class="row-t"><b>Animation effects</b><small>Turn off to reduce motion</small></span><span class="tgl"><span class="tgl-lbl">${rm ? "Off" : "On"}</span><input type="checkbox" role="switch" id="st-anim" ${rm ? "" : "checked"} aria-label="Animation effects"></span></label>
      ${toggle("transparency", "Transparency effects", "", "layers")}
      ${toggle("nightlight", "Night light", "", "nightlight")}
      <h3>Keyboard</h3>
      <dl class="kv"><dt>Start</dt><dd><span class="kbd">Ctrl</span> + <span class="kbd">Esc</span>, or tap the <span class="kbd">⊞ / ⌘</span> key</dd><dt>Task Manager</dt><dd><span class="kbd">Ctrl</span> + <span class="kbd">Shift</span> + <span class="kbd">Esc</span></dd><dt>Close menus</dt><dd><span class="kbd">Esc</span></dd><dt>Files</dt><dd><span class="kbd">F2</span> rename · <span class="kbd">Del</span> delete · <span class="kbd">Ctrl</span>+<span class="kbd">C</span>/<span class="kbd">X</span>/<span class="kbd">V</span></dd></dl>`;
    },
    privacy: () => {
      const u = fs.usage();
      return `<h2>Privacy & storage</h2>
      <div class="st-hero"><span class="ico">${glyph("disk")}</span><span style="flex:1"><b>${fmtBytes(u.bytes)} used</b><small id="st-quota">${u.files} files · ${fs.persistent() ? "kept in this browser (IndexedDB)" : "this visit only (private browsing)"}</small><div class="st-bar"><i id="st-qbar" style="width:1%"></i></div></span></div>
      <h3>Your data</h3>
      <div class="row">${glyph("lock")}<span class="row-t"><b>Files stay on this device</b><small>Everything you create stays in this browser.</small></span></div>
      <div class="row">${glyph("activity")}<span class="row-t"><b>Analytics</b><small>Google Analytics counts visits and app opens. Never your files.</small></span></div>
      <div class="row">${glyph("globe")}<span class="row-t"><b>Location</b><small>Weather uses your approximate city. Not stored.</small></span></div>
      <h3>Reset</h3>
      <div class="row">${glyph("trash")}<span class="row-t"><b>Reset rivaOS</b><small>Deletes your files and settings here</small></span><button class="btn danger" type="button" id="st-reset">Reset</button></div>`;
    },
    update: () => `<h2>rivaOS Update</h2>
      <div class="st-hero"><span class="ico">${glyph("update")}</span><span style="flex:1"><b id="up-t">You're up to date</b><small id="up-s">rivaOS ${VERSION} · updates arrive automatically</small></span><button class="btn accent" type="button" id="up-chk">Check for updates</button></div>
      <h3>More options</h3>
      <dl class="kv" id="up-kv"><dt>Version</dt><dd>${VERSION}</dd><dt>Deployment</dt><dd id="up-dep">—</dd><dt>Channel</dt><dd>Cloudflare Workers</dd></dl>
      <h3>What's new</h3>
      <div class="row">${glyph("sparkle")}<span class="row-t"><b>rivaOS ${VERSION}</b><small>A full desktop in your browser, served from Cloudflare's edge.</small></span></div>`
  };
  const device = () => [["Device name", "RIVAOS-" + settings.get("deviceId")], ["Processor", (navigator.hardwareConcurrency || "?") + " logical processors"], ["Installed RAM", navigator.deviceMemory ? navigator.deviceMemory + " GB (as reported by your browser)" : "Not reported by this browser"],
    ["Display", `${screen.width} × ${screen.height} at ${devicePixelRatio}× scale`], ["Browser", uaName()], ["Language", navigator.language], ["Storage", fs.persistent() ? "IndexedDB" : "Memory only"]];
  const kv = rows => rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");

  function show(p) {
    cur = render[p] ? p : "system";
    page.innerHTML = render[cur](); page.scrollTop = 0;
    $$(".navi", nav).forEach(b => b.classList.toggle("on", b.dataset.page === cur || (cur === "about" && b.dataset.page === "system")));
    win.setTitle("Settings");
    after[cur]?.();
  }
  const after = {
    about: async () => {
      $("#st-copy", page).addEventListener("click", () => copyText(device().map(r => r.join(": ")).join("\n")).then(ok => ok && os.notify({ title: "Copied", body: "Device specifications are on your clipboard.", app: "settings", silent: true })));
      const s = await system(), box = $("#st-edge", page); if (!box) return;
      box.innerHTML = s ? kv([["Cloudflare data centre", s.colo + (s.coloCity ? ` (${s.coloCity})` : "")], ["Your approximate location", [s.city, s.region, s.country].filter(Boolean).join(", ") || "—"], ["Network", s.asOrganization || "—"], ["Protocol", [s.httpProtocol, s.tlsVersion].filter(Boolean).join(" · ") || "—"], ["Ray ID", s.ray || "—"]])
        : kv([["Status", "Unavailable right now"]]);
    },
    time: () => { const f = () => { const el = $("#st-now", page); if (el) el.textContent = new Date().toLocaleString([], { dateStyle: "full", timeStyle: "medium" }); }; f(); const t = setInterval(() => { if (!$("#st-now", page)) clearInterval(t); else f(); }, 1000); },
    accessibility: () => $("#st-anim", page).addEventListener("change", e => { settings.set("motion", e.target.checked ? "full" : "reduce"); show("accessibility"); }),
    privacy: () => {
      navigator.storage?.estimate?.().then(e => { const q = $("#st-quota", page), b = $("#st-qbar", page); if (q && e.quota) { q.textContent += ` · ${fmtBytes(e.quota)} available to this site`; b.style.width = Math.max(1, e.usage / e.quota * 100) + "%"; } });
      $("#st-reset", page).addEventListener("click", async () => {
        if (!(await confirm({ owner: win, title: "Reset rivaOS", text: "This deletes every file and setting you've made in rivaOS on this browser. It can't be undone.", ok: "Reset and restart" }))) return;
        await fs.reset(); store.clear(); location.hash = ""; location.reload();
      });
    },
    update: async () => {
      const dep = $("#up-dep", page), s = await system();
      if (dep) dep.textContent = s?.version?.id ? `${s.version.id.slice(0, 8)}${s.version.timestamp ? " · " + new Date(s.version.timestamp).toLocaleString() : ""}` : "Local preview";
      $("#up-chk", page)?.addEventListener("click", async e => {
        const b = e.currentTarget; b.disabled = true; $("#up-t", page).textContent = "Checking for updates…";
        let fresh = null; try { fresh = (await api("version")).version; } catch {}
        await sleep(900);
        const same = !fresh || !s?.version?.id || fresh.id === s.version.id;
        $("#up-t", page).textContent = same ? "You're up to date" : "An update is ready";
        $("#up-s", page).textContent = same ? `Last checked: ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Restart rivaOS to get the latest version.";
        b.disabled = false; if (!same) { b.textContent = "Restart now"; b.onclick = () => os.restart(); }
      });
    }
  };
  nav.addEventListener("click", e => { const b = e.target.closest("[data-page]"); if (b) show(b.dataset.page); });
  page.addEventListener("click", async e => {
    const lk = e.target.closest("[data-page]"); if (lk) { show(lk.dataset.page); return; }
    const w = e.target.closest("[data-wall]");
    if (w) {
      if (w.dataset.wall === "browse") { const p = await pickFile({ owner: win, dir: fs.PICS, exts: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"], title: "Choose a picture" }); if (p) settings.set("wallpaper", "file:" + p); }
      else settings.set("wallpaper", w.dataset.wall);
      show("personalization"); return;
    }
    const a = e.target.closest("[data-accent]"); if (a) { settings.set("accent", a.dataset.accent); show(cur); return; }
    const o = e.target.closest("[data-open]"); if (o) { os.launch(o.dataset.open); return; }
    const p = e.target.closest("[data-pin]"); if (p) { const id = p.dataset.pin, list = settings.get("pinned"); settings.set("pinned", list.includes(id) ? list.filter(x => x !== id) : [...list, id]); show("apps"); }
  });
  page.addEventListener("change", e => {
    const k = e.target.dataset?.set; if (!k) return;
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.dataset.num ? +e.target.value : e.target.value;
    settings.set(k, v); if (k !== "brightness" && k !== "volume" && k !== "textScale") show(cur);
  });
  page.addEventListener("input", e => {
    const s = e.target.closest("input[type=range][data-set]"); if (!s) return;
    s.style.setProperty("--p", (s.value - s.min) / (s.max - s.min) * 100 + "%"); s.nextElementSibling.textContent = s.value + (s.dataset.set === "volume" ? "" : "%");
    settings.set(s.dataset.set, +s.value);
  });
  show(args.page || "system");
  return { onArgs(a) { if (a.page) show(a.page); } };
}

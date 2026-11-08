/* rivaOS · shared UI: context menus, tooltips, dialogs, the file picker, Open with, Properties,
   importing real files and downloading virtual ones. */

import { d, h, $, $$, esc, glyph, clamp, os, fmtBytes, fmtDate } from "./core.js";
import * as fs from "./fs.js";
import { fileIcon, typeName, appIcon } from "./icons.js";
import { APPS } from "./apps.js";

/* ───────── context menus ───────── */
let open = null;
export const closeMenu = () => closeAll();
function outside(e) { if (open && !e.target.closest(".menu")) closeMenu(); }
function build(items) {
  const m = h("div", { class: "menu", role: "menu", tabindex: "-1" });
  items.filter(x => x !== null && x !== undefined && x !== false).forEach(it => {
    if (it === "-") { m.append(h("div", { class: "msep", role: "separator" })); return; }
    const b = h("button", { class: "mi" + (it.checked ? " chk" : "") + (it.danger ? " danger" : ""), type: "button", role: "menuitem", disabled: !!it.disabled });
    b.innerHTML = `<span class="mi-i">${it.checked ? "" : it.icon || ""}</span><span class="mi-l">${esc(it.label)}</span>${it.kbd ? `<span class="mi-k">${esc(it.kbd)}</span>` : ""}${it.sub ? glyph("chev-r", "i mi-sub") : ""}`;
    if (it.sub) {
      const openSub = () => {
        if (m._sub?._for === b) return; closeSub(m);
        const s = build(it.sub); s._for = b; s.classList.add("sub"); m._sub = s; d.body.append(s); s.style.zIndex = 20051;
        const r = b.getBoundingClientRect(); place(s, r.right - 2, r.top - 4, r.left + 2);
        $$(".mi", m).forEach(x => x.classList.toggle("open", x === b));
      };
      b.addEventListener("pointerenter", openSub); b.addEventListener("click", openSub);
      b.addEventListener("keydown", e => { if (e.key === "ArrowRight") { openSub(); m._sub?.querySelector(".mi:not(:disabled)")?.focus(); } });
    } else {
      b.addEventListener("pointerenter", () => { closeSub(m); $$(".mi", m).forEach(x => x.classList.remove("open")); });
      b.addEventListener("click", () => { closeAll(); it.run?.(); });
    }
    m.append(b);
  });
  m.addEventListener("keydown", e => {
    const list = $$(".mi:not(:disabled)", m), i = list.indexOf(d.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); (list[i + 1] || list[0])?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); (list[i - 1] || list[list.length - 1])?.focus(); }
    else if (e.key === "ArrowLeft" && m.classList.contains("sub")) { e.preventDefault(); const f = m._for; m.remove(); f?.focus(); }
    else if (e.key === "Escape") { e.preventDefault(); closeAll(); }
  });
  return m;
}
function closeSub(m) { if (m._sub) { closeSub(m._sub); m._sub.remove(); m._sub = null; } }
function closeAll() { $$(".menu").forEach(x => x.remove()); open = null; d.removeEventListener("pointerdown", outside, true); }
function place(m, x, y, altX) {
  const w = m.offsetWidth, hh = m.offsetHeight, W = innerWidth, H = innerHeight - 4;
  let left = x, top = y;
  if (left + w > W - 4) left = altX != null ? altX - w : W - w - 4;
  if (top + hh > H) { top = Math.max(4, y - hh); m.classList.add("up"); }
  m.style.left = clamp(left, 4, W - w - 4) + "px"; m.style.top = clamp(top, 4, H - hh) + "px";
}
/** menu(items, x, y) — items: {label, icon, kbd, run, disabled, checked, danger, sub:[…]} or "-" */
export function menu(items, x, y, { keyboard = false } = {}) {
  closeAll();
  const m = build(items); d.body.append(m); open = m;
  place(m, x, y);
  setTimeout(() => d.addEventListener("pointerdown", outside, true));
  if (keyboard) m.querySelector(".mi:not(:disabled)")?.focus(); else m.focus({ preventScroll: true });
  return m;
}
d.addEventListener("keydown", e => { if (e.key === "Escape" && open) closeAll(); });
addEventListener("blur", () => closeAll());
addEventListener("resize", () => closeAll());

/* ───────── tooltips: any element with data-tip ───────── */
let tipEl, tipT;
d.addEventListener("pointerover", e => {
  const t = e.target.closest("[data-tip]"); if (!t || e.pointerType !== "mouse") return;
  clearTimeout(tipT);
  tipT = setTimeout(() => {
    if (!t.isConnected || !t.matches(":hover")) return;
    tipEl?.remove(); tipEl = h("div", { class: "tip", role: "tooltip" }, t.dataset.tip); d.body.append(tipEl);
    const r = t.getBoundingClientRect(), w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
    const above = t.closest(".taskbar") || t.dataset.tipPos === "top";
    tipEl.style.left = clamp(r.left + r.width / 2 - w / 2, 6, innerWidth - w - 6) + "px";
    tipEl.style.top = (above ? r.top - hh - 8 : r.bottom + 8) + "px";
  }, 550);
});
d.addEventListener("pointerout", e => { if (e.target.closest("[data-tip]")) { clearTimeout(tipT); tipEl?.remove(); tipEl = null; } });
d.addEventListener("pointerdown", () => { clearTimeout(tipT); tipEl?.remove(); tipEl = null; }, true);

/* ───────── dialogs ───────── */
const sysIcon = appIcon("system", 16);
export const alert = ({ title = "rivaOS", text, html, owner }) =>
  os.wm.dialog({ owner, title, icon: sysIcon, body: html || `<p>${esc(text)}</p>`, buttons: [{ label: "OK", value: true, primary: true }] });
export const confirm = ({ title = "rivaOS", text, html, ok = "OK", cancel = "Cancel", owner, extra }) =>
  os.wm.dialog({ owner, title, icon: sysIcon, body: html || `<p>${esc(text)}</p>`,
    buttons: [{ label: ok, value: true, primary: true }, extra && { label: extra, value: "extra" }, { label: cancel, value: false }].filter(Boolean) }).then(v => v === null ? false : v);
export function prompt({ title = "rivaOS", label = "", value = "", ok = "OK", owner }) {
  const inp = h("input", { class: "field", value, "aria-label": label || title });
  const body = h("div", null, label ? h("p", null, label) : null, inp);
  setTimeout(() => inp.select(), 40);
  return os.wm.dialog({ owner, title, icon: sysIcon, body, buttons: [{ label: ok, value: () => inp.value, primary: true }, { label: "Cancel", value: null }] });
}

/* ───────── file picker ───────── */
const PLACES = () => [["Desktop", fs.DESKTOP, "desktop"], ["Documents", fs.DOCS, "doc"], ["Pictures", fs.PICS, "image"], ["Downloads", fs.DL, "download"], ["Riva", fs.RIVA, "terminal"], ["Local Disk (C:)", fs.ROOT, "disk"]];
/** pickFile({mode:"open"|"save", dir, name, exts:["txt"], owner}) → Promise<path|null> */
export function pickFile({ mode = "open", title, dir = fs.DOCS, name = "", exts = null, owner } = {}) {
  return new Promise(res => {
    const win = os.wm.open({ app: owner?.app || "system", title: title || (mode === "save" ? "Save as" : "Open"), icon: sysIcon, w: 720, h: 480, minW: 420, minH: 320, owner, maximizable: false, minimizable: false });
    let cwd = fs.isDir(dir) ? fs.resolve(dir) : fs.DOCS, sel = null, done = false;
    const pathF = h("input", { class: "field", "aria-label": "Folder" });
    const nameF = h("input", { class: "field", value: name, "aria-label": "File name" });
    const list = h("div", { class: "fp-list", role: "listbox", "aria-label": "Files" });
    const nav = h("div", { class: "navpane" }, PLACES().map(([l, p, g]) => h("button", { class: "navi", type: "button", html: glyph(g) + esc(l), onclick: () => go(p) })));
    const okB = h("button", { class: "btn accent", type: "button" }, mode === "save" ? "Save" : "Open");
    const typeS = h("select", { class: "field", "aria-label": "File type" }, h("option", null, exts ? exts.map(e => "*." + e).join("; ") : "All files (*.*)"));
    const fit = n => n.type === "dir" || !exts || exts.includes(fs.extOf(n.path));
    function go(p) {
      const r = fs.resolve(p, cwd); if (!fs.isDir(r)) return; cwd = r; sel = null; pathF.value = cwd; render();
    }
    function render() {
      list.innerHTML = "";
      const items = fs.ls(cwd).filter(fit);
      if (!items.length) list.append(h("div", { class: "st-empty" }, "This folder is empty."));
      items.forEach(n => {
        const b = h("button", { class: "fp-item", type: "button", role: "option", html: fileIcon(n, 18, { thumb: false }) + `<span>${esc(fs.displayName(n))}</span><small>${n.type === "dir" ? "" : fmtBytes(n.size)}</small>` });
        b.addEventListener("click", () => { $$(".fp-item", list).forEach(x => x.classList.remove("sel")); b.classList.add("sel"); sel = n; if (n.type === "file") nameF.value = n.name; });
        b.addEventListener("dblclick", () => n.type === "dir" ? go(n.path) : choose());
        list.append(b);
      });
    }
    async function choose() {
      const v = nameF.value.trim();
      if (!v) { if (sel?.type === "dir") go(sel.path); return; }
      let p = fs.resolve(v, cwd);
      if (fs.isDir(p)) { go(p); nameF.value = ""; return; }
      if (mode === "save") {
        if (exts && !fs.extOf(p)) p += "." + exts[0];
        if (fs.exists(p) && !(await confirm({ owner: win, title: "Confirm Save As", text: `${fs.baseName(p)} already exists. Do you want to replace it?`, ok: "Yes", cancel: "No" }))) return;
      } else if (!fs.exists(p)) { await alert({ owner: win, title: "Open", text: `${p}\nFile not found. Check the file name and try again.` }); return; }
      done = true; win.close(true); res(p);
    }
    okB.addEventListener("click", choose);
    nameF.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); choose(); } });
    pathF.addEventListener("keydown", e => { if (e.key === "Enter") go(pathF.value); });
    const top = h("div", { class: "fp-top" },
      h("button", { class: "ibtn", type: "button", "aria-label": "Up one level", "data-tip": "Up", html: glyph("up"), onclick: () => { const p = fs.parentOf(cwd); if (p) go(p); } }),
      pathF,
      mode === "save" ? h("button", { class: "btn subtle", type: "button", html: glyph("plus") + "New folder", onclick: async () => {
        const nm = await prompt({ owner: win, title: "New folder", label: "Folder name", value: "New folder" });
        if (nm) try { fs.mkdir(fs.join(cwd, nm)); render(); } catch (e) { alert({ owner: win, text: e.message }); }
      } }) : null);
    const bot = h("div", { class: "fp-bot" }, h("label", null, "File name:"), nameF, typeS,
      h("div", { class: "acts" }, okB, h("button", { class: "btn", type: "button", onclick: () => win.close(true) }, "Cancel")));
    win.body.append(h("div", { class: "fp" }, top, h("div", { class: "fp-mid" }, nav, list), bot));
    win.on("close", () => { if (!done) res(null); });
    go(cwd); setTimeout(() => nameF.focus(), 40);
  });
}

/* ───────── Open with / Properties / download / import ───────── */
export function openWith(path) {
  const n = fs.stat(path); if (!n) return;
  const choices = ["notepad", "code", "photos", "browser"];
  const body = h("div", null, h("p", null, `How do you want to open ${fs.displayName(n)}?`),
    h("div", { style: { display: "flex", flexDirection: "column", gap: "4px" } }, choices.map(a => h("button", { class: "row", type: "button", style: { minHeight: "48px" }, html: appIcon(a, 24) + `<span class="row-t"><b>${esc(APPS[a].name)}</b></span>`, onclick: () => { win?.close(true); os.openPath(path, { with: a }); } })),
      h("button", { class: "row", type: "button", style: { minHeight: "48px" }, html: glyph("download") + `<span class="row-t"><b>Download</b></span>`, onclick: () => { win?.close(true); download(path); } })));
  let win;
  os.wm.dialog({ title: "Open with", icon: sysIcon, body, buttons: [{ label: "Cancel", value: null }], onOpen: w => { win = w; } });
}
export function properties(path) {
  const n = fs.stat(path); if (!n) return;
  let size = n.size || 0, files = 0, dirs = 0;
  if (n.type === "dir") fs.walk(n.path, x => { if (x === n) return; x.type === "dir" ? dirs++ : (files++, size += x.size || 0); });
  const rows = [["Type", typeName(n)], ["Location", fs.parentOf(n.path) || "—"], ["Size", fmtBytes(size) + (size >= 1024 ? ` (${size.toLocaleString()} bytes)` : "")],
    n.type === "dir" && ["Contains", `${files} Files, ${dirs} Folders`], ["Created", fmtDate(n.ctime)], ["Modified", fmtDate(n.mtime)],
    ["Attributes", n.ro || n.path.toLowerCase().startsWith(fs.RIVA.toLowerCase()) ? "Read-only" : "—"], n.meta?.origin && ["Original location", n.meta.origin]].filter(Boolean);
  const body = h("div", null,
    h("div", { style: { display: "flex", alignItems: "center", gap: "14px", marginBottom: "18px" }, html: fileIcon(n, 40, { thumb: false }) + `<b style="font-size:15px;word-break:break-all">${esc(fs.displayName(n))}</b>` }),
    h("dl", { class: "dlg-props", html: rows.map(([k, v]) => `<dt>${k}:</dt><dd>${esc(v)}</dd>`).join("") }));
  return os.wm.dialog({ title: fs.displayName(n) + " Properties", icon: sysIcon, body, w: 420, buttons: [{ label: "OK", value: true, primary: true }] });
}
export function download(path) {
  const n = fs.stat(path); if (!n || n.type !== "file") return;
  const blob = n.data instanceof Blob ? n.data : new Blob([n.data ?? ""], { type: n.mime || "text/plain" });
  const a = h("a", { href: URL.createObjectURL(blob), download: n.name }); d.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const TEXTISH = /\.(txt|md|ps1|json|csv|log|ini|html?|css|js|xml|svg|url)$/i;
export async function importFiles(files, dir) {
  let n = 0;
  for (const f of files) {
    if (f.size > 25 * 1024 * 1024) { os.notify?.({ title: "File too large", body: `${f.name} is over 25 MB.` }); continue; }
    try {
      const data = TEXTISH.test(f.name) || f.type.startsWith("text/") ? await f.text() : f;
      fs.write(fs.unique(dir, f.name.replace(/[<>:"/\\|?*]/g, "_")), data, { mime: f.type || fs.mimeOf(f.name) }); n++;
    } catch (e) { os.notify?.({ title: "Couldn't copy " + f.name, body: e.message }); }
  }
  return n;
}

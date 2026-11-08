/* Notepad */
import { h, $, esc, glyph, injectCSS, os, store, clamp } from "../core.js";
import * as fs from "../fs.js";
import { menu, pickFile, confirm, download } from "../ui.js";

injectCSS("notepad", `
.np-area{flex:1;min-height:0;display:flex;background:var(--layer-2);border-top:1px solid var(--divider)}
.np-area textarea{flex:1;border:0;outline:0;resize:none;background:transparent;color:var(--text);padding:12px 16px;font:var(--np-size,15px)/1.55 var(--mono);tab-size:4;white-space:pre;overflow:auto}
.np-area textarea.wrap{white-space:pre-wrap;word-break:break-word}
.np-find{display:flex;align-items:center;gap:6px;padding:6px 10px;border-top:1px solid var(--divider);background:var(--mica)}
.np-find .field{max-width:260px;min-height:28px;font-size:13px}
.np-find small{color:var(--text-2);font-size:12px;min-width:70px}
.np-ro{display:flex;align-items:center;gap:8px;padding:6px 14px;font-size:12.5px;background:var(--accent-soft)}
.np-ro .i{width:14px;height:14px}
`);

export const winOpts = { w: 760, h: 540, minW: 320, minH: 220 };

export default async function notepad(win, args) {
  let path = args.path ? fs.resolve(args.path) : null, saved = "", dirty = false, zoom = 100;
  const wrapOn = () => store.get("np:wrap", true);
  const bar = h("div", { class: "menubar", role: "menubar" });
  ["File", "Edit", "View"].forEach(m => bar.append(h("button", { type: "button", "data-m": m.toLowerCase() }, m)));
  const ro = h("div", { class: "np-ro", hidden: true, html: glyph("lock") + "<span>Read-only file. Use Save as to keep your own copy.</span>" });
  const ta = h("textarea", { spellcheck: "false", "aria-label": "Text editor", autocapitalize: "off", autocomplete: "off" });
  const find = h("div", { class: "np-find", hidden: true });
  const findF = h("input", { class: "field", placeholder: "Find", "aria-label": "Find" }), findN = h("small");
  find.append(findF, h("button", { class: "ibtn", type: "button", "aria-label": "Previous match", html: glyph("chev-u"), onclick: () => findNext(-1) }), h("button", { class: "ibtn", type: "button", "aria-label": "Next match", html: glyph("chev-d"), onclick: () => findNext(1) }), findN, h("button", { class: "ibtn", type: "button", "aria-label": "Close find", style: { marginLeft: "auto" }, html: '<svg class="i xs"><use href="#c-x"/></svg>', onclick: () => { find.hidden = true; ta.focus(); } }));
  const stat = h("div", { class: "statusbar" });
  win.body.append(bar, ro, h("div", { class: "np-area" }, ta), find, stat);

  const name = () => path ? fs.baseName(path) : "Untitled";
  const isRO = () => path && path.toLowerCase().startsWith(fs.RIVA.toLowerCase());
  function title() { win.setTitle(`${dirty ? "*" : ""}${name()} - Notepad`); ro.hidden = !isRO(); }
  function status() {
    const v = ta.value, pos = ta.selectionStart, before = v.slice(0, pos), ln = before.split("\n").length, col = pos - before.lastIndexOf("\n");
    stat.hidden = store.get("np:status", true) === false;
    stat.innerHTML = `<span>Ln ${ln}, Col ${col}</span><span>${v.length.toLocaleString()} characters</span><span class="grow"></span><span>${zoom}%</span><span>Windows (CRLF)</span><span>UTF-8</span>`;
  }
  function applyView() { ta.classList.toggle("wrap", wrapOn()); ta.style.setProperty("--np-size", (15 * zoom / 100) + "px"); status(); }
  async function load(p) {
    path = p ? fs.resolve(p) : null;
    saved = path && fs.exists(path) ? (await fs.text(path)).replace(/\r\n/g, "\n") : "";
    ta.value = saved; dirty = false; title(); status(); ta.setSelectionRange(0, 0); ta.scrollTop = 0;
  }
  async function save(as) {
    let p = path;
    if (as || !p || isRO()) { p = await pickFile({ mode: "save", owner: win, dir: p && !isRO() ? fs.parentOf(p) : fs.DOCS, name: p ? fs.baseName(p) : "Untitled.txt", exts: null }); if (!p) return false; if (!fs.extOf(p)) p += ".txt"; }
    try { fs.write(p, ta.value.replace(/\r?\n/g, "\r\n")); } catch (e) { os.ui.alert({ owner: win, title: "Notepad", text: e.message }); return false; }
    path = p; saved = ta.value; dirty = false; title(); return true;
  }
  async function guard() {
    if (!dirty) return true;
    const r = await os.wm.dialog({ owner: win, title: "Notepad", body: `<p>Do you want to save changes to ${esc(name())}?</p>`, buttons: [{ label: "Save", value: "save", primary: true }, { label: "Don't save", value: "no" }, { label: "Cancel", value: null }] });
    if (r === "save") return save();
    return r === "no";
  }
  function findNext(dir = 1) {
    const q = findF.value; if (!q) { findN.textContent = ""; return; }
    const v = ta.value.toLowerCase(), ql = q.toLowerCase();
    let i = dir > 0 ? v.indexOf(ql, ta.selectionEnd) : v.lastIndexOf(ql, Math.max(0, ta.selectionStart - 1));
    if (i < 0) i = dir > 0 ? v.indexOf(ql) : v.lastIndexOf(ql);
    const count = v.split(ql).length - 1;
    findN.textContent = count ? `${count} match${count > 1 ? "es" : ""}` : "No results";
    if (i >= 0) { ta.focus(); ta.setSelectionRange(i, i + q.length); const line = v.slice(0, i).split("\n").length; ta.scrollTop = Math.max(0, (line - 4) * parseFloat(getComputedStyle(ta).lineHeight)); findF.focus(); }
  }
  findF.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); findNext(e.shiftKey ? -1 : 1); } if (e.key === "Escape") { find.hidden = true; ta.focus(); } });
  const openFind = () => { find.hidden = false; findF.value = ta.value.slice(ta.selectionStart, ta.selectionEnd) || findF.value; findF.select(); findF.focus(); };
  const stamp = () => { const n = new Date(); ta.setRangeText(n.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " " + n.toLocaleDateString(), ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); };
  const setZoom = z => { zoom = clamp(z, 50, 300); applyView(); };

  const menus = {
    file: () => [
      { label: "New window", kbd: "Ctrl+N", icon: glyph("plus"), run: () => os.launch("notepad") },
      { label: "Open…", kbd: "Ctrl+O", icon: glyph("folder"), run: async () => { if (!(await guard())) return; const p = await pickFile({ mode: "open", owner: win, dir: path ? fs.parentOf(path) : fs.DOCS }); if (p) load(p); } },
      { label: "Save", kbd: "Ctrl+S", icon: glyph("save"), run: () => save() },
      { label: "Save as…", kbd: "Ctrl+Shift+S", icon: glyph("save"), run: () => save(true) },
      { label: "Download", icon: glyph("download"), disabled: !path || !fs.exists(path), run: () => download(path) },
      "-", { label: "Close", icon: '<svg class="i xs"><use href="#c-x"/></svg>', run: () => win.close() }],
    edit: () => [
      { label: "Undo", kbd: "Ctrl+Z", icon: glyph("undo"), run: () => { ta.focus(); document.execCommand("undo"); } },
      "-",
      { label: "Cut", kbd: "Ctrl+X", icon: glyph("cut"), run: () => { ta.focus(); document.execCommand("cut"); } },
      { label: "Copy", kbd: "Ctrl+C", icon: glyph("copy"), run: () => { ta.focus(); document.execCommand("copy"); } },
      { label: "Paste", kbd: "Ctrl+V", icon: glyph("paste"), run: async () => { try { const t = await navigator.clipboard.readText(); ta.focus(); ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); } catch { os.notify({ title: "Press Ctrl+V to paste", app: "notepad", silent: true }); } } },
      "-",
      { label: "Find", kbd: "Ctrl+F", icon: glyph("search"), run: openFind },
      { label: "Select all", kbd: "Ctrl+A", run: () => { ta.focus(); ta.select(); } },
      { label: "Time/Date", kbd: "F5", icon: glyph("clock"), run: stamp }],
    view: () => [
      { label: "Zoom in", kbd: "Ctrl+Plus", icon: glyph("zoom-in"), run: () => setZoom(zoom + 10) },
      { label: "Zoom out", kbd: "Ctrl+Minus", icon: glyph("zoom-out"), run: () => setZoom(zoom - 10) },
      { label: "Restore default zoom", kbd: "Ctrl+0", run: () => setZoom(100) },
      "-",
      { label: "Word wrap", checked: wrapOn(), run: () => { store.set("np:wrap", !wrapOn()); applyView(); } },
      { label: "Status bar", checked: store.get("np:status", true) !== false, run: () => { store.set("np:status", store.get("np:status", true) === false); status(); } }]
  };
  bar.addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (!b) return; const r = b.getBoundingClientRect(); b.classList.add("on"); const m = menu(menus[b.dataset.m](), r.left, r.bottom + 2); const off = new MutationObserver(() => { if (!m.isConnected) { b.classList.remove("on"); off.disconnect(); } }); off.observe(document.body, { childList: true }); });
  ta.addEventListener("input", () => { const d = ta.value !== saved; if (d !== dirty) { dirty = d; title(); } status(); });
  ["keyup", "click", "select"].forEach(ev => ta.addEventListener(ev, status));
  ta.addEventListener("keydown", e => {
    if (e.key === "Tab") { e.preventDefault(); ta.setRangeText("\t", ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); }
    if (e.key === "F5") { e.preventDefault(); stamp(); }
  });
  win.el.addEventListener("keydown", e => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "s") { e.preventDefault(); save(e.shiftKey); }
    else if (k === "o") { e.preventDefault(); menus.file()[1].run(); }
    else if (k === "n") { e.preventDefault(); os.launch("notepad"); }
    else if (k === "f") { e.preventDefault(); openFind(); }
    else if (k === "=" || k === "+") { e.preventDefault(); setZoom(zoom + 10); }
    else if (k === "-") { e.preventDefault(); setZoom(zoom - 10); }
    else if (k === "0") { e.preventDefault(); setZoom(100); }
  });
  win.body.addEventListener("wheel", e => { if (e.ctrlKey) { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? 10 : -10)); } }, { passive: false });
  applyView(); await load(path);
  win.on("focus", () => setTimeout(() => ta.focus({ preventScroll: true })));
  setTimeout(() => ta.focus(), 50);
  return {
    onClose: guard,
    async onArgs(a) { if (a.path) { if (await guard()) load(a.path); } }
  };
}

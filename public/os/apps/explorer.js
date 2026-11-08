/* File Explorer */
import { h, $, $$, esc, glyph, injectCSS, os, bus, store, fmtBytes, fmtDate } from "../core.js";
import * as fs from "../fs.js";
import { fileIcon, typeName, driveIcon, folderIcon, binIcon, pcIcon } from "../icons.js";
import { APPS, recent, openPath } from "../apps.js";
import { menu, confirm, properties, importFiles, download, alert } from "../ui.js";

const DND = "application/x-rivaos";
injectCSS("explorer", `
.ex-addr{display:flex;align-items:center;gap:4px;padding:6px 10px;flex:none}
.ex-crumbs{flex:1;min-width:0;height:32px;display:flex;align-items:center;gap:0;padding:0 6px;border-radius:var(--r-ctl);background:var(--field);border:1px solid var(--ctl-edge);overflow:hidden;cursor:text}
.ex-crumbs:hover{background:var(--ctl-hover)}
.ex-crumbs .file-ico{--s:16px;margin:0 6px 0 2px}
.ex-crumbs button{border:0;background:transparent;padding:3px 6px;border-radius:3px;font-size:13px;white-space:nowrap;color:var(--text)}
.ex-crumbs button:hover{background:var(--subtle-hover)}
.ex-crumbs .gt{width:12px;height:12px;color:var(--text-3);flex:none}
.ex-path{flex:1;min-width:0;height:32px;font-size:13px}
.ex-search{width:220px;flex:none;height:32px;font-size:13px}
.ex-main{display:flex;flex:1;min-height:0;border-top:1px solid var(--divider)}
.ex-main .navpane{border-right:1px solid var(--divider);width:200px}
.ex-main .navpane .sep{height:1px;background:var(--divider);margin:6px 10px}
.ex-main .navi.drop{background:var(--accent-soft);outline:1px solid var(--accent)}
.ex-view{flex:1;overflow:auto;background:var(--layer-2);position:relative;outline:none;padding:8px 10px 20px}
.ex-view.drop{box-shadow:inset 0 0 0 2px var(--accent)}
.ex-info{display:flex;align-items:center;gap:10px;padding:8px 14px;margin:0 0 8px;border-radius:var(--r-card);background:var(--accent-soft);font-size:13px}
.ex-info .i{width:16px;height:16px;color:var(--accent-ink)}
.ex-h{font-weight:600;font-size:14px;margin:10px 6px 8px;display:flex;align-items:center;gap:6px}
.ex-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(var(--cell,104px),1fr));gap:4px}
.ex-grid .ex-item{flex-direction:column;justify-content:flex-start;height:auto;min-height:var(--cellh,112px);padding:8px 4px;text-align:center;gap:6px}
.ex-grid .ex-item .lbl{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;font-size:12.5px;line-height:1.3}
.ex-grid .ex-item .file-ico{--s:var(--ico,56px)}
.ex-grid.sz-large{--cell:140px;--cellh:150px;--ico:96px}
.ex-item{display:flex;align-items:center;gap:10px;border:1px solid transparent;border-radius:var(--r-ctl);background:transparent;color:var(--text);text-align:left;font-size:13px;width:100%;min-width:0}
.ex-item:hover{background:var(--subtle-hover)}
.ex-item.sel{background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 40%,transparent)}
.ex-item.cut{opacity:.5}
.ex-item.drop{outline:2px solid var(--accent)}
.ex-item .ren{width:100%;font:inherit;font-size:12.5px;text-align:inherit;border:1px solid var(--accent);border-radius:2px;padding:1px 3px;background:var(--field-focus);color:var(--text);outline:none}
.ex-det{display:grid;grid-template-columns:minmax(200px,3fr) minmax(140px,1.3fr) minmax(110px,1fr) minmax(70px,.7fr);min-width:560px}
.ex-det .hd{display:contents}
.ex-det .hd button{border:0;border-right:1px solid var(--divider);background:transparent;text-align:left;padding:6px 10px;font-size:12px;color:var(--text-2);position:sticky;top:-8px;background:var(--layer-2);z-index:1;display:flex;align-items:center;gap:4px}
.ex-det .hd button:hover{background:var(--subtle-hover)}
.ex-det .hd .i{width:10px;height:10px}
.ex-det .ex-item{display:contents}
.ex-det .ex-item > span{display:flex;align-items:center;gap:10px;height:32px;padding:0 10px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-2);border-top:1px solid transparent;border-bottom:1px solid transparent}
.ex-det .ex-item > span:first-child{color:var(--text);border-left:1px solid transparent;border-radius:4px 0 0 4px}
.ex-det .ex-item > span:last-child{border-right:1px solid transparent;border-radius:0 4px 4px 0}
.ex-det .ex-item:hover > span{background:var(--subtle-hover)}
.ex-det .ex-item.sel > span{background:var(--accent-soft)}
.ex-det .ex-item .file-ico{--s:20px}
.ex-det .ex-item .lbl{overflow:hidden;text-overflow:ellipsis}
.ex-drive{display:flex;align-items:center;gap:14px;padding:12px 14px;width:min(340px,100%);border-radius:var(--r-card);border:1px solid var(--stroke);background:var(--card);text-align:left;color:var(--text)}
.ex-drive:hover{background:var(--card-hover)}
.ex-drive.sel{background:var(--accent-soft)}
.ex-drive .file-ico{--s:48px}
.ex-drive b{display:block;font-weight:600;font-size:13px}
.ex-drive small{display:block;font-size:12px;color:var(--text-2)}
.ex-bar{height:6px;border-radius:3px;background:var(--stroke-2);margin:6px 0 4px;overflow:hidden;width:200px;max-width:100%}
.ex-bar i{display:block;height:100%;background:var(--accent);border-radius:3px}
.ex-empty{padding:40px 10px;text-align:center;color:var(--text-2);font-size:13px}
.ex-marq{position:absolute;border:1px solid var(--accent);background:color-mix(in srgb,var(--accent) 18%,transparent);pointer-events:none}
:root.compact .ex-main .navpane{display:none}
:root.compact .cmdbar{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}
:root.compact .cmdbar .btn.subtle span{display:none}
:root.compact .cmdbar .sep{margin:0 2px}
:root.compact .ex-addr [aria-label=Forward],:root.compact .ex-addr [aria-label=Refresh]{display:none}
:root.compact .ex-view{padding:6px 6px 16px}
:root.compact .ex-grid{--cell:92px;--cellh:104px;--ico:48px}
:root.compact .ex-search{width:120px}
@media (max-width:640px){.ex-search{width:110px}}
`);

export const winOpts = { w: 980, h: 620, minW: 420, minH: 300 };
const PLACES = [["Home", "home", "home"], "-", ["Desktop", fs.DESKTOP], ["Documents", fs.DOCS], ["Pictures", fs.PICS], ["Downloads", fs.DL], ["Riva", fs.RIVA], "-", ["This PC", "pc", "pc"], ["Local Disk (C:)", fs.ROOT], ["Recycle Bin", fs.TRASH]];

export default function explorer(win, args) {
  let cwd = null, back = [], fwd = [], query = "";
  let view = store.get("ex:view", "grid"), sort = store.get("ex:sort", { k: "name", d: 1 });
  const sel = new Set(); let anchor = null, shown = [];
  const isReal = p => p && p !== "home" && p !== "pc";
  const lower = p => p.toLowerCase();
  const inTrash = () => cwd && lower(cwd) === lower(fs.TRASH);

  // ── chrome ──
  const cmd = h("div", { class: "cmdbar", role: "toolbar", "aria-label": "Commands" });
  const crumbs = h("div", { class: "ex-crumbs", "aria-label": "Address" });
  const pathF = h("input", { class: "field ex-path", hidden: true, "aria-label": "Address", spellcheck: "false" });
  const searchF = h("input", { class: "field ex-search", type: "search", placeholder: "Search", "aria-label": "Search this folder" });
  const bB = h("button", { class: "ibtn", type: "button", "aria-label": "Back", "data-tip": "Back (Alt+Left)", html: glyph("back") });
  const fB = h("button", { class: "ibtn", type: "button", "aria-label": "Forward", "data-tip": "Forward (Alt+Right)", html: glyph("arrow") });
  const uB = h("button", { class: "ibtn", type: "button", "aria-label": "Up", "data-tip": "Up to parent folder", html: glyph("up") });
  const rB = h("button", { class: "ibtn", type: "button", "aria-label": "Refresh", "data-tip": "Refresh", html: glyph("refresh") });
  const addr = h("div", { class: "ex-addr" }, bB, fB, uB, rB, crumbs, pathF, searchF);
  const nav = h("nav", { class: "navpane", "aria-label": "Navigation" });
  const pane = h("div", { class: "ex-view", tabindex: "0", role: "listbox", "aria-multiselectable": "true", "aria-label": "Items" });
  const status = h("div", { class: "statusbar" });
  const upload = h("input", { type: "file", multiple: true, hidden: true });
  win.body.append(cmd, addr, h("div", { class: "ex-main" }, nav, pane), status, upload);

  nav.innerHTML = PLACES.map(p => p === "-" ? '<div class="sep"></div>' : `<button class="navi" type="button" data-nav="${esc(p[1])}">${p[2] === "home" ? glyph("home") : p[2] === "pc" ? pcIcon(18) : p[1] === fs.TRASH ? binIcon(18) : p[1] === fs.ROOT ? driveIcon(18) : folderIcon(18)}${esc(p[0])}</button>`).join("");
  nav.addEventListener("click", e => { const b = e.target.closest("[data-nav]"); if (b) go(b.dataset.nav); });

  function go(p, { push = true } = {}) {
    if (p !== "home" && p !== "pc") {
      const r = fs.resolve(p, isReal(cwd) ? cwd : fs.HOME);
      const n = fs.stat(r);
      if (!n) { alert({ owner: win, title: "File Explorer", text: `Windows can't find '${p}'. Check the spelling and try again.` }); return; }
      if (n.type === "file") { openPath(n.path); return; }
      p = n.path;
    }
    if (push && cwd && cwd !== p) { back.push(cwd); fwd = []; }
    cwd = p; query = ""; searchF.value = ""; sel.clear(); anchor = null;
    render(); pane.scrollTop = 0;
  }
  const title = () => cwd === "home" ? "Home" : cwd === "pc" ? "This PC" : cwd === fs.TRASH ? "Recycle Bin" : fs.displayName(fs.stat(cwd) || { path: cwd, name: fs.baseName(cwd) });

  function renderCrumbs() {
    crumbs.innerHTML = "";
    if (!isReal(cwd)) { crumbs.innerHTML = (cwd === "home" ? `<span class="file-ico" style="--s:16px">${glyph("home")}</span>` : pcIcon(16)) + `<button type="button" data-crumb="${cwd}">${title()}</button>`; return; }
    const parts = []; let p = cwd; while (p) { parts.unshift(p); p = fs.parentOf(p); }
    crumbs.insertAdjacentHTML("beforeend", fileIcon(fs.stat(cwd), 16, { thumb: false }));
    crumbs.insertAdjacentHTML("beforeend", `<button type="button" data-crumb="pc">This PC</button>`);
    parts.forEach(x => crumbs.insertAdjacentHTML("beforeend", glyph("chev-r", "i gt") + `<button type="button" data-crumb="${esc(x)}">${esc(x === fs.ROOT ? "Local Disk (C:)" : x === fs.TRASH ? "Recycle Bin" : fs.baseName(x))}</button>`));
  }
  crumbs.addEventListener("click", e => {
    const b = e.target.closest("[data-crumb]"); if (b) { go(b.dataset.crumb); return; }
    crumbs.hidden = true; pathF.hidden = false; pathF.value = isReal(cwd) ? cwd : title(); pathF.select(); pathF.focus();
  });
  pathF.addEventListener("keydown", e => { if (e.key === "Enter") { const v = pathF.value.trim(); pathF.blur(); if (/^this pc$/i.test(v)) go("pc"); else if (/^home$/i.test(v)) go("home"); else if (/^https?:\/\//i.test(v)) os.launch("browser", { url: v }); else go(v); } if (e.key === "Escape") pathF.blur(); });
  pathF.addEventListener("blur", () => { pathF.hidden = true; crumbs.hidden = false; });
  searchF.addEventListener("input", () => { query = searchF.value.trim(); sel.clear(); renderItems(); });

  bB.addEventListener("click", () => { if (back.length) { fwd.push(cwd); go(back.pop(), { push: false }); } });
  fB.addEventListener("click", () => { if (fwd.length) { back.push(cwd); go(fwd.pop(), { push: false }); } });
  uB.addEventListener("click", () => { if (isReal(cwd)) { const p = fs.parentOf(cwd); go(p || "pc"); } else if (cwd === "pc") go("home"); });
  rB.addEventListener("click", () => render());

  // ── command bar ──
  function renderCmd() {
    const n = sel.size, real = isReal(cwd), ro = real && lower(cwd).startsWith(lower(fs.RIVA)), canNew = real && !ro && !inTrash() && cwd !== fs.ROOT;
    const B = (id, g, label, dis, tip) => `<button class="btn subtle" type="button" data-c="${id}" ${dis ? "disabled" : ""} ${tip ? `data-tip="${tip}"` : ""}>${glyph(g)}<span>${label}</span></button>`;
    const I = (id, g, label, dis) => `<button class="ibtn" type="button" data-c="${id}" aria-label="${label}" data-tip="${label}" ${dis ? "disabled" : ""}>${glyph(g)}</button>`;
    cmd.innerHTML = inTrash()
      ? B("empty", "trash", "Empty Recycle Bin", !fs.ls(fs.TRASH).length) + B("restore", "undo", n ? "Restore selected" : "Restore all items", !fs.ls(fs.TRASH).length) + '<span class="sep"></span>' + I("del", "x", "Delete permanently", !n) + '<span class="sep"></span>' + B("view", "grid", "View")
      : B("new", "plus", "New", !canNew) + '<span class="sep"></span>' + I("cut", "cut", "Cut", !n || ro) + I("copy", "copy", "Copy", !n) + I("paste", "paste", "Paste", !canNew || !os.fileops.canPaste()) + I("rename", "pencil", "Rename", n !== 1 || ro) + I("del", "trash", "Delete", !n || ro) +
        '<span class="sep"></span>' + B("sort", "sort", "Sort") + B("view", "grid", "View") + '<span class="sep"></span>' + B("upload", "upload", "Upload", !canNew, "Copy files from your computer") + I("more", "more", "See more");
  }
  cmd.addEventListener("click", e => {
    const b = e.target.closest("[data-c]"); if (!b || b.disabled) return; const r = b.getBoundingClientRect(), c = b.dataset.c;
    if (c === "new") menu(newItems(), r.left, r.bottom + 4);
    if (c === "cut") os.fileops.copy(selPaths(), true);
    if (c === "copy") os.fileops.copy(selPaths());
    if (c === "paste") pasteHere();
    if (c === "rename") rename(selPaths()[0]);
    if (c === "del") del(inTrash());
    if (c === "sort") menu(sortItems(), r.left, r.bottom + 4);
    if (c === "view") menu(viewItems(), r.left, r.bottom + 4);
    if (c === "upload") upload.click();
    if (c === "more") menu([{ label: "Select all", icon: glyph("check"), kbd: "Ctrl+A", run: selAll }, { label: "Open in Terminal", icon: glyph("terminal"), disabled: !isReal(cwd), run: () => os.launch("terminal", { cwd }) }, "-", { label: "Properties", icon: glyph("info"), disabled: !isReal(cwd) && !sel.size, run: () => properties(selPaths()[0] || cwd) }], r.left, r.bottom + 4);
    if (c === "empty") emptyBin();
    if (c === "restore") (sel.size ? selPaths() : fs.ls(fs.TRASH).map(n => n.path)).forEach(p => fs.restore(p));
  });
  upload.addEventListener("change", async () => { const n = await importFiles(upload.files, cwd); upload.value = ""; if (n) os.notify({ title: `Copied ${n} file${n > 1 ? "s" : ""}`, app: "explorer", silent: true }); });
  const newItems = () => [{ label: "Folder", icon: glyph("folder"), run: () => create("folder") }, "-", { label: "Text Document", icon: glyph("doc"), run: () => create("text") }, { label: "PowerShell Script", icon: glyph("terminal"), run: () => create("ps1") }];
  const sortItems = () => [["name", "Name"], ["mtime", "Date modified"], ["type", "Type"], ["size", "Size"]].map(([k, l]) => ({ label: l, checked: sort.k === k, run: () => setSort(k, sort.k === k ? -sort.d : 1) })).concat(["-", { label: "Ascending", checked: sort.d === 1, run: () => setSort(sort.k, 1) }, { label: "Descending", checked: sort.d === -1, run: () => setSort(sort.k, -1) }]);
  const viewItems = () => [["large", "Large icons"], ["grid", "Medium icons"], ["details", "Details"]].map(([k, l]) => ({ label: l, checked: view === k, run: () => { view = k; store.set("ex:view", k); renderItems(); } }));
  function setSort(k, dd) { sort = { k, d: dd }; store.set("ex:sort", sort); renderItems(); }
  function create(kind) { const p = os.fileops.newItem(cwd, kind); if (p) { sel.clear(); sel.add(lower(p)); renderItems(); rename(p); } }
  function pasteHere() { const out = os.fileops.paste(cwd); sel.clear(); out.forEach(p => sel.add(lower(p))); renderItems(); }
  async function emptyBin() { if (await confirm({ owner: win, title: "Empty Recycle Bin", text: `Permanently delete ${fs.ls(fs.TRASH).length} item(s)?`, ok: "Yes", cancel: "No" })) fs.emptyTrash(); }
  const selPaths = () => shown.filter(n => sel.has(lower(n.path))).map(n => n.path);
  function del(perm) { const ps = selPaths(); if (ps.length) os.fileops.remove(ps, { permanent: perm, owner: win }); }
  function selAll() { shown.forEach(n => sel.add(lower(n.path))); syncSel(); }

  // ── content ──
  function render() {
    const ok = cwd === "home" || cwd === "pc" || fs.exists(cwd);
    if (!ok) { cwd = fs.parentOf(cwd) || "home"; while (isReal(cwd) && !fs.exists(cwd)) cwd = fs.parentOf(cwd) || "home"; }
    win.setTitle(title());
    $$(".navi", nav).forEach(b => b.classList.toggle("on", b.dataset.nav === cwd));
    bB.disabled = !back.length; fB.disabled = !fwd.length; uB.disabled = cwd === "home";
    searchF.placeholder = "Search " + title();
    renderCrumbs(); renderItems();
  }
  function sorted(list) {
    const k = sort.k, dd = sort.d, val = n => k === "name" ? fs.displayName(n).toLowerCase() : k === "mtime" ? n.mtime : k === "size" ? (n.size || 0) : typeName(n);
    return [...list].sort((a, b) => (a.type === b.type ? 0 : a.type === "dir" ? -1 : 1) || (val(a) < val(b) ? -dd : val(a) > val(b) ? dd : 0));
  }
  function renderItems() {
    pane.innerHTML = ""; shown = [];
    const clip = os.clip?.op === "cut" ? new Set(os.clip.paths.map(lower)) : null;
    const itemHTML = (n, extraCols) => {
      const s = sel.has(lower(n.path)), cls = "ex-item" + (s ? " sel" : "") + (clip?.has(lower(n.path)) ? " cut" : "");
      if (view === "details") return `<div class="${cls}" role="option" draggable="true" data-path="${esc(n.path)}" aria-selected="${s}" tabindex="-1"><span>${fileIcon(n, 20, { thumb: false })}<span class="lbl">${esc(fs.displayName(n))}</span></span>${(extraCols || [fmtDate(n.mtime), typeName(n), n.type === "dir" ? "" : fmtBytes(n.size || 0)]).map(c => `<span>${esc(c)}</span>`).join("")}</div>`;
      return `<button class="${cls}" type="button" role="option" draggable="true" data-path="${esc(n.path)}" aria-selected="${s}" title="${esc(fs.displayName(n) + "\n" + typeName(n) + (n.type === "file" ? "\nSize: " + fmtBytes(n.size || 0) : ""))}">${fileIcon(n, view === "large" ? 96 : 56)}<span class="lbl">${esc(fs.displayName(n))}</span></button>`;
    };
    const list = (nodes, cols) => {
      shown.push(...nodes);
      if (!nodes.length) return `<div class="ex-empty">${query ? "No items match your search." : inTrash() ? "The Recycle Bin is empty." : "This folder is empty."}</div>`;
      if (view === "details") {
        const heads = cols ? cols.h : [["name", "Name"], ["mtime", "Date modified"], ["type", "Type"], ["size", "Size"]];
        return `<div class="ex-det"><div class="hd">${heads.map(([k, l]) => `<button type="button" data-sort="${k}">${l}${sort.k === k ? glyph(sort.d === 1 ? "chev-u" : "chev-d") : ""}</button>`).join("")}</div>${nodes.map(n => itemHTML(n, cols?.row(n))).join("")}</div>`;
      }
      return `<div class="ex-grid ${view === "large" ? "sz-large" : ""}">${nodes.map(n => itemHTML(n)).join("")}</div>`;
    };
    let html = "";
    if (cwd === "home") {
      html += `<div class="ex-h">${glyph("star", "i sm")}Quick access</div>` + list([fs.DESKTOP, fs.DOCS, fs.PICS, fs.DL, fs.RIVA].map(p => fs.stat(p)).filter(Boolean));
      const rec = recent().map(p => fs.stat(p)).filter(Boolean);
      const v = view; view = "details";
      html += `<div class="ex-h" style="margin-top:22px">${glyph("clock", "i sm")}Recent</div>` + (rec.length ? list(rec, { h: [["name", "Name"], ["mtime", "Date modified"], ["loc", "File location"], ["size", "Size"]], row: n => [fmtDate(n.mtime), fs.parentOf(n.path), fmtBytes(n.size || 0)] }) : `<div class="ex-empty">Files you open will show up here.</div>`);
      view = v;
    } else if (cwd === "pc") {
      const u = fs.usage();
      html += `<div class="ex-h">Devices and drives</div><button class="ex-drive" type="button" data-path="${esc(fs.ROOT)}">${driveIcon(48)}<span><b>Local Disk (C:)</b><span class="ex-bar"><i id="ex-q" style="width:2%"></i></span><small id="ex-qt">${fmtBytes(u.bytes)} used · ${u.files} files</small></span></button>`;
      html += `<div class="ex-h" style="margin-top:22px">Folders</div>` + list([fs.DESKTOP, fs.DOCS, fs.PICS, fs.DL, fs.RIVA].map(p => fs.stat(p)));
      navigator.storage?.estimate?.().then(est => { const q = $("#ex-q", pane), t = $("#ex-qt", pane); if (q && est.quota) { q.style.width = Math.max(1, est.usage / est.quota * 100) + "%"; t.textContent = `${fmtBytes(est.quota - est.usage)} free of ${fmtBytes(est.quota)} · browser storage`; } });
    } else {
      if (lower(cwd).startsWith(lower(fs.RIVA))) html += `<div class="ex-info">${glyph("lock")}<span>Read-only. Copy files elsewhere to edit them.</span></div>`;
      if (inTrash() && fs.ls(fs.TRASH).length) html += `<div class="ex-info">${glyph("info")}<span>Right-click an item to restore it.</span></div>`;
      let nodes;
      if (query) { nodes = []; const q = query.toLowerCase(); fs.walk(cwd, n => { if (n.path !== cwd && fs.displayName(n).toLowerCase().includes(q)) nodes.push(n); }); }
      else nodes = fs.ls(cwd);
      html += inTrash() ? list(sorted(nodes), { h: [["name", "Name"], ["loc", "Original location"], ["mtime", "Date deleted"], ["size", "Size"]], row: n => [fs.parentOf(n.meta?.origin || "") || "", fmtDate(n.meta?.deleted || n.mtime), n.type === "dir" ? "" : fmtBytes(n.size || 0)] }) : list(sorted(nodes));
    }
    pane.innerHTML = html; renderCmd(); renderStatus();
  }
  function renderStatus() {
    const n = sel.size, items = shown.length;
    const size = selPaths().reduce((s, p) => s + (fs.stat(p)?.size || 0), 0);
    status.innerHTML = `<span>${items} item${items === 1 ? "" : "s"}</span>${n ? `<span>${n} item${n === 1 ? "" : "s"} selected${size ? " · " + fmtBytes(size) : ""}</span>` : ""}<span class="grow"></span><span>${fs.persistent() ? "Saved in this browser" : "Not saved (private mode)"}</span>`;
  }
  function syncSel() {
    $$(".ex-item,.ex-drive", pane).forEach(el => { const on = sel.has(lower(el.dataset.path)); el.classList.toggle("sel", on); el.setAttribute("aria-selected", on); });
    renderCmd(); renderStatus();
  }

  // ── interaction ──
  pane.addEventListener("click", e => {
    const hd = e.target.closest("[data-sort]"); if (hd) { const k = hd.dataset.sort; if (k !== "loc") setSort(k, sort.k === k ? -sort.d : 1); return; }
    const it = e.target.closest("[data-path]");
    if (!it) { if (!e.ctrlKey && !e.shiftKey) { sel.clear(); syncSel(); } return; }
    if (e.target.closest(".ren")) return;
    const k = lower(it.dataset.path);
    if (e.shiftKey && anchor) { const idx = shown.map(n => lower(n.path)); const a = idx.indexOf(anchor), b = idx.indexOf(k); if (!e.ctrlKey) sel.clear(); idx.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => sel.add(x)); }
    else if (e.ctrlKey || e.metaKey) { sel.has(k) ? sel.delete(k) : sel.add(k); anchor = k; }
    else { sel.clear(); sel.add(k); anchor = k; }
    syncSel();
    if (e.pointerType === "touch") openItem(it.dataset.path);
  });
  pane.addEventListener("dblclick", e => { const it = e.target.closest("[data-path]"); if (it && !e.target.closest(".ren")) openItem(it.dataset.path); });
  function openItem(p) {
    const n = fs.stat(p); if (!n) return;
    if (inTrash()) { properties(p); return; }
    if (n.type === "dir") go(n.path); else openPath(n.path);
  }
  pane.addEventListener("keydown", e => {
    if (e.target.closest(".ren")) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey, ps = selPaths();
    if (k === "enter" && ps.length) { e.preventDefault(); ps.forEach(openItem); }
    else if (k === "delete") { e.preventDefault(); del(e.shiftKey || inTrash()); }
    else if (k === "f2" && ps.length === 1) { e.preventDefault(); rename(ps[0]); }
    else if (k === "backspace") { e.preventDefault(); uB.click(); }
    else if (mod && k === "a") { e.preventDefault(); selAll(); }
    else if (mod && k === "c" && ps.length) os.fileops.copy(ps);
    else if (mod && k === "x" && ps.length) os.fileops.copy(ps, true);
    else if (mod && k === "v" && isReal(cwd)) pasteHere();
    else if (k.startsWith("arrow") && shown.length) {
      e.preventDefault();
      const idx = shown.map(n => lower(n.path)), i = Math.max(-1, idx.indexOf(anchor));
      const cols = view === "details" ? 1 : Math.max(1, Math.round(pane.clientWidth / (view === "large" ? 144 : 108)));
      const j = Math.max(0, Math.min(idx.length - 1, i + ({ arrowdown: cols, arrowup: -cols, arrowright: 1, arrowleft: -1 }[k] || 0)));
      sel.clear(); sel.add(idx[j]); anchor = idx[j]; syncSel(); pane.querySelector(`[data-path="${CSS.escape(shown[j].path)}"]`)?.scrollIntoView({ block: "nearest" });
    }
  });
  win.el.addEventListener("keydown", e => { if (e.altKey && e.key === "ArrowLeft") { e.preventDefault(); bB.click(); } if (e.altKey && e.key === "ArrowRight") { e.preventDefault(); fB.click(); } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") { e.preventDefault(); searchF.focus(); } });

  function rename(p) {
    const el = pane.querySelector(`[data-path="${CSS.escape(p)}"]`), n = fs.stat(p); if (!el || !n) return;
    const lbl = $(".lbl", el), inp = h("input", { class: "ren", value: fs.displayName(n), spellcheck: "false", "aria-label": "New name" });
    lbl.replaceWith(inp); el.draggable = false; inp.focus();
    const dot = n.type === "file" && fs.extOf(n.path) !== "lnk" ? inp.value.lastIndexOf(".") : -1; inp.setSelectionRange(0, dot > 0 ? dot : inp.value.length);
    let done = false;
    const fin = ok => { if (done) return; done = true; const v = inp.value.trim(); if (ok && v && v !== fs.displayName(n)) { const np = os.fileops.rename(p, v); if (np) { sel.clear(); sel.add(lower(np)); } } renderItems(); pane.focus({ preventScroll: true }); };
    inp.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") fin(true); if (e.key === "Escape") fin(false); });
    inp.addEventListener("blur", () => fin(true));
    inp.addEventListener("click", e => e.stopPropagation());
  }

  pane.addEventListener("contextmenu", e => {
    e.preventDefault();
    const it = e.target.closest("[data-path]"), x = e.clientX, y = e.clientY;
    const ro = isReal(cwd) && lower(cwd).startsWith(lower(fs.RIVA));
    if (it) {
      const k = lower(it.dataset.path); if (!sel.has(k)) { sel.clear(); sel.add(k); anchor = k; syncSel(); }
      const ps = selPaths(), n = fs.stat(it.dataset.path), file = n?.type === "file";
      if (inTrash()) return menu([{ label: "Restore", icon: glyph("undo"), run: () => ps.forEach(p => fs.restore(p)) }, "-", { label: "Delete permanently", icon: glyph("x"), run: () => del(true) }, { label: "Properties", icon: glyph("info"), run: () => properties(n.path) }], x, y);
      return menu([
        { label: "Open", icon: glyph(file ? "external" : "folder"), run: () => ps.forEach(openItem) },
        !file && { label: "Open in new window", icon: glyph("external"), run: () => os.launch("explorer", { path: n.path }) },
        file && fs.extOf(n.path) !== "lnk" && { label: "Open with", icon: glyph("apps"), sub: ["notepad", "code", "photos", "browser"].map(a => ({ label: APPS[a].name, run: () => openPath(n.path, { with: a }) })) },
        query && { label: "Open file location", icon: glyph("folder"), run: () => { go(fs.parentOf(n.path)); sel.add(lower(n.path)); syncSel(); } },
        !file && { label: "Open in Terminal", icon: glyph("terminal"), run: () => os.launch("terminal", { cwd: n.path }) },
        "-",
        { label: "Cut", icon: glyph("cut"), kbd: "Ctrl+X", disabled: ro || !isReal(cwd), run: () => os.fileops.copy(ps, true) },
        { label: "Copy", icon: glyph("copy"), kbd: "Ctrl+C", run: () => os.fileops.copy(ps) },
        { label: "Rename", icon: glyph("pencil"), kbd: "F2", disabled: ps.length !== 1 || ro || !isReal(cwd), run: () => rename(n.path) },
        { label: "Delete", icon: glyph("trash"), kbd: "Del", disabled: ro || !isReal(cwd), run: () => del(false) },
        "-",
        file && { label: "Download", icon: glyph("download"), run: () => ps.forEach(download) },
        file && fs.isImage(n) && { label: "Set as desktop background", icon: glyph("image"), run: () => os.settings.set("wallpaper", "file:" + n.path) },
        { label: "Properties", icon: glyph("info"), run: () => properties(n.path) }
      ], x, y);
    }
    if (!isReal(cwd)) return;
    sel.clear(); syncSel();
    const canNew = !ro && !inTrash();
    menu([
      { label: "View", icon: glyph("grid"), sub: viewItems() }, { label: "Sort by", icon: glyph("sort"), sub: sortItems() }, { label: "Refresh", icon: glyph("refresh"), run: render }, "-",
      { label: "Paste", icon: glyph("paste"), kbd: "Ctrl+V", disabled: !canNew || !os.fileops.canPaste(), run: pasteHere },
      canNew && { label: "New", icon: glyph("plus"), sub: newItems() },
      "-", { label: "Open in Terminal", icon: glyph("terminal"), run: () => os.launch("terminal", { cwd }) },
      { label: "Properties", icon: glyph("info"), run: () => properties(cwd) }
    ], x, y);
  });

  // drag & drop
  pane.addEventListener("dragstart", e => {
    const it = e.target.closest("[data-path]"); if (!it) return;
    const k = lower(it.dataset.path); if (!sel.has(k)) { sel.clear(); sel.add(k); syncSel(); }
    const ps = selPaths(); e.dataTransfer.setData(DND, JSON.stringify({ src: "explorer", paths: ps })); e.dataTransfer.setData("text/plain", ps.join("\n")); e.dataTransfer.effectAllowed = "copyMove";
  });
  const dropDir = el => { const it = el?.closest?.("[data-path]"); if (it) { const n = fs.stat(it.dataset.path); if (n?.type === "dir") return n.path; } const nv = el?.closest?.("[data-nav]"); if (nv && isReal(nv.dataset.nav)) return nv.dataset.nav; return isReal(cwd) ? cwd : null; };
  [pane, nav].forEach(zone => {
    zone.addEventListener("dragover", e => {
      const t = e.dataTransfer.types; if (!t.includes(DND) && !t.includes("Files")) return;
      const dd = dropDir(e.target); if (!dd || lower(dd).startsWith(lower(fs.RIVA))) return;
      e.preventDefault(); e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
      $$(".drop", win.body).forEach(x => x.classList.remove("drop"));
      (e.target.closest("[data-path],[data-nav]") || pane).classList.add("drop");
    });
    zone.addEventListener("dragleave", e => { if (!zone.contains(e.relatedTarget)) $$(".drop", win.body).forEach(x => x.classList.remove("drop")); });
    zone.addEventListener("drop", async e => {
      e.preventDefault(); $$(".drop", win.body).forEach(x => x.classList.remove("drop"));
      const dd = dropDir(e.target); if (!dd) return;
      if (e.dataTransfer.files?.length && !e.dataTransfer.types.includes(DND)) { const n = await importFiles(e.dataTransfer.files, dd); if (n) os.notify({ title: `Copied ${n} file${n > 1 ? "s" : ""}`, app: "explorer", silent: true }); return; }
      let data; try { data = JSON.parse(e.dataTransfer.getData(DND)); } catch { return; }
      const paths = data.paths.filter(p => lower(p) !== lower(dd));
      await os.fileops.drop(paths, dd, { copy: e.ctrlKey });
    });
  });

  // live updates
  const offFs = bus.on("fs", ev => {
    if (!cwd) return;
    if (!isReal(cwd)) { render(); return; }
    const c = lower(cwd), hit = [ev.dir, ev.fromDir, ev.path, ev.from].some(x => x && (lower(x) === c || (query && lower(x).startsWith(c))));
    if (hit || !fs.exists(cwd)) render();
  });
  const offClip = bus.on("clip", () => renderItems());
  win.on("close", () => { offFs(); offClip(); });

  go(args.path === "pc" ? "pc" : args.path || "home");
  setTimeout(() => pane.focus({ preventScroll: true }), 60);
  return { onArgs(a) { if (a.path) go(a.path); } };
}

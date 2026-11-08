/* rivaOS · the shell: desktop, taskbar, Start, Quick Settings, notifications, widgets,
   lock screen and power. Apps reach it through `os` (os.notify, os.lock, os.fileops…). */

import { d, h, $, $$, esc, glyph, LOGO, os, bus, settings, store, sound, reduced, clamp, sleep, system, api, copyText, EMAIL, uid, track } from "./core.js";
import * as fs from "./fs.js";
import { wm } from "./wm.js";
import { APPS, START_PINS, launch, openPath, recent, openRoute } from "./apps.js";
import { appIcon, fileIcon, pcIcon, binIcon } from "./icons.js";
import { menu, confirm, prompt, alert, properties, importFiles, download } from "./ui.js";
import { wallpaperURL } from "./wallpapers.js";
import { SERVICES, STATUS } from "./content.js";

const DND = "application/x-rivaos";
let desk, icons, wall, tbApps, flyOpen = null, flyBtn = null;

/* ═════════════ boot ═════════════ */
export async function initShell() {
  const root = $("#os");
  root.innerHTML = `
  <div class="desktop" id="desktop">
    <div class="desktop-wall"></div>
    <div class="icons" id="icons" tabindex="0" role="listbox" aria-label="Desktop icons" aria-multiselectable="true"></div>
    <div class="wins" id="wins"></div>
  </div>
  <nav class="taskbar acrylic" id="taskbar" aria-label="Taskbar">
    <div class="tb-l"><button class="tbb tb-widgets" id="tb-widgets" type="button" aria-label="Widgets" aria-expanded="false">${glyph("weather", "i wi")}<span><b>Widgets</b><small>Weather &amp; more</small></span></button></div>
    <div class="tb-c">
      <button class="tbb tb-start" id="tb-start" type="button" aria-label="Start" aria-expanded="false" data-tip="Start">${LOGO}</button>
      <button class="tbb tb-search" id="tb-search" type="button" aria-label="Search">${glyph("search")}<span>Search</span></button>
      <div class="tb-apps" id="tb-apps" style="display:contents"></div>
    </div>
    <div class="tb-r">
      <button class="tbb tb-tray" id="tb-qs" type="button" aria-label="Quick settings" aria-expanded="false" data-tip="Quick settings">${glyph("wifi")}${glyph("volume")}${glyph("battery")}</button>
      <button class="tbb tb-clock" id="tb-clock" type="button" aria-label="Notifications and calendar" aria-expanded="false"><span id="clk-t"></span><span id="clk-d"></span><span class="bdg" id="nc-badge" hidden></span></button>
      <button class="tb-show" id="tb-show" type="button" aria-label="Show desktop" data-tip="Show desktop"></button>
    </div>
  </nav>
  <section class="fly start acrylic" id="start" role="dialog" aria-label="Start"></section>
  <section class="fly qs acrylic" id="qs" role="dialog" aria-label="Quick settings"></section>
  <section class="fly ncenter" id="nc" role="dialog" aria-label="Notifications and calendar"></section>
  <section class="fly widgets acrylic" id="widgets" role="dialog" aria-label="Widgets"></section>
  <div class="toasts" id="toasts" aria-live="polite"></div>
  <div class="night"></div><div class="dim"></div>`;
  desk = $("#desktop"); icons = $("#icons"); wall = $(".desktop-wall"); tbApps = $("#tb-apps");
  wm.init($("#wins"));
  Object.assign(os, { notify, lock, restart, shutdown, fileops, clip: null, shell: { buttonRect, openFly, closeFly } });
  settings.apply();
  applyWallpaper(); bus.on("settings", e => { if (!e.key || e.key === "theme" || e.key === "wallpaper") applyWallpaper(); if (e.key === "pinned") renderTaskbar(); if (e.key === "iconSize" || e.key === "showIcons") renderIcons(); if (e.key === "clock24") tick(true); if (e.key === "tbWidgets" || e.key === "tbSearch") tbPrefs(); });
  initDesktop(); initTaskbar(); initStart(); initQS(); initNC(); initWidgets(); initKeys();
  tick(true); setInterval(tick, 1000);
  bus.on("fs-error", () => notify({ title: "Storage is full", body: "Free up space in Settings." }));

  // first windows: a deep link wins, otherwise Welcome (+ Terminal on big screens)
  const routed = location.hash && openRoute(location.hash);
  if (!routed && settings.get("showWelcome") !== false) {
    const a = wm.workArea(), wide = !wm.compact && a.w >= 1240 && a.h >= 640;
    // On wide screens Welcome and Terminal sit side by side, never overlapping.
    const gap = Math.round(Math.max(24, a.w * .04)), tw = Math.min(620, Math.max(540, Math.round(a.w * .36))), th = Math.min(440, a.h - 120);
    const left = 100;   // clear of the desktop icon column
    const ww = Math.min(820, a.w - tw - gap * 2 - left);
    const wel = await launch("welcome", wide ? { window: { x: left, y: Math.round(Math.max(16, a.h * .07)), w: ww, h: Math.min(620, a.h - 40) } } : {});
    if (wide) {
      await launch("terminal", { intro: true, window: { x: a.w - tw - gap, y: Math.round(a.h - th - Math.max(24, a.h * .08)), w: tw, h: th } });
      wel?.focus();
    }
  }
  addEventListener("hashchange", () => openRoute(location.hash));
  hideBoot();
  if (!store.get("tipShown") && !wm.compact) setTimeout(() => { store.set("tipShown", 1); notify({ title: "Welcome to rivaOS", body: "Everything here works. Try dragging a window to the screen edge.", app: "welcome", actions: [{ label: "Book a free chat", run: () => launch("mail") }] }); }, 5000);
}
function hideBoot() {
  const b = $("#boot"); if (!b) return;
  setTimeout(() => { b.classList.add("out"); setTimeout(() => b.remove(), 500); }, reduced() ? 0 : 450);
}

function applyWallpaper() {
  const id = settings.get("wallpaper");
  let url = "";
  if (String(id).startsWith("file:")) { const p = id.slice(5); url = fs.exists(p) ? fs.url(p) : ""; }
  if (!url) url = wallpaperURL(String(id).startsWith("file:") ? "bloom" : id, settings.theme());
  wall.style.backgroundImage = `url("${url}")`;
  const lb = $(".lock-bg"); if (lb) lb.style.backgroundImage = wall.style.backgroundImage;
}

/* ═════════════ clock ═════════════ */
let lastMin = -1;
function tick(force) {
  const n = new Date(); if (!force && n.getMinutes() === lastMin) return; lastMin = n.getMinutes();
  const h24 = settings.get("clock24");
  const t = n.toLocaleTimeString([], { hour: h24 ? "2-digit" : "numeric", minute: "2-digit", hour12: !h24 });
  $("#clk-t").textContent = t; $("#clk-d").textContent = n.toLocaleDateString();
  $("#tb-clock").dataset.tip = n.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const lt = $("#lk-t"); if (lt) { lt.textContent = t.replace(/\s?[AP]\.?M\.?$/i, ""); $("#lk-d").textContent = n.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }); }
  if (flyOpen?.id === "nc" && n.getHours() === 0 && n.getMinutes() === 0) renderCal();
}

/* ═════════════ file operations (desktop + Explorer share these) ═════════════ */
const fileops = {
  newItem(dir, kind) {
    try {
      if (kind === "folder") return fs.mkdir(fs.unique(dir, "New folder")).path;
      if (kind === "ps1") return fs.write(fs.unique(dir, "New Script.ps1"), "# New PowerShell script\nWrite-Host \"Hello from rivaOS\"\n").path;
      return fs.write(fs.unique(dir, "New Text Document.txt"), "").path;
    } catch (e) { alert({ title: "Can't create item", text: e.message }); return null; }
  },
  copy(paths, cut = false) { os.clip = { op: cut ? "cut" : "copy", paths: [...paths] }; bus.emit("clip"); },
  canPaste: () => !!os.clip?.paths?.length,
  paste(dir) {
    const c = os.clip; if (!c) return [];
    const out = [];
    for (const p of c.paths) {
      try {
        if (!fs.exists(p)) continue;
        if (c.op === "cut") { const par = fs.parentOf(fs.stat(p).path); if (par.toLowerCase() === fs.resolve(dir).toLowerCase()) continue; out.push(fs.mv(p, fs.unique(dir, fs.baseName(p))).path); }
        else out.push(fs.cp(p, dir).path);
      } catch (e) { alert({ title: "Couldn't paste", text: e.message }); }
    }
    if (c.op === "cut") { os.clip = null; bus.emit("clip"); }
    return out;
  },
  async remove(paths, { permanent = false, owner } = {}) {
    paths = paths.filter(p => fs.exists(p)); if (!paths.length) return;
    const inBin = paths.every(p => p.toLowerCase().startsWith(fs.TRASH.toLowerCase() + "\\"));
    if (permanent || inBin) {
      const what = paths.length === 1 ? `"${fs.displayName(fs.stat(paths[0]))}"` : `these ${paths.length} items`;
      if (!(await confirm({ owner, title: "Delete " + (paths.length === 1 ? "File" : "Multiple Items"), text: `Are you sure you want to permanently delete ${what}?`, ok: "Yes", cancel: "No" }))) return;
      paths.forEach(p => { try { fs.rm(p, { recursive: true }); } catch (e) { alert({ owner, title: "Can't delete", text: e.message }); } });
    } else paths.forEach(p => { try { fs.trash(p); } catch (e) { alert({ owner, title: "Can't delete", text: e.message }); } });
    sound("click");
  },
  rename(path, name) {
    const n = fs.stat(path); if (!n) return null;
    name = name.trim(); if (!name) return null;
    if (fs.extOf(n.path) === "lnk" && !/\.lnk$/i.test(name)) name += ".lnk";
    if (name === n.name) return n.path;
    try { return fs.mv(n.path, fs.join(fs.parentOf(n.path), name)).path; } catch (e) { alert({ title: "Rename", text: e.message }); return null; }
  },
  async drop(paths, dir, { copy = false } = {}) {
    for (const p of paths) {
      try {
        if (!fs.exists(p)) continue;
        const n = fs.stat(p);
        if (dir.toLowerCase() === fs.TRASH.toLowerCase()) { fs.trash(p); continue; }
        if (fs.parentOf(n.path).toLowerCase() === fs.resolve(dir).toLowerCase()) continue;
        const ro = p.toLowerCase().startsWith(fs.RIVA.toLowerCase());
        copy || ro ? fs.cp(p, dir) : fs.mv(p, fs.unique(dir, n.name));
      } catch (e) { alert({ title: "Couldn't move " + fs.baseName(p), text: e.message }); }
    }
  }
};

/* ═════════════ desktop ═════════════ */
const SIZES = { small: [74, 66, 28], medium: [78, 90, 44], large: [100, 118, 72] };
const sel = new Set(); let items = [], cells = {}, dragKey = null;
const deskKey = it => it.key;
function initDesktop() {
  bus.on("fs", e => { const D = fs.DESKTOP.toLowerCase(), T = fs.TRASH.toLowerCase(); if ([e.dir, e.fromDir, e.path].some(x => x && (x.toLowerCase() === D || x.toLowerCase() === T || x.toLowerCase().startsWith(T + "\\")))) renderIcons(); });
  addEventListener("resize", () => layoutIcons());
  icons.addEventListener("pointerdown", onDeskDown);
  icons.addEventListener("dblclick", e => { const el = e.target.closest(".dicon"); if (el && !e.target.closest(".ren")) openItem(el.dataset.key); });
  icons.addEventListener("click", e => { const el = e.target.closest(".dicon"); if (el && e.pointerType === "touch" && !e.target.closest(".ren")) openItem(el.dataset.key); });
  icons.addEventListener("contextmenu", onDeskMenu);
  icons.addEventListener("keydown", onDeskKey);
  // drag & drop: icons, Explorer items and real files from the visitor's computer
  icons.addEventListener("dragstart", e => {
    const el = e.target.closest(".dicon"); if (!el) return;
    const k = el.dataset.key; if (!sel.has(k)) { selectOnly(k); }
    dragKey = k;
    const paths = [...sel].map(x => items.find(i => i.key === x)?.node?.path).filter(Boolean);
    e.dataTransfer.setData(DND, JSON.stringify({ src: "desktop", paths, keys: [...sel] }));
    e.dataTransfer.setData("text/plain", paths.join("\n"));
    e.dataTransfer.effectAllowed = "copyMove";
    setTimeout(() => $$(".dicon.sel", icons).forEach(x => x.classList.add("dragging")));
  });
  icons.addEventListener("dragend", () => { $$(".dicon.dragging", icons).forEach(x => x.classList.remove("dragging")); dragKey = null; });
  let hint = null, depth = 0;
  const clearHint = () => { hint?.remove(); hint = null; depth = 0; };
  desk.addEventListener("dragenter", e => { if (e.dataTransfer.types.includes("Files") && !e.target.closest(".win")) { depth++; if (!hint) { hint = h("div", { class: "drop-hint" }, "Drop to copy to the desktop"); desk.append(hint); } } });
  desk.addEventListener("dragleave", e => { if (hint && --depth <= 0) clearHint(); });
  icons.addEventListener("dragover", e => {
    const t = e.dataTransfer.types; if (!t.includes(DND) && !t.includes("Files")) return;
    e.preventDefault(); e.dataTransfer.dropEffect = e.ctrlKey ? "copy" : "move";
    $$(".dicon.drop", icons).forEach(x => x.classList.remove("drop", "sel"));
    const tgt = e.target.closest(".dicon"); const it = tgt && items.find(i => i.key === tgt.dataset.key);
    if (it?.dropDir && !sel.has(it.key)) tgt.classList.add("drop", "sel");
  });
  icons.addEventListener("drop", async e => {
    e.preventDefault(); clearHint();
    const r = icons.getBoundingClientRect(), [cw, ch] = SIZES[settings.get("iconSize")] || SIZES.medium;
    const cell = [Math.max(0, Math.floor((e.clientX - r.left - 4) / cw)), Math.max(0, Math.floor((e.clientY - r.top - 4) / ch))];
    const tgt = e.target.closest(".dicon"), it = tgt && items.find(i => i.key === tgt.dataset.key);
    if (e.dataTransfer.files?.length && !e.dataTransfer.types.includes(DND)) {
      const before = new Set(fs.ls(fs.DESKTOP).map(n => n.path));
      const n = await importFiles(e.dataTransfer.files, it?.dropDir || fs.DESKTOP);
      if (n && !it?.dropDir) { const nw = fs.ls(fs.DESKTOP).find(x => !before.has(x.path)); if (nw) setPos(nw.path.toLowerCase(), cell); renderIcons(); }
      if (n) notify({ title: `Copied ${n} item${n > 1 ? "s" : ""} to the desktop`, app: "explorer", silent: true });
      return;
    }
    let data; try { data = JSON.parse(e.dataTransfer.getData(DND)); } catch { return; }
    if (it?.dropDir && !(data.keys || []).includes(it.key)) { await fileops.drop(data.paths, it.dropDir, { copy: e.ctrlKey }); return; }
    if (data.src === "desktop") {
      const base = cells[dragKey]; if (!base) return;
      const moved = (data.keys || []).map(k => [k, cells[k]]).filter(x => x[1]);
      const pos = store.get("deskpos", {});
      moved.forEach(([k]) => delete pos[k]);
      const taken = new Set(Object.entries(cells).filter(([k]) => !data.keys.includes(k)).map(([, c]) => c.join(",")));
      const { rows, cols } = grid();
      moved.forEach(([k, c]) => {
        const n = [clamp(cell[0] + c[0] - base[0], 0, cols - 1), clamp(cell[1] + c[1] - base[1], 0, rows - 1)];
        if (!taken.has(n.join(","))) { pos[k] = n; taken.add(n.join(",")); }
      });
      store.set("deskpos", pos); layoutIcons();
    } else {
      const before = data.paths.length;
      await fileops.drop(data.paths, fs.DESKTOP, { copy: e.ctrlKey });
      const first = fs.ls(fs.DESKTOP).find(n => n.name === fs.baseName(data.paths[0]));
      if (first && before) { setPos(first.path.toLowerCase(), cell); layoutIcons(); }
    }
  });
  renderIcons();
}
function setPos(k, cell) { const pos = store.get("deskpos", {}); pos[k] = cell; store.set("deskpos", pos); }
function grid() {
  const [cw, ch] = SIZES[settings.get("iconSize")] || SIZES.medium;
  return { cw, ch, rows: Math.max(1, Math.floor((icons.clientHeight - 8) / ch)), cols: Math.max(1, Math.floor((icons.clientWidth - 8) / cw)) };
}
function renderIcons() {
  const sz = settings.get("iconSize") || "medium", is = (SIZES[sz] || SIZES.medium)[2];
  icons.className = "icons sz-" + sz + (settings.get("showIcons") ? "" : " hide-icons");
  items = [
    { key: "sys:pc", label: "This PC", icon: pcIcon(is), open: () => launch("explorer", { path: "pc" }), dropDir: null, sys: true },
    { key: "sys:bin", label: "Recycle Bin", icon: binIcon(is), open: () => launch("explorer", { path: fs.TRASH }), dropDir: fs.TRASH, sys: true },
    ...fs.ls(fs.DESKTOP).map(n => ({ key: n.path.toLowerCase(), node: n, label: fs.displayName(n), icon: fileIcon(n, is), open: () => openPath(n.path), dropDir: n.type === "dir" ? n.path : null }))
  ];
  const keep = new Set(items.map(deskKey));
  $$(".dicon", icons).forEach(el => { if (!keep.has(el.dataset.key)) el.remove(); });
  [...sel].forEach(k => { if (!keep.has(k)) sel.delete(k); });
  items.forEach(it => {
    let el = icons.querySelector(`.dicon[data-key="${CSS.escape(it.key)}"]`);
    if (!el) { el = h("button", { class: "dicon", type: "button", "data-key": it.key, draggable: "true", role: "option" }); icons.append(el); }
    el.innerHTML = it.icon + `<span class="lbl">${esc(it.label)}</span>`;
    el.title = it.node ? `${it.label}\n${it.node.type === "dir" ? "File folder" : "Modified: " + new Date(it.node.mtime).toLocaleString()}` : it.label;
    el.setAttribute("aria-label", it.label); el.setAttribute("aria-selected", sel.has(it.key));
    el.classList.toggle("sel", sel.has(it.key));
  });
  layoutIcons();
}
function layoutIcons() {
  if (!icons) return;
  const { cw, ch, rows, cols } = grid(), pos = store.get("deskpos", {}), taken = new Set(); cells = {};
  items.forEach(it => { const p = pos[it.key]; if (p && p[0] < cols && p[1] < rows && !taken.has(p.join(","))) { cells[it.key] = p; taken.add(p.join(",")); } });
  let c = 0, r = 0;
  items.forEach(it => {
    if (cells[it.key]) return;
    while (taken.has(c + "," + r)) { r++; if (r >= rows) { r = 0; c++; } }
    cells[it.key] = [c, r]; taken.add(c + "," + r);
  });
  items.forEach(it => { const el = icons.querySelector(`.dicon[data-key="${CSS.escape(it.key)}"]`); if (!el) return; const [x, y] = cells[it.key]; el.style.left = 4 + x * cw + "px"; el.style.top = 4 + y * ch + "px"; });
}
function selectOnly(k) { sel.clear(); if (k) sel.add(k); syncSel(); }
function syncSel() { $$(".dicon", icons).forEach(el => { const on = sel.has(el.dataset.key); el.classList.toggle("sel", on); el.setAttribute("aria-selected", on); }); }
function openItem(k) { const it = items.find(i => i.key === k); it?.open(); }
function onDeskDown(e) {
  closeFly();
  const el = e.target.closest(".dicon");
  if (el) {
    if (e.target.closest(".ren")) return;
    const k = el.dataset.key;
    if (e.ctrlKey || e.metaKey) { sel.has(k) ? sel.delete(k) : sel.add(k); syncSel(); }
    else if (!sel.has(k) || e.button === 0) { if (!sel.has(k)) selectOnly(k); }
    return;
  }
  if (e.target !== icons || e.button !== 0) { if (e.target === icons) selectOnly(null); return; }
  icons.focus({ preventScroll: true });
  if (!(e.ctrlKey || e.metaKey)) selectOnly(null);
  const r = icons.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top, base = new Set(sel);
  const box = h("div", { class: "marquee" }); let shown = false;
  try { icons.setPointerCapture(e.pointerId); } catch {}
  const move = ev => {
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const L = Math.min(sx, x), T = Math.min(sy, y), W = Math.abs(x - sx), H = Math.abs(y - sy);
    if (!shown) { if (W + H < 5) return; shown = true; icons.append(box); }
    Object.assign(box.style, { left: L + "px", top: T + "px", width: W + "px", height: H + "px" });
    sel.clear(); base.forEach(k => sel.add(k));
    $$(".dicon", icons).forEach(el => { const ex = el.offsetLeft, ey = el.offsetTop; if (ex < L + W && ex + el.offsetWidth > L && ey < T + H && ey + el.offsetHeight > T) sel.add(el.dataset.key); });
    syncSel();
  };
  const up = () => { icons.removeEventListener("pointermove", move); icons.removeEventListener("pointerup", up); icons.removeEventListener("pointercancel", up); box.remove(); };
  icons.addEventListener("pointermove", move); icons.addEventListener("pointerup", up); icons.addEventListener("pointercancel", up);
}
const selPaths = () => [...sel].map(k => items.find(i => i.key === k)?.node?.path).filter(Boolean);
function onDeskKey(e) {
  if (e.target.closest(".ren")) return;
  const paths = selPaths();
  if (e.key === "Enter") { [...sel].forEach(openItem); }
  else if (e.key === "Delete") { fileops.remove(paths, { permanent: e.shiftKey }); }
  else if (e.key === "F2" && paths.length === 1) { e.preventDefault(); rename([...sel][0]); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") { e.preventDefault(); items.forEach(i => sel.add(i.key)); syncSel(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && paths.length) fileops.copy(paths);
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x" && paths.length) fileops.copy(paths, true);
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") fileops.paste(fs.DESKTOP);
}
function rename(k) {
  const it = items.find(i => i.key === k), el = icons.querySelector(`.dicon[data-key="${CSS.escape(k)}"]`);
  if (!it?.node || !el) return;
  const lbl = $(".lbl", el), ta = h("textarea", { class: "ren", rows: "2", spellcheck: "false", "aria-label": "New name" });
  ta.value = it.label; lbl.replaceWith(ta); el.draggable = false;
  ta.focus(); const dot = it.node.type === "file" && fs.extOf(it.node.path) !== "lnk" ? it.label.lastIndexOf(".") : -1; ta.setSelectionRange(0, dot > 0 ? dot : it.label.length);
  let done = false;
  const finish = ok => { if (done) return; done = true; const v = ta.value.replace(/\n/g, "").trim(); el.draggable = true; if (ok && v && v !== it.label) { const np = fileops.rename(it.node.path, v); if (np) { const pos = store.get("deskpos", {}); if (pos[k]) { pos[np.toLowerCase()] = pos[k]; delete pos[k]; store.set("deskpos", pos); } sel.clear(); sel.add(np.toLowerCase()); } } renderIcons(); icons.focus({ preventScroll: true }); };
  ta.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); finish(true); } if (e.key === "Escape") finish(false); });
  ta.addEventListener("blur", () => finish(true));
}
function onDeskMenu(e) {
  e.preventDefault();
  const el = e.target.closest(".dicon"), x = e.clientX, y = e.clientY;
  if (el) {
    const k = el.dataset.key; if (!sel.has(k)) selectOnly(k);
    const it = items.find(i => i.key === k), paths = selPaths();
    if (k === "sys:pc") return menu([{ label: "Open", icon: glyph("folder", "i"), run: it.open }, "-", { label: "Properties", icon: glyph("info"), run: () => launch("settings", { page: "about" }) }], x, y);
    if (k === "sys:bin") return menu([{ label: "Open", icon: glyph("folder"), run: it.open }, { label: "Empty Recycle Bin", icon: glyph("trash"), disabled: !fs.ls(fs.TRASH).length, run: async () => { if (await confirm({ title: "Empty Recycle Bin", text: "Permanently delete everything in the Recycle Bin?", ok: "Yes", cancel: "No" })) fs.emptyTrash(); } }], x, y);
    const n = it.node, file = n.type === "file";
    return menu([
      { label: "Open", icon: glyph(file ? "external" : "folder"), run: () => [...sel].forEach(openItem) },
      file && fs.extOf(n.path) !== "lnk" && { label: "Open with", icon: glyph("apps"), sub: ["notepad", "code", "photos"].map(a => ({ label: APPS[a].name, icon: appIcon(a, 16), run: () => openPath(n.path, { with: a }) })) },
      "-",
      { label: "Cut", icon: glyph("cut"), kbd: "Ctrl+X", run: () => fileops.copy(paths, true) },
      { label: "Copy", icon: glyph("copy"), kbd: "Ctrl+C", run: () => fileops.copy(paths) },
      { label: "Rename", icon: glyph("pencil"), kbd: "F2", disabled: paths.length !== 1, run: () => rename(k) },
      { label: "Delete", icon: glyph("trash"), kbd: "Del", run: () => fileops.remove(paths) },
      "-",
      file && { label: "Download", icon: glyph("download"), run: () => paths.forEach(download) },
      { label: "Properties", icon: glyph("info"), run: () => properties(n.path) }
    ], x, y);
  }
  selectOnly(null);
  const sz = settings.get("iconSize");
  const newAt = kind => { const p = fileops.newItem(fs.DESKTOP, kind); if (!p) return; const r = icons.getBoundingClientRect(), { cw, ch } = grid(); setPos(p.toLowerCase(), [Math.floor((x - r.left) / cw), Math.floor((y - r.top) / ch)]); renderIcons(); sel.add(p.toLowerCase()); syncSel(); setTimeout(() => rename(p.toLowerCase()), 30); };
  menu([
    { label: "View", icon: glyph("grid"), sub: [
      { label: "Large icons", checked: sz === "large", run: () => settings.set("iconSize", "large") },
      { label: "Medium icons", checked: sz === "medium", run: () => settings.set("iconSize", "medium") },
      { label: "Small icons", checked: sz === "small", run: () => settings.set("iconSize", "small") }, "-",
      { label: "Show desktop icons", checked: settings.get("showIcons"), run: () => settings.set("showIcons", !settings.get("showIcons")) }] },
    { label: "Sort by", icon: glyph("sort"), sub: [["Name", (a, b) => a.label.localeCompare(b.label)], ["Item type", (a, b) => fs.extOf(a.node.path).localeCompare(fs.extOf(b.node.path))], ["Date modified", (a, b) => b.node.mtime - a.node.mtime]]
      .map(([l, f]) => ({ label: l, run: () => { store.set("deskpos", {}); const sys = items.filter(i => i.sys), rest = items.filter(i => !i.sys).sort(f); items = [...sys, ...rest]; layoutIcons(); } })) },
    { label: "Refresh", icon: glyph("refresh"), run: () => { $$(".dicon", icons).forEach(x => x.remove()); setTimeout(renderIcons, 80); } },
    "-",
    { label: "Paste", icon: glyph("paste"), kbd: "Ctrl+V", disabled: !fileops.canPaste(), run: () => fileops.paste(fs.DESKTOP) },
    { label: "New", icon: glyph("plus"), sub: [
      { label: "Folder", icon: glyph("folder"), run: () => newAt("folder") },
      { label: "Text Document", icon: glyph("doc"), run: () => newAt("text") },
      { label: "PowerShell Script", icon: glyph("terminal"), run: () => newAt("ps1") }] },
    "-",
    { label: "Open in Terminal", icon: glyph("terminal"), run: () => launch("terminal", { cwd: fs.DESKTOP }) },
    { label: "Display settings", icon: glyph("monitor"), run: () => launch("settings", { page: "system" }) },
    { label: "Personalize", icon: glyph("palette"), run: () => launch("settings", { page: "personalization" }) }
  ], x, y);
}

/* ═════════════ taskbar ═════════════ */
function initTaskbar() {
  bus.on("wm", renderTaskbar);
  bus.on("app-loading", ({ id, on }) => { d.body.style.cursor = on ? "progress" : ""; tbApps.querySelector(`[data-app="${id}"]`)?.classList.toggle("loading", on); });
  tbApps.addEventListener("click", e => {
    const b = e.target.closest(".tbb.app"); if (!b) return; closeFly();
    const id = b.dataset.app, ws = wm.byApp(id);
    if (!ws.length) return launch(id);
    if (ws.length === 1) { const w = ws[0]; if (wm.active === w && !w.minimized) w.minimize(); else { w.restore(); w.focus(); } return; }
    const r = b.getBoundingClientRect();
    menu(ws.map(w => ({ label: w.title, icon: appIcon(id, 16), run: () => { w.restore(); w.focus(); } })), r.left, r.top);
  });
  tbApps.addEventListener("contextmenu", e => {
    const b = e.target.closest(".tbb.app"); if (!b) return; e.preventDefault(); e.stopPropagation();
    const id = b.dataset.app, ws = wm.byApp(id), pinned = settings.get("pinned"), isPin = pinned.includes(id), r = b.getBoundingClientRect();
    menu([...ws.map(w => ({ label: w.title, icon: appIcon(id, 16), run: () => { w.restore(); w.focus(); } })), ws.length && "-",
      { label: APPS[id].name, icon: appIcon(id, 16), run: () => launch(id) },
      { label: isPin ? "Unpin from taskbar" : "Pin to taskbar", icon: glyph("pin"), run: () => settings.set("pinned", isPin ? pinned.filter(x => x !== id) : [...pinned, id]) },
      ws.length && { label: ws.length > 1 ? "Close all windows" : "Close window", icon: '<svg class="i xs"><use href="#c-x"/></svg>', run: () => ws.forEach(w => w.close()) }], r.left, r.top);
  });
  $("#taskbar").addEventListener("contextmenu", e => {
    if (e.defaultPrevented) return; e.preventDefault();
    if (e.target.closest("#tb-start")) return winX(e.clientX, e.clientY);
    menu([{ label: "Task Manager", icon: appIcon("taskmgr", 16), run: () => launch("taskmgr") }, "-", { label: "Taskbar settings", icon: glyph("gear"), run: () => launch("settings", { page: "personalization" }) }], e.clientX, e.clientY);
  });
  let shown = null;
  $("#tb-show").addEventListener("click", () => {
    if (shown && shown.some(w => w.minimized && !w.closed)) { shown.forEach(w => !w.closed && w.restore()); shown = null; }
    else shown = wm.minimizeAll();
  });
  $("#tb-start").addEventListener("click", () => openFly("start", $("#tb-start")));
  $("#tb-search").addEventListener("click", () => openFly("start", $("#tb-search")));
  $("#tb-qs").addEventListener("click", () => openFly("qs", $("#tb-qs")));
  $("#tb-clock").addEventListener("click", () => openFly("nc", $("#tb-clock")));
  $("#tb-widgets").addEventListener("click", () => openFly("widgets", $("#tb-widgets")));
  d.addEventListener("pointerdown", e => { if (flyOpen && !flyOpen.contains(e.target) && !e.target.closest("#tb-start,#tb-search,#tb-qs,#tb-clock,#tb-widgets,.menu")) closeFly(); }, true);
  tbPrefs(); renderTaskbar();
}
function tbPrefs() { $("#tb-widgets").hidden = !settings.get("tbWidgets"); $("#tb-search").hidden = !settings.get("tbSearch"); }
function renderTaskbar() {
  if (!tbApps) return;
  const pinned = settings.get("pinned").filter(id => APPS[id]);
  const running = [...new Set(wm.list().filter(w => !w.owner && w.o.taskbar !== false && APPS[w.app]).map(w => w.app))];
  const ids = [...pinned, ...running.filter(a => !pinned.includes(a))];
  const act = wm.active && (wm.active.owner?.app || wm.active.app);
  tbApps.innerHTML = ids.map(id => {
    const ws = wm.byApp(id), name = ws.length === 1 ? ws[0].title : APPS[id].name;
    const cls = "tbb app" + (ws.length ? " running" : "") + (act === id && !wm.active?.minimized ? " active" : "");
    return `<button class="${cls}" type="button" data-app="${id}" aria-label="${esc(name)}${ws.length ? " — running" : ""}" data-tip="${esc(name)}">${appIcon(id, 24)}</button>`;
  }).join("");
}
function buttonRect(app) { const b = tbApps?.querySelector(`[data-app="${app}"]`); return b ? b.getBoundingClientRect() : null; }
function winX(x, y) {
  menu([
    { label: "Task Manager", icon: appIcon("taskmgr", 16), run: () => launch("taskmgr") },
    { label: "Settings", icon: appIcon("settings", 16), run: () => launch("settings") },
    { label: "File Explorer", icon: appIcon("explorer", 16), run: () => launch("explorer") },
    { label: "Terminal", icon: appIcon("terminal", 16), run: () => launch("terminal") },
    { label: "Search", icon: glyph("search"), run: () => openFly("start", $("#tb-search")) },
    "-",
    { label: "Shut down or sign out", icon: glyph("power"), sub: powerItems() },
    { label: "Desktop", icon: glyph("desktop"), run: () => wm.minimizeAll() }
  ], x, y);
}
const powerItems = () => [
  { label: "Lock", icon: glyph("lock"), run: lock },
  { label: "Sleep", icon: glyph("moon"), run: lock },
  { label: "Shut down", icon: glyph("power"), run: shutdown },
  { label: "Restart", icon: glyph("refresh"), run: restart }
];

/* ═════════════ flyouts ═════════════ */
function openFly(name, btn) {
  const p = $("#" + name); if (flyOpen === p) { closeFly(); return; }
  closeFly(); flyOpen = p; flyBtn = btn;
  $$("#toasts .toast").forEach(t => t.remove());   // like Windows: an open panel takes over from pop-ups
  if (name === "start") renderStart(btn?.id === "tb-search");
  if (name === "qs") renderQS();
  if (name === "nc") { unread = 0; badge(); renderNC(); renderCal(); }
  if (name === "widgets") renderWidgets();
  p.classList.add("open"); btn?.classList.add("open"); btn?.setAttribute("aria-expanded", "true");
}
function closeFly() {
  if (!flyOpen) return;
  flyOpen.classList.remove("open"); flyBtn?.classList.remove("open"); flyBtn?.setAttribute("aria-expanded", "false");
  flyOpen = flyBtn = null;
}

/* ───────── Start ───────── */
let stView = "home";
function initStart() {
  const s = $("#start");
  s.innerHTML = `<div class="st-search">${glyph("search")}<input class="field" id="st-q" type="search" placeholder="Search apps, settings and files" aria-label="Search" autocomplete="off" spellcheck="false" /></div>
    <div class="st-body" id="st-body"></div>
    <div class="st-foot"><button class="st-user" type="button" id="st-user"><span class="av">${glyph("user")}</span>Guest</button>
    <button class="ibtn" type="button" id="st-power" aria-label="Power" data-tip="Power">${glyph("power")}</button></div>`;
  const q = $("#st-q");
  q.addEventListener("input", () => renderStartBody());
  q.addEventListener("keydown", e => {
    if (e.key === "Enter") { const f = $("#st-body .res"); if (f) { e.preventDefault(); f.click(); } }
    if (e.key === "ArrowDown") { const r = $$("#st-body .res, #st-body .pin, #st-body .rec")[0]; if (r) { e.preventDefault(); r.focus(); } }
  });
  $("#st-body").addEventListener("keydown", e => {
    const list = $$("#st-body .res, #st-body .pin, #st-body .rec"), i = list.indexOf(d.activeElement); if (i < 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); (list[i + 1] || list[i]).focus(); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); i ? list[i - 1].focus() : q.focus(); }
  });
  $("#st-power").addEventListener("click", e => { const r = e.currentTarget.getBoundingClientRect(); menu(powerItems(), r.left - 120, r.top); });
  $("#st-user").addEventListener("click", e => { const r = e.currentTarget.getBoundingClientRect(); menu([{ label: "Change account settings", icon: glyph("user"), run: () => { closeFly(); launch("settings", { page: "accounts" }); } }, { label: "Lock", icon: glyph("lock"), run: () => { closeFly(); lock(); } }], r.left, r.top); });
  s.addEventListener("click", e => {
    const a = e.target.closest("[data-launch],[data-open],[data-view],[data-act]"); if (!a) return;
    if (a.dataset.view) { stView = a.dataset.view; renderStartBody(); return; }
    closeFly();
    if (a.dataset.launch) launch(a.dataset.launch, a.dataset.args ? JSON.parse(a.dataset.args) : {});
    if (a.dataset.open) openPath(a.dataset.open);
    if (a.dataset.act) SEARCH_ACTS[a.dataset.act]?.(a.dataset.q);
  });
  s.addEventListener("contextmenu", e => {
    const p = e.target.closest("[data-launch]"); if (!p) return; e.preventDefault();
    const id = p.dataset.launch, pinned = settings.get("pinned"), on = pinned.includes(id);
    menu([{ label: "Open", icon: appIcon(id, 16), run: () => { closeFly(); launch(id); } }, { label: on ? "Unpin from taskbar" : "Pin to taskbar", icon: glyph("pin"), run: () => settings.set("pinned", on ? pinned.filter(x => x !== id) : [...pinned, id]) }], e.clientX, e.clientY);
  });
}
function renderStart(focusSearch) {
  stView = "home"; $("#st-q").value = ""; renderStartBody();
  setTimeout(() => { if (focusSearch || matchMedia("(pointer:fine)").matches) $("#st-q").focus({ preventScroll: true }); }, 60);
}
const pinHTML = id => `<button class="pin" type="button" data-launch="${id}">${appIcon(id, 32)}<span>${esc(APPS[id].short || APPS[id].name)}</span></button>`;
function ago(t) { const s = (Date.now() - t) / 1000; return s < 60 ? "Just now" : s < 3600 ? Math.floor(s / 60) + "m ago" : s < 86400 ? Math.floor(s / 3600) + "h ago" : new Date(t).toLocaleDateString(); }
function renderStartBody() {
  const body = $("#st-body"), q = $("#st-q").value.trim();
  if (q) { body.innerHTML = searchHTML(q); return; }
  if (stView === "all") {
    const ids = Object.keys(APPS).sort((a, b) => APPS[a].name.localeCompare(APPS[b].name)); let L = "";
    body.innerHTML = `<div class="st-h"><span>All apps</span><button class="btn" type="button" data-view="home">${glyph("chev-l")}Back</button></div><div class="allapps">` +
      ids.map(id => { const l = APPS[id].name[0].toUpperCase(), hd = l !== L ? `<div class="letter">${(L = l)}</div>` : ""; return hd + `<button class="res" type="button" data-launch="${id}">${appIcon(id, 28)}<span><b>${esc(APPS[id].name)}</b></span></button>`; }).join("") + "</div>";
    return;
  }
  const rec = settings.get("showRecent") ? recent().slice(0, 6) : [];
  const recs = rec.map(p => { const n = fs.stat(p); return `<button class="rec" type="button" data-open="${esc(p)}">${fileIcon(n, 32, { thumb: false })}<span><b>${esc(fs.displayName(n))}</b><small>${ago(n.mtime)}</small></span></button>`; });
  const sugg = [["mail", "Book a free 30-min chat", "Talk it through with Devik"], ["health", "Run the IT health check", "8 questions · about a minute"], ["services", "See what Riva looks after", "Microsoft 365, Azure, migrations…"], ["terminal", "Try the PowerShell terminal", "Type help to start"]];
  while (recs.length < 4 && sugg.length) { const [id, t, s] = sugg.shift(); recs.push(`<button class="rec" type="button" data-launch="${id}">${appIcon(id, 32)}<span><b>${esc(t)}</b><small>${esc(s)}</small></span></button>`); }
  body.innerHTML = `<div class="st-h"><span>Pinned</span><button class="btn" type="button" data-view="all">All apps${glyph("chev-r")}</button></div>
    <div class="pins">${START_PINS.map(pinHTML).join("")}</div>
    <div class="st-h" style="margin-top:22px"><span>Recommended</span></div><div class="recs">${recs.join("")}</div>`;
}
const SEARCH_ACTS = {
  ask: q => launch("mail", { subject: q, focus: "msg" }),
  web: q => window.open("https://duckduckgo.com/?q=" + encodeURIComponent(q), "_blank", "noopener"),
  theme: () => settings.set("theme", settings.theme() === "dark" ? "light" : "dark"),
  motion: () => settings.set("motion", d.documentElement.classList.contains("rm") ? "full" : "reduce"),
  night: () => settings.set("nightlight", !settings.get("nightlight")),
  lock: () => lock(), restart: () => restart(), shutdown: () => shutdown(),
  copy: () => copyText(EMAIL).then(ok => notify({ title: ok ? "Email copied" : "Devik's email", body: EMAIL, silent: true }))
};
const SETTINGS_INDEX = [
  ["Dark mode", "Switch light / dark", "moon", "act:theme", "dark light theme mode night"],
  ["Night light", "Warmer colours", "nightlight", "act:night", "night light warm blue filter"],
  ["Reduce motion", "Accessibility", "motion", "act:motion", "motion animation reduce accessibility"],
  ["Change the wallpaper", "Personalization", "image", "settings:personalization", "wallpaper background desktop picture personalize"],
  ["Accent colour", "Personalization", "palette", "settings:personalization", "accent color colour"],
  ["About this PC", "System", "info", "settings:about", "about pc system device specs version cloudflare edge"],
  ["Storage & reset", "Privacy & storage", "disk", "settings:privacy", "storage reset clear data privacy"],
  ["Copy Devik's email", "rivacomputech@gmail.com", "copy", "act:copy", "email copy address"],
  ["Lock", "Power", "lock", "act:lock", "lock sleep screen"],
  ["Restart", "Power", "refresh", "act:restart", "restart reboot reload"],
  ["Shut down", "Power", "power", "act:shutdown", "shut down off power"]
];
function searchHTML(q) {
  const words = q.toLowerCase().split(/\s+/), hit = hay => words.every(w => hay.toLowerCase().includes(w));
  const rows = [];
  Object.entries(APPS).forEach(([id, a]) => { if (hit(a.name + " " + (a.keys || "") + " " + (a.desc || ""))) rows.push(`<button class="res" type="button" data-launch="${id}">${appIcon(id, 32)}<span><b>${esc(a.name)}</b><small>App · ${esc(a.desc || "")}</small></span></button>`); });
  SERVICES.forEach(s => { if (hit(s.name + " " + s.keys + " " + s.ticks.join(" "))) rows.push(`<button class="res" type="button" data-launch="services" data-args='${esc(JSON.stringify({ focus: s.id }))}'><span class="app-ico" style="--s:32px;--g1:${s.g[0]};--g2:${s.g[1]}">${glyph(s.glyph)}</span><span><b>${esc(s.name)}</b><small>Riva service · ${esc(s.blurb)}</small></span></button>`); });
  SETTINGS_INDEX.forEach(([t, sub, g, act, keys]) => { if (!hit(t + " " + keys)) return; const [k, v] = act.split(":"); rows.push(`<button class="res" type="button" ${k === "act" ? `data-act="${v}"` : `data-launch="settings" data-args='${esc(JSON.stringify({ page: v }))}'`}><span class="app-ico" style="--s:32px;--g1:#97a1b1;--g2:#525d6d">${glyph(g)}</span><span><b>${esc(t)}</b><small>Settings · ${esc(sub)}</small></span></button>`); });
  fs.find(q, { limit: 8 }).forEach(n => rows.push(`<button class="res" type="button" data-open="${esc(n.path)}">${fileIcon(n, 32, { thumb: false })}<span><b>${esc(fs.displayName(n))}</b><small>${esc(n.path)}</small></span></button>`));
  const head = `<div class="st-h"><span>${rows.length ? "Best matches" : "No exact match"}</span></div>`;
  return head + rows.slice(0, 10).join("") +
    `<div class="st-h" style="margin-top:14px"><span>More</span></div>
     <button class="res res-ask" type="button" data-act="ask" data-q="${esc(q)}"><span class="app-ico" style="--s:32px">${glyph("chat")}</span><span><b>Ask Devik about “${esc(q)}”</b><small>Starts a message with this as the subject</small></span></button>
     <button class="res" type="button" data-act="web" data-q="${esc(q)}"><span class="app-ico" style="--s:32px;--g1:#33cbd5;--g2:#0a6fc2">${glyph("search")}</span><span><b>Search the web for “${esc(q)}”</b><small>Opens in a new browser tab</small></span></button>`;
}

/* ───────── Quick settings ───────── */
let battery = null;
function initQS() {
  navigator.getBattery?.().then(b => { battery = b; const u = () => { if (flyOpen?.id === "qs") renderQS(); $("#tb-qs").dataset.tip = `Battery: ${Math.round(b.level * 100)}%${b.charging ? " (charging)" : ""}`; }; b.addEventListener("levelchange", u); b.addEventListener("chargingchange", u); u(); }).catch(() => {});
  $("#qs").addEventListener("click", e => {
    const t = e.target.closest("[data-qs]"); if (!t) return; const k = t.dataset.qs;
    if (k === "wifi") notify({ title: navigator.onLine ? "You're online" : "You're offline", body: navigator.onLine ? "" : "Sending messages needs a connection.", app: "settings", silent: true });
    if (k === "theme") SEARCH_ACTS.theme();
    if (k === "night") SEARCH_ACTS.night();
    if (k === "dnd") settings.set("dnd", !settings.get("dnd"));
    if (k === "motion") SEARCH_ACTS.motion();
    if (k === "transp") settings.set("transparency", !settings.get("transparency"));
    if (k === "settings") { closeFly(); launch("settings"); return; }
    renderQS();
  });
  $("#qs").addEventListener("input", e => {
    const s = e.target.closest("input[type=range]"); if (!s) return;
    s.style.setProperty("--p", s.value + "%"); settings.set(s.dataset.k, +s.value);
  });
  $("#qs").addEventListener("change", e => { if (e.target.dataset?.k === "volume") sound("note"); });
}
function renderQS() {
  const on = (k, v) => `aria-pressed="${v}"`;
  const tile = (k, g, l, v) => `<button class="qs-t" type="button" data-qs="${k}" ${on(k, v)}><span class="qs-b">${glyph(g)}</span><span class="l">${l}</span></button>`;
  const bat = battery ? `${glyph("battery")} ${Math.round(battery.level * 100)}%${battery.charging ? " · charging" : ""}` : `${glyph("bolt")} Plugged in`;
  $("#qs").innerHTML = `<div class="qs-grid">
      ${tile("wifi", "wifi", navigator.onLine ? "Online" : "Offline", navigator.onLine)}
      ${tile("theme", "moon", "Dark mode", settings.theme() === "dark")}
      ${tile("night", "nightlight", "Night light", !!settings.get("nightlight"))}
      ${tile("dnd", "bell-off", "Do not disturb", !!settings.get("dnd"))}
      ${tile("motion", "motion", "Reduce motion", d.documentElement.classList.contains("rm"))}
      ${tile("transp", "layers", "Transparency", !!settings.get("transparency"))}
    </div>
    <div class="qs-sl">${glyph("sun")}<input class="slider" type="range" min="30" max="100" value="${settings.get("brightness")}" data-k="brightness" aria-label="Brightness" style="--p:${(settings.get("brightness") - 30) / .7}%"></div>
    <div class="qs-sl">${glyph("volume")}<input class="slider" type="range" min="0" max="100" value="${settings.get("volume")}" data-k="volume" aria-label="Volume" style="--p:${settings.get("volume")}%"></div>
    <div class="qs-foot"><span>${bat}</span><button class="ibtn" type="button" data-qs="settings" aria-label="All settings" data-tip="All settings">${glyph("gear")}</button></div>`;
  const b = $('#qs input[data-k="brightness"]'); b.addEventListener("input", () => b.style.setProperty("--p", (b.value - 30) / .7 + "%"));
}

/* ───────── notifications + calendar ───────── */
const notes = []; let unread = 0, calOff = 0;
function badge() { const b = $("#nc-badge"); b.hidden = !unread; b.textContent = unread > 9 ? "9+" : unread; }
function notify({ title, body = "", app = "system", actions = [], silent = false, timeout = 6500 }) {
  const n = { id: uid(), title, body, app, actions, time: Date.now() };
  notes.unshift(n); if (notes.length > 30) notes.pop();
  if (flyOpen?.id !== "nc") { unread++; badge(); } else renderNC();
  if (!settings.get("dnd")) { toast(n, timeout); if (!silent) sound("note"); }
  return n;
}
const appName = id => APPS[id]?.name || (id === "system" ? "rivaOS" : id);
function noteHTML(n, cls) {
  return `<div class="${cls}" data-note="${n.id}" role="status"><div class="note-app">${appIcon(n.app, 16)}<span>${esc(appName(n.app))}</span></div><b>${esc(n.title)}</b>${n.body ? `<p>${esc(n.body)}</p>` : ""}
    ${n.actions.length ? `<div class="note-acts">${n.actions.map((a, i) => `<button class="btn" type="button" data-act-i="${i}">${esc(a.label)}</button>`).join("")}</div>` : ""}
    <button class="ibtn x" type="button" aria-label="Dismiss"><svg class="i xs"><use href="#c-x"/></svg></button></div>`;
}
function toast(n, timeout) {
  const box = $("#toasts"); box.insertAdjacentHTML("beforeend", noteHTML(n, "toast")); const t = box.lastElementChild;
  void t.offsetWidth; t.classList.add("in");
  const kill = () => { if (!t.isConnected) return; t.classList.add("out"); setTimeout(() => t.remove(), 300); };
  t.addEventListener("click", e => {
    const a = e.target.closest("[data-act-i]"); if (a) { n.actions[+a.dataset.actI].run?.(); kill(); return; }
    if (e.target.closest(".x")) kill();
  });
  let tm = setTimeout(kill, timeout);
  t.addEventListener("pointerenter", () => clearTimeout(tm)); t.addEventListener("pointerleave", () => { tm = setTimeout(kill, 2500); });
}
function initNC() {
  $("#nc").innerHTML = `<section class="nc-list"><div class="nc-h"><span>Notifications</span><button class="btn subtle" type="button" id="nc-clear" style="min-height:26px;font-size:12px">Clear all</button></div><div class="nc-items" id="nc-items"></div></section>
    <section><div class="cal-sec-h"><span id="cal-today"></span></div><div class="cal-m"><b id="cal-month"></b><span><button class="ibtn" type="button" id="cal-prev" aria-label="Previous month">${glyph("chev-u")}</button><button class="ibtn" type="button" id="cal-next" aria-label="Next month">${glyph("chev-d")}</button></span></div><div class="cal-grid" id="cal-grid"></div></section>`;
  $("#nc-clear").addEventListener("click", () => { notes.length = 0; renderNC(); });
  $("#cal-prev").addEventListener("click", () => { calOff--; renderCal(); });
  $("#cal-next").addEventListener("click", () => { calOff++; renderCal(); });
  $("#nc-items").addEventListener("click", e => {
    const el = e.target.closest("[data-note]"); if (!el) return; const i = notes.findIndex(n => n.id === el.dataset.note); if (i < 0) return;
    const a = e.target.closest("[data-act-i]"); if (a) { notes[i].actions[+a.dataset.actI].run?.(); closeFly(); }
    if (e.target.closest(".x") || a) { notes.splice(i, 1); renderNC(); }
  });
}
function renderNC() {
  const box = $("#nc-items"); if (!box) return;
  $("#nc-clear").hidden = !notes.length;
  box.innerHTML = notes.length ? notes.map(n => noteHTML(n, "note")).join("") : `<div class="nc-empty">No new notifications</div>`;
}
function renderCal() {
  const now = new Date(), base = new Date(now.getFullYear(), now.getMonth() + calOff, 1), y = base.getFullYear(), m = base.getMonth();
  const first = base.getDay(), days = new Date(y, m + 1, 0).getDate(), prev = new Date(y, m, 0).getDate();
  $("#cal-today").textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  $("#cal-month").textContent = base.toLocaleDateString([], { month: "long", year: "numeric" });
  let html = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(x => `<span class="dow">${x}</span>`).join("");
  for (let i = first; i > 0; i--) html += `<span class="mute">${prev - i + 1}</span>`;
  for (let i = 1; i <= days; i++) html += `<span${!calOff && i === now.getDate() ? ' class="now" aria-current="date"' : ""}>${i}</span>`;
  for (let i = 1; i <= (7 - (first + days) % 7) % 7; i++) html += `<span class="mute">${i}</span>`;
  $("#cal-grid").innerHTML = html;
}

/* ───────── widgets ───────── */
const WX = c => c === 0 ? ["sun", "Clear"] : c <= 2 ? ["weather", "Partly cloudy"] : c === 3 ? ["cloud", "Cloudy"] : c <= 48 ? ["fog", "Fog"] : c <= 67 || (c >= 80 && c <= 82) ? ["rain", c <= 57 ? "Drizzle" : "Rain"] : c <= 77 || c === 85 || c === 86 ? ["snow", "Snow"] : c >= 95 ? ["storm", "Thunderstorms"] : ["weather", "—"];
let wx = null, wxAt = 0;
const TIPS = [
  "Drag a window to a screen corner to snap it into a quarter.",
  "Hover a window's maximize button to see snap layouts.",
  "Right-click the Start button for a quick-access menu.",
  "In Terminal, type <span class=\"kbd\">ls</span>, <span class=\"kbd\">cd</span> and <span class=\"kbd\">notepad notes.txt</span>, just like PowerShell.",
  "Drop files onto the desktop to copy them in.",
  "Press <span class=\"kbd\">Ctrl</span> + <span class=\"kbd\">Esc</span> to open Start, <span class=\"kbd\">Ctrl</span> + <span class=\"kbd\">Shift</span> + <span class=\"kbd\">Esc</span> for Task Manager.",
  "Your files stay in this browser."
];
function initWidgets() { loadWeather(); }
async function loadWeather() {
  if (wx && Date.now() - wxAt < 15 * 60e3) return wx;
  try { wx = await api("weather"); wxAt = Date.now(); } catch { wx = null; }
  const b = $("#tb-widgets");
  if (wx?.temp != null) { const [g, l] = WX(wx.code); b.innerHTML = `${glyph(g, "i wi")}<span><b>${Math.round(wx.temp)}°${wx.unit}</b><small>${esc(l)}</small></span>`; b.dataset.tip = `${wx.city || "Local"} weather`; }
  else { b.innerHTML = `${glyph("apps", "i wi")}<span><b>Widgets</b><small>${esc(STATUS)}</small></span>`; b.querySelector(".wi").style.color = "var(--accent)"; }
  return wx;
}
async function renderWidgets() {
  const p = $("#widgets"), n = new Date(), hr = n.getHours();
  const greet = hr < 5 ? "Working late?" : hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  p.innerHTML = `<div class="wg-head"><div><b>${greet}</b><small>${n.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</small></div>
      <button class="ibtn" type="button" aria-label="Close widgets" id="wg-x"><svg class="i xs"><use href="#c-x"/></svg></button></div>
    <div class="wg-grid">
      <div class="wg wg-weather" id="wg-wx"><h4>${glyph("weather")}Weather</h4><div class="spin" style="border-color:rgba(255,255,255,.3);border-top-color:#fff"></div></div>
      <div class="wg wg-riva"><h4>${appIcon("welcome", 16)}Riva Computech</h4><span class="pill"><span class="dot"></span>${esc(STATUS)}</span>
        <p>Senior Microsoft 365, Azure &amp; infrastructure help.</p>
        <div class="btns"><button class="btn accent" type="button" data-w="mail">Book a free chat</button><button class="btn" type="button" data-w="health">Health check</button></div></div>
      <div class="wg wg-edge" id="wg-edge"><h4>${glyph("globe")}Served from the edge</h4><div class="spin"></div></div>
      <div class="wg wg-tip"><h4>${glyph("sparkle")}Tip</h4><p>${TIPS[Math.floor(Math.random() * TIPS.length)]}</p></div>
      <div class="wg wide"><h4>${glyph("briefcase")}Services</h4><div style="display:flex;flex-wrap:wrap;gap:8px">${SERVICES.map(s => `<button class="btn" type="button" data-w="services" data-focus="${s.id}"><span class="app-ico" style="--s:18px;--g1:${s.g[0]};--g2:${s.g[1]}">${glyph(s.glyph)}</span>${esc(s.name)}</button>`).join("")}</div></div>
    </div>`;
  $("#wg-x").addEventListener("click", closeFly);
  p.querySelector(".wg-grid").addEventListener("click", e => { const b = e.target.closest("[data-w]"); if (!b) return; closeFly(); launch(b.dataset.w, b.dataset.focus ? { focus: b.dataset.focus } : {}); });
  const w = await loadWeather(), box = $("#wg-wx");
  if (box) {
    if (w?.temp != null) {
      const [g, l] = WX(w.code);
      box.innerHTML = `<h4>${glyph("weather")}${esc(w.city || "Your area")}</h4><div class="big">${glyph(g)}<b>${Math.round(w.temp)}°${w.unit}</b></div><div class="sub">${esc(l)} · H ${Math.round(w.hi)}° L ${Math.round(w.lo)}°</div>
        <div class="days">${(w.days || []).slice(1, 5).map(x => `<div>${new Date(x.date + "T12:00").toLocaleDateString([], { weekday: "short" })}${glyph(WX(x.code)[0])}${Math.round(x.hi)}°</div>`).join("")}</div><span class="credit">Data: MET Norway</span>`;
    } else box.innerHTML = `<h4>${glyph("weather")}Weather</h4><p style="margin:0;font-size:13px;opacity:.9">Weather isn't available right now.</p>`;
  }
  const eb = $("#wg-edge");
  try {
    const t0 = performance.now(); const s = await system(); await api("ping"); const rtt = Math.round(performance.now() - t0) / 2 | 0;
    if (!s) throw 0;
    if (eb) eb.innerHTML = `<h4>${glyph("globe")}Served from the edge</h4><b>${esc(s.colo || "—")}</b><small>Cloudflare data centre ${s.coloCity ? "near " + esc(s.coloCity) : ""}<br>Round trip ≈ ${rtt} ms · ${esc(s.httpProtocol || "")}</small>`;
  } catch { if (eb) eb.innerHTML = `<h4>${glyph("globe")}Served from the edge</h4><small>Unavailable right now.</small>`; }
}

/* ═════════════ lock, restart, shut down ═════════════ */
function lock() {
  closeFly();
  if ($("#lock")) return;
  const el = h("div", { class: "lock", id: "lock", tabindex: "0", role: "dialog", "aria-label": "Lock screen" });
  el.innerHTML = `<div class="lock-bg"></div><div class="lock-clock"><b id="lk-t"></b><span id="lk-d"></span></div><div class="lock-hint">Click or press any key to sign in</div>
    <div class="lock-sign"><div class="lock-av">${glyph("user")}</div><div class="lock-name">Guest</div><button class="btn lg" type="button" id="lk-in">Sign in</button><small>No password. It's a website.</small></div>`;
  d.body.append(el); $(".lock-bg", el).style.backgroundImage = wall.style.backgroundImage; tick(true);
  const t0 = Date.now();
  const sign = () => { if (Date.now() - t0 < 400) return; if (!el.classList.contains("signin")) { el.classList.add("signin"); setTimeout(() => $("#lk-in")?.focus(), 200); } };
  el.addEventListener("click", e => { if (e.target.closest("#lk-in")) unlock(); else sign(); });
  el.addEventListener("keydown", e => { if (el.classList.contains("signin")) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); unlock(); } } else { e.preventDefault(); sign(); } });
  function unlock() { el.classList.add("up"); sound("chime"); setTimeout(() => el.remove(), reduced() ? 0 : 460); }
  setTimeout(() => el.focus(), 50);
}
async function powerScreen(msg, ms) {
  closeFly();
  const el = h("div", { class: "power-screen", role: "status" }); el.innerHTML = `<div class="boot-spin"><i></i><i></i><i></i><i></i><i></i></div><div class="msg">${msg}</div>`;
  d.body.append(el); await sleep(reduced() ? 400 : ms); return el;
}
async function restart() {
  const open = wm.list().length;
  if (open && !(await confirm({ title: "Restart rivaOS", text: "Open windows will close. Your files are kept.", ok: "Restart" }))) return;
  track("power", { action: "restart" });
  await powerScreen("Restarting", 1600); location.hash = ""; location.reload();
}
async function shutdown() {
  track("power", { action: "shutdown" });
  const el = await powerScreen("Shutting down", 1500);
  wm.list().forEach(w => w.close(true));
  el.innerHTML = `<button class="power-btn" type="button" aria-label="Power on">${glyph("power")}</button><div class="msg">rivaOS is off.</div><small>Riva Computech is still on call: evenings, weekends &amp; holidays.</small>`;
  const b = $(".power-btn", el); b.focus(); b.addEventListener("click", () => { location.hash = ""; location.reload(); });
}

/* ═════════════ keyboard ═════════════ */
function initKeys() {
  let metaAlone = false;
  d.addEventListener("keydown", e => {
    if (e.key === "Meta" || e.key === "OS") { metaAlone = true; return; }
    metaAlone = false;
    if (e.key === "Escape" && flyOpen) { const b = flyBtn; closeFly(); b?.focus(); return; }
    if (e.ctrlKey && e.shiftKey && e.key === "Escape") { e.preventDefault(); launch("taskmgr"); return; }
    if (e.ctrlKey && e.key === "Escape") { e.preventDefault(); openFly("start", $("#tb-start")); return; }
    if (flyOpen?.id === "start" && e.key.length === 1 && !e.ctrlKey && !e.metaKey && d.activeElement !== $("#st-q")) { $("#st-q").focus(); }
  });
  d.addEventListener("keyup", e => { if ((e.key === "Meta" || e.key === "OS") && metaAlone) { metaAlone = false; openFly("start", $("#tb-start")); } });
  addEventListener("blur", () => { metaAlone = false; });
}

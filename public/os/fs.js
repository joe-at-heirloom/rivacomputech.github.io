/* rivaOS · virtual file system.
   A case-insensitive, Windows-style tree (C:\…) held in memory and persisted to IndexedDB, so a
   visitor's files survive reloads. C:\Riva is read-only and rebuilt from content.js on every boot.
   Nothing here ever leaves the browser. */

import { bus, store, uid } from "./core.js";
import { rivaFiles } from "./content.js";
import { WALLPAPERS, wallpaperSVG } from "./wallpapers.js";

export const ROOT = "C:\\";
export const HOME = "C:\\Users\\Guest";
export const DESKTOP = HOME + "\\Desktop";
export const DOCS = HOME + "\\Documents";
export const PICS = HOME + "\\Pictures";
export const DL = HOME + "\\Downloads";
export const TRASH = "C:\\$Recycle.Bin";
export const RIVA = "C:\\Riva";
export const SHORTCUT = "application/x-rivaos-shortcut";
const SYSTEM = [ROOT, "C:\\Users", HOME, DESKTOP, DOCS, PICS, DL, TRASH, RIVA];
const SEED_VERSION = 1;

export class FsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }

const nodes = new Map();          // lower-case path → node
const kids = new Map();           // lower-case dir path → Set(lower-case child paths)
const K = p => p.toLowerCase();
let db = null;

export const parentOf = p => { if (p.length <= 3) return null; const i = p.lastIndexOf("\\"); return i <= 2 ? ROOT : p.slice(0, i); };
export const baseName = p => p.length <= 3 ? "Local Disk (C:)" : p.slice(p.lastIndexOf("\\") + 1);
export const join = (dir, name) => (dir.endsWith("\\") ? dir : dir + "\\") + name;
export const extOf = p => { const n = baseName(p), i = n.lastIndexOf("."); return i > 0 ? n.slice(i + 1).toLowerCase() : ""; };
export const stemOf = n => { const i = n.lastIndexOf("."); return i > 0 ? n.slice(0, i) : n; };
/** What people see: shortcuts hide ".lnk", like Windows. */
export const displayName = node => node.path === ROOT ? "Local Disk (C:)" : (extOf(node.path) === "lnk" ? stemOf(node.name) : node.name);

const MIME = { txt: "text/plain", log: "text/plain", ini: "text/plain", md: "text/markdown", ps1: "text/x-powershell", json: "application/json", csv: "text/csv",
  html: "text/html", htm: "text/html", css: "text/css", js: "text/javascript", xml: "application/xml", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg",
  jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", ico: "image/x-icon", pdf: "application/pdf", lnk: SHORTCUT, url: "text/uri-list", zip: "application/zip" };
export const mimeOf = p => MIME[extOf(p)] || "application/octet-stream";
export const isText = n => !!n && n.type === "file" && (/^text\/|json|xml|svg|uri-list/.test(n.mime || "") || typeof n.data === "string" && !/^image\/(png|jpe?g|gif|webp|bmp)/.test(n.mime || ""));
export const isImage = n => !!n && n.type === "file" && /^image\//.test(n.mime || "");
const enc = new TextEncoder();
const sizeOf = data => data == null ? 0 : typeof data === "string" ? enc.encode(data).length : data.size ?? 0;

/* ───────── paths ───────── */
export function resolve(p, cwd = HOME) {
  p = String(p ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").replace(/\//g, "\\");
  if (!p || p === ".") return cwd;
  if (p === "~" || p.startsWith("~\\")) p = HOME + p.slice(1);
  let abs;
  if (/^[a-z]:/i.test(p)) abs = p[0].toUpperCase() + p.slice(1);
  else if (p.startsWith("\\")) abs = "C:" + p;
  else abs = join(cwd, p);
  const drive = abs.slice(0, 2), parts = [];
  for (const seg of abs.slice(2).split("\\")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop(); else parts.push(seg);
  }
  let cur = drive + "\\";
  for (const seg of parts) { const cand = join(cur, seg); cur = nodes.get(K(cand))?.path || cand; }
  return cur;
}

/* ───────── IndexedDB plumbing ───────── */
function openDB() {
  return new Promise((ok, no) => {
    const r = indexedDB.open("rivaos-fs", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("nodes", { keyPath: "key" });
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  });
}
const tx = (mode, fn) => db && new Promise((ok, no) => { const t = db.transaction("nodes", mode); const res = fn(t.objectStore("nodes")); t.oncomplete = () => ok(res?.result); t.onerror = () => no(t.error); });
function persist(n) { if (!n.ro) tx("readwrite", s => s.put({ ...n, key: K(n.path) }))?.catch(e => { console.warn("rivaOS fs:", e); bus.emit("fs-error", e); }); }
function unpersist(path) { tx("readwrite", s => s.delete(K(path)))?.catch(() => {}); }

/* ───────── in-memory index ───────── */
function index(n) {
  const k = K(n.path); nodes.set(k, n);
  const par = parentOf(n.path);
  if (par) { const pk = K(par); (kids.get(pk) || kids.set(pk, new Set()).get(pk)).add(k); }
}
function unindex(path) {
  const k = K(path); nodes.delete(k); kids.delete(k);
  const par = parentOf(path); if (par) kids.get(K(par))?.delete(k);
}
const emit = (op, path, extra) => bus.emit("fs", { op, path, dir: parentOf(path), ...extra });

/* ───────── queries ───────── */
export const stat = p => nodes.get(K(resolve(p))) || null;
export const exists = p => nodes.has(K(resolve(p)));
export const isDir = p => stat(p)?.type === "dir";
export function ls(p, { hidden = false } = {}) {
  const set = kids.get(K(resolve(p))); if (!set) return [];
  return [...set].map(k => nodes.get(k)).filter(n => n && (hidden || !n.hidden))
    .sort((a, b) => (a.type === b.type ? 0 : a.type === "dir" ? -1 : 1) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}
export function walk(p, fn) { const n = stat(p); if (!n) return; fn(n); if (n.type === "dir") ls(n.path, { hidden: true }).forEach(c => walk(c.path, fn)); }
export function find(q, { limit = 20 } = {}) {
  q = q.toLowerCase(); const out = [];
  for (const n of nodes.values()) {
    if (n.hidden || n.path.toLowerCase().startsWith(TRASH.toLowerCase()) || n.path.length <= 3) continue;
    if (displayName(n).toLowerCase().includes(q)) out.push(n);
    if (out.length >= limit) break;
  }
  return out;
}
export function read(p) {
  const n = stat(p);
  if (!n) throw new FsError("ENOENT", `Cannot find path '${resolve(p)}' because it does not exist.`);
  if (n.type === "dir") throw new FsError("EISDIR", `'${n.path}' is a directory.`);
  return n.data;
}
export async function text(p) { const d = read(p); return typeof d === "string" ? d : d instanceof Blob ? d.text() : String(d ?? ""); }
export function shortcut(p) { try { const d = read(p); return typeof d === "string" ? JSON.parse(d) : null; } catch { return null; } }

const urls = new Map();
/** A URL a <img> can show: blob: for binary data, data: for SVG text. */
export function url(p) {
  const n = stat(p); if (!n || n.type !== "file") return "";
  if (typeof n.data === "string") {
    if (n.data.startsWith("data:")) return n.data;
    return "data:" + (n.mime || "text/plain") + ";charset=utf-8," + encodeURIComponent(n.data);
  }
  const k = K(n.path), c = urls.get(k);
  if (c && c.mtime === n.mtime) return c.url;
  if (c) URL.revokeObjectURL(c.url);
  const u = URL.createObjectURL(n.data); urls.set(k, { url: u, mtime: n.mtime }); return u;
}

/* ───────── mutations ───────── */
const ro = n => n.ro || n.path.toLowerCase() === RIVA.toLowerCase() || n.path.toLowerCase().startsWith(RIVA.toLowerCase() + "\\");
function denyWrite(dir) { if (ro(dir)) throw new FsError("EACCES", `Access to the path '${dir.path}' is denied. C:\\Riva is read-only.`); }

export function mkdir(p, { parents = false, quiet = false } = {}) {
  const path = resolve(p), ex = nodes.get(K(path));
  if (ex) { if (ex.type === "dir" && parents) return ex; throw new FsError("EEXIST", `An item with the specified name ${path} already exists.`); }
  const par = parentOf(path); if (!par) throw new FsError("EACCES", "Invalid path.");
  let pn = nodes.get(K(par));
  if (!pn) { if (!parents) throw new FsError("ENOENT", `Could not find a part of the path '${path}'.`); pn = mkdir(par, { parents: true, quiet }); }
  if (pn.type !== "dir") throw new FsError("ENOTDIR", `'${par}' is not a directory.`);
  denyWrite(pn); checkName(baseName(path));
  const now = Date.now(), n = { path, name: baseName(path), type: "dir", ctime: now, mtime: now };
  index(n); persist(n); if (!quiet) emit("mkdir", path);
  return n;
}
export function write(p, data, { mime, parents = false, meta } = {}) {
  const path = resolve(p), ex = nodes.get(K(path));
  if (ex?.type === "dir") throw new FsError("EISDIR", `Cannot write to '${path}' because it is a directory.`);
  if (ex && ro(ex)) throw new FsError("EACCES", `Access to the path '${path}' is denied. C:\\Riva is read-only.`);
  const par = parentOf(path); let pn = par && nodes.get(K(par));
  if (!pn) { if (!parents || !par) throw new FsError("ENOENT", `Could not find a part of the path '${path}'.`); pn = mkdir(par, { parents: true }); }
  if (pn.type !== "dir") throw new FsError("ENOTDIR", `'${par}' is not a directory.`);
  denyWrite(pn); if (!ex) checkName(baseName(path));
  const now = Date.now();
  const n = ex ? { ...ex, data, mtime: now } : { path, name: baseName(path), type: "file", data, ctime: now, mtime: now };
  n.mime = mime || (ex && ex.mime) || mimeOf(path);
  n.size = sizeOf(data);
  if (meta) n.meta = { ...(n.meta || {}), ...meta };
  index(n); persist(n); emit(ex ? "write" : "create", path);
  return n;
}
function checkName(name) {
  if (!name || /[<>:"/\\|?*\x00-\x1f]/.test(name) || /^\.+$/.test(name)) throw new FsError("EINVAL", `A file name can't contain any of these characters: \\ / : * ? " < > |`);
}
function guard(n, verb) {
  if (SYSTEM.some(s => K(s) === K(n.path))) throw new FsError("EACCES", `${n.path} is a system folder and can't be ${verb}.`);
  if (ro(n)) throw new FsError("EACCES", `Access to the path '${n.path}' is denied. C:\\Riva is read-only.`);
}
export function rm(p, { recursive = false } = {}) {
  const n = stat(p); if (!n) throw new FsError("ENOENT", `Cannot find path '${resolve(p)}' because it does not exist.`);
  guard(n, "deleted");
  if (n.type === "dir" && kids.get(K(n.path))?.size && !recursive) throw new FsError("ENOTEMPTY", `The item at ${n.path} has children and the -Recurse parameter was not specified.`);
  const all = []; walk(n.path, x => all.push(x.path));
  all.reverse().forEach(x => { unindex(x); unpersist(x); });
  emit("rm", n.path);
}
/** Renames or moves. If dst is an existing folder, src goes inside it. */
export function mv(src, dst, { overwrite = false } = {}) {
  const n = stat(src); if (!n) throw new FsError("ENOENT", `Cannot find path '${resolve(src)}' because it does not exist.`);
  guard(n, "moved");
  let to = resolve(dst, parentOf(n.path));
  if (isDir(to) && K(to) !== K(n.path)) to = join(to, n.name);
  if (K(to) === K(n.path) && to === n.path) return n;
  if (K(to).startsWith(K(n.path) + "\\")) throw new FsError("EINVAL", "The destination folder is a subfolder of the source folder.");
  const tn = nodes.get(K(to));
  if (tn && K(to) !== K(n.path)) { if (!overwrite || tn.type === "dir") throw new FsError("EEXIST", `An item with the name '${baseName(to)}' already exists.`); rm(to, { recursive: true }); }
  const tp = nodes.get(K(parentOf(to))); if (!tp || tp.type !== "dir") throw new FsError("ENOENT", `Could not find a part of the path '${to}'.`);
  denyWrite(tp); checkName(baseName(to));
  const moved = []; walk(n.path, x => moved.push(x));
  moved.forEach(x => { unindex(x.path); unpersist(x.path); });
  moved.forEach(x => { const np = to + x.path.slice(n.path.length); const nn = { ...x, path: np, name: baseName(np) }; if (x === n) nn.mtime = Date.now(); index(nn); persist(nn); });
  emit("mv", to, { from: n.path, fromDir: parentOf(n.path) });
  return stat(to);
}
export function cp(src, dst) {
  const n = stat(src); if (!n) throw new FsError("ENOENT", `Cannot find path '${resolve(src)}' because it does not exist.`);
  let to = resolve(dst, parentOf(n.path));
  if (isDir(to)) to = join(to, n.name);
  if (exists(to)) to = unique(parentOf(to), baseName(to), true);
  if (K(to).startsWith(K(n.path) + "\\")) throw new FsError("EINVAL", "The destination folder is a subfolder of the source folder.");
  const tp = nodes.get(K(parentOf(to))); if (!tp) throw new FsError("ENOENT", `Could not find a part of the path '${to}'.`);
  denyWrite(tp);
  const list = []; walk(n.path, x => list.push(x));
  const now = Date.now();
  list.forEach(x => { const np = to + x.path.slice(n.path.length); const nn = { ...x, path: np, name: baseName(np), ctime: now, mtime: now, ro: false, meta: undefined }; index(nn); persist(nn); });
  emit("create", to);
  return stat(to);
}
/** "New folder" → "New folder (2)" … */
export function unique(dir, name, copy = false) {
  if (!exists(join(dir, name))) return join(dir, name);
  const ext = name.includes(".") && !name.startsWith(".") ? name.slice(name.lastIndexOf(".")) : "";
  const stem = ext ? name.slice(0, -ext.length) : name;
  for (let i = 2; ; i++) { const cand = join(dir, copy ? `${stem} - Copy${i > 2 ? ` (${i - 1})` : ""}${ext}` : `${stem} (${i})${ext}`); if (!exists(cand)) return cand; }
}

/* ───────── Recycle Bin ───────── */
export function trash(p) {
  const n = stat(p); if (!n) return;
  guard(n, "deleted");
  if (K(n.path).startsWith(K(TRASH) + "\\")) return rm(n.path, { recursive: true });
  const to = unique(TRASH, n.name);
  const moved = mv(n.path, to);
  const upd = { ...moved, meta: { ...(moved.meta || {}), origin: n.path, deleted: Date.now() } };
  index(upd); persist(upd); emit("trash", to, { fromDir: parentOf(n.path) });
}
export function restore(p) {
  const n = stat(p); if (!n?.meta?.origin) return;
  const dir = parentOf(n.meta.origin); if (!exists(dir)) mkdir(dir, { parents: true });
  const to = unique(dir, baseName(n.meta.origin));
  const back = mv(n.path, to); const upd = { ...back, meta: { ...back.meta, origin: undefined, deleted: undefined } };
  index(upd); persist(upd); emit("write", to);
}
export function emptyTrash() { ls(TRASH, { hidden: true }).forEach(n => rm(n.path, { recursive: true })); }

/* ───────── usage & reset ───────── */
export function usage() { let b = 0, files = 0; for (const n of nodes.values()) if (!n.ro && n.type === "file") { b += n.size || 0; files++; } return { bytes: b, files }; }
export async function reset() {
  await tx("readwrite", s => s.clear()); nodes.clear(); kids.clear(); store.del("fsSeed"); await init();
}

/* ───────── boot ───────── */
const json = o => JSON.stringify(o);
function seedUser() {
  const lnk = (dir, name, app, args) => write(join(dir, name + ".lnk"), json({ app, args }), { mime: SHORTCUT });
  lnk(DESKTOP, "Riva Services", "services");
  lnk(DESKTOP, "Health Check", "health");
  lnk(DESKTOP, "Book a free chat", "mail");
  lnk(DESKTOP, "Terminal", "terminal");
  write(join(DESKTOP, "Read me.txt"),
`Welcome to rivaOS 👋

This whole website is a small operating system, built by Riva Computech.
Everything works: windows snap to the screen edges, files you create are
saved in this browser, and Terminal runs a (friendly) PowerShell.

Things to try
  • Right-click the desktop → New → Text Document
  • Drag a window to the left or right edge to snap it
  • Hover a window's maximize button for snap layouts
  • Open Terminal and type  help
  • Start → Settings → Personalization to change the wallpaper

Need help with your real Microsoft 365 or Azure setup?
Open "Book a free chat" on the desktop. You'll be talking to Devik.
`);
  write(join(DOCS, "Notes.txt"), "Things to ask Devik:\n- \n- \n- \n");
  write(join(DOCS, "Scripts\\Hello.ps1"),
`# Hello.ps1 — open me in Script Editor and press Run (F5).
$name = "rivaOS"
Write-Host "Hello from $name!" -ForegroundColor Cyan
Get-Date
Write-Host "2 + 2 is" (2 + 2)
Get-Service
Write-Host "Done." -ForegroundColor Green
`, { parents: true });
  mkdir(join(PICS, "Wallpapers"), { parents: true, quiet: true });
  WALLPAPERS.forEach(w => write(join(PICS, "Wallpapers\\" + w.name + ".svg"), wallpaperSVG(w.id, "light"), { mime: "image/svg+xml" }));
}
function seedRiva() {
  // drop the previous boot's read-only tree, then rebuild it from content.js
  [...nodes.values()].filter(n => n.ro).forEach(n => unindex(n.path));
  const now = Date.now();
  const add = (path, type, data, mime) => index({ path, name: baseName(path), type, data, mime, size: sizeOf(data), ctime: now, mtime: now, ro: true });
  const rp = nodes.get(K(RIVA)); if (rp) { rp.ro = true; } else add(RIVA, "dir");
  Object.entries(rivaFiles()).forEach(([rel, data]) => {
    const path = join(RIVA, rel), par = parentOf(path);
    if (!nodes.has(K(par))) add(par, "dir");
    const isLnk = rel.endsWith(".lnk");
    add(path, "file", isLnk ? json(data) : data, isLnk ? SHORTCUT : mimeOf(path));
  });
}
export async function init() {
  try { db = await openDB(); const all = await tx("readonly", s => s.getAll()); (all || []).forEach(n => { delete n.key; index(n); }); }
  catch (e) { console.warn("rivaOS fs: IndexedDB unavailable, files will last for this visit only.", e); db = null; }
  const now = Date.now();
  SYSTEM.forEach(p => { if (!nodes.has(K(p))) { const n = { path: p, name: baseName(p), type: "dir", ctime: now, mtime: now, hidden: p === TRASH }; index(n); if (p !== RIVA) persist(n); } });
  seedRiva();
  if (store.get("fsSeed", 0) < SEED_VERSION) { try { seedUser(); } catch (e) { console.warn(e); } store.set("fsSeed", SEED_VERSION); }
}
export const persistent = () => !!db;
export const tmpName = () => "upload-" + uid();

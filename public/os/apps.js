/* rivaOS · app registry, launcher and file associations. Apps are ES modules in ./apps/,
   loaded on first launch, so boot stays fast. Each exports `default (win, args) => api`. */

import { os, store, track, bus } from "./core.js";
import * as fs from "./fs.js";
import { appIcon } from "./icons.js";

export const APPS = {
  welcome:    { name: "Welcome", w: 860, h: 620, single: true, desc: "Riva Computech at a glance", keys: "home start intro riva computech hello" },
  services:   { name: "Riva Services", short: "Services", w: 1020, h: 700, single: true, desc: "What we look after", keys: "services help support offer microsoft 365 azure migration backup security infrastructure compare why" },
  health:     { name: "Health Check", w: 980, h: 660, single: true, desc: "8 questions · about a minute", keys: "health check audit assessment score security quiz test" },
  about:      { name: "About Devik", w: 920, h: 640, single: true, desc: "Owner & senior engineer", keys: "about devik patel owner who experience gujarati team" },
  mail:       { name: "Contact", w: 940, h: 680, single: true, desc: "Book a free 30-min chat", keys: "contact book call email chat quote price pricing phone hire mail message" },
  terminal:   { name: "Terminal", w: 780, h: 500, minW: 380, desc: "PowerShell", keys: "powershell shell console cli command prompt cmd" },
  explorer:   { name: "File Explorer", short: "Explorer", w: 980, h: 620, minW: 420, desc: "Browse your files", keys: "files folders documents explorer finder" },
  code:       { name: "Script Editor", w: 940, h: 640, minW: 420, desc: "Edit & run PowerShell scripts", keys: "code script editor ps1 automation powershell ide" },
  notepad:    { name: "Notepad", w: 760, h: 540, desc: "Plain text editor", keys: "notepad text editor write notes txt" },
  browser:    { name: "Browser", w: 1040, h: 700, minW: 420, desc: "Browse the web", keys: "browser web internet edge chrome url site" },
  settings:   { name: "Settings", w: 1040, h: 700, minW: 420, single: true, desc: "Personalize rivaOS", keys: "settings control panel preferences theme wallpaper background dark light accent color" },
  calculator: { name: "Calculator", w: 340, h: 540, minW: 300, minH: 440, desc: "Standard calculator", keys: "calculator calc math numbers" },
  paint:      { name: "Paint", w: 1000, h: 680, minW: 480, desc: "Draw and edit pictures", keys: "paint draw drawing sketch image art" },
  photos:     { name: "Photos", w: 920, h: 640, desc: "View pictures", keys: "photos pictures images viewer gallery" },
  taskmgr:    { name: "Task Manager", w: 860, h: 580, minW: 480, single: true, desc: "Processes & performance", keys: "task manager processes performance cpu memory kill end task" }
};
export const START_PINS = ["welcome", "services", "health", "about", "mail", "terminal", "explorer", "code", "notepad", "settings", "browser", "calculator", "paint", "photos", "taskmgr"];
export const ASSOC = { txt: "notepad", log: "notepad", md: "notepad", ini: "notepad", csv: "notepad", json: "notepad", css: "notepad", js: "notepad", html: "notepad", xml: "notepad",
  ps1: "code", png: "photos", jpg: "photos", jpeg: "photos", gif: "photos", webp: "photos", svg: "photos", bmp: "photos", url: "browser" };

/** Hash routes keep the old one-page site's links working (#services, #contact…). */
export const ROUTES = {
  home: ["welcome"], services: ["services"], why: ["services", { tab: "why" }], automation: ["code", { path: fs.RIVA + "\\Scripts\\Offboard-User.ps1" }],
  health: ["health"], about: ["about"], contact: ["mail"], terminal: ["terminal"], settings: ["settings"], files: ["explorer"],
  "svc-m365": ["services", { focus: "m365" }], "svc-azure": ["services", { focus: "azure" }], "svc-migrate": ["services", { focus: "migrate" }],
  "svc-backup": ["services", { focus: "backup" }], "svc-security": ["services", { focus: "security" }], "svc-infra": ["services", { focus: "infra" }]
};
const ROUTE_OF = { welcome: "home", services: "services", health: "health", about: "about", mail: "contact" };

const loading = new Set();
export async function launch(id, args = {}) {
  const meta = APPS[id]; if (!meta) { os.notify?.({ title: "Can't find that app", body: id }); return null; }
  if (meta.single) {
    const w = os.wm.byApp(id)[0];
    if (w) { w.restore(); w.focus(); w.api?.onArgs?.(args); return w; }
    if (loading.has(id)) return null;
  }
  loading.add(id); bus.emit("app-loading", { id, on: true });
  let mod;
  try { mod = await import(`./apps/${id}.js`); }
  catch (e) { console.error(e); os.notify?.({ title: `${meta.name} couldn't start`, body: "Check your connection and try again." }); return null; }
  finally { loading.delete(id); bus.emit("app-loading", { id, on: false }); }
  const win = os.wm.open({ app: id, title: meta.name, icon: appIcon(id, 16), w: meta.w, h: meta.h, minW: meta.minW, minH: meta.minH, ...(mod.winOpts || {}), ...(args.window || {}) });
  try { win.api = (await mod.default(win, args)) || {}; }
  catch (e) { console.error(e); win.close(true); os.notify?.({ title: `${meta.name} stopped working`, body: String(e.message || e) }); return null; }
  track("app_open", { app_id: id });
  return win;
}

export function addRecent(path) {
  const r = store.get("recent", []).filter(p => p.toLowerCase() !== path.toLowerCase());
  r.unshift(path); store.set("recent", r.slice(0, 12)); bus.emit("recent");
}
export const recent = () => store.get("recent", []).filter(p => fs.exists(p));

/** Open a path the way double-clicking it would. */
export async function openPath(path, { with: app } = {}) {
  const n = fs.stat(path);
  if (!n) { os.notify?.({ title: "Item not found", body: `${path} doesn't exist any more.` }); return; }
  if (n.type === "dir") return launch("explorer", { path: n.path });
  const ext = fs.extOf(n.path);
  if (ext === "lnk" && !app) {
    const s = fs.shortcut(n.path);
    if (s?.url) return window.open(s.url, "_blank", "noopener");
    if (s?.path) return openPath(s.path);
    if (s?.app) return launch(s.app, s.args || {});
    return;
  }
  app ||= ASSOC[ext] || (fs.isImage(n) ? "photos" : fs.isText(n) ? "notepad" : null);
  addRecent(n.path);
  if (!app) return os.openWith?.(n.path);
  return launch(app, { path: n.path });
}

export function openRoute(hash) {
  const r = ROUTES[String(hash || "").replace(/^#/, "").toLowerCase()];
  if (r) { launch(r[0], r[1] || {}); return true; }
  return false;
}
/** Keep the address bar in step with the focused app, so links can be shared. */
bus.on("wm", e => {
  if (e.type !== "focus") return;
  const route = e.win && ROUTE_OF[e.win.app];
  const want = route ? "#" + route : "";
  if (location.hash !== want) try { history.replaceState(null, "", location.pathname + location.search + want); } catch {}
});

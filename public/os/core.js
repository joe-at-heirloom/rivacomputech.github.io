/* rivaOS · core: helpers, settings, event bus and the `os` object every module shares. */

export const d = document, root = d.documentElement;
export const $ = (s, c = d) => c.querySelector(s);
export const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const reduced = () => root.classList.contains("rm");
export const uid = () => Math.random().toString(36).slice(2, 10);

export const EMAIL = "rivacomputech@gmail.com";
export const PHONE = "+1 (313) 405-7164";
export const PHONE_TEL = "+13134057164";
/** Contact form endpoint (Formspree). Messages go to rivacomputech@gmail.com. */
export const FORMSPREE = "https://formspree.io/f/xvkkjper";
export const VERSION = "26.11";

/** Tiny element builder: h("div", {class:"x", onclick}, "text", child, [more]) */
export function h(tag, attrs, ...kids) {
  const el = d.createElement(tag);
  if (attrs) for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  const add = k => { if (k == null || k === false) return; if (Array.isArray(k)) k.forEach(add); else el.append(k instanceof Node ? k : d.createTextNode(k)); };
  kids.forEach(add);
  return el;
}

export const glyph = (name, cls = "i") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const LOGO = '<svg class="bmark" viewBox="0 0 64 64" aria-hidden="true"><use href="#rivaMarkG"/></svg>';
export const WORDMARK = '<svg class="bword" viewBox="6.2 -51.88 180.24 87.56" aria-hidden="true"><use href="#rivaWordG"/></svg>';

const injected = new Set();
export function injectCSS(id, css) {
  if (injected.has(id)) return;
  injected.add(id);
  d.head.append(h("style", { "data-app": id }, css));
}

export function fmtBytes(n) {
  if (n == null) return "";
  if (n < 1024) return n + " bytes";
  const u = ["KB", "MB", "GB"]; let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return (n < 10 ? n.toFixed(1) : Math.round(n)) + " " + u[i];
}
export function fmtDate(ts, withTime = true) {
  const dt = new Date(ts);
  return dt.toLocaleDateString() + (withTime ? " " + dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");
}

/* ───────── storage (localStorage, namespaced, never throws) ───────── */
export const store = {
  get(k, def) { try { const v = localStorage.getItem("rivaos:" + k); return v == null ? def : JSON.parse(v); } catch { return def; } },
  set(k, v) { try { localStorage.setItem("rivaos:" + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem("rivaos:" + k); } catch {} },
  clear() { try { Object.keys(localStorage).filter(k => k.startsWith("rivaos:")).forEach(k => localStorage.removeItem(k)); } catch {} }
};

/* ───────── event bus ───────── */
const subs = {};
export const bus = {
  on(ev, fn) { (subs[ev] ||= new Set()).add(fn); return () => subs[ev].delete(fn); },
  emit(ev, data) { subs[ev]?.forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
};

/* ───────── settings ───────── */
export const ACCENTS = {
  riva:     { name: "Riva blue", l: "#0067c0", d: "#4cc2ff" },
  teal:     { name: "Teal",      l: "#00777d", d: "#3fd0c9" },
  green:    { name: "Green",     l: "#107c10", d: "#6ccb5f" },
  purple:   { name: "Purple",    l: "#744da9", d: "#c5a3ff" },
  pink:     { name: "Pink",      l: "#bf0077", d: "#ff8ccf" },
  red:      { name: "Red",       l: "#c42b1c", d: "#ff99a4" },
  orange:   { name: "Orange",    l: "#c24e00", d: "#ffb27a" },
  graphite: { name: "Graphite",  l: "#4c5866", d: "#a9b7c6" }
};
const DEFAULTS = {
  theme: "auto", accent: "riva", wallpaper: "bloom", motion: "auto", transparency: true,
  volume: 40, brightness: 100, nightlight: false, dnd: false, clock24: false,
  iconSize: "medium", showIcons: true, tbAlign: "center", tbWidgets: true, tbSearch: true,
  textScale: 100, showRecent: true,
  pinned: ["explorer", "services", "health", "terminal", "mail", "browser"]
};
const mqDark = matchMedia("(prefers-color-scheme: dark)");
const mqMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const settings = {
  data: Object.assign({}, DEFAULTS, store.get("settings", {})),
  get(k) { return this.data[k]; },
  set(k, v) { this.data[k] = v; store.set("settings", this.data); this.apply(); bus.emit("settings", { key: k, value: v }); },
  theme() { const t = this.data.theme; return t === "light" || t === "dark" ? t : (mqDark.matches ? "dark" : "light"); },
  apply() {
    const s = this.data;
    root.setAttribute("data-theme", this.theme());
    const a = ACCENTS[s.accent] || ACCENTS.riva;
    root.style.setProperty("--accent-l", a.l);
    root.style.setProperty("--accent-d", a.d);
    root.classList.toggle("rm", s.motion === "reduce" || (s.motion !== "full" && mqMotion.matches));
    root.classList.toggle("no-transparency", !s.transparency);
    root.classList.toggle("nightlight", !!s.nightlight);
    root.classList.toggle("tb-left", s.tbAlign === "left");
    root.style.setProperty("--text-scale", (s.textScale || 100) / 100);
    const dim = $(".dim"); if (dim) dim.style.opacity = String((100 - s.brightness) / 100 * .7);
    const meta = $('meta[name="theme-color"]'); if (meta) meta.content = this.theme() === "dark" ? "#202020" : "#f3f3f3";
  }
};
const onSys = () => { settings.apply(); bus.emit("settings", { key: "theme" }); };
mqDark.addEventListener?.("change", onSys);
mqMotion.addEventListener?.("change", onSys);

/* ───────── sound: tiny synthesized cues (no audio files) ───────── */
let actx;
export function sound(kind = "note") {
  const vol = settings.get("volume") / 100;
  if (!vol || settings.get("dnd") && kind === "note") return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const seq = { note: [[880, 0, .09], [1320, .07, .14]], error: [[220, 0, .16], [196, .1, .2]], chime: [[523, 0, .4], [659, .12, .4], [784, .24, .5], [1047, .36, .7]], click: [[1200, 0, .03]] }[kind] || [];
    const t0 = actx.currentTime;
    for (const [f, at, dur] of seq) {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0 + at);
      g.gain.linearRampToValueAtTime(.12 * vol, t0 + at + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t0 + at + dur);
      o.connect(g).connect(actx.destination); o.start(t0 + at); o.stop(t0 + at + dur + .05);
    }
  } catch {}
}

/* ───────── Worker API (gracefully absent on static hosting) ───────── */
export async function api(path, opts = {}, timeout = 8000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch("/api/" + path, { ...opts, signal: ctl.signal, headers: { accept: "application/json", ...(opts.headers || {}) } });
    const type = r.headers.get("content-type") || "";
    if (!type.includes("json")) throw Object.assign(new Error("API unavailable"), { status: r.status, offline: true });
    const body = await r.json();
    if (!r.ok) throw Object.assign(new Error(body.error || "Request failed"), { status: r.status, body });
    return body;
  } finally { clearTimeout(t); }
}
let sysInfo;
export const system = () => (sysInfo ||= api("system").catch(() => (sysInfo = null)));

export function track(name, params) { try { window.gtag?.("event", name, params); } catch {} }

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/** The shared OS object. Modules fill it in at boot (fs, wm, shell, launch…). */
export const os = { settings, bus, store, sound, api, system, track };

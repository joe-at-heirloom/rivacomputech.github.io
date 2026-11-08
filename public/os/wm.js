/* rivaOS · window manager.
   Windows are positioned with the CSS `translate` property (so the `scale` used by open/close/minimize
   animations always scales around the window's own centre), sized with width/height, and stacked by z-index. */

import { d, h, $, bus, clamp, reduced, os, sleep } from "./core.js";

let layer, ghost, snapFly, zTop = 100, seq = 0;
const wins = [];
const RZ = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
const ZONES = {
  left: { x: 0, y: 0, w: .5, h: 1 }, right: { x: .5, y: 0, w: .5, h: 1 },
  tl: { x: 0, y: 0, w: .5, h: .5 }, tr: { x: .5, y: 0, w: .5, h: .5 }, bl: { x: 0, y: .5, w: .5, h: .5 }, br: { x: .5, y: .5, w: .5, h: .5 }
};
const LAYOUTS = [
  { cols: "1fr 1fr", rows: "1fr", z: [[0, 0, .5, 1], [.5, 0, .5, 1]] },
  { cols: "2fr 1fr", rows: "1fr", z: [[0, 0, 2 / 3, 1], [2 / 3, 0, 1 / 3, 1]] },
  { cols: "1fr 1fr", rows: "1fr 1fr", z: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]] },
  { cols: "1fr 1fr 1fr", rows: "1fr", z: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]] }
];

export const workArea = () => ({ w: layer.clientWidth, h: layer.clientHeight });
const zoneRect = z => { const a = workArea(); return { x: Math.round(z.x * a.w), y: Math.round(z.y * a.h), w: Math.round(z.w * a.w), h: Math.round(z.h * a.h) }; };

class Win {
  constructor(o) {
    this.id = ++seq; this.app = o.app; this.o = o; this.owner = o.owner || null;
    this.minW = o.minW || 320; this.minH = o.minH || 200;
    this.state = "normal"; this.minimized = false; this.zone = null; this.ev = {}; this.api = {};
    this.autoH = o.h === "auto";
    const el = this.el = h("div", { class: "win opening " + (o.cls || ""), role: "dialog", "aria-label": o.title || "", tabindex: "-1", "data-app": o.app });
    el.innerHTML = `<div class="win-bar"><span class="win-ico">${o.icon || ""}</span><span class="win-title"></span><div class="win-slot"></div><div class="win-caps">
      <button class="cap n" type="button" data-c="min" aria-label="Minimize" title="Minimize"><svg><use href="#c-min"/></svg></button>
      <button class="cap m" type="button" data-c="max" aria-label="Maximize" title="Maximize"><svg><use href="#c-max"/></svg></button>
      <button class="cap x" type="button" data-c="close" aria-label="Close" title="Close"><svg><use href="#c-x"/></svg></button></div></div>
      <div class="win-body"></div>${RZ.map(r => `<i class="rz ${r}" data-rz="${r}"></i>`).join("")}`;
    this.bar = $(".win-bar", el); this.body = $(".win-body", el); this.titleEl = $(".win-title", el); this.slot = $(".win-slot", el); this.icoEl = $(".win-ico", el);
    if (o.resizable === false) el.classList.add("no-resize");
    if (o.maximizable === false) el.classList.add("no-max");
    if (o.minimizable === false) el.classList.add("no-min");
    this.setTitle(o.title || "");
    const a = workArea();
    const w = Math.round(Math.min(o.w || 800, a.w - 16)), hh = this.autoH ? 200 : Math.round(Math.min(o.h || 560, a.h - 16));
    const n = wins.filter(x => !x.owner).length % 7, off = (n - 3) * 26;
    this.rect = { w, h: hh, x: o.x ?? Math.round(clamp((a.w - w) / 2 + off, 0, Math.max(0, a.w - w))), y: o.y ?? Math.round(clamp((a.h - hh) / 2 - 16 + off, 0, Math.max(0, a.h - hh))) };
    if (o.max) this.state = "max";
    layer.append(el); this.apply();
    el.addEventListener("animationend", e => { if (e.animationName === "winOpen") el.classList.remove("opening"); });
    this.wire(); wins.push(this);
    if (this.owner) { this.owner.el.classList.add("blocked"); this.owner.child = this; }
    this.focus();
    bus.emit("wm", { type: "open", win: this });
  }

  setTitle(t) { this.title = t; this.titleEl.textContent = t; this.el.setAttribute("aria-label", t); bus.emit("wm", { type: "title", win: this }); }
  setIcon(html) { this.icoEl.innerHTML = html; }
  on(ev, fn) { (this.ev[ev] ||= []).push(fn); return this; }
  fire(ev, x) { (this.ev[ev] || []).forEach(fn => { try { fn(x); } catch (e) { console.error(e); } }); }

  get maxed() { return this.state === "max" || wm.compact; }
  apply() {
    const s = this.el.style;
    if (this.maxed) { s.translate = "0px 0px"; s.width = "100%"; s.height = "100%"; }
    else {
      const r = this.state === "snapped" ? zoneRect(this.zone) : this.rect;
      s.translate = `${r.x}px ${r.y}px`; s.width = r.w + "px"; s.height = this.autoH ? "" : r.h + "px";
    }
    this.el.classList.toggle("max", this.maxed);
    this.el.classList.toggle("snapped", this.state === "snapped" && !wm.compact);
    const mb = $(".cap.m", this.el), on = this.state === "max";
    mb.innerHTML = `<svg><use href="#c-${on ? "restore" : "max"}"/></svg>`;
    mb.setAttribute("aria-label", on ? "Restore" : "Maximize"); mb.title = on ? "Restore down" : "Maximize";
  }
  anim(fn) {
    if (reduced()) { fn(); this.fire("resize"); return; }
    this.el.classList.add("anim"); fn();
    clearTimeout(this._at); this._at = setTimeout(() => { this.el.classList.remove("anim"); this.fire("resize"); }, 280);
  }
  center() {
    const a = workArea(), w = this.el.offsetWidth, hh = this.el.offsetHeight;
    const ref = this.owner && !this.owner.maxed ? this.owner.rect : { x: 0, y: 0, w: a.w, h: a.h };
    this.rect.x = Math.round(clamp(ref.x + (ref.w - w) / 2, 0, Math.max(0, a.w - w)));
    this.rect.y = Math.round(clamp(ref.y + (ref.h - hh) / 2, 0, Math.max(0, a.h - hh)));
    this.rect.w = w; if (!this.autoH) this.rect.h = hh; this.apply();
  }
  focus() {
    if (this.owner && this.owner.child === this) { /* dialogs sit above their owner */ }
    if (this.child && !this.child.closed) { this.child.focus(); this.child.el.classList.remove("flash"); void this.child.el.offsetWidth; this.child.el.classList.add("flash"); return; }
    if (this.minimized) this.restore();
    this.el.style.zIndex = ++zTop;
    if (this.child) this.child.el.style.zIndex = ++zTop;
    wins.forEach(w => w.el.classList.toggle("active", w === this));
    const changed = wm.active !== this; wm.active = this;
    if (!this.el.contains(d.activeElement)) this.el.focus({ preventScroll: true });
    if (changed) { bus.emit("wm", { type: "focus", win: this }); this.fire("focus"); }
  }
  toggleMax() { if (wm.compact || this.o.maximizable === false) return; this.state === "max" ? this.unmax() : this.maximize(); }
  maximize() { if (this.o.maximizable === false) return; this.anim(() => { this.state = "max"; this.apply(); }); bus.emit("wm", { type: "state", win: this }); }
  unmax() { this.anim(() => { this.state = "normal"; this.apply(); }); bus.emit("wm", { type: "state", win: this }); }
  snap(zone) { if (wm.compact) return; this.anim(() => { this.state = "snapped"; this.zone = zone; this.apply(); }); bus.emit("wm", { type: "state", win: this }); }

  minimize() {
    if (this.minimized || this.o.minimizable === false) return;
    this.minimized = true;
    const t = os.shell?.buttonRect?.(this.app), lr = layer.getBoundingClientRect();
    const finish = () => { this.el.classList.add("minimized"); this.el.classList.remove("min-anim"); };
    if (t && !reduced()) {
      const w = this.el.offsetWidth, hh = this.el.offsetHeight;
      this.el.classList.add("min-anim");
      this.el.style.translate = `${t.x + t.width / 2 - lr.left - w / 2}px ${t.y + t.height / 2 - lr.top - hh / 2}px`;
      setTimeout(finish, 240);
    } else finish();
    if (wm.active === this) { wm.active = null; this.el.classList.remove("active"); focusTop(this); }
    bus.emit("wm", { type: "min", win: this });
  }
  restore() {
    if (!this.minimized) return;
    this.minimized = false;
    this.el.classList.remove("minimized");
    if (!reduced()) {
      this.el.classList.add("min-anim");
      void this.el.offsetWidth;
      this.el.classList.add("restore-anim"); this.el.classList.remove("min-anim"); this.apply();
      setTimeout(() => this.el.classList.remove("restore-anim"), 280);
    } else this.apply();
    bus.emit("wm", { type: "restore", win: this });
    this.focus();
  }
  async close(force) {
    if (this.closed) return;
    if (!force && this.api.onClose) { const ok = await this.api.onClose(); if (ok === false) return; }
    if (this.child && !this.child.closed) this.child.close(true);
    this.closed = true;
    const i = wins.indexOf(this); if (i > -1) wins.splice(i, 1);
    if (this.owner) { this.owner.el.classList.remove("blocked"); if (this.owner.child === this) this.owner.child = null; }
    this.fire("close");
    this.el.classList.add("closing");
    setTimeout(() => this.el.remove(), reduced() ? 0 : 150);
    if (wm.active === this) { wm.active = null; this.owner && !this.owner.closed ? this.owner.focus() : focusTop(); }
    bus.emit("wm", { type: "close", win: this });
  }

  wire() {
    const el = this.el, bar = this.bar;
    el.addEventListener("pointerdown", () => { if (wm.active !== this) this.focus(); }, true);
    bar.addEventListener("dblclick", e => { if (!e.target.closest("button,input,.no-drag")) this.toggleMax(); });
    bar.addEventListener("contextmenu", e => {
      if (e.target.closest("input,.no-drag")) return; e.preventDefault();
      os.menu?.([
        { label: "Restore", icon: '<svg class="i xs"><use href="#c-restore"/></svg>', disabled: this.state === "normal" || wm.compact, run: () => this.unmax() },
        { label: "Minimize", icon: '<svg class="i xs"><use href="#c-min"/></svg>', disabled: this.o.minimizable === false, run: () => this.minimize() },
        { label: "Maximize", icon: '<svg class="i xs"><use href="#c-max"/></svg>', disabled: this.state === "max" || wm.compact || this.o.maximizable === false, run: () => this.maximize() },
        "-",
        { label: "Close", icon: '<svg class="i xs"><use href="#c-x"/></svg>', kbd: "Alt+F4", run: () => this.close() }
      ], e.clientX, e.clientY);
    });
    $(".win-caps", el).addEventListener("click", e => {
      const c = e.target.closest("[data-c]")?.dataset.c; if (!c) return;
      hideSnapFly();
      if (c === "min") this.minimize(); else if (c === "max") this.toggleMax(); else this.close();
    });
    // snap layouts: hover the maximize button
    const mb = $(".cap.m", el); let ht;
    mb.addEventListener("pointerenter", e => { if (e.pointerType !== "mouse" || wm.compact) return; ht = setTimeout(() => showSnapFly(this, mb), 480); });
    mb.addEventListener("pointerleave", () => clearTimeout(ht));

    // move
    bar.addEventListener("pointerdown", e => {
      if (e.button !== 0 || e.target.closest("button,input,select,textarea,a,.no-drag") || wm.compact) return;
      const lr = layer.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
      let moved = false, st = null, zone = null;
      try { bar.setPointerCapture(e.pointerId); } catch {}
      const move = ev => {
        if (!moved) {
          if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) < 4) return;
          moved = true; el.classList.add("dragging"); layer.classList.add("busy"); hideSnapFly();
          if (this.state !== "normal") {
            const cur = this.el.getBoundingClientRect(), frac = clamp((sx - cur.left) / cur.width, 0, 1);
            this.state = "normal";
            this.rect.x = Math.round(sx - lr.left - frac * this.rect.w); this.rect.y = Math.max(0, Math.round(sy - lr.top - 14));
            this.apply(); bus.emit("wm", { type: "state", win: this });
          }
          st = { x: this.rect.x, y: this.rect.y };
        }
        const a = workArea();
        this.rect.x = Math.round(clamp(st.x + ev.clientX - sx, -this.rect.w + 120, a.w - 120));
        this.rect.y = Math.round(clamp(st.y + ev.clientY - sy, 0, a.h - 32));
        this.apply();
        if (this.o.maximizable === false) return;
        const px = ev.clientX - lr.left, py = ev.clientY - lr.top, E = 6, C = 90;
        zone = px <= E ? (py < C ? "tl" : py > a.h - C ? "bl" : "left") : px >= a.w - E ? (py < C ? "tr" : py > a.h - C ? "br" : "right") : py <= E ? "max" : null;
        showGhost(zone, this);
      };
      const up = () => {
        bar.removeEventListener("pointermove", move); bar.removeEventListener("pointerup", up); bar.removeEventListener("pointercancel", up);
        el.classList.remove("dragging"); layer.classList.remove("busy"); showGhost(null);
        if (moved && zone) zone === "max" ? this.maximize() : this.snap(ZONES[zone]);
        if (moved) this.fire("resize");
      };
      bar.addEventListener("pointermove", move); bar.addEventListener("pointerup", up); bar.addEventListener("pointercancel", up);
    });

    // resize
    el.querySelectorAll(".rz").forEach(hd => hd.addEventListener("pointerdown", e => {
      if (e.button !== 0 || wm.compact) return;
      e.preventDefault(); e.stopPropagation(); this.focus();
      const dir = hd.dataset.rz, sx = e.clientX, sy = e.clientY;
      if (this.state === "snapped") { this.rect = zoneRect(this.zone); this.state = "normal"; }
      if (this.autoH) { this.rect.h = this.el.offsetHeight; this.autoH = false; }
      const r0 = { ...this.rect }, a = workArea();
      try { hd.setPointerCapture(e.pointerId); } catch {}
      el.classList.add("resizing"); layer.classList.add("busy");
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy, r = { ...r0 };
        if (dir.includes("e")) r.w = clamp(r0.w + dx, this.minW, a.w - r0.x);
        if (dir.includes("s")) r.h = clamp(r0.h + dy, this.minH, a.h - r0.y);
        if (dir.includes("w")) { r.w = clamp(r0.w - dx, this.minW, r0.x + r0.w); r.x = r0.x + r0.w - r.w; }
        if (dir.includes("n")) { r.h = clamp(r0.h - dy, this.minH, r0.y + r0.h); r.y = r0.y + r0.h - r.h; }
        this.rect = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }; this.apply();
      };
      const up = () => { hd.removeEventListener("pointermove", move); hd.removeEventListener("pointerup", up); hd.removeEventListener("pointercancel", up); el.classList.remove("resizing"); layer.classList.remove("busy"); this.fire("resize"); };
      hd.addEventListener("pointermove", move); hd.addEventListener("pointerup", up); hd.addEventListener("pointercancel", up);
    }));
  }
}

function showGhost(zone, win) {
  if (!zone) { ghost.classList.remove("on"); return; }
  const r = zone === "max" ? { x: 0, y: 0, ...workArea() } : zoneRect(ZONES[zone]);
  const m = 6;
  if (!ghost.classList.contains("on")) { const c = win.rect; Object.assign(ghost.style, { left: c.x + "px", top: c.y + "px", width: c.w + "px", height: c.h + "px" }); void ghost.offsetWidth; }
  ghost.style.zIndex = zTop - 0.5 | 0;
  win.el.style.zIndex = ++zTop;
  Object.assign(ghost.style, { left: r.x + m + "px", top: r.y + m + "px", width: r.w - 2 * m + "px", height: r.h - 2 * m + "px" });
  ghost.classList.add("on");
}

function showSnapFly(win, btn) {
  hideSnapFly();
  const lr = layer.getBoundingClientRect(), br = btn.getBoundingClientRect();
  snapFly = h("div", { class: "snap-fly", role: "menu", "aria-label": "Snap layouts" });
  LAYOUTS.forEach(L => {
    const g = h("div", { class: "snap-lay", style: { gridTemplateColumns: L.cols, gridTemplateRows: L.rows } });
    L.z.forEach(([x, y, w, hh], i) => g.append(h("button", { type: "button", "aria-label": `Snap to area ${i + 1}`, onclick: () => { hideSnapFly(); win.snap({ x, y, w: w, h: hh }); } })));
    snapFly.append(g);
  });
  layer.append(snapFly);
  snapFly.style.zIndex = 20055;
  const fw = snapFly.offsetWidth;
  snapFly.style.left = clamp(br.left - lr.left + br.width / 2 - fw / 2, 8, lr.width - fw - 8) + "px";
  snapFly.style.top = (br.bottom - lr.top + 4) + "px";
  const leave = e => { if (!snapFly) return; if (!snapFly.contains(e.relatedTarget) && e.relatedTarget !== btn) hideSnapFly(); };
  snapFly.addEventListener("pointerleave", leave); btn.addEventListener("pointerleave", leave, { once: true });
}
function hideSnapFly() { snapFly?.remove(); snapFly = null; }

export function focusTop(except) {
  const list = wins.filter(w => !w.minimized && w !== except && !w.closed).sort((a, b) => (+b.el.style.zIndex) - (+a.el.style.zIndex));
  if (list[0]) list[0].focus(); else { wm.active = null; wins.forEach(w => w.el.classList.remove("active")); bus.emit("wm", { type: "focus", win: null }); }
}

/** A small modal window. Resolves with the clicked button's value (or null when closed). */
export function dialog({ owner, title = "", icon, body, buttons = [{ label: "OK", value: true, primary: true }], w = 440, onOpen }) {
  return new Promise(res => {
    const win = new Win({ app: owner?.app || "system", title, icon, w, h: "auto", owner, resizable: false, maximizable: false, minimizable: false, cls: "dlg", taskbar: !owner });
    const b = h("div", { class: "dlg-body" }); if (typeof body === "string") b.innerHTML = body; else if (body) b.append(body);
    const f = h("div", { class: "dlg-foot" });
    let val = null;
    buttons.forEach(bt => f.append(h("button", { class: "btn" + (bt.primary ? " accent" : ""), type: "button", onclick: () => { val = typeof bt.value === "function" ? bt.value() : bt.value; if (val === undefined) return; win.close(true); } }, bt.label)));
    win.body.append(b, f); win.on("close", () => res(val));
    win.center();
    win.el.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.stopPropagation(); win.close(true); }
      if (e.key === "Enter" && !e.target.matches("textarea,button")) { const p = f.querySelector(".accent"); if (p) { e.preventDefault(); p.click(); } }
    });
    onOpen?.(win, b);
    setTimeout(() => (b.querySelector("input,textarea,select") || f.querySelector(".accent") || f.querySelector("button"))?.focus(), 30);
  });
}

export const wm = {
  active: null, compact: false,
  init(el) {
    layer = el; ghost = h("div", { class: "snap-ghost" }); layer.append(ghost);
    const fit = () => {
      const c = innerWidth < 760 || (matchMedia("(pointer:coarse)").matches && innerWidth < 1024 && innerHeight < 1100);
      const changed = c !== wm.compact; wm.compact = c; d.documentElement.classList.toggle("compact", c);
      const a = workArea();
      wins.forEach(w => {
        if (!w.maxed && w.state === "normal") { w.rect.w = Math.min(w.rect.w, a.w); w.rect.h = Math.min(w.rect.h, a.h); w.rect.x = clamp(w.rect.x, -w.rect.w + 120, a.w - 120); w.rect.y = clamp(w.rect.y, 0, a.h - 32); }
        w.apply(); w.fire("resize");
      });
      if (changed) bus.emit("wm", { type: "compact" });
    };
    addEventListener("resize", fit); fit();
    d.addEventListener("pointerdown", e => { if (snapFly && !snapFly.contains(e.target)) hideSnapFly(); });
  },
  open: o => new Win(o),
  dialog,
  list: () => wins.slice(),
  byApp: id => wins.filter(w => w.app === id && !w.owner),
  focusTop,
  minimizeAll() { const vis = wins.filter(w => !w.minimized); vis.forEach(w => w.minimize()); return vis; },
  workArea
};

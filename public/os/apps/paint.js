/* Paint */
import { h, $, $$, esc, glyph, injectCSS, os, clamp } from "../core.js";
import * as fs from "../fs.js";
import { pickFile, download } from "../ui.js";

injectCSS("paint", `
.pt-tools{display:flex;align-items:center;gap:4px;padding:8px 12px;border-bottom:1px solid var(--divider);flex-wrap:wrap;background:var(--mica)}
.pt-tools .sep{width:1px;height:28px;background:var(--divider);margin:0 6px}
.pt-tools .ibtn.on{background:var(--accent-soft);color:var(--accent-ink);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--accent) 45%,transparent)}
.pt-size{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-2)}
.pt-size input{width:90px}
.pt-cur{width:30px;height:30px;border-radius:50%;border:2px solid var(--mica);box-shadow:0 0 0 1px var(--stroke-2);position:relative;overflow:hidden;flex:none}
.pt-cur input{position:absolute;inset:-8px;width:200%;height:200%;opacity:0;cursor:pointer}
.pt-pal{display:grid;grid-template-columns:repeat(10,18px);grid-auto-rows:18px;gap:3px}
.pt-pal button{border:1px solid rgba(0,0,0,.2);border-radius:50%;padding:0}
.pt-pal button:hover{transform:scale(1.15)}
.pt-stage{flex:1;min-height:0;overflow:auto;background:var(--mica-2);padding:24px;display:flex}
.pt-stage canvas{margin:auto;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.18);touch-action:none;cursor:crosshair;image-rendering:auto;flex:none}
.pt-menu{border:0;background:transparent;padding:4px 10px;border-radius:var(--r-ctl);font-size:13px}
.pt-menu:hover{background:var(--subtle-hover)}
`);

export const winOpts = { w: 1000, h: 680, minW: 480, minH: 360 };
const PAL = ["#000000", "#7f7f7f", "#880015", "#ed1c24", "#ff7f27", "#fff200", "#22b14c", "#00a2e8", "#3f48cc", "#a349a4", "#ffffff", "#c3c3c3", "#b97a57", "#ffaec9", "#ffc90e", "#efe4b0", "#b5e61d", "#99d9ea", "#7092be", "#c8bfe7"];
const TOOLS = [["pencil", "pencil", "Pencil"], ["brush", "brush", "Brush"], ["eraser", "eraser", "Eraser"], ["fill", "bucket", "Fill"], ["pick", "palette", "Colour picker"], ["line", "line", "Line"], ["rect", "rect", "Rectangle"], ["ellipse", "ellipse", "Ellipse"]];

export default async function paint(win, args) {
  let tool = "brush", color = "#1e9bf0", size = 6, path = null, dirty = false;
  const undo = [], redo = [];
  const tools = h("div", { class: "pt-tools" });
  tools.innerHTML = `<button class="pt-menu" type="button" data-m="file">File</button><span class="sep"></span>
    ${TOOLS.map(([id, g, l]) => `<button class="ibtn" type="button" data-t="${id}" aria-label="${l}" data-tip="${l}">${glyph(g)}</button>`).join("")}<span class="sep"></span>
    <span class="pt-size">Size <input class="slider" type="range" min="1" max="60" value="${size}" aria-label="Brush size" style="--p:${size / 60 * 100}%"><b>${size}</b></span><span class="sep"></span>
    <span class="pt-cur" data-tip="Edit colour" style="background:${color}"><input type="color" value="${color}" aria-label="Colour"></span>
    <div class="pt-pal">${PAL.map(c => `<button type="button" data-c="${c}" style="background:${c}" aria-label="Colour ${c}"></button>`).join("")}</div><span class="sep"></span>
    <button class="ibtn" type="button" data-x="undo" aria-label="Undo" data-tip="Undo (Ctrl+Z)">${glyph("undo")}</button><button class="ibtn" type="button" data-x="redo" aria-label="Redo" data-tip="Redo (Ctrl+Y)">${glyph("redo")}</button>
    <button class="ibtn" type="button" data-x="clear" aria-label="Clear canvas" data-tip="Clear canvas">${glyph("trash")}</button>`;
  const cv = h("canvas", { "aria-label": "Drawing canvas" }), ctx = cv.getContext("2d", { willReadFrequently: true });
  const stage = h("div", { class: "pt-stage" }, cv);
  const stat = h("div", { class: "statusbar" });
  win.body.append(tools, stage, stat);

  const name = () => path ? fs.baseName(path) : "Untitled";
  const title = () => win.setTitle(`${dirty ? "*" : ""}${name()} - Paint`);
  function blank(w = 960, hh = 560) { cv.width = w; cv.height = hh; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, hh); undo.length = redo.length = 0; dirty = false; title(); status(); }
  function status(p) { stat.innerHTML = `<span>${p ? `${p[0]}, ${p[1]}px` : ""}</span><span>${cv.width} × ${cv.height}px</span><span class="grow"></span><span>${TOOLS.find(t => t[0] === tool)[2]}</span>`; }
  const snap = () => { undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); if (undo.length > 30) undo.shift(); redo.length = 0; };
  const setTool = t => { tool = t; $$("[data-t]", tools).forEach(b => b.classList.toggle("on", b.dataset.t === t)); cv.style.cursor = t === "pick" ? "copy" : t === "fill" ? "cell" : "crosshair"; status(); };
  const setColor = c => { color = c; $(".pt-cur", tools).style.background = c; $(".pt-cur input", tools).value = c; };
  async function load(p) {
    path = p; const img = new Image(); img.src = fs.url(p);
    try { await img.decode(); } catch { blank(); os.notify({ title: "Paint can't open this file", body: fs.baseName(p), app: "paint" }); return; }
    cv.width = img.naturalWidth || 960; cv.height = img.naturalHeight || 560; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0);
    if (fs.extOf(p) !== "png") path = null;   // edits save as a new PNG
    undo.length = redo.length = 0; dirty = false; title(); status();
  }
  async function save(as) {
    let p = path;
    if (as || !p || p.toLowerCase().startsWith(fs.RIVA.toLowerCase())) { p = await pickFile({ mode: "save", owner: win, dir: fs.PICS, name: name().replace(/\.\w+$/, "") + ".png", exts: ["png"] }); if (!p) return false; }
    const blob = await new Promise(r => cv.toBlob(r, "image/png"));
    try { fs.write(p, blob, { mime: "image/png" }); } catch (e) { os.ui.alert({ owner: win, title: "Paint", text: e.message }); return false; }
    path = p; dirty = false; title(); return true;
  }
  async function guard() {
    if (!dirty) return true;
    const r = await os.wm.dialog({ owner: win, title: "Paint", body: `<p>Do you want to save changes to ${esc(name())}?</p>`, buttons: [{ label: "Save", value: "save", primary: true }, { label: "Don't save", value: "no" }, { label: "Cancel", value: null }] });
    return r === "save" ? save() : r === "no";
  }
  function flood(x, y, hex) {
    const W = cv.width, H = cv.height, img = ctx.getImageData(0, 0, W, H), d = img.data, i0 = (y * W + x) * 4;
    const t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]], f = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255];
    if (t.every((v, k) => Math.abs(v - f[k]) < 3)) return;
    const same = i => Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2]) + Math.abs(d[i + 3] - t[3]) < 96;
    const stack = [[x, y]];
    while (stack.length) {
      let [cx, cy] = stack.pop(), i = (cy * W + cx) * 4;
      while (cx >= 0 && same(i)) { cx--; i -= 4; }
      cx++; i += 4; let up = false, dn = false;
      while (cx < W && same(i)) {
        d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = 255;
        if (cy > 0) { const u = same(i - W * 4); if (u && !up) { stack.push([cx, cy - 1]); up = true; } else if (!u) up = false; }
        if (cy < H - 1) { const v = same(i + W * 4); if (v && !dn) { stack.push([cx, cy + 1]); dn = true; } else if (!v) dn = false; }
        cx++; i += 4;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const pt = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) * cv.width / r.width), Math.round((e.clientY - r.top) * cv.height / r.height)]; };
  cv.addEventListener("pointermove", e => status(pt(e)));
  cv.addEventListener("pointerdown", e => {
    if (e.button !== 0 && e.button !== 2) return; e.preventDefault();
    const col = e.button === 2 ? "#ffffff" : color, p0 = pt(e);
    if (tool === "pick") { const d = ctx.getImageData(p0[0], p0[1], 1, 1).data; setColor("#" + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, "0")).join("")); setTool("brush"); return; }
    snap();
    if (tool === "fill") { flood(clamp(p0[0], 0, cv.width - 1), clamp(p0[1], 0, cv.height - 1), col); dirty = true; title(); return; }
    cv.setPointerCapture(e.pointerId);
    const base = ctx.getImageData(0, 0, cv.width, cv.height);
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : col;
    ctx.lineWidth = tool === "pencil" ? Math.max(1, size / 4) : tool === "eraser" ? size * 2 : size;
    let last = p0;
    if (["pencil", "brush", "eraser"].includes(tool)) { ctx.beginPath(); ctx.arc(p0[0], p0[1], ctx.lineWidth / 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); }
    const mv = ev => {
      const p = pt(ev); status(p);
      if (["pencil", "brush", "eraser"].includes(tool)) { ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); last = p; return; }
      ctx.putImageData(base, 0, 0); ctx.beginPath();
      let [x, y] = p0, [x2, y2] = p;
      if (ev.shiftKey && tool !== "line") { const s = Math.max(Math.abs(x2 - x), Math.abs(y2 - y)); x2 = x + Math.sign(x2 - x) * s; y2 = y + Math.sign(y2 - y) * s; }
      if (tool === "line") { ctx.moveTo(x, y); ctx.lineTo(x2, y2); }
      if (tool === "rect") ctx.rect(Math.min(x, x2), Math.min(y, y2), Math.abs(x2 - x), Math.abs(y2 - y));
      if (tool === "ellipse") ctx.ellipse((x + x2) / 2, (y + y2) / 2, Math.abs(x2 - x) / 2 || 1, Math.abs(y2 - y) / 2 || 1, 0, 0, Math.PI * 2);
      ctx.stroke();
    };
    const up = () => { cv.removeEventListener("pointermove", mv); cv.removeEventListener("pointerup", up); cv.removeEventListener("pointercancel", up); dirty = true; title(); };
    cv.addEventListener("pointermove", mv); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  });
  cv.addEventListener("contextmenu", e => e.preventDefault());
  tools.addEventListener("click", e => {
    const t = e.target.closest("[data-t]"); if (t) { setTool(t.dataset.t); return; }
    const c = e.target.closest("[data-c]"); if (c) { setColor(c.dataset.c); return; }
    const x = e.target.closest("[data-x]")?.dataset.x;
    if (x === "undo" && undo.length) { redo.push(ctx.getImageData(0, 0, cv.width, cv.height)); ctx.putImageData(undo.pop(), 0, 0); dirty = true; title(); }
    if (x === "redo" && redo.length) { undo.push(ctx.getImageData(0, 0, cv.width, cv.height)); ctx.putImageData(redo.pop(), 0, 0); dirty = true; title(); }
    if (x === "clear") { snap(); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height); dirty = true; title(); }
    const m = e.target.closest("[data-m]"); if (m) { const r = m.getBoundingClientRect(); os.menu([
      { label: "New", kbd: "Ctrl+N", icon: glyph("plus"), run: async () => { if (await guard()) { path = null; blank(); } } },
      { label: "Open…", kbd: "Ctrl+O", icon: glyph("folder"), run: async () => { if (!(await guard())) return; const p = await pickFile({ owner: win, dir: fs.PICS, exts: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"] }); if (p) load(p); } },
      { label: "Save", kbd: "Ctrl+S", icon: glyph("save"), run: () => save() }, { label: "Save as…", icon: glyph("save"), run: () => save(true) },
      { label: "Download as PNG", icon: glyph("download"), run: () => cv.toBlob(b => { const a = h("a", { href: URL.createObjectURL(b), download: name().replace(/\.\w+$/, "") + ".png" }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }) },
      { label: "Set as desktop background", icon: glyph("desktop"), run: async () => { if (await save(!path)) os.settings.set("wallpaper", "file:" + path); } }
    ], r.left, r.bottom + 2); }
  });
  $("input[type=range]", tools).addEventListener("input", e => { size = +e.target.value; e.target.style.setProperty("--p", size / 60 * 100 + "%"); e.target.nextElementSibling.textContent = size; });
  $(".pt-cur input", tools).addEventListener("input", e => setColor(e.target.value));
  win.el.addEventListener("keydown", e => {
    if (!(e.ctrlKey || e.metaKey)) return; const k = e.key.toLowerCase();
    if (k === "z") { e.preventDefault(); $('[data-x="undo"]', tools).click(); } if (k === "y") { e.preventDefault(); $('[data-x="redo"]', tools).click(); }
    if (k === "s") { e.preventDefault(); save(e.shiftKey); }
  });
  blank(); setTool("brush");
  if (args.path) await load(fs.resolve(args.path));
  return { onClose: guard };
}

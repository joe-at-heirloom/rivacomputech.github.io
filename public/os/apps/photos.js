/* Photos: a gallery of Pictures, and a viewer with zoom, next/previous and "Set as background". */
import { h, $, $$, esc, glyph, injectCSS, os, settings, clamp, fmtBytes } from "../core.js";
import * as fs from "../fs.js";
import { download } from "../ui.js";

injectCSS("photos", `
.ph-bar{display:flex;align-items:center;gap:2px;padding:6px 10px;border-bottom:1px solid var(--divider);flex-wrap:wrap}
.ph-bar .t{flex:1;min-width:0;font-size:13px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 6px}
.ph-stage{flex:1;min-height:0;position:relative;overflow:hidden;background:var(--mica-2);display:grid;place-items:center;touch-action:none;cursor:grab}
.ph-stage.drag{cursor:grabbing}
.ph-stage img{max-width:none;user-select:none;-webkit-user-drag:none;transform-origin:center;box-shadow:0 10px 40px -10px rgba(0,0,0,.4);background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/16px 16px}
.ph-nav{position:absolute;top:50%;margin-top:-22px;width:44px;height:44px;border-radius:50%;background:var(--acrylic);backdrop-filter:blur(10px);border:1px solid var(--stroke);display:grid;place-items:center;color:var(--text);opacity:0;transition:opacity .15s}
.ph-stage:hover .ph-nav{opacity:1}
.ph-nav.l{left:14px}.ph-nav.r{right:14px}
.ph-gal{flex:1;overflow:auto;padding:18px 20px 30px;background:var(--layer-2)}
.ph-gal h3{font-size:14px;margin:12px 4px 10px}
.ph-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.ph-grid button{aspect-ratio:4/3;border:0;border-radius:8px;padding:0;overflow:hidden;background:var(--card);position:relative;box-shadow:0 0 0 1px var(--stroke)}
.ph-grid img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .25s var(--ease)}
.ph-grid button:hover img{transform:scale(1.04)}
.ph-grid span{position:absolute;left:0;right:0;bottom:0;padding:16px 8px 6px;font-size:11.5px;color:#fff;text-align:left;background:linear-gradient(transparent,rgba(0,0,0,.6));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`);

export const winOpts = { w: 920, h: 640, minW: 360, minH: 300 };

export default function photos(win, args) {
  let path = null, list = [], z = 1, fit = 1, rot = 0, tx = 0, ty = 0;
  const bar = h("div", { class: "ph-bar" }), body = h("div", { style: { flex: 1, display: "flex", flexDirection: "column", minHeight: 0 } });
  win.body.append(bar, body);
  const B = (g, l, fn, dis) => `<button class="ibtn" type="button" data-a="${fn}" aria-label="${l}" data-tip="${l}" ${dis ? "disabled" : ""}>${glyph(g)}</button>`;

  function gallery() {
    path = null; win.setTitle("Photos");
    const all = []; fs.walk(fs.PICS, n => { if (fs.isImage(n)) all.push(n); }); fs.walk(fs.DESKTOP, n => { if (fs.isImage(n)) all.push(n); });
    bar.innerHTML = `<span class="t">Gallery · ${all.length} item${all.length === 1 ? "" : "s"}</span>${B("folder", "Open folder in File Explorer", "folder")}`;
    body.innerHTML = `<div class="ph-gal"><h3>Pictures</h3>${all.length ? `<div class="ph-grid">${all.sort((a, b) => b.mtime - a.mtime).map(n => `<button type="button" data-p="${esc(n.path)}"><img src="${esc(fs.url(n.path))}" alt="" loading="lazy"><span>${esc(n.name)}</span></button>`).join("")}</div>` : `<p class="muted">No pictures yet. Drop images onto the desktop, or draw something in Paint.</p>`}</div>`;
  }
  function view(p) {
    const n = fs.stat(p); if (!n) return gallery();
    path = n.path; z = 1; rot = 0; tx = ty = 0;
    list = fs.ls(fs.parentOf(path)).filter(fs.isImage).map(x => x.path);
    const i = list.indexOf(path);
    win.setTitle(n.name + " — Photos");
    bar.innerHTML = B("grid", "Gallery", "gal") + `<span class="t">${esc(n.name)} · ${fmtBytes(n.size || 0)} · ${i + 1} of ${list.length}</span>` +
      B("zoom-out", "Zoom out", "zo") + B("zoom-in", "Zoom in", "zi") + B("monitor", "Fit to window", "fit") + B("refresh", "Rotate", "rot") +
      B("brush", "Edit in Paint", "paint") + B("desktop", "Set as desktop background", "bg") + B("download", "Download", "dl") + B("trash", "Delete", "del", n.path.toLowerCase().startsWith(fs.RIVA.toLowerCase()));
    body.innerHTML = `<div class="ph-stage"><img alt="${esc(n.name)}" draggable="false">${list.length > 1 ? `<button class="ph-nav l" type="button" data-a="prev" aria-label="Previous">${glyph("chev-l")}</button><button class="ph-nav r" type="button" data-a="next" aria-label="Next">${glyph("chev-r")}</button>` : ""}</div>`;
    const img = $("img", body), st = $(".ph-stage", body);
    img.onload = () => { fit = Math.min(1, (st.clientWidth - 40) / img.naturalWidth, (st.clientHeight - 40) / img.naturalHeight) || 1; z = fit; apply(); };
    img.src = fs.url(path);
    st.addEventListener("wheel", e => { e.preventDefault(); z = clamp(z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), .05, 12); apply(); }, { passive: false });
    st.addEventListener("pointerdown", e => {
      if (e.target.closest("button")) return; const sx = e.clientX - tx, sy = e.clientY - ty; st.classList.add("drag"); st.setPointerCapture(e.pointerId);
      const mv = ev => { tx = ev.clientX - sx; ty = ev.clientY - sy; apply(); }, up = () => { st.classList.remove("drag"); st.removeEventListener("pointermove", mv); st.removeEventListener("pointerup", up); };
      st.addEventListener("pointermove", mv); st.addEventListener("pointerup", up);
    });
    st.addEventListener("dblclick", () => { z = Math.abs(z - fit) < .01 ? 1 : fit; tx = ty = 0; apply(); });
  }
  const apply = () => { const img = $(".ph-stage img", body); if (img) { img.style.width = img.naturalWidth * z + "px"; img.style.transform = `translate(${tx}px,${ty}px) rotate(${rot}deg)`; } };
  const step = d => { if (list.length > 1) view(list[(list.indexOf(path) + d + list.length) % list.length]); };
  win.body.addEventListener("click", async e => {
    const p = e.target.closest("[data-p]"); if (p) { view(p.dataset.p); return; }
    const a = e.target.closest("[data-a]")?.dataset.a; if (!a) return;
    if (a === "gal") gallery(); if (a === "folder") os.launch("explorer", { path: fs.PICS });
    if (a === "zi") { z = clamp(z * 1.25, .05, 12); apply(); } if (a === "zo") { z = clamp(z / 1.25, .05, 12); apply(); }
    if (a === "fit") { z = fit; tx = ty = 0; apply(); } if (a === "rot") { rot = (rot + 90) % 360; apply(); }
    if (a === "prev") step(-1); if (a === "next") step(1);
    if (a === "bg") { settings.set("wallpaper", "file:" + path); os.notify({ title: "Background updated", body: fs.baseName(path), app: "photos", silent: true }); }
    if (a === "paint") os.launch("paint", { path });
    if (a === "dl") download(path);
    if (a === "del") { const p0 = path; await os.fileops.remove([p0], { owner: win }); if (!fs.exists(p0)) { list = list.filter(x => x !== p0); list.length ? view(list[0]) : gallery(); } }
  });
  win.el.addEventListener("keydown", e => { if (!path) return; if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); if (e.key === "Escape") gallery(); });
  win.on("resize", () => { const img = $(".ph-stage img", body), st = $(".ph-stage", body); if (img?.naturalWidth && st) { const was = Math.abs(z - fit) < .01; fit = Math.min(1, (st.clientWidth - 40) / img.naturalWidth, (st.clientHeight - 40) / img.naturalHeight); if (was) { z = fit; apply(); } } });
  args.path ? view(args.path) : gallery();
}

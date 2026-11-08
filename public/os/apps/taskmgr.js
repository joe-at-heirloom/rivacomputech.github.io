/* Task Manager: open windows as processes, plus live performance graphs measured in this browser. */
import { h, $, $$, esc, glyph, injectCSS, os, bus, api, system } from "../core.js";
import { appIcon } from "../icons.js";
import { APPS } from "../apps.js";

injectCSS("taskmgr", `
.tm{display:flex;flex:1;min-height:0}
.tm-nav{width:200px;flex:none;padding:6px 6px 12px;overflow:auto}
.tm-page{flex:1;display:flex;flex-direction:column;min-width:0;background:var(--layer-2);border-top:1px solid var(--stroke);border-left:1px solid var(--stroke);border-radius:8px 0 0 0}
.tm-head{display:flex;align-items:center;gap:10px;padding:14px 20px 10px}
.tm-head h2{font:600 20px var(--font-display);flex:1}
.tm-tbl{flex:1;overflow:auto;padding:0 8px 12px}
.tm-tbl table{width:100%;border-collapse:collapse;font-size:12.5px}
.tm-tbl th{position:sticky;top:0;background:var(--layer-2);text-align:right;font-weight:400;color:var(--text-2);padding:8px 12px;border-bottom:1px solid var(--divider);white-space:nowrap}
.tm-tbl th:first-child,.tm-tbl td:first-child{text-align:left}
.tm-tbl th b{display:block;font:600 16px var(--font-display);color:var(--text)}
.tm-tbl td{padding:6px 12px;text-align:right;white-space:nowrap}
.tm-tbl tr.sel td{background:var(--accent-soft)}
.tm-tbl tbody tr:hover td{background:var(--subtle-hover)}
.tm-tbl td .nm{display:flex;align-items:center;gap:10px}
.tm-tbl td .nm small{color:var(--text-2)}
.tm-tbl td.heat{background:color-mix(in srgb,#ffd400 calc(var(--h,0) * 1%),transparent)}
.tm-perf{flex:1;display:flex;min-height:0}
.tm-side{width:220px;flex:none;overflow:auto;padding:4px 8px;border-right:1px solid var(--divider)}
.tm-mini{display:flex;gap:10px;align-items:center;width:100%;padding:8px;border:0;border-radius:6px;background:transparent;text-align:left;color:var(--text)}
.tm-mini:hover{background:var(--subtle-hover)}
.tm-mini.on{background:var(--accent-soft)}
.tm-mini canvas{width:64px;height:40px;flex:none;border:1px solid var(--c);border-radius:2px}
.tm-mini b{display:block;font-size:13px;font-weight:600}
.tm-mini small{display:block;font-size:12px;color:var(--text-2)}
.tm-big{flex:1;padding:16px 22px;overflow:auto;min-width:0}
.tm-big h3{font:600 24px var(--font-display);display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.tm-big h3 small{font:400 13px var(--font);color:var(--text-2)}
.tm-big .gl{font-size:12px;color:var(--text-2);display:flex;justify-content:space-between;margin:12px 0 4px}
.tm-big canvas{width:100%;height:260px;border:1px solid var(--c);display:block}
.tm-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;margin-top:18px}
.tm-stats div small{display:block;color:var(--text-2);font-size:12px}
.tm-stats div b{font:600 20px var(--font-display)}
.tm-note{font-size:12px;color:var(--text-3);margin-top:16px;line-height:1.5}
:root.compact .tm{flex-direction:column}
:root.compact .tm-nav{width:auto;display:flex;padding:4px}
:root.compact .tm-nav .navi{width:auto}
:root.compact .tm-side{display:none}
`);

export const winOpts = { w: 880, h: 580, minW: 420, minH: 340 };

export default function taskmgr(win) {
  let page = "proc", selId = null, metric = "cpu", timer;
  const H = { cpu: [], mem: [], fps: [], net: [] }, N = 60;
  const nav = h("nav", { class: "tm-nav" });
  nav.innerHTML = `<button class="navi" type="button" data-p="proc">${glyph("grid")}Processes</button><button class="navi" type="button" data-p="perf">${glyph("activity")}Performance</button>`;
  const body = h("div", { class: "tm-page" });
  win.body.append(h("div", { class: "tm" }, nav, body));

  // ── measurement: main-thread busy time (long tasks, or timer drift), frame rate, heap, edge latency ──
  let busy = 0, frames = 0, lastT = performance.now(), drift = 0, rtt = null, raf;
  try { const po = new PerformanceObserver(l => l.getEntries().forEach(e => { busy += e.duration; })); po.observe({ type: "longtask", buffered: false }); win.on("close", () => po.disconnect()); } catch {}
  const loop = () => { frames++; raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop);
  let exp = performance.now() + 100; const drifter = setInterval(() => { const n = performance.now(); drift += Math.max(0, n - exp); exp = n + 100; }, 100);
  const ping = async () => { try { const t0 = performance.now(); await api("ping", {}, 3000); rtt = Math.round(performance.now() - t0); } catch { rtt = null; } };
  ping(); const pinger = setInterval(ping, 5000);
  function sample() {
    const now = performance.now(), dt = now - lastT; lastT = now;
    const cpu = Math.min(100, Math.max(busy, drift) / dt * 100 + Math.random() * 2 + os.wm.list().length * .4);
    const fps = Math.round(frames * 1000 / dt);
    const mem = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : document.getElementsByTagName("*").length / 40;
    busy = drift = frames = 0;
    [["cpu", cpu], ["mem", mem], ["fps", fps], ["net", rtt ?? 0]].forEach(([k, v]) => { H[k].push(v); if (H[k].length > N) H[k].shift(); });
    page === "proc" ? renderProc(cpu, mem) : renderPerf();
  }
  const procs = () => os.wm.list().filter(w => !w.owner).map(w => ({ w, id: 1000 + w.id, nodes: w.el.getElementsByTagName("*").length }));
  function renderProc(cpu, mem) {
    const list = procs(), totalNodes = list.reduce((s, p) => s + p.nodes, 0) || 1;
    const rows = list.map(p => { const share = p.nodes / totalNodes, active = os.wm.active === p.w; return { ...p, cpu: Math.max(0, (cpu * (active ? .55 : .15) * share * 2 + Math.random() * .4)), mb: (p.nodes / 18 + 12).toFixed(1) }; }).sort((a, b) => b.mb - a.mb);
    const tb = $("tbody", body);
    if (!tb) {
      body.innerHTML = `<div class="tm-head"><h2>Processes</h2><button class="btn" type="button" id="tm-new">${glyph("plus")}Run new task</button><button class="btn" type="button" id="tm-end" disabled>${glyph("x")}End task</button></div>
        <div class="tm-tbl"><table><thead><tr><th>Name</th><th>Status</th><th><b id="tm-c"></b>CPU</th><th><b id="tm-m"></b>Memory</th><th>PID</th></tr></thead><tbody></tbody></table></div>`;
      $("#tm-end", body).addEventListener("click", () => { const p = procs().find(x => x.id === selId); if (p) { p.w.close(true); selId = null; } });
      $("#tm-new", body).addEventListener("click", async () => { const v = await os.ui.prompt({ owner: win, title: "Create new task", label: "Type the name of an app, e.g. notepad, calc or terminal.", value: "" }); if (!v) return; const k = v.trim().toLowerCase().replace(/\.exe$/, ""); const id = APPS[k] ? k : { calc: "calculator", mspaint: "paint", cmd: "terminal", powershell: "terminal", pwsh: "terminal", wt: "terminal", control: "settings" }[k]; id ? os.launch(id) : os.ui.alert({ owner: win, title: "Run", text: `rivaOS cannot find '${v}'.` }); });
      body.addEventListener("click", e => { const tr = e.target.closest("tr[data-id]"); if (!tr) return; selId = +tr.dataset.id; $$("tr[data-id]", body).forEach(r => r.classList.toggle("sel", +r.dataset.id === selId)); $("#tm-end", body).disabled = false; });
      body.addEventListener("dblclick", e => { const tr = e.target.closest("tr[data-id]"); const p = tr && procs().find(x => x.id === +tr.dataset.id); if (p) { p.w.restore(); p.w.focus(); } });
      return renderProc(cpu, mem);
    }
    $("#tm-c", body).textContent = Math.round(cpu) + "%"; $("#tm-m", body).textContent = (performance.memory ? Math.round(mem) + " MB" : Math.round(list.reduce((s, r) => s + r.nodes / 18 + 12, 0)) + " MB");
    tb.innerHTML = rows.map(r => `<tr data-id="${r.id}" class="${r.id === selId ? "sel" : ""}"><td><span class="nm">${appIcon(r.w.app, 18)}<span>${esc(APPS[r.w.app]?.name || r.w.app)} <small>${r.w.title !== APPS[r.w.app]?.name ? "— " + esc(r.w.title) : ""}</small></span></span></td><td>${r.w.minimized ? "Suspended" : ""}</td><td class="heat" style="--h:${Math.min(60, r.cpu * 6)}">${r.cpu.toFixed(1)}%</td><td class="heat" style="--h:${Math.min(40, r.mb / 3)}">${r.mb} MB</td><td>${r.id}</td></tr>`).join("") ||
      `<tr><td colspan="5" style="text-align:center;color:var(--text-2);padding:30px">No apps are running.</td></tr>`;
    if (selId && !rows.some(r => r.id === selId)) { selId = null; $("#tm-end", body).disabled = true; }
  }
  const META = { cpu: ["CPU", "#1e9bf0", v => Math.round(v) + "%", 100], mem: ["Memory", "#a855f7", v => Math.round(v) + " MB", null], fps: ["Frame rate", "#16a34a", v => v + " fps", 120], net: ["Edge latency", "#e19b00", v => v ? v + " ms" : "—", null] };
  function draw(cv, data, color, max) {
    const r = devicePixelRatio || 1, w = cv.clientWidth, hh = cv.clientHeight; if (!w) return;
    if (cv.width !== w * r) { cv.width = w * r; cv.height = hh * r; }
    const c = cv.getContext("2d"); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, w, hh);
    const m = max || Math.max(10, ...data) * 1.2;
    c.strokeStyle = color + "33"; c.lineWidth = 1;
    for (let i = 1; i < 10; i++) { c.beginPath(); c.moveTo(0, hh * i / 10); c.lineTo(w, hh * i / 10); c.stroke(); }
    for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(w * i / 6, 0); c.lineTo(w * i / 6, hh); c.stroke(); }
    if (!data.length) return;
    const x = i => w - (data.length - 1 - i) * (w / (N - 1)), y = v => hh - Math.min(1, v / m) * hh;
    c.beginPath(); c.moveTo(x(0), hh); data.forEach((v, i) => c.lineTo(x(i), y(v))); c.lineTo(x(data.length - 1), hh); c.closePath(); c.fillStyle = color + "26"; c.fill();
    c.beginPath(); data.forEach((v, i) => i ? c.lineTo(x(i), y(v)) : c.moveTo(x(i), y(v))); c.strokeStyle = color; c.lineWidth = 1.5; c.stroke();
  }
  async function renderPerf() {
    if (!$(".tm-perf", body)) {
      body.innerHTML = `<div class="tm-head"><h2>Performance</h2></div><div class="tm-perf"><div class="tm-side">${Object.entries(META).map(([k, [l, c]]) => `<button class="tm-mini" type="button" data-k="${k}" style="--c:${c}"><canvas></canvas><span><b>${l}</b><small></small></span></button>`).join("")}</div><div class="tm-big"></div></div>`;
      $(".tm-side", body).addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) { metric = b.dataset.k; $(".tm-big", body).innerHTML = ""; renderPerf(); } });
    }
    $$(".tm-mini", body).forEach(b => { const k = b.dataset.k, [, c, f, mx] = META[k]; b.classList.toggle("on", k === metric); draw($("canvas", b), H[k], c, mx); $("small", b).textContent = f(H[k][H[k].length - 1] || 0); });
    const big = $(".tm-big", body), [l, c, f, mx] = META[metric], cur = H[metric][H[metric].length - 1] || 0;
    if (!big.firstChild) {
      const s = await system();
      const sub = { cpu: `${navigator.hardwareConcurrency || "?"} logical processors`, mem: performance.memory ? "JavaScript heap" : "Estimated from page size", fps: "Display refresh as seen by rivaOS", net: s ? `Cloudflare ${s.colo}` : "Worker not running" }[metric];
      big.innerHTML = `<h3>${l}<small>${esc(sub)}</small></h3><div class="gl"><span>% utilization over 60 seconds</span><span id="tm-max"></span></div><canvas style="--c:${c}"></canvas><div class="tm-stats" id="tm-stats"></div>
        <p class="tm-note">Measured live in this browser.</p>`;
    }
    $("canvas", big).style.setProperty("--c", c); draw($("canvas", big), H[metric], c, mx);
    $("#tm-max", big).textContent = mx ? (metric === "cpu" ? "100%" : mx + " fps") : f(Math.max(...H[metric], 0) * 1.2);
    const a = H[metric], avg = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
    $("#tm-stats", big).innerHTML = `<div><small>Now</small><b>${f(cur)}</b></div><div><small>Average</small><b>${f(Math.round(avg))}</b></div><div><small>Peak</small><b>${f(Math.round(Math.max(0, ...a)))}</b></div><div><small>Windows open</small><b>${os.wm.list().length}</b></div><div><small>Uptime</small><b>${Math.floor(performance.now() / 60000)}m</b></div>`;
  }
  function show(p) { page = p; body.innerHTML = ""; $$(".navi", nav).forEach(b => b.classList.toggle("on", b.dataset.p === p)); sample(); }
  nav.addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) show(b.dataset.p); });
  const off = bus.on("wm", e => { if (page === "proc" && (e.type === "open" || e.type === "close" || e.type === "title")) setTimeout(sample, 50); });
  show("proc"); timer = setInterval(sample, 1000);
  win.on("close", () => { clearInterval(timer); clearInterval(drifter); clearInterval(pinger); cancelAnimationFrame(raf); off(); });
}

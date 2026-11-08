/* Script Editor: a PowerShell editor with highlighting and a Run button wired to rivaOS PowerShell. */
import { h, $, $$, esc, glyph, injectCSS, os, store } from "../core.js";
import * as fs from "../fs.js";
import { createShell, hlPS } from "../ps.js";
import { pickFile } from "../ui.js";

injectCSS("code", `
.win[data-app=code]{background:#1f1f1f;--text:#e8e8e8;--text-2:#a8a8a8;--divider:#2b2b2b;--subtle-hover:rgba(255,255,255,.07);--subtle-press:rgba(255,255,255,.04);--ctl:rgba(255,255,255,.06);--ctl-hover:rgba(255,255,255,.09);--ctl-edge:rgba(255,255,255,.08);--ctl-edge-b:rgba(255,255,255,.04);--field:rgba(255,255,255,.06);--field-focus:#181818;--field-line:rgba(255,255,255,.4);color-scheme:dark;color:#e8e8e8}
.win[data-app=code] .cap{color:#fff}
.ce-tools{display:flex;align-items:center;gap:4px;padding:6px 10px;border-bottom:1px solid #2b2b2b;flex-wrap:wrap}
.ce-tools .sep{width:1px;height:20px;background:#333;margin:0 4px}
.ce-tools .args{flex:1;min-width:140px;max-width:420px;min-height:28px;font:12.5px var(--mono)}
.ce-run{background:#2ea043!important;color:#fff!important;border-color:transparent!important}
.ce-run:hover{background:#3fb950!important}
.ce-run:disabled{opacity:.5}
.ce-tab{display:flex;align-items:center;gap:8px;padding:6px 14px;background:#1f1f1f;border-bottom:1px solid #2b2b2b;font-size:12.5px;color:#ccc}
.ce-tab .ps-dot{font:700 11px var(--mono);color:#5aa9ff}
.ce-tab .dirty{width:8px;height:8px;border-radius:50%;background:#ccc}
.ce-ed{flex:1;min-height:0;display:flex;background:#1e1e1e;position:relative;font:13.5px/1.6 var(--mono)}
.ce-gut{padding:10px 10px 40px 14px;text-align:right;color:#6e7681;user-select:none;overflow:hidden;min-width:48px;white-space:pre}
.ce-scroll{position:relative;flex:1;min-width:0;overflow:auto}
.ce-scroll pre,.ce-scroll textarea{margin:0;padding:10px 14px 40px 4px;font:inherit;white-space:pre;tab-size:4;border:0;min-height:100%;min-width:100%}
.ce-scroll pre{position:absolute;inset:0 auto auto 0;pointer-events:none;color:#d4d4d4;min-width:max-content}
.ce-scroll textarea{position:relative;display:block;width:100%;height:100%;resize:none;outline:0;background:transparent;color:transparent;caret-color:#fff;-webkit-text-fill-color:transparent;overflow:hidden}
.ce-scroll textarea::selection{background:#264f78;-webkit-text-fill-color:transparent}
.ce-ed .tk-fn{color:#dcdcaa}.ce-ed .tk-pa{color:#9cdcfe}.ce-ed .tk-va{color:#4fc1ff}.ce-ed .tk-st{color:#ce9178}.ce-ed .tk-cm{color:#6a9955}.ce-ed .tk-kw{color:#c586c0}.ce-ed .tk-nu{color:#b5cea8}.ce-ed .tk-ty{color:#4ec9b0}.ce-ed .tk-op{color:#d4d4d4}
.ce-out{height:38%;min-height:90px;display:flex;flex-direction:column;border-top:1px solid #333;background:#181818}
.ce-out-h{display:flex;align-items:center;gap:18px;padding:0 10px 0 16px;height:34px;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:#999;flex:none}
.ce-out-h b{color:#e8e8e8;font-weight:600;border-bottom:1px solid #e8e8e8;padding:8px 0 6px}
.ce-out-h .ibtn{margin-left:auto;color:#ccc}
.ce-term{flex:1;overflow:auto;padding:4px 16px 14px;font:13px/1.5 var(--mono);white-space:pre-wrap;color:#ccc;user-select:text;-webkit-user-select:text}
.ce-term .c-g{color:#16C60C}.ce-term .c-dg{color:#13A10E}.ce-term .c-y{color:#F9F1A5}.ce-term .c-c{color:#61D6D6}.ce-term .c-dc{color:#3A96DD}.ce-term .c-r{color:#E74856}.ce-term .c-gr{color:#808080}.ce-term .c-w{color:#F2F2F2}.ce-term .c-b{color:#3B78FF}.ce-term .c-m{color:#B4009E}.ce-term .c-h{color:#16C60C;font-weight:700}
.ce-term .tk-fn{color:#dcdcaa}.ce-term .tk-pa{color:#9cdcfe}.ce-term .tk-va{color:#4fc1ff}.ce-term .tk-st{color:#ce9178}
.ce-term .t-link{color:inherit}
.ce-term .pbar{color:#16C60C}.ce-term .pbar i{font-style:normal;color:#333}
.win[data-app=code] .statusbar{background:#0e639c;color:#fff;border-top:0}
`);

export const winOpts = { w: 960, h: 660, minW: 420, minH: 320 };
const DEFAULT_ARGS = { "offboard-user.ps1": "-User alex@contoso.com -Manager sam@contoso.com" };

export default async function code(win, args) {
  let path = null, saved = "", dirty = false, running = false;
  const tools = h("div", { class: "ce-tools" });
  const argsF = h("input", { class: "field args", placeholder: "Arguments, e.g. -User alex@contoso.com", "aria-label": "Script arguments", spellcheck: "false" });
  const runB = h("button", { class: "btn ce-run", type: "button", "data-tip": "Run (F5)", html: glyph("play") + "<span>Run</span>" });
  const stopB = h("button", { class: "btn", type: "button", disabled: true, html: glyph("stop") + "<span>Stop</span>" });
  const B = (g, label, fn) => h("button", { class: "ibtn", type: "button", "aria-label": label, "data-tip": label, html: glyph(g), onclick: fn });
  tools.append(B("plus", "New script", () => os.launch("code")), B("folder", "Open… (Ctrl+O)", openDlg), B("save", "Save (Ctrl+S)", () => save()), h("span", { class: "sep" }), runB, stopB, argsF);
  const tab = h("div", { class: "ce-tab" });
  const gut = h("div", { class: "ce-gut", "aria-hidden": "true" }), pre = h("pre", { "aria-hidden": "true" }), ta = h("textarea", { spellcheck: "false", autocapitalize: "off", autocomplete: "off", "aria-label": "Script" });
  const scroll = h("div", { class: "ce-scroll" }, pre, ta);
  const ed = h("div", { class: "ce-ed" }, gut, scroll);
  const outT = h("div", { class: "ce-term", role: "log", "aria-live": "polite" });
  const out = h("div", { class: "ce-out", hidden: true }, h("div", { class: "ce-out-h", html: `<b>Terminal</b><span>Output</span><span>Problems</span>` }), outT);
  $(".ce-out-h", out).append(B("x", "Close panel", () => { out.hidden = true; }));
  const stat = h("div", { class: "statusbar" });
  win.body.append(tools, tab, ed, out, stat);

  const host = { line(html) { outT.append(h("div", { class: "t-l", html: html || "" })); outT.scrollTop = outT.scrollHeight; }, clear() { outT.innerHTML = ""; }, update(id, html) { const el = outT.querySelector("#" + id); if (el) el.innerHTML = html; }, cwd() {}, exit() {} };
  let sh = createShell({ host, cwd: fs.DOCS });

  const name = () => path ? fs.baseName(path) : "Untitled-1.ps1";
  const isRO = () => path && path.toLowerCase().startsWith(fs.RIVA.toLowerCase());
  function paint() {
    const v = ta.value, n = v.split("\n").length;
    pre.innerHTML = v.split("\n").map(l => hlPS(l) || " ").join("\n") + "\n";
    gut.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
    ta.style.height = (n * 1.6 * 13.5 + 60) + "px";
    ta.style.width = Math.max(scroll.clientWidth, pre.scrollWidth) + "px";
    const p = ta.selectionStart, b = v.slice(0, p);
    stat.innerHTML = `<span>Ln ${b.split("\n").length}, Col ${p - b.lastIndexOf("\n")}</span><span class="grow"></span><span>Spaces: 4</span><span>UTF-8</span><span>CRLF</span><span>PowerShell</span>`;
  }
  scroll.addEventListener("scroll", () => { gut.scrollTop = scroll.scrollTop; });
  function header() {
    tab.innerHTML = `<span class="ps-dot">&gt;_</span><span>${esc(name())}</span>${dirty ? '<span class="dirty" title="Unsaved changes"></span>' : ""}${isRO() ? '<span style="color:#999">(read-only)</span>' : ""}`;
    win.setTitle(`${dirty ? "● " : ""}${name()} — Script Editor`);
  }
  async function load(p) {
    path = p && fs.exists(p) ? fs.stat(p).path : p ? fs.resolve(p) : null;
    saved = path && fs.exists(path) ? (await fs.text(path)).replace(/\r\n/g, "\n") : "# New PowerShell script\nWrite-Host \"Hello from rivaOS\" -ForegroundColor Cyan\n";
    ta.value = saved; dirty = false;
    argsF.value = store.get("ce:args", {})[(path || "").toLowerCase()] ?? DEFAULT_ARGS[name().toLowerCase()] ?? "";
    header(); paint(); ta.setSelectionRange(0, 0); scroll.scrollTop = 0;
  }
  async function save(as) {
    let p = path;
    if (as || !p || isRO()) { p = await pickFile({ mode: "save", owner: win, dir: p && !isRO() ? fs.parentOf(p) : fs.join(fs.DOCS, "Scripts"), name: name(), exts: ["ps1"] }); if (!p) return false; }
    try { fs.write(p, ta.value.replace(/\r?\n/g, "\r\n"), { parents: true }); } catch (e) { os.ui.alert({ owner: win, title: "Script Editor", text: e.message }); return false; }
    path = p; saved = ta.value; dirty = false; header(); return true;
  }
  async function openDlg() { if (!(await guard())) return; const p = await pickFile({ mode: "open", owner: win, dir: path ? fs.parentOf(path) : fs.join(fs.DOCS, "Scripts"), exts: ["ps1", "txt"] }); if (p) load(p); }
  async function guard() {
    if (!dirty) return true;
    const r = await os.wm.dialog({ owner: win, title: "Script Editor", body: `<p>Save changes to ${esc(name())}?</p>`, buttons: [{ label: "Save", value: "save", primary: true }, { label: "Don't save", value: "no" }, { label: "Cancel", value: null }] });
    return r === "save" ? save() : r === "no";
  }
  async function run() {
    if (running) return; running = true; runB.disabled = true; stopB.disabled = false; out.hidden = false;
    const a = store.get("ce:args", {}); a[(path || "").toLowerCase()] = argsF.value; store.set("ce:args", a);
    host.line(""); host.line(`<span style="color:#808080">PS ${esc(path ? fs.parentOf(path) : fs.DOCS)}&gt;</span> ${hlPS(".\\" + name() + (argsF.value ? " " + argsF.value : ""), true)}`);
    sh.S.cwd = path ? fs.parentOf(path) : fs.DOCS;
    const t0 = performance.now();
    try { await sh.run(ta.value, name(), argsF.value); } catch (e) { host.line(`<span class="c-r">${esc(e.message)}</span>`); }
    const secs = ((performance.now() - t0) / 1000).toFixed(1);
    host.line(`<span class="c-gr"># Finished in ${secs}s.${/offboard/i.test(name()) ? " By hand: four admin portals and a checklist. Every time." : ""}</span>`);
    running = false; runB.disabled = false; stopB.disabled = true;
  }
  runB.addEventListener("click", run);
  stopB.addEventListener("click", () => { sh.abort(); host.line('<span class="c-r">^C  Stopped.</span>'); });
  argsF.addEventListener("keydown", e => { if (e.key === "Enter") run(); });
  ta.addEventListener("input", () => { const d = ta.value !== saved; if (d !== dirty) { dirty = d; header(); } paint(); });
  ["keyup", "click"].forEach(ev => ta.addEventListener(ev, paint));
  ta.addEventListener("keydown", e => {
    if (e.key === "Tab") { e.preventDefault(); ta.setRangeText("    ", ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); }
    if (e.key === "Enter") { const b = ta.value.slice(0, ta.selectionStart), ind = (b.split("\n").pop().match(/^\s*/) || [""])[0] + (/\{\s*$/.test(b) ? "    " : ""); e.preventDefault(); ta.setRangeText("\n" + ind, ta.selectionStart, ta.selectionEnd, "end"); ta.dispatchEvent(new Event("input")); }
  });
  win.el.addEventListener("keydown", e => {
    if (e.key === "F5") { e.preventDefault(); run(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(e.shiftKey); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") { e.preventDefault(); openDlg(); }
  });
  win.on("resize", paint);
  await load(args.path || null);
  if (args.run) run();
  setTimeout(() => ta.focus({ preventScroll: true }), 60);
  return { onClose: guard };
}

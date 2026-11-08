/* Terminal: Windows Terminal-style tabs running rivaOS PowerShell (os/ps.js). */
import { h, $, $$, esc, glyph, injectCSS, os, reduced, sleep } from "../core.js";
import * as fs from "../fs.js";
import { createShell, hlPS } from "../ps.js";

injectCSS("terminal", `
.win[data-app=terminal]{background:#202020;--text:#fff;--subtle-hover:rgba(255,255,255,.08);--subtle-press:rgba(255,255,255,.05);color:#ccc}
.win[data-app=terminal] .win-ico,.win[data-app=terminal] .win-title{display:none}
.win[data-app=terminal] .cap{color:#fff}
.win[data-app=terminal]:not(.active) .cap{color:rgba(255,255,255,.5)}
.tt-tabs{display:flex;align-items:flex-end;height:100%;padding-left:8px;gap:1px;min-width:0;overflow:hidden}
.tt-tab{display:flex;align-items:center;gap:8px;height:28px;padding:0 6px 0 12px;border-radius:7px 7px 0 0;font-size:12px;color:rgba(255,255,255,.75);background:transparent;border:0;max-width:200px;min-width:0;flex:0 1 200px}
.tt-tab:hover{background:rgba(255,255,255,.05)}
.tt-tab.on{background:#0c0c0c;color:#fff}
.tt-tab .tt-ico{width:16px;height:16px;border-radius:3px;background:#012456;display:grid;place-items:center;flex:none}
.tt-tab .tt-ico svg{width:12px;height:12px;stroke:#fff;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.tt-tab span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
.tt-tab .tx{width:20px;height:20px;border:0;padding:0;background:transparent;color:inherit;border-radius:4px;display:grid;place-items:center;opacity:.7;flex:none}
.tt-tab .tx:hover{background:rgba(255,255,255,.12);opacity:1}
.tt-tab .tx svg{width:8px;height:8px;stroke:currentColor;fill:none}
.tt-new{width:32px;height:28px;border:0;background:transparent;color:#fff;border-radius:5px;display:grid;place-items:center;flex:none;margin-bottom:1px}
.tt-new:hover{background:rgba(255,255,255,.08)}
.tt-new .i{width:14px;height:14px}
.term{flex:1;overflow:auto;background:#0c0c0c;color:#cccccc;padding:10px 14px 18px;font:14px/1.45 var(--mono);white-space:pre-wrap;word-break:break-word;cursor:text;user-select:text;-webkit-user-select:text}
.term[hidden]{display:none}
.t-l{min-height:1.45em}
.t-row{display:flex;align-items:flex-start}
.t-ps{color:#cccccc;white-space:pre;flex:none}
.t-in{position:relative;flex:1;min-width:0}
.t-in input{position:relative;width:100%;background:transparent;border:0;outline:0;padding:0;margin:0;font:inherit;color:transparent;caret-color:#cccccc;-webkit-text-fill-color:transparent;z-index:1}
.t-in .t-hl{position:absolute;left:0;top:0;white-space:pre;pointer-events:none;overflow:hidden;right:0}
.t-caret{display:inline-block;width:.6em;height:1.1em;vertical-align:-.15em;background:#cccccc;animation:blink 1.06s steps(1) infinite}
.term .t-link{color:inherit;text-decoration:underline;text-decoration-color:rgba(204,204,204,.35);text-underline-offset:3px;cursor:pointer}
.term .t-link:hover{text-decoration-color:currentColor;color:#fff}
.term .c-dir{color:#3b78ff;font-weight:700}
.c-g{color:#16C60C}.c-dg{color:#13A10E}.c-y{color:#F9F1A5}.c-dy{color:#C19C00}.c-c{color:#61D6D6}.c-dc{color:#3A96DD}.c-r{color:#E74856}.c-gr{color:#808080}.c-w{color:#F2F2F2}.c-b{color:#3B78FF}.c-m{color:#B4009E}
.c-h{color:#16C60C;font-weight:700}
.c-inv{background:#F9F1A5;color:#000}
.term .tk-fn{color:#F9F1A5}.term .tk-pa,.term .tk-op,.term .tk-ty{color:#a0a0a0}.term .tk-st{color:#3A96DD}.term .tk-va,.term .tk-kw{color:#16C60C}.term .tk-cm{color:#13A10E}.term .tk-nu{color:#F2F2F2}
.pbar{color:#16C60C}.pbar i{font-style:normal;color:#333}
.term ::selection{background:#ffffff40}
`);

export const winOpts = { w: 780, h: 500, minW: 380, minH: 220 };

export default function terminal(win, args) {
  const tabs = []; let active = null;
  const strip = h("div", { class: "tt-tabs no-drag-children" });
  const plus = h("button", { class: "tt-new", type: "button", "aria-label": "New tab", "data-tip": "New tab", html: glyph("plus") });
  win.slot.append(strip, plus);
  plus.addEventListener("click", () => addTab({}));

  function addTab({ cwd, intro }) {
    const t = { id: Math.random().toString(36).slice(2) };
    t.body = h("div", { class: "term", role: "log", "aria-live": "polite", "aria-label": "PowerShell output" });
    t.btn = h("div", { class: "tt-tab", role: "tab", tabindex: "0", html: `<span class="tt-ico"><svg viewBox="0 0 24 24"><path d="M6 7l6 5-6 5M13 17h5"/></svg></span><span>PowerShell</span><button class="tx" type="button" aria-label="Close tab"><svg viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9"/></svg></button>` });
    t.btn.addEventListener("pointerdown", e => { if (!e.target.closest(".tx")) select(t); });
    t.btn.querySelector(".tx").addEventListener("click", () => closeTab(t));
    t.btn.addEventListener("auxclick", e => { if (e.button === 1) closeTab(t); });
    strip.append(t.btn); win.body.append(t.body);
    const host = {
      line(html) { const el = h("div", { class: "t-l", html: html || "" }); t.row && t.row.parentNode === t.body ? t.body.insertBefore(el, t.row) : t.body.append(el); t.body.scrollTop = t.body.scrollHeight; return el; },
      clear() { $$(".t-l", t.body).forEach(l => l.remove()); },
      update(id, html) { const el = t.body.querySelector("#" + id); if (el) el.innerHTML = html; },
      cwd() { renderPrompt(); },
      exit() { setTimeout(() => closeTab(t), 80); }
    };
    t.host = host;
    t.sh = createShell({ host, cwd: cwd && fs.isDir(cwd) ? fs.resolve(cwd) : fs.RIVA });
    const prompt = () => `PS ${esc(t.sh.S.cwd)}&gt; `;
    t.row = h("div", { class: "t-row" });
    const ps = h("span", { class: "t-ps" });
    const wrap = h("div", { class: "t-in" }), hl = h("span", { class: "t-hl", "aria-hidden": "true" });
    const input = h("input", { type: "text", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", enterkeyhint: "go", "aria-label": "Type a PowerShell command, then press Enter" });
    wrap.append(hl, input); t.row.append(ps, wrap); t.input = input;
    const renderPrompt = () => { ps.innerHTML = prompt(); };
    const paint = () => { hl.innerHTML = hlPS(input.value, true); hl.scrollLeft = input.scrollLeft; };
    input.addEventListener("input", paint); input.addEventListener("scroll", paint);
    let hIdx = 0, tab = null, busy = false;
    async function run(v) {
      host.line(prompt() + hlPS(v, true));
      if (!v.trim()) return;
      busy = true; t.row.hidden = true;
      try { await t.sh.exec(v); } catch (e) { host.line(`<span class="c-r">${esc(e.message)}</span>`); }
      busy = false; if (!t.closed) { t.row.hidden = false; renderPrompt(); input.focus({ preventScroll: true }); t.body.scrollTop = t.body.scrollHeight; }
      hIdx = t.sh.S.hist.length;
    }
    t.run = run;
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); const v = input.value; input.value = ""; paint(); tab = null; run(v); }
      else if (e.key === "ArrowUp") { e.preventDefault(); const H = t.sh.S.hist; if (hIdx > 0) { hIdx--; input.value = H[hIdx]; paint(); } }
      else if (e.key === "ArrowDown") { e.preventDefault(); const H = t.sh.S.hist; if (hIdx < H.length - 1) { hIdx++; input.value = H[hIdx]; } else { hIdx = H.length; input.value = ""; } paint(); }
      else if (e.key === "Tab") {
        e.preventDefault();
        if (!tab) { const parts = input.value.split(/\s+/); const list = t.sh.complete(input.value); tab = { list, i: -1, pre: parts.slice(0, -1).join(" ") }; }
        if (tab.list.length) { tab.i = (tab.i + (e.shiftKey ? -1 : 1) + tab.list.length) % tab.list.length; input.value = (tab.pre ? tab.pre + " " : "") + tab.list[tab.i]; paint(); }
      }
      else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); host.clear(); }
      else if (e.key === "c" && e.ctrlKey && !String(getSelection())) { e.preventDefault(); host.line(prompt() + hlPS(input.value, true) + '<span class="c-r">^C</span>'); input.value = ""; paint(); }
      else tab = null;
    });
    t.body.addEventListener("keydown", e => { if (busy && e.key === "c" && e.ctrlKey && !String(getSelection())) { e.preventDefault(); t.sh.abort(); } });
    t.body.tabIndex = -1;
    t.body.addEventListener("click", e => {
      const a = e.target.closest(".t-link");
      if (a) {
        e.preventDefault();
        if (a.dataset.cd) { const p = a.dataset.cd; run(`cd "${p}"`).then(() => run("ls")); }
        else if (a.dataset.open) os.openPath(a.dataset.open);
        else if (a.dataset.app) os.launch(a.dataset.app);
        return;
      }
      if (!busy && !String(getSelection())) input.focus({ preventScroll: true });
    });
    renderPrompt();
    tabs.push(t); select(t);
    if (intro) playIntro(t); else { host.line('<span class="c-w">PowerShell 7.5.0</span> <span class="c-gr">· rivaOS edition</span>'); host.line('<span class="c-gr"># Type help to see what this terminal can do.</span>'); t.body.append(t.row); input.focus({ preventScroll: true }); }
    return t;
  }
  async function playIntro(t) {
    t.host.line('<span class="c-w">PowerShell 7.5.0</span>');
    const cmd = "Get-Service Riva* | Select Status, DisplayName";
    const line = t.host.line(`PS ${esc(t.sh.S.cwd)}&gt; <span class="t-cmd"></span><span class="t-caret"></span>`), tgt = $(".t-cmd", line);
    if (!reduced()) { await sleep(900); for (let i = 1; i <= cmd.length; i++) { if (t.closed) return; tgt.innerHTML = hlPS(cmd.slice(0, i), true); await sleep(24 + Math.random() * 46); } await sleep(320); }
    else tgt.innerHTML = hlPS(cmd, true);
    $(".t-caret", line)?.remove(); tgt.innerHTML = hlPS(cmd, true);
    await t.sh.exec("Get-Service");
    t.host.line('<span class="c-gr"># Try: help · book · Get-ADUser devik · Invoke-Migration · ls</span>');
    t.body.append(t.row);
    if (os.wm.active === win) t.input.focus({ preventScroll: true });
  }
  function select(t) {
    active = t; tabs.forEach(x => { x.btn.classList.toggle("on", x === t); x.btn.setAttribute("aria-selected", x === t); x.body.hidden = x !== t; });
    win.setTitle("PowerShell");
    setTimeout(() => { if (!t.row.hidden && t.row.isConnected) t.input.focus({ preventScroll: true }); }, 0);
  }
  function closeTab(t) {
    t.closed = true; t.sh.abort();
    const i = tabs.indexOf(t); tabs.splice(i, 1); t.btn.remove(); t.body.remove();
    if (!tabs.length) { win.close(true); return; }
    if (active === t) select(tabs[Math.max(0, i - 1)]);
  }
  addTab({ cwd: args.cwd, intro: args.intro });
  win.on("focus", () => { if (active && !active.row.hidden && active.row.isConnected) active.input.focus({ preventScroll: true }); });
  return {
    onArgs(a) { addTab({ cwd: a.cwd }); },
    run(cmd) { active?.run(cmd); }
  };
}

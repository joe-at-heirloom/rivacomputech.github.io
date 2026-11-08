/* rivaOS · a small PowerShell. Enough of the language to be fun and honest: quoting, $variables,
   arithmetic, pipelines (text-based), > / >> redirection, if/foreach blocks, .ps1 scripts with param(),
   and ~70 cmdlets/aliases backed by the virtual file system. Microsoft Graph / Exchange cmdlets are
   simulated (a demo tenant) so Offboard-User.ps1 can actually run. */

import { esc, os, sleep, system, api, EMAIL, PHONE, VERSION, settings } from "./core.js";
import * as fs from "./fs.js";
import { APPS } from "./apps.js";
import { SERVICES, PROFILE } from "./content.js";

const COLORS = { green: "c-g", darkgreen: "c-dg", red: "c-r", darkred: "c-r", yellow: "c-y", darkyellow: "c-dy", cyan: "c-c", darkcyan: "c-dc", blue: "c-b", darkblue: "c-b", magenta: "c-m", darkmagenta: "c-m", gray: "c-gr", darkgray: "c-gr", white: "c-w", black: "c-gr" };
const pad = (s, n) => (String(s) + " ".repeat(n)).slice(0, Math.max(n, String(s).length));
const lpad = (s, n) => (" ".repeat(n) + s).slice(-Math.max(n, String(s).length));
const dt = t => { const d = new Date(t); return d.toLocaleDateString("en-US") + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); };
class PSError extends Error {}

/* ───────── tokenizer ───────── */
function splitTop(s, sep) {
  const out = []; let cur = "", q = null, depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { cur += c; if (c === "`" && q === '"') { cur += s[++i] ?? ""; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"') { q = c; cur += c; continue; }
    if (c === "(" || c === "{" || c === "[") depth++;
    if (c === ")" || c === "}" || c === "]") depth--;
    if (c === "#" && depth === 0 && (!cur || /\s$/.test(cur))) break;
    if (c === sep && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur); return out;
}
function tokens(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    while (/\s/.test(s[i] || "")) i++;
    if (i >= s.length) break;
    const c = s[i];
    if (c === "'" || c === '"') {
      let j = i + 1, v = "";
      while (j < s.length && s[j] !== c) { if (c === '"' && s[j] === "`") { j++; v += { n: "\n", t: "\t", "0": "" }[s[j]] ?? s[j]; } else v += s[j]; j++; }
      if (c === "'" && s[j + 1] === "'") { /* doubled quote */ }
      out.push({ v, q: c }); i = j + 1; continue;
    }
    if (c === "(" || (c === "$" && s[i + 1] === "(") || (c === "@" && s[i + 1] === "(")) {
      let j = i + (c === "(" ? 0 : 1), depth = 0, start = i;
      for (; j < s.length; j++) { if (s[j] === "(") depth++; else if (s[j] === ")" && --depth === 0) break; }
      let end = j + 1;
      while (end < s.length && /[\w.]/.test(s[end])) end++;   // (expr).Property
      out.push({ v: s.slice(start, end), x: true }); i = end; continue;
    }
    let j = i; while (j < s.length && !/\s/.test(s[j])) j++;
    out.push({ v: s.slice(i, j) }); i = j;
  }
  return out;
}

/* ───────── the shell ───────── */
export function createShell({ host, cwd = fs.RIVA, onExit, onClear }) {
  const S = { cwd, vars: { true: true, false: false, null: null, HOME: fs.HOME, PID: 4242 + Math.floor(Math.random() * 999), Error: [] }, hist: [], abort: false };
  const say = (text, cls) => host.line(cls ? `<span class="${cls}">${esc(text)}</span>` : esc(text));
  const sayHTML = html => host.line(html);
  const err = (cmd, msg) => sayHTML(`<span class="c-r">${esc(cmd ? cmd + ": " : "")}${esc(msg)}</span>`);

  function getVar(name) {
    const n = name.replace(/^\{|\}$/g, ""), l = n.toLowerCase();
    if (l.startsWith("env:")) { const k = l.slice(4); return { username: "Guest", computername: "RIVAOS-" + (settings.get("deviceId") || "PC"), userprofile: fs.HOME, os: "rivaOS", path: "C:\\Riva;C:\\Users\\Guest", home: fs.HOME }[k] ?? null; }
    if (l === "pwd") return S.cwd;
    if (l === "pshome") return "C:\\Program Files\\PowerShell\\7";
    const k = Object.keys(S.vars).find(x => x.toLowerCase() === l);
    return k ? S.vars[k] : undefined;
  }
  const str = v => v == null ? "" : Array.isArray(v) ? v.map(str).join(" ") : typeof v === "boolean" ? (v ? "True" : "False") : String(v);
  function expand(s) {
    return s.replace(/\$\(([^()]*(?:\([^()]*\)[^()]*)*)\)|\$\{([^}]+)\}|\$([\w:]+)/g, (m, sub, br, nm) => {
      if (sub != null) { const v = evalExpr(sub); return str(v === undefined ? sub : v); }
      const v = getVar(br || nm); return v === undefined ? "" : str(v);
    });
  }
  function evalExpr(src) {
    let s = String(src).trim(); if (!s) return undefined;
    if (/^\$\(.*\)$/s.test(s)) return evalExpr(s.slice(2, -1));
    if (/^\(.*\)$/s.test(s)) return evalExpr(s.slice(1, -1));
    if (s === "@()") return [];
    if (/^'(?:[^']|'')*'$/.test(s)) return s.slice(1, -1).replace(/''/g, "'");
    if (/^"(?:[^"`]|`.)*"$/.test(s)) return expand(s.slice(1, -1).replace(/`(.)/g, (m, c) => ({ n: "\n", t: "\t" })[c] ?? c));
    let m;
    if ((m = s.match(/^(-?\d+)\.\.(-?\d+)$/))) { const a = +m[1], b = +m[2], out = []; for (let i = a; a <= b ? i <= b : i >= b; a <= b ? i++ : i--) { out.push(i); if (out.length > 1000) break; } return out; }
    if ((m = s.match(/^\$([\w:{}]+)(\.(\w+))?$/))) { const v = getVar(m[1]); if (m[3]) { const p = m[3].toLowerCase(); if (p === "count" || p === "length") return Array.isArray(v) ? v.length : str(v).length; if (p === "toupper()") return str(v).toUpperCase(); } return v === undefined ? null : v; }
    if (/^\$true$|^\$false$|^\$null$/i.test(s)) return getVar(s.slice(1));
    const num = s.replace(/\$([\w:]+)/g, (mm, n) => { const v = getVar(n); return typeof v === "number" ? String(v) : /^-?\d+(\.\d+)?$/.test(str(v)) ? str(v) : "NaN"; });
    if (/^[\d\s+\-*/%().]+$/.test(num) && /\d/.test(num) && !/NaN/.test(num)) {
      try { const v = Function(`"use strict";return (${num})`)(); if (typeof v === "number" && isFinite(v)) return Math.round(v * 1e10) / 1e10; } catch {}
    }
    if (/^-?\d+(\.\d+)?(kb|mb|gb)?$/i.test(s)) { const u = { kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[(s.match(/kb|mb|gb/i) || [""])[0].toLowerCase()] || 1; return parseFloat(s) * u; }
    return undefined;
  }
  function evalCond(c) {
    c = c.trim();
    if (/^(-not|!)\s*/i.test(c)) return !evalCond(c.replace(/^(-not|!)\s*/i, ""));
    const m = c.match(/^(.+?)\s+-(eq|ne|gt|lt|ge|le|like|match|contains)\s+(.+)$/i);
    const val = x => { const v = evalExpr(x); return v === undefined ? x.replace(/^['"]|['"]$/g, "") : v; };
    if (m) {
      const a = val(m[1]), b = val(m[3]), op = m[2].toLowerCase(), A = typeof a === "number" ? a : str(a).toLowerCase(), B = typeof b === "number" ? b : str(b).toLowerCase();
      return { eq: A == B, ne: A != B, gt: A > B, lt: A < B, ge: A >= B, le: A <= B, like: new RegExp("^" + str(b).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i").test(str(a)), match: safeRe(str(b))?.test(str(a)), contains: Array.isArray(a) && a.map(x => str(x).toLowerCase()).includes(B) }[op];
    }
    const v = evalExpr(c); return Array.isArray(v) ? v.length > 0 : !!v;
  }
  const safeRe = p => { try { return new RegExp(p, "i"); } catch { return null; } };

  /* argument binding: positional + -Named (prefixes allowed, like PowerShell) */
  function bind(toks, spec = {}) {
    const params = spec.params || [], switches = spec.switches || [], all = [...params, ...switches];
    const a = { _: [] };
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (!t.q && !t.x && /^-[A-Za-z][\w-]*(:.*)?$/.test(t.v)) {
        let [nm, inline] = t.v.slice(1).split(/:(.*)/s); const l = nm.toLowerCase();
        const full = all.find(p => p === l) || all.filter(p => p.startsWith(l))[0] || l;
        if (inline !== undefined) { a[full] = inline === "$false" ? false : inline === "$true" ? true : value(inline); continue; }
        if (switches.includes(full) || i === toks.length - 1 || (!toks[i + 1].q && /^-[A-Za-z]/.test(toks[i + 1].v))) a[full] = true;
        else a[full] = value(toks[++i]);
        continue;
      }
      a._.push(value(t));
    }
    params.forEach((p, i) => { if (a[p] === undefined && spec.pos && spec.pos[i] !== undefined) a[p] = a._[spec.pos[i]]; });
    return a;
  }
  function value(t) {
    if (typeof t === "string") t = { v: t };
    if (t.q === "'") return t.v;
    if (t.q === '"') return expand(t.v);
    if (t.x) {
      const prop = t.v.match(/\)\.(\w+)$/);
      const inner = t.v.replace(/^[$@]?\(/, "").replace(/\)(\.\w+)?$/, "");
      const v = evalExpr(inner);
      if (v !== undefined && !prop) return v;
      return { $cmd: inner, prop: prop?.[1] };
    }
    if (/^\$/.test(t.v)) { const v = evalExpr(t.v); return v === undefined ? expand(t.v) : v; }
    if (/^-?\d+(\.\d+)?$/.test(t.v)) return +t.v;
    if (/^\d+\.\.\d+$/.test(t.v)) return evalExpr(t.v);
    return expand(t.v);
  }
  async function resolveSub(v) {
    if (v && typeof v === "object" && v.$cmd) { const out = await capture(v.$cmd); return out.length === 1 ? out[0] : out; }
    if (Array.isArray(v)) return Promise.all(v.map(resolveSub));
    return v;
  }
  async function capture(line) { const buf = []; await runPipeline(line, rec => buf.push(rec.data ?? rec.text), true); return buf; }

  /* ───────── pipeline execution ───────── */
  async function runPipeline(line, sink, quiet = false) {
    let redirect = null;
    const rm = line.match(/\s(>>?)\s*("[^"]+"|'[^']+'|[^\s>]+)\s*$/);
    if (rm && !/^\s*(echo|write-output)?\s*['"][^'"]*>[^'"]*['"]\s*$/i.test(line)) { redirect = { append: rm[1] === ">>", path: rm[2].replace(/^['"]|['"]$/g, "") }; line = line.slice(0, rm.index); }
    const stages = splitTop(line, "|").map(s => s.trim()).filter(Boolean);
    let input = null;
    for (let i = 0; i < stages.length; i++) {
      const recs = [];
      const last = i === stages.length - 1 && !redirect && !sink;
      const ok = await runStage(stages[i], input, recs, last);
      if (ok === false) return;
      input = recs;
    }
    const out = input || [];
    if (redirect) {
      const p = fs.resolve(redirect.path, S.cwd), txt = out.map(r => r.text).join("\r\n") + (out.length ? "\r\n" : "");
      try { const prev = redirect.append && fs.exists(p) ? await fs.text(p) : ""; fs.write(p, prev + txt); } catch (e) { err("Out-File", e.message); }
      return;
    }
    if (sink) { out.forEach(sink); return; }
    out.forEach(r => r.html != null ? sayHTML(r.html) : say(r.text, r.cls));
  }
  async function runStage(src, input, recs, isLast) {
    const emit = (text, o = {}) => { String(text).split("\n").forEach((t, i) => recs.push({ text: t.replace(/\r$/, ""), ...o, html: i === 0 ? o.html : undefined, data: i === 0 ? o.data : undefined })); };
    const fmt = (text, o = {}) => emit(text, { ...o, fmt: true });
    if (/^\$psversiontable$/i.test(src)) { CMD["$psversiontable"]({ emit, fmt }); return true; }
    // expressions and assignments
    let m;
    if ((m = src.match(/^\$([\w:]+)\s*(\+?=)\s*(.+)$/s))) {
      let v = evalExpr(m[3]);
      if (v === undefined) { const t = tokens(m[3]); v = t.length === 1 ? await resolveSub(value(t[0])) : await capture(m[3].replace(/^\((.*)\)(\.\w+)?$/, "$1")); if (Array.isArray(v) && v.length === 1) v = v[0]; }
      const cur = getVar(m[1]);
      S.vars[m[1]] = m[2] === "+=" ? (Array.isArray(cur) ? [...cur, v] : typeof cur === "number" && typeof v === "number" ? cur + v : str(cur) + str(v)) : v;
      return true;
    }
    const ex = evalExpr(src);
    if (ex !== undefined && !/^[a-z]/i.test(src.trim())) { (Array.isArray(ex) ? ex : [ex]).forEach(v => emit(str(v), { data: v })); return true; }
    const toks = tokens(src); if (!toks.length) return true;
    let name = toks[0].v; const rest = toks.slice(1);
    if (toks[0].q) { emit(value(toks[0])); return true; }
    if (name === "&" || name === ".") { if (!rest.length) return true; name = value(rest.shift()); }
    const key = String(name).toLowerCase();
    const fn = CMD[ALIAS[key] || key];
    const ctx = { input, emit, fmt, say, sayHTML, err: msg => err(display(ALIAS[key] || key), msg), isLast, S, bind: spec => bind(rest, spec), args: rest, raw: src, resolve: p => fs.resolve(p, S.cwd), sub: resolveSub };
    try {
      if (fn) { await fn(ctx); return true; }
      // scripts and files
      const p = fs.resolve(name, S.cwd);
      if (/\.ps1$/i.test(name) || (fs.extOf(p) === "ps1" && fs.exists(p))) {
        if (!fs.exists(p)) { err("", `The term '${name}' is not recognized as a name of a cmdlet, function, script file, or executable program.`); return false; }
        if (!/^(\.|[a-z]:|\\|~)/i.test(name) && !name.includes("\\")) { err("", `The term '${name}' is not recognized… Suggestion: the script exists in the current location. Try .\\${name}`); return false; }
        await runScript(p, rest); return true;
      }
      if (APPS[key] || APP_ALIAS[key]) { const id = APPS[key] ? key : APP_ALIAS[key]; const a = rest[0] ? fs.resolve(value(rest[0]), S.cwd) : null; os.launch(id, a ? { path: a, cwd: S.cwd } : { cwd: S.cwd }); return true; }
      if (fs.exists(p) && fs.stat(p).type === "file" && /^(\.|[a-z]:)/i.test(name)) { os.openPath(p); return true; }
      err("", `${name}: The term '${name}' is not recognized as a name of a cmdlet, function, script file, or executable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.`);
      say("# Type help to see what rivaOS PowerShell can do.", "c-gr");
      return false;
    } catch (e) {
      if (e instanceof PSError) err(display(ALIAS[key] || key), e.message);
      else if (e instanceof fs.FsError) err(display(ALIAS[key] || key), e.message);
      else { console.error(e); err(display(ALIAS[key] || key), e.message || String(e)); }
      S.vars.Error.unshift(e.message);
      return false;
    }
  }
  const display = k => NAMES.find(n => n.toLowerCase() === k) || k;

  /* ───────── scripts & blocks ───────── */
  async function runScript(path, argToks) { return runSource(await fs.text(path), fs.baseName(path), argToks); }
  async function runSource(src, name, argToks) {
    const pm = src.match(/^\s*(?:#[^\n]*\n|\s)*param\s*\(/i);
    let params = [];
    if (pm) {
      let i = pm[0].length, depth = 1; const start = i;
      for (; i < src.length && depth; i++) { if (src[i] === "(") depth++; else if (src[i] === ")") depth--; }
      const block = src.slice(start, i - 1);
      params = [...block.matchAll(/(\[Parameter\([^)]*Mandatory[^)]*\)\])?[^$,]*\$(\w+)(?:\s*=\s*([^,\n]+))?/gi)].map(x => ({ name: x[2], mand: !!x[1], def: x[3] }));
      src = src.slice(0, pm.index) + src.slice(i);
    }
    const a = bind(argToks, { params: params.map(p => p.name.toLowerCase()), pos: params.map((p, i) => i) });
    const saved = { ...S.vars };
    for (const p of params) {
      let v = a[p.name.toLowerCase()];
      if (v === undefined && p.def) v = evalExpr(p.def);
      if (v === undefined && p.mand) {
        v = /user/i.test(p.name) ? "alex@contoso.com" : /manager/i.test(p.name) ? "sam@contoso.com" : null;
        if (v) say(`# -${p.name} not given: using the demo value ${v}`, "c-gr");
        else { err(name, `Cannot bind argument to parameter '${p.name}' because it is null.`); return; }
      }
      S.vars[p.name] = v ?? null;
    }
    await runBlock(src.split(/\r?\n/));
    for (const p of params) S.vars[p.name] = saved[p.name];
  }
  function blockOf(lines, i) {
    // returns [bodyLines, nextIndex] for a "{ … }" that opens on lines[i]
    let depth = 0, body = [], j = i, first = true;
    for (; j < lines.length; j++) {
      let l = lines[j];
      if (first) { const k = l.indexOf("{"); l = l.slice(k + 1); first = false; depth = 1; }
      for (let c = 0; c < l.length; c++) {
        if (l[c] === "{") depth++;
        else if (l[c] === "}" && --depth === 0) { const tail = l.slice(0, c); if (tail.trim()) body.push(tail); return [body, j + 1, l.slice(c + 1).trim()]; }
      }
      if (j > i || l.trim()) body.push(l);
    }
    return [body, j, ""];
  }
  async function runBlock(lines) {
    for (let i = 0; i < lines.length; i++) {
      if (S.abort) return;
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;
      let m;
      if ((m = line.match(/^if\s*\((.+)\)\s*\{/i))) {
        const [body, next, rest] = blockOf(lines, i);
        let ran = false;
        if (evalCond(m[1])) { await runBlock(body); ran = true; }
        // else / elseif: either after the closing brace on the same line (pending) or on the next line
        let pending = rest, j = next;
        const peek = () => (pending || lines[j] || "").trim();
        while (/^(else\s*if|elseif|else)\b/i.test(peek())) {
          const head = peek(), src = pending ? [pending, ...lines.slice(j)] : lines.slice(j);
          const [b2, n2, r2] = blockOf(src, 0), cm = head.match(/^(?:else\s*if|elseif)\s*\((.+)\)\s*\{/i);
          if (!ran && (!cm || evalCond(cm[1]))) { await runBlock(b2); ran = true; }
          j = pending ? j + n2 - 1 : j + n2; pending = r2;
        }
        if (pending) await exec(pending, true);
        i = j - 1;
        continue;
      }
      if ((m = line.match(/^foreach\s*\(\s*\$(\w+)\s+in\s+(.+)\)\s*\{/i))) {
        const [body, next] = blockOf(lines, i); i = next - 1;
        let list = evalExpr(m[2]); if (list === undefined) list = await capture(m[2]);
        for (const v of [].concat(list ?? [])) { if (S.abort) return; S.vars[m[1]] = v; await runBlock(body); }
        continue;
      }
      if ((m = line.match(/^function\s+([\w-]+)\s*\{/i))) {
        const [body, next] = blockOf(lines, i); i = next - 1;
        const nm = m[1].toLowerCase(); CMD[nm] = async () => runBlock(body); if (!NAMES.includes(m[1])) NAMES.push(m[1]);
        continue;
      }
      if (line === "}" || line === "{") continue;
      await exec(line, true);
    }
  }

  async function exec(line, inScript = false) {
    if (!inScript) { S.abort = false; if (line.trim()) S.hist.push(line); }
    for (const st of splitTop(line, ";")) { if (S.abort) break; if (st.trim()) await runPipeline(st.trim()); }
  }

  /* ───────── cmdlets ───────── */
  const lsTable = (dir, nodes) => {
    const out = [];
    out.push({ text: "", fmt: true }, { text: `    Directory: ${dir}`, fmt: true }, { text: "", fmt: true },
      { text: "Mode                 LastWriteTime         Length Name", fmt: true, cls: "c-h" }, { text: "----                 -------------         ------ ----", fmt: true, cls: "c-h" });
    nodes.forEach(n => {
      const ro = n.ro || n.path.toLowerCase().startsWith(fs.RIVA.toLowerCase());
      const mode = (n.type === "dir" ? "d" : "-") + (n.type === "dir" ? "-" : "a") + (ro ? "r" : "-") + "--";
      const len = n.type === "dir" ? "" : String(n.size || 0);
      const pre = `${pad(mode, 6)}${lpad(dt(n.mtime), 24)}${lpad(len, 15)} `;
      const nm = n.name;
      out.push({ text: pre + nm, key: nm.toLowerCase(), data: n.path, html: esc(pre) + `<a class="t-link ${n.type === "dir" ? "c-dir" : ""}" data-${n.type === "dir" ? "cd" : "open"}="${esc(n.path)}">${esc(nm)}</a>` });
    });
    out.push({ text: "", fmt: true });
    return out;
  };
  const textFilters = list => {
    const head = [], data = [];
    for (const r of list || []) { if (r.fmt && !data.length) head.push(r); else if (!r.fmt) data.push(r); }
    return { head, data };
  };
  const svcRows = () => SERVICES.map(s => [s.name, s.cmdlet]).concat([["PowerShell automation", "Invoke-Automation"]]);

  const CMD = {
    "get-help": c => {
      const topic = c.args[0]?.v?.toLowerCase();
      if (topic && HELP[topic]) { c.fmt(""); c.fmt("NAME", { cls: "c-h" }); c.fmt("    " + display(topic)); c.fmt(""); c.fmt("SYNOPSIS", { cls: "c-h" }); c.fmt("    " + HELP[topic]); c.fmt(""); return; }
      c.fmt(""); c.fmt("rivaOS PowerShell " + VERSION + " — a friendly subset. Try one of these:", { cls: "c-w" }); c.fmt("");
      const groups = [["Riva Computech", [["Get-Service", "What Riva Computech looks after"], ["Get-ADUser devik", "Who you'll be working with"], ["Test-ITHealth", "The one-minute health check"], ["Invoke-Migration", "Watch a (simulated) migration"], ["Invoke-Automation", "Open Offboard-User.ps1"], ["book", "Book a free 30-min chat"]]],
        ["Files", [["ls / dir", "List a folder"], ["cd <folder>", "Change folder"], ["cat <file>", "Show a file"], ["mkdir / ni", "New folder / file"], ["cp · mv · rm", "Copy, move, delete"], ["echo hi > a.txt", "Write to a file"], ["tree", "Show the folder tree"]]],
        ["System", [["Get-Process / kill", "Open windows"], ["start <app|file>", "Open something"], ["notepad <file>", "Edit a file"], ["Get-ComputerInfo", "About this PC"], ["Test-Connection", "Ping the Cloudflare edge"], ["Get-Weather", "Local weather"], ["irm <url>", "Call a web API"], ["cls · history · exit", ""]]]];
      groups.forEach(([g, rows]) => { c.fmt(g, { cls: "c-h" }); rows.forEach(([a, b]) => c.emit("  " + pad(a, 22) + b, { html: "  " + `<span class="c-y">${esc(pad(a, 22))}</span>` + esc(b) })); c.fmt(""); });
      c.fmt("Pipes work too:  Get-Service | Select-Object -First 3   ·   ls | sls ps1", { cls: "c-gr" }); c.fmt("");
    },
    "get-command": c => { const q = (c.bind({ params: ["name"], pos: [0] }).name || "*").toString(); const re = new RegExp("^" + q.replace(/\*/g, ".*") + "$", "i"); c.fmt(""); c.fmt("CommandType     Name", { cls: "c-h" }); c.fmt("-----------     ----", { cls: "c-h" }); NAMES.filter(n => re.test(n)).sort().forEach(n => c.emit("Cmdlet          " + n, { key: n.toLowerCase() })); c.fmt(""); },
    "get-alias": c => { c.fmt(""); c.fmt("CommandType     Name", { cls: "c-h" }); c.fmt("-----------     ----", { cls: "c-h" }); Object.entries(ALIAS).sort().forEach(([a, b]) => c.emit(`Alias           ${a} -> ${display(b)}`, { key: a })); c.fmt(""); },
    "get-service": c => {
      const a = c.bind({ params: ["name"], pos: [0] }), q = a.name ? new RegExp("^" + String(a.name).replace(/\*/g, ".*") + "$", "i") : null;
      c.fmt(""); c.fmt("Status   Name                      DisplayName", { cls: "c-h" }); c.fmt("------   ----                      -----------", { cls: "c-h" });
      svcRows().filter(([n, cm]) => !q || q.test(n) || q.test(cm) || q.test("Riva")).forEach(([n, cm]) => c.emit(`Running  ${pad(cm, 26)}${n}`, { key: n.toLowerCase(), data: n, html: `<span class="c-g">Running</span>  ${esc(pad(cm, 26))}<a class="t-link" data-app="services">${esc(n)}</a>` }));
      c.fmt("");
    },
    "get-aduser": c => {
      const who = (c.args[0]?.v || "devik").toLowerCase();
      if (!/devik|patel|\*/.test(who)) throw new PSError(`Cannot find an object with identity: '${c.args[0].v}' under: 'DC=riva,DC=local'.`);
      c.fmt("");
      [["DistinguishedName", "CN=Devik Patel,OU=Owners,DC=riva,DC=local"], ["Enabled", "True"], ["GivenName", "Devik"], ["Surname", "Patel"], ...PROFILE.slice(1).map(([k, v]) => [k, v]), ["Email", EMAIL], ["Phone", PHONE], ["SamAccountName", "devik"]]
        .forEach(([k, v]) => c.emit(pad(k, 18) + ": " + v, { html: `<span class="c-h">${esc(pad(k, 18))}</span>: ${k === "Enabled" ? '<span class="c-g">True</span>' : esc(v)}` }));
      c.fmt(""); c.emit("More: About Devik", { fmt: true, html: `More: <a class="t-link" data-app="about">About Devik</a>` });
    },
    whoami: c => { c.emit("rivaos\\guest"); c.say("# You're signed in as Guest. Devik is the admin: Get-ADUser devik", "c-gr"); },
    hostname: c => c.emit("RIVAOS-" + (settings.get("deviceId") || "PC")),
    "test-ithealth": c => { c.say("Opening Health Check…"); os.launch("health"); },
    "invoke-automation": c => { c.say("Opening Offboard-User.ps1 in Script Editor…"); os.launch("code", { path: fs.RIVA + "\\Scripts\\Offboard-User.ps1" }); },
    "start-assessment": c => { c.sayHTML('<span class="c-g">✔</span> Great — opening a message to Devik.'); os.launch("mail", { focus: "name" }); },
    "invoke-migration": async c => {
      const total = 48, w = 24; let n = 0;
      const id = "mig" + Math.random().toString(36).slice(2);
      c.sayHTML(`<span id="${id}"></span>`);
      while (n < total) { if (S.abort) { c.say("^C", "c-r"); return; } n = Math.min(total, n + 1 + Math.floor(Math.random() * 3)); const f = Math.round(n / total * w); host.update?.(id, `Migrating mailboxes <span class="pbar">[${"o".repeat(f)}<i>${" ".repeat(w - f)}</i>]</span> ${n}/${total}`); await sleep(settings.get("motion") === "reduce" ? 0 : 60 + Math.random() * 60); }
      host.update?.(id, `Migrating mailboxes <span class="pbar">[${"o".repeat(w)}]</span> ${total}/${total}`);
      ['<span class="c-g">✔</span> 48 of 48 mailboxes migrated', '<span class="c-g">✔</span> MX and Autodiscover cut over', '<span class="c-g">✔</span> Users signed in — no data lost', '<span class="c-h">Downtime</span> : none noticed', '<span class="c-gr"># Simulated. Real migrations are planned to be just as boring.</span>'].forEach(c.sayHTML);
    },
    "get-childitem": c => {
      const a = c.bind({ params: ["path", "filter"], switches: ["recurse", "force", "name", "file", "directory"], pos: [0, 1] });
      const p = c.resolve(a.path || "."), n = fs.stat(p);
      if (!n) throw new PSError(`Cannot find path '${p}' because it does not exist.`);
      const filt = a.filter ? new RegExp("^" + String(a.filter).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i") : null;
      const list = dir => fs.ls(dir, { hidden: !!a.force }).filter(x => (!filt || filt.test(x.name)) && (!a.file || x.type === "file") && (!a.directory || x.type === "dir"));
      const dirs = n.type === "dir" ? [n.path] : [fs.parentOf(n.path)];
      if (a.recurse) fs.walk(n.path, x => { if (x.type === "dir" && x.path !== n.path) dirs.push(x.path); });
      for (const dir of dirs) {
        const items = n.type === "dir" ? list(dir) : [n];
        if (!items.length && a.recurse) continue;
        if (a.name) items.forEach(x => c.emit(x.name, { key: x.name.toLowerCase(), data: x.path }));
        else lsTable(dir, items).forEach(r => c.emit(r.text, r));
      }
    },
    "set-location": c => {
      const t = c.args[0] ? value(c.args[0]) : fs.HOME, p = c.resolve(String(t) === "-" ? (S.prev || S.cwd) : t), n = fs.stat(p);
      if (!n) throw new PSError(`Cannot find path '${p}' because it does not exist.`);
      if (n.type !== "dir") throw new PSError(`Cannot set location to '${p}' because it is a file.`);
      S.prev = S.cwd; S.cwd = n.path; host.cwd?.(S.cwd);
    },
    "get-location": c => { c.fmt(""); c.fmt("Path", { cls: "c-h" }); c.fmt("----", { cls: "c-h" }); c.emit(S.cwd, { data: S.cwd }); c.fmt(""); },
    "new-item": c => {
      const a = c.bind({ params: ["path", "itemtype", "name", "value"], switches: ["force"], pos: [0] });
      let p = a.path || "."; if (a.name) p = fs.join(c.resolve(p), a.name); p = c.resolve(p);
      const type = String(a.itemtype || "file").toLowerCase();
      const n = type.startsWith("d") ? fs.mkdir(p, { parents: !!a.force }) : fs.write(p, a.value != null ? str(a.value) : "", { parents: !!a.force });
      lsTable(fs.parentOf(n.path), [n]).forEach(r => c.emit(r.text, r));
    },
    mkdir: c => { const a = c.bind({ params: ["path"], switches: ["force"], pos: [0] }); if (!a.path) throw new PSError("Missing a folder name. Try: mkdir Projects"); const n = fs.mkdir(c.resolve(a.path), { parents: true }); lsTable(fs.parentOf(n.path), [n]).forEach(r => c.emit(r.text, r)); },
    "remove-item": c => {
      const a = c.bind({ params: ["path"], switches: ["recurse", "force", "confirm", "whatif"], pos: [0] });
      const targets = a._.length ? a._ : [a.path]; if (!targets[0]) throw new PSError("Missing a path. Try: rm notes.txt");
      for (const t of targets) { const p = c.resolve(t); if (a.whatif) { c.emit(`What if: Performing the operation "Remove File" on target "${p}".`); continue; } fs.rm(p, { recursive: !!a.recurse }); }
    },
    "copy-item": c => { const a = c.bind({ params: ["path", "destination"], switches: ["recurse", "force"], pos: [0, 1] }); if (!a.path || !a.destination) throw new PSError("Usage: cp <source> <destination>"); fs.cp(c.resolve(a.path), c.resolve(a.destination)); },
    "move-item": c => { const a = c.bind({ params: ["path", "destination"], switches: ["force"], pos: [0, 1] }); if (!a.path || !a.destination) throw new PSError("Usage: mv <source> <destination>"); fs.mv(c.resolve(a.path), c.resolve(a.destination), { overwrite: !!a.force }); },
    "rename-item": c => { const a = c.bind({ params: ["path", "newname"], switches: ["force"], pos: [0, 1] }); if (!a.path || !a.newname) throw new PSError("Usage: ren <item> <new name>"); const p = c.resolve(a.path); fs.mv(p, fs.join(fs.parentOf(fs.stat(p)?.path || p), String(a.newname))); },
    "get-content": async c => {
      const a = c.bind({ params: ["path", "totalcount", "tail"], pos: [0] }); if (!a.path) throw new PSError("Missing a path. Try: cat README.txt");
      const p = c.resolve(a.path), n = fs.stat(p);
      if (!n) throw new PSError(`Cannot find path '${p}' because it does not exist.`);
      if (n.type === "dir") throw new PSError(`Unable to get content because it is a directory: '${p}'.`);
      if (!fs.isText(n)) { c.say(`(${n.mime}, ${n.size} bytes — binary file. Try: start "${n.name}")`, "c-gr"); return; }
      let lines = (await fs.text(p)).replace(/\r/g, "").split("\n"); if (lines[lines.length - 1] === "") lines.pop();
      if (a.totalcount) lines = lines.slice(0, +a.totalcount); if (a.tail) lines = lines.slice(-a.tail);
      lines.forEach(l => c.emit(l, { data: l }));
    },
    "set-content": async c => { const a = c.bind({ params: ["path", "value"], pos: [0, 1] }); const v = c.input ? c.input.map(r => r.text).join("\r\n") : str(await c.sub(a.value)); fs.write(c.resolve(a.path), v + "\r\n"); },
    "add-content": async c => { const a = c.bind({ params: ["path", "value"], pos: [0, 1] }); const p = c.resolve(a.path); const prev = fs.exists(p) ? await fs.text(p) : ""; const v = c.input ? c.input.map(r => r.text).join("\r\n") : str(await c.sub(a.value)); fs.write(p, prev + v + "\r\n"); },
    "clear-content": c => { const a = c.bind({ params: ["path"], pos: [0] }); fs.write(c.resolve(a.path), ""); },
    "out-file": async c => { const a = c.bind({ params: ["filepath"], switches: ["append"], pos: [0] }); const p = c.resolve(a.filepath); const prev = a.append && fs.exists(p) ? await fs.text(p) : ""; fs.write(p, prev + (c.input || []).map(r => r.text).join("\r\n") + "\r\n"); },
    "out-null": () => {},
    "write-output": async c => { for (const t of c.args) { const v = await c.sub(value(t)); [].concat(v ?? "").forEach(x => c.emit(str(x), { data: x })); } if (!c.args.length && c.input) c.input.forEach(r => c.emit(r.text, r)); },
    "write-host": async c => {
      const a = c.bind({ params: ["foregroundcolor", "backgroundcolor", "object"], switches: ["nonewline"] });
      const parts = []; for (const v of a._) parts.push(str(await c.sub(v)));
      const cls = COLORS[String(a.foregroundcolor || "").toLowerCase()];
      c.say(parts.join(" "), cls);
    },
    "write-error": c => c.err(c.args.map(t => str(value(t))).join(" ")),
    "write-warning": c => c.say("WARNING: " + c.args.map(t => str(value(t))).join(" "), "c-y"),
    "clear-host": () => host.clear(),
    "get-date": c => { const a = c.bind({ params: ["format"], pos: [0] }); const n = new Date(); c.emit(a.format ? fmtDate(n, String(a.format)) : n.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) + " " + n.toLocaleTimeString("en-US"), { data: n.toISOString() }); },
    "get-random": c => { const a = c.bind({ params: ["minimum", "maximum"], switches: [] }); const min = +a.minimum || 0, max = a.maximum != null ? +a.maximum : 2147483647; c.emit(String(Math.floor(min + Math.random() * (max - min)))); },
    "start-sleep": async c => { const a = c.bind({ params: ["seconds", "milliseconds"], pos: [0] }); let ms = a.milliseconds != null ? +a.milliseconds : (+a.seconds || 0) * 1000; while (ms > 0 && !S.abort) { await sleep(Math.min(100, ms)); ms -= 100; } },
    "get-history": c => { c.fmt(""); c.fmt("  Id CommandLine", { cls: "c-h" }); c.fmt("  -- -----------", { cls: "c-h" }); S.hist.slice(0, -1).forEach((l, i) => c.emit(lpad(i + 1, 4) + " " + l)); c.fmt(""); },
    "get-process": c => {
      const a = c.bind({ params: ["name"], pos: [0] });
      c.fmt(""); c.fmt(" NPM(K)    WS(M)      Id ProcessName      MainWindowTitle", { cls: "c-h" }); c.fmt(" ------    -----      -- -----------      ---------------", { cls: "c-h" });
      const procs = [{ id: 4, app: "System", title: "", ws: 2 }, { id: S.vars.PID, app: "pwsh", title: "", ws: 48 }, ...os.wm.list().filter(w => !w.owner).map(w => ({ id: 1000 + w.id, app: w.app, title: w.title, ws: Math.round(w.el.getElementsByTagName("*").length / 18 + 12) }))];
      procs.filter(p => !a.name || new RegExp("^" + String(a.name).replace(/\*/g, ".*") + "$", "i").test(p.app)).forEach(p => c.emit(`${lpad(Math.round(p.ws / 3), 7)}${lpad(p.ws.toFixed ? p.ws.toFixed(2) : p.ws, 9)}${lpad(p.id, 8)} ${pad(p.app, 17)}${p.title}`, { key: p.app }));
      c.fmt("");
    },
    "stop-process": c => {
      const a = c.bind({ params: ["name", "id"], switches: ["force"], pos: [0] });
      const id = a.id != null ? +a.id : /^\d+$/.test(String(a.name)) ? +a.name : null;
      if (id === S.vars.PID || String(a.name).toLowerCase() === "pwsh") { host.exit?.(); return; }
      if (id === 4 || String(a.name).toLowerCase() === "system") throw new PSError("Access is denied. Nice try.");
      const list = os.wm.list().filter(w => !w.owner && (id != null ? 1000 + w.id === id : w.app === String(a.name).toLowerCase()));
      if (!list.length) throw new PSError(`Cannot find a process with the ${id != null ? "process identifier " + id : `name "${a.name}"`}. Verify the process ${id != null ? "identifier" : "name"} and call the cmdlet again.`);
      list.forEach(w => w.close(!!a.force));
    },
    "start-process": async c => {
      const a = c.bind({ params: ["filepath", "argumentlist"], pos: [0, 1] }); const t = String(a.filepath ?? "");
      if (!t) throw new PSError("Missing a target. Try: start notepad");
      if (/^https?:\/\//i.test(t)) { os.launch("browser", { url: t }); return; }
      if (/^(ms-settings:|settings)$/i.test(t)) { os.launch("settings"); return; }
      const k = t.toLowerCase(), id = APPS[k] ? k : APP_ALIAS[k];
      if (id) { os.launch(id, a.argumentlist ? { path: c.resolve(a.argumentlist), cwd: S.cwd } : { cwd: S.cwd }); return; }
      const p = c.resolve(t); if (!fs.exists(p)) throw new PSError(`This command cannot be run because "${t}" could not be found.`);
      os.openPath(p);
    },
    "invoke-item": c => { const a = c.bind({ params: ["path"], pos: [0] }); const p = c.resolve(a.path || "."); if (!fs.exists(p)) throw new PSError(`Cannot find path '${p}' because it does not exist.`); os.openPath(p); },
    tree: c => {
      const a = c.bind({ params: ["path"], switches: ["f"], pos: [0] }); const root = c.resolve(a.path || "."); if (!fs.isDir(root)) throw new PSError("Invalid path - " + root);
      c.emit("Folder PATH listing for volume Local Disk"); c.emit(root);
      const rec = (dir, pre) => { const k = fs.ls(dir).filter(n => a.f || n.type === "dir"); k.forEach((n, i) => { const last = i === k.length - 1; c.emit(pre + (last ? "└───" : "├───") + n.name); if (n.type === "dir") rec(n.path, pre + (last ? "    " : "│   ")); }); };
      rec(root, ""); c.fmt("");
    },
    "select-object": c => { const a = c.bind({ params: ["first", "last", "skip", "property"], pos: [3] }); const { head, data } = textFilters(c.input); let d = data; if (a.skip) d = d.slice(+a.skip); if (a.first != null) d = d.slice(0, +a.first); if (a.last != null) d = d.slice(-a.last); [...head, ...d].forEach(r => c.emit(r.text, r)); },
    "sort-object": c => { const a = c.bind({ params: ["property"], switches: ["descending", "unique"], pos: [0] }); const { head, data } = textFilters(c.input); let d = [...data].sort((x, y) => String(x.key ?? x.text).localeCompare(String(y.key ?? y.text), undefined, { numeric: true })); if (a.descending) d.reverse(); if (a.unique) d = d.filter((r, i) => !i || r.text !== d[i - 1].text); [...head, ...d].forEach(r => c.emit(r.text, r)); },
    "select-string": async c => {
      const a = c.bind({ params: ["pattern", "path"], switches: ["simplematch", "casesensitive"], pos: [0, 1] }); if (a.pattern == null) throw new PSError("Missing a pattern. Try: cat README.txt | sls Riva");
      const re = a.simplematch ? null : safeRe(String(a.pattern)), test = t => re ? re.test(t) : t.toLowerCase().includes(String(a.pattern).toLowerCase());
      let src = c.input;
      if (a.path) { const p = c.resolve(a.path); src = (await fs.text(p)).split(/\r?\n/).map((t, i) => ({ text: `${fs.baseName(p)}:${i + 1}:${t}`, raw: t })); }
      (src || []).filter(r => !r.fmt && test(r.raw ?? r.text)).forEach(r => c.emit(r.text, { ...r, html: hiMatch(r.text, a.pattern, re) }));
    },
    "measure-object": c => { const { data } = textFilters(c.input); const nums = data.map(r => +r.text).filter(n => !isNaN(n)); c.fmt(""); c.emit("Count    : " + data.length); if (nums.length === data.length && nums.length) { c.emit("Sum      : " + nums.reduce((s, n) => s + n, 0)); c.emit("Average  : " + nums.reduce((s, n) => s + n, 0) / nums.length); } c.fmt(""); },
    "where-object": c => { const src = c.raw.replace(/^\S+\s*/, "").replace(/^\{|\}$/g, "").trim(); const m = src.match(/\$_\s+-(like|match|eq|ne)\s+(.+)/i); if (!m) { (c.input || []).forEach(r => c.emit(r.text, r)); return; } const { head, data } = textFilters(c.input); const pat = String(evalExpr(m[2]) ?? m[2].replace(/^['"]|['"]$/g, "")); const ok = t => ({ like: new RegExp("^" + pat.replace(/\*/g, ".*") + "$", "i").test(t), match: safeRe(pat)?.test(t), eq: t.toLowerCase() === pat.toLowerCase(), ne: t.toLowerCase() !== pat.toLowerCase() })[m[1].toLowerCase()]; [...head, ...data.filter(r => ok(String(r.key ?? r.text)))].forEach(r => c.emit(r.text, r)); },
    "format-table": c => (c.input || []).forEach(r => c.emit(r.text, r)),
    "test-connection": async c => {
      const a = c.bind({ params: ["targetname", "count"], switches: ["quiet"], pos: [0] }); const tgt = String(a.targetname || "rivacomputech.com"); const n = Math.min(+a.count || 4, 10);
      if (/devik|riva(?!computech\.com)/i.test(tgt) && !/\./.test(tgt)) { c.emit(""); c.emit(`Pinging ${tgt} with 32 bytes of data:`); c.emit("Reply from devik: time<1 business day"); c.emit("Reply from devik: evenings & weekends too"); c.emit("Reply from devik: holidays as well"); c.emit(""); return; }
      const s = await system();
      if (!s) { c.say("# The Cloudflare Worker isn't running here (static preview), so there's no edge to ping.", "c-gr"); return; }
      c.emit(""); c.emit(`Pinging ${tgt} [Cloudflare edge ${s.colo}] with 32 bytes of data:`);
      if (!/rivacomputech|localhost|^\//i.test(tgt)) c.say(`# Browsers can't send ICMP, so rivaOS measures a round trip to its own Cloudflare edge instead.`, "c-gr");
      const times = [];
      for (let i = 0; i < n && !S.abort; i++) { const t0 = performance.now(); try { await api("ping", {}, 4000); const ms = Math.round(performance.now() - t0); times.push(ms); c.say(`Reply from ${s.colo}: bytes=32 time=${ms}ms`); } catch { c.say("Request timed out.", "c-r"); } await sleep(350); }
      if (times.length) { c.emit(""); c.emit(`Ping statistics: Sent = ${n}, Received = ${times.length}, Lost = ${n - times.length}`); c.emit(`Minimum = ${Math.min(...times)}ms, Maximum = ${Math.max(...times)}ms, Average = ${Math.round(times.reduce((x, y) => x + y, 0) / times.length)}ms`); c.emit(""); }
    },
    "get-computerinfo": async c => {
      const s = await system(), nav = navigator, mem = nav.deviceMemory ? nav.deviceMemory + " GB (reported by browser)" : "Not reported by this browser";
      const rows = [["OsName", "rivaOS " + VERSION], ["OsVersion", VERSION + " (build " + (s?.version?.id?.slice(0, 8) || "local") + ")"], ["CsName", "RIVAOS-" + (settings.get("deviceId") || "PC")], ["CsProcessors", (nav.hardwareConcurrency || "?") + " logical processors"], ["CsPhysicalMemory", mem],
        ["OsLanguage", nav.language], ["TimeZone", Intl.DateTimeFormat().resolvedOptions().timeZone], ["Display", `${screen.width}x${screen.height} @${devicePixelRatio}x`], ["Browser", uaName()],
        ["EdgeLocation", s ? `${s.colo}${s.coloCity ? " (" + s.coloCity + ")" : ""}` : "— (static preview)"], ["HttpProtocol", s?.httpProtocol || "—"], ["TlsVersion", s?.tlsVersion || "—"], ["Storage", fs.persistent() ? "IndexedDB (this browser)" : "Memory only"]];
      c.fmt(""); rows.forEach(([k, v]) => c.emit(pad(k, 18) + ": " + v, { html: `<span class="c-h">${esc(pad(k, 18))}</span>: ${esc(v)}` })); c.fmt("");
    },
    ipconfig: async c => {
      const s = await system();
      c.emit(""); c.emit("rivaOS IP Configuration"); c.emit(""); c.emit("Ethernet adapter Cloudflare:"); c.emit("");
      c.emit("   Connection-specific DNS Suffix  . : " + location.hostname);
      c.emit("   Public IP Address . . . . . . . . : " + (s?.ip || "unknown (static preview)"));
      c.emit("   Edge data centre. . . . . . . . . : " + (s?.colo || "—"));
      c.emit("   Approximate location. . . . . . . : " + (s ? [s.city, s.country].filter(Boolean).join(", ") || "—" : "—"));
      c.emit("");
    },
    "get-weather": async c => {
      let w; try { w = await api("weather"); } catch { c.say("# Weather isn't available right now (it comes from the Cloudflare Worker and MET Norway).", "c-gr"); return; }
      c.fmt(""); c.emit(`${w.city || "Your area"}: ${Math.round(w.temp)}°${w.unit}, high ${Math.round(w.hi)}° low ${Math.round(w.lo)}°`); (w.days || []).slice(1, 5).forEach(x => c.emit(`  ${new Date(x.date + "T12:00").toLocaleDateString("en-US", { weekday: "short" })}  ${Math.round(x.hi)}° / ${Math.round(x.lo)}°`)); c.fmt("");
    },
    "invoke-restmethod": async c => {
      const a = c.bind({ params: ["uri", "method"], pos: [0] }); let u = String(a.uri || ""); if (!u) throw new PSError("Missing a URL. Try: irm /api/system");
      if (!/^https?:|^\//i.test(u)) u = "https://" + u;
      let r; try { r = await fetch(u, { method: String(a.method || "GET").toUpperCase(), headers: { accept: "application/json, text/plain;q=0.9, */*;q=0.5" } }); }
      catch { throw new PSError(`The request to ${u} failed. The site may not allow requests from other websites (CORS), or you're offline.`); }
      const type = r.headers.get("content-type") || "", body = await r.text();
      if (!r.ok) throw new PSError(`Response status code does not indicate success: ${r.status} (${r.statusText}).`);
      let txt = body; if (type.includes("json")) { try { txt = JSON.stringify(JSON.parse(body), null, 2); } catch {} } else if (type.includes("html")) txt = body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200);
      txt.split("\n").slice(0, 200).forEach(l => c.emit(l));
    },
    "stop-computer": c => { const a = c.bind({ switches: ["force"] }); if (a.force) { os.shutdown(); return; } c.say("Stop-Computer: Access is denied. Riva Computech doesn't do downtime.", "c-r"); c.say("# Add -Force if you really mean it.", "c-gr"); },
    "restart-computer": c => { c.emit("Restarting…"); setTimeout(() => os.restart(), 300); },
    "lock-computer": () => os.lock(),
    sudo: c => { c.emit("sudo works on Windows 11 now — but there's no queue here to skip."); c.say("# Type book to talk to Devik.", "c-gr"); },
    exit: () => host.exit?.(),
    "$psversiontable": c => { c.fmt(""); c.fmt("Name                           Value", { cls: "c-h" }); c.fmt("----                           -----", { cls: "c-h" }); [["PSVersion", "7.5.0"], ["PSEdition", "Core"], ["OS", "rivaOS " + VERSION], ["Platform", "Web (Cloudflare Workers)"], ["Patience", "Unlimited"]].forEach(([k, v]) => c.emit(pad(k, 31) + v)); c.fmt(""); },
    // ── simulated Microsoft Graph / Exchange Online (a demo tenant, so Offboard-User.ps1 runs) ──
    ...mock()
  };
  function mock() {
    let noted = false;
    const step = (label, ms, extra) => async c => {
      if (!noted) { noted = true; c.say("# Demo tenant: Microsoft Graph & Exchange cmdlets are simulated in rivaOS.", "c-gr"); }
      await sleep(settings.get("motion") === "reduce" ? 0 : ms);
      const a = c.bind({ params: ["userid", "identity", "user", "scopes", "type", "accessrights", "addlicenses", "removelicenses"], switches: ["nowelcome", "showbanner", "accountenabled"], pos: [0] });
      const who = String(a.userid || a.identity || a._[0] || "user").split("@")[0];
      const text = typeof label === "function" ? label(a, who) : label;
      c.sayHTML(`<span class="c-gr">${esc(pad(text, 38))}</span> <span class="c-g">✔</span>`);
      extra?.(c, a);
    };
    return {
      "connect-mggraph": step("Connected to Microsoft Graph", 650),
      "connect-exchangeonline": step("Connected to Exchange Online", 900),
      "update-mguser": step((a, w) => `Sign-in blocked for ${w}`, 550),
      "revoke-mgusersigninsession": step("Active sessions revoked", 450),
      "set-mailbox": step((a, w) => `Mailbox for ${w} converted to ${a.type || "Shared"}`, 700),
      "add-mailboxpermission": step((a) => `Full access granted to ${String(a.user || "manager").split("@")[0]}`, 500),
      "get-mguserlicensedetail": async c => { await sleep(300); ["c42b9cae-ea4f-4ab7-9717-81576235ccac", "f30db892-07e9-47e9-837c-80727f46fd3d"].forEach(id => c.emit(id, { data: id })); },
      "set-mguserlicense": step((a) => `Licences removed (${[].concat(a.removelicenses || []).flatMap(x => String(x).split(/[\s,]+/)).filter(Boolean).length || 0})`, 600),
      "disconnect-mggraph": step("Disconnected from Microsoft Graph", 200)
    };
  }

  function complete(line) {
    const parts = line.split(/\s+/); const last = parts[parts.length - 1] || "";
    if (parts.length === 1) { const l = last.toLowerCase(); return [...NAMES, ...Object.keys(ALIAS)].filter(n => n.toLowerCase().startsWith(l)).sort(); }
    const q = last.replace(/^["']/, ""), i = q.lastIndexOf("\\"), dir = i >= 0 ? q.slice(0, i + 1) : "", stem = (i >= 0 ? q.slice(i + 1) : q).toLowerCase();
    const base = fs.resolve(dir || ".", S.cwd);
    return fs.ls(base).filter(n => n.name.toLowerCase().startsWith(stem)).map(n => { const v = dir + n.name + (n.type === "dir" ? "\\" : ""); return /\s/.test(v) ? `"${v}"` : (/^[.~\\]|^[a-z]:/i.test(v) ? v : ".\\" + v); });
  }
  return { exec, S, complete, abort: () => { S.abort = true; }, highlight: hlPS,
    run: async (src, name = "script.ps1", argLine = "") => { S.abort = false; await runSource(src, name, tokens(argLine)); } };
}

function hiMatch(text, pat, re) { if (!re) return esc(text); return esc(text).replace(new RegExp(String(pat).replace(/[.+^${}()|[\]\\]/g, "\\$&"), "gi"), m => `<span class="c-inv">${m}</span>`); }
function fmtDate(d, f) {
  const z = n => String(n).padStart(2, "0");
  return f.replace(/yyyy|MM|dd|HH|mm|ss|ddd/g, t => ({ yyyy: d.getFullYear(), MM: z(d.getMonth() + 1), dd: z(d.getDate()), HH: z(d.getHours()), mm: z(d.getMinutes()), ss: z(d.getSeconds()), ddd: d.toLocaleDateString("en-US", { weekday: "short" }) })[t]);
}
export function uaName() {
  const u = navigator.userAgent;
  const m = u.match(/(Edg|OPR|Chrome|Firefox|Version)\/([\d.]+)/);
  const name = /Edg\//.test(u) ? "Edge" : /OPR\//.test(u) ? "Opera" : /Firefox\//.test(u) ? "Firefox" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "Browser";
  const osn = /Windows/.test(u) ? "Windows" : /Mac OS X/.test(u) ? (/Mobile/.test(u) ? "iOS" : "macOS") : /Android/.test(u) ? "Android" : /Linux/.test(u) ? "Linux" : "";
  return `${name} ${m ? m[2].split(".")[0] : ""}${osn ? " on " + osn : ""}`;
}

const ALIAS = {
  help: "get-help", man: "get-help", "?": "get-help", gcm: "get-command", alias: "get-alias", gal: "get-alias",
  gsv: "get-service", services: "get-service", about: "get-aduser", health: "test-ithealth", automation: "invoke-automation", script: "invoke-automation",
  migrate: "invoke-migration", book: "start-assessment", contact: "start-assessment", "send-mailmessage": "start-assessment",
  ls: "get-childitem", dir: "get-childitem", gci: "get-childitem", cd: "set-location", sl: "set-location", chdir: "set-location", pwd: "get-location", gl: "get-location",
  ni: "new-item", md: "mkdir", rm: "remove-item", del: "remove-item", erase: "remove-item", rd: "remove-item", rmdir: "remove-item", ri: "remove-item",
  cp: "copy-item", copy: "copy-item", cpi: "copy-item", mv: "move-item", move: "move-item", mi: "move-item", ren: "rename-item", rni: "rename-item",
  cat: "get-content", type: "get-content", gc: "get-content", sc: "set-content", ac: "add-content", clc: "clear-content",
  echo: "write-output", write: "write-output", cls: "clear-host", clear: "clear-host", date: "get-date", sleep: "start-sleep",
  history: "get-history", h: "get-history", ps: "get-process", gps: "get-process", kill: "stop-process", spps: "stop-process",
  start: "start-process", saps: "start-process", ii: "invoke-item", select: "select-object", sort: "sort-object", sls: "select-string", grep: "select-string",
  measure: "measure-object", where: "where-object", "?": "where-object", ft: "format-table", fl: "format-table", "format-list": "format-table", "out-host": "format-table", more: "format-table", "out-string": "format-table",
  ping: "test-connection", systeminfo: "get-computerinfo", gin: "get-computerinfo", irm: "invoke-restmethod", iwr: "invoke-restmethod", "invoke-webrequest": "invoke-restmethod", curl: "invoke-restmethod", wget: "invoke-restmethod",
  weather: "get-weather", shutdown: "stop-computer", restart: "restart-computer", reboot: "restart-computer", lock: "lock-computer", quit: "exit", "$psversiontable": "$psversiontable", ver: "$psversiontable"
};
ALIAS["?"] = "get-help";
const APP_ALIAS = { calc: "calculator", mspaint: "paint", taskmgr: "taskmgr", wt: "terminal", pwsh: "terminal", powershell: "terminal", control: "settings", "ms-settings:": "settings", edge: "browser", msedge: "browser", firefox: "browser", chrome: "browser", contact: "mail", photos: "photos", code: "code", ise: "code", "powershell_ise": "code", files: "explorer" };
const NAMES = ["Get-Help", "Get-Command", "Get-Alias", "Get-Service", "Get-ADUser", "Test-ITHealth", "Invoke-Automation", "Invoke-Migration", "Start-Assessment", "Get-ChildItem", "Set-Location", "Get-Location",
  "New-Item", "mkdir", "Remove-Item", "Copy-Item", "Move-Item", "Rename-Item", "Get-Content", "Set-Content", "Add-Content", "Clear-Content", "Out-File", "Out-Null", "Write-Output", "Write-Host", "Write-Error", "Write-Warning",
  "Clear-Host", "Get-Date", "Get-Random", "Start-Sleep", "Get-History", "Get-Process", "Stop-Process", "Start-Process", "Invoke-Item", "tree", "Select-Object", "Sort-Object", "Select-String", "Measure-Object", "Where-Object",
  "Format-Table", "Test-Connection", "Get-ComputerInfo", "ipconfig", "Get-Weather", "Invoke-RestMethod", "Stop-Computer", "Restart-Computer", "Lock-Computer", "whoami", "hostname", "exit",
  "Connect-MgGraph", "Connect-ExchangeOnline", "Update-MgUser", "Revoke-MgUserSignInSession", "Set-Mailbox", "Add-MailboxPermission", "Get-MgUserLicenseDetail", "Set-MgUserLicense", "Disconnect-MgGraph"];
const HELP = { "get-service": "Lists what Riva Computech looks after.", "get-aduser": "Shows Devik's directory record.", "get-childitem": "Lists files and folders. -Recurse, -Force, -Filter, -Name.", "set-location": "Changes the current folder. cd - goes back.",
  "remove-item": "Deletes items permanently. Use -Recurse for folders.", "test-connection": "Measures the round trip to your Cloudflare edge.", "start-process": "Opens an app, file or URL.", "invoke-restmethod": "Fetches a URL and prints the response (JSON is pretty-printed)." };

/* syntax highlighting shared by Terminal and Script Editor */
export function hlPS(src, cmdPos) {
  const re = /(#.*$)|('(?:[^']|'')*'?|"(?:[^"`]|`.)*"?)|(\$[\w:]+)|(\[[A-Za-z_][\w.]*(?:\([^)]*\))?\])|(-[A-Za-z]\w*)|\b(param|if|else|elseif|foreach|function|return|in)\b|([A-Za-z][\w]*-[A-Za-z]\w*|[A-Za-z_.\\][\w.\\*]*)|(\d+(?:\.\d+)?)|(\||>>?)/g;
  let out = "", last = 0, expect = !!cmdPos, m, cls;
  while ((m = re.exec(src))) {
    if (!m[0]) { re.lastIndex++; continue; }
    out += esc(src.slice(last, m.index)); last = re.lastIndex; cls = "";
    if (m[1]) cls = "cm"; else if (m[2]) cls = "st"; else if (m[3]) cls = "va"; else if (m[4]) cls = "ty"; else if (m[5]) cls = "pa"; else if (m[6]) cls = "kw";
    else if (m[7]) { if (expect || /^[A-Z][a-z]+-[A-Z]/.test(m[7])) cls = "fn"; expect = false; }
    else if (m[8]) cls = "nu"; else if (m[9]) { cls = "op"; expect = m[9] === "|"; }
    if (!m[7] && !m[9]) expect = false;
    out += cls ? `<span class="tk-${cls}">${esc(m[0])}</span>` : esc(m[0]);
  }
  return out + esc(src.slice(last));
}

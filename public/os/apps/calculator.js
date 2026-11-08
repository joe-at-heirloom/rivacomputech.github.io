/* Calculator (standard mode) */
import { h, $, $$, injectCSS } from "../core.js";

injectCSS("calculator", `
.calc{flex:1;display:flex;flex-direction:column;padding:4px 4px 4px;gap:2px;min-height:0}
.calc-h{display:flex;align-items:center;justify-content:space-between;padding:4px 10px 0}
.calc-h b{font:600 20px var(--font-display)}
.calc-disp{padding:4px 12px 8px;text-align:right;min-height:96px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden}
.calc-expr{font-size:14px;color:var(--text-2);min-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.calc-val{font:600 46px/1.15 var(--font-display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;user-select:text}
.calc-keys{flex:1;display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:1fr;gap:2px;min-height:0}
.calc-keys button{border:1px solid var(--ctl-edge);border-bottom-color:var(--ctl-edge-b);border-radius:5px;background:var(--ctl);font-size:15px;color:var(--text);min-height:40px}
.calc-keys button:hover{background:var(--ctl-hover)}
.calc-keys button:active{background:var(--ctl-press);color:var(--text-2)}
.calc-keys button.n{background:var(--layer-2);font-weight:600;font-size:17px}
:root[data-theme=dark] .calc-keys button.n{background:rgba(255,255,255,.09)}
.calc-keys button.eq{background:var(--accent);color:var(--on-accent);border-color:transparent;font-size:20px}
.calc-keys button.eq:hover{background:var(--accent-hover)}
`);

export const winOpts = { w: 340, h: 540, minW: 300, minH: 440 };
const KEYS = [["%", "pct"], ["CE", "ce"], ["C", "c"], ["⌫", "bs"], ["¹⁄ₓ", "inv"], ["x²", "sq"], ["²√x", "sqrt"], ["÷", "/"], ["7"], ["8"], ["9"], ["×", "*"], ["4"], ["5"], ["6"], ["−", "-"], ["1"], ["2"], ["3"], ["+", "+"], ["+/−", "neg"], ["0"], [".", "."], ["=", "="]];
const SYM = { "/": "÷", "*": "×", "-": "−", "+": "+" };

export default function calculator(win) {
  let val = "0", acc = null, op = null, fresh = true, expr = "", err = false;
  const root = h("div", { class: "calc" });
  root.innerHTML = `<div class="calc-h"><b>Standard</b></div><div class="calc-disp" aria-live="polite"><div class="calc-expr"></div><div class="calc-val">0</div></div>
    <div class="calc-keys">${KEYS.map(([l, k]) => `<button type="button" data-k="${k || l}" class="${/^\d$/.test(l) || l === "." || k === "neg" ? "n" : k === "=" ? "eq" : ""}" aria-label="${l}">${l}</button>`).join("")}</div>`;
  win.body.append(root);
  const E = $(".calc-expr", root), V = $(".calc-val", root);
  const fmt = n => { if (!isFinite(n)) return "Cannot divide by zero"; const s = Math.abs(n) >= 1e16 || (Math.abs(n) < 1e-9 && n) ? n.toExponential(8).replace(/\.?0+e/, "e") : String(+n.toPrecision(15)); return s; };
  const show = () => { V.textContent = err ? "Cannot divide by zero" : val.replace(/^(-?)(\d+)/, (m, s, d) => s + Number(d).toLocaleString("en-US")); E.textContent = expr; V.style.fontSize = V.textContent.length > 12 ? "30px" : ""; };
  const num = () => parseFloat(val);
  const calc = (a, o, b) => ({ "+": a + b, "-": a - b, "*": a * b, "/": b === 0 ? Infinity : a / b })[o];
  function press(k) {
    if (err && k !== "c" && k !== "ce") { val = "0"; acc = null; op = null; expr = ""; err = false; }
    if (/^\d$/.test(k)) { if (fresh) { val = k; fresh = false; } else if (val.replace(/[-.]/g, "").length < 16) val = val === "0" ? k : val + k; }
    else if (k === ".") { if (fresh) { val = "0."; fresh = false; } else if (!val.includes(".")) val += "."; }
    else if (k === "bs") { if (!fresh) { val = val.length > 1 && !(val.length === 2 && val[0] === "-") ? val.slice(0, -1) : "0"; } else expr = ""; }
    else if (k === "ce") { val = "0"; fresh = true; err = false; }
    else if (k === "c") { val = "0"; acc = null; op = null; expr = ""; fresh = true; err = false; }
    else if (k === "neg") { if (val !== "0") val = val.startsWith("-") ? val.slice(1) : "-" + val; }
    else if (k === "pct") { const b = num(); val = fmt(acc != null && (op === "+" || op === "-") ? acc * b / 100 : b / 100); fresh = true; }
    else if (k === "inv" || k === "sq" || k === "sqrt") {
      const x = num(), r = k === "inv" ? (x === 0 ? Infinity : 1 / x) : k === "sq" ? x * x : Math.sqrt(x);
      expr = (acc != null && op ? fmt(acc) + " " + SYM[op] + " " : "") + ({ inv: `1/(${fmt(x)})`, sq: `sqr(${fmt(x)})`, sqrt: `√(${fmt(x)})` })[k];
      if (!isFinite(r) || isNaN(r)) { err = true; } else val = fmt(r); fresh = true;
    }
    else if (SYM[k]) {
      if (op && !fresh) { const r = calc(acc, op, num()); if (!isFinite(r)) { err = true; show(); return; } acc = r; val = fmt(r); }
      else if (acc == null || !op || !fresh) acc = num();
      op = k; expr = fmt(acc) + " " + SYM[k]; fresh = true;
    }
    else if (k === "=") {
      if (op) { const b = num(), r = calc(acc, op, b); expr = `${fmt(acc)} ${SYM[op]} ${fmt(b)} =`; if (!isFinite(r)) err = true; else val = fmt(r); acc = null; op = null; fresh = true; }
    }
    show();
  }
  root.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) press(b.dataset.k); });
  win.el.addEventListener("keydown", e => {
    const m = { Enter: "=", "=": "=", Backspace: "bs", Escape: "c", Delete: "ce", "%": "pct", ",": ".", "x": "*", "X": "*" }[e.key] || (/^[\d.+\-*/]$/.test(e.key) ? e.key : null);
    if (m) { e.preventDefault(); press(m); const b = root.querySelector(`[data-k="${CSS.escape(m)}"]`); if (b) { b.style.background = "var(--ctl-press)"; setTimeout(() => (b.style.background = ""), 90); } }
    if ((e.ctrlKey || e.metaKey) && e.key === "c") navigator.clipboard?.writeText(val);
  });
  show();
}

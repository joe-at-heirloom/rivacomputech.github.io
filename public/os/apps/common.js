/* Shared styles for Riva Computech's own apps (Welcome, Services, Health Check, About, Contact). */
import { injectCSS } from "../core.js";

injectCSS("page", `
.page{flex:1;overflow:auto;background:var(--layer-2);user-select:text;-webkit-user-select:text}
.page-in{max-width:1040px;margin:0 auto;padding:32px 36px 40px}
.kicker{font:600 12px/1.2 var(--font);letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink);margin:0 0 10px;display:flex;align-items:center;gap:8px}
.kicker b{font-family:var(--mono);letter-spacing:0;text-transform:none;font-weight:600;background:var(--accent-soft);padding:2px 7px;border-radius:4px}
.ph{font:600 clamp(26px,3.4vw,36px)/1.15 var(--font-display);letter-spacing:-.02em;margin:0 0 12px;text-wrap:balance}
.ph .hl{color:var(--accent-ink)}
.lede{font-size:16px;line-height:1.6;color:var(--text-2);margin:0 0 22px;max-width:62ch;text-wrap:pretty}
.cta{display:flex;gap:10px;flex-wrap:wrap}
.ticks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.ticks li{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;line-height:1.45}
.ticks li::before{content:"";flex:none;width:16px;height:16px;margin-top:1px;border-radius:50%;background:var(--accent-soft) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 8.3l2.3 2.3 4.7-5' fill='none' stroke='%230067c0' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/16px no-repeat}
:root[data-theme=dark] .ticks li::before{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4.5 8.3l2.3 2.3 4.7-5' fill='none' stroke='%234cc2ff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")}
.meta-row{display:flex;flex-wrap:wrap;gap:8px 20px;margin:20px 0 0;padding:0;list-style:none;font-size:13px;color:var(--text-2)}
.meta-row li{display:flex;align-items:center;gap:7px}
.meta-row .i{width:16px;height:16px;color:var(--ok);stroke-width:2.4}
.sec-t{font:600 20px/1.3 var(--font-display);margin:34px 0 4px}
.sec-s{color:var(--text-2);margin:0 0 16px;font-size:14px}
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.tile{display:flex;gap:14px;align-items:flex-start;padding:16px;border-radius:var(--r-card);background:var(--card);border:1px solid var(--stroke);text-align:left;color:var(--text);transition:background .12s,transform .12s;font:inherit}
.tile:hover{background:var(--card-hover)}
.tile:active{transform:scale(.99)}
.tile b{display:block;font-weight:600;font-size:14px;margin-bottom:2px}
.tile small{display:block;color:var(--text-2);font-size:12.5px;line-height:1.45}
.techs{display:flex;align-items:center;flex-wrap:wrap;gap:12px 28px;padding:18px 20px;border-radius:var(--r-card);background:var(--card);border:1px solid var(--stroke);margin-top:28px}
.techs span.l{font-size:12px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:.08em}
.techs img{height:22px;width:auto;opacity:.75;filter:grayscale(1)}
:root[data-theme=dark] .techs img{filter:grayscale(1) invert(1) brightness(1.4);opacity:.7}
.techs .citrix{display:flex;align-items:center;gap:6px;font:700 17px var(--font);color:#5a5f66;opacity:.8;letter-spacing:-.02em}
:root[data-theme=dark] .techs .citrix{color:#c9cdd2}
.legal{font-size:11.5px;color:var(--text-3);margin-top:22px;line-height:1.5}
.avatar{width:72px;height:72px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(150deg,#ffb35e,#e26b08);color:#fff;font:700 24px var(--font-display);flex:none;box-shadow:0 0 0 4px var(--accent-soft)}
.avatar.sm{width:36px;height:36px;font-size:13px;box-shadow:none}
.avatar.xs{width:22px;height:22px;font-size:9px;box-shadow:none}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--divider);padding:0 28px;flex:none;background:var(--mica);overflow-x:auto;scrollbar-width:none}
.tabs button{position:relative;border:0;background:transparent;padding:12px 14px;font-size:14px;color:var(--text-2);white-space:nowrap}
.tabs button:hover{color:var(--text)}
.tabs button.on{color:var(--text);font-weight:600}
.tabs button.on::after{content:"";position:absolute;left:14px;right:14px;bottom:-1px;height:3px;border-radius:2px;background:var(--accent)}
:root.compact .page-in{padding:18px 16px 28px}
:root.compact .ph{font-size:24px;line-height:1.2}
:root.compact .lede{font-size:14.5px;line-height:1.55;margin-bottom:18px}
:root.compact .kicker{font-size:11px}
:root.compact .cta .btn{flex:1 1 auto}
:root.compact .btn.lg{min-height:40px;padding:8px 14px;font-size:14px}
:root.compact .sec-t{font-size:18px;margin-top:26px}
:root.compact .tile{padding:12px}
:root.compact .tile .app-ico{--s:30px}
:root.compact .techs{padding:14px 16px;gap:10px 20px}
:root.compact .techs img{height:18px}
:root.compact .tabs{padding:0 10px}
`);

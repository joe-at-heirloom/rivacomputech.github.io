/* rivaOS · boot. Wires the modules together, mounts the file system, then hands over to the shell.
   If anything fails, a friendly crash screen still shows how to reach Riva Computech. */

import { os, settings, EMAIL, PHONE, PHONE_TEL, esc } from "./core.js";
import * as fs from "./fs.js";
import { wm } from "./wm.js";
import { launch, openPath } from "./apps.js";
import * as ui from "./ui.js";
import { initShell } from "./shell.js";

function crash(err) {
  console.error(err);
  if (document.getElementById("crash")) return;
  document.getElementById("boot")?.remove();
  const el = document.createElement("div");
  el.id = "crash";
  el.setAttribute("role", "alert");
  el.style.cssText = "position:fixed;inset:0;z-index:40000;background:#0067c0;color:#fff;display:flex;align-items:center;justify-content:center;padding:6vw;font:300 18px/1.5 var(--font);overflow:auto";
  el.innerHTML = `<div style="max-width:760px"><div style="font-size:110px;line-height:1;margin-bottom:24px">:(</div>
    <p style="font-size:26px;margin:0 0 18px">rivaOS ran into a problem while starting.</p>
    <p style="margin:0 0 18px">The real thing still works: reach Devik at <a style="color:#fff" href="mailto:${EMAIL}">${EMAIL}</a> or <a style="color:#fff" href="tel:${PHONE_TEL}">${PHONE}</a>.</p>
    <p style="font-size:14px;opacity:.8;font-family:var(--mono)">Stop code: ${esc(err?.message || err || "UNKNOWN")}</p>
    <button type="button" style="margin-top:20px;font:600 15px var(--font);color:#0067c0;background:#fff;border:0;border-radius:6px;padding:10px 18px" onclick="location.reload()">Restart</button></div>`;
  document.body.append(el);
}

async function boot() {
  settings.apply();
  if (!settings.get("deviceId")) settings.set("deviceId", Math.random().toString(16).slice(2, 6).toUpperCase());
  Object.assign(os, { fs, wm, launch, openPath, menu: ui.menu, ui, openWith: ui.openWith });
  window.rivaOS = os;   // for the curious: try rivaOS.launch("paint") in DevTools
  await fs.init();
  await initShell();
}

let booted = false;
addEventListener("error", e => { if (!booted) crash(e.error || e.message); });
addEventListener("unhandledrejection", e => { if (!booted) crash(e.reason); });
boot().then(() => { booted = true; }, crash);

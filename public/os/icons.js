/* rivaOS · icons. App tiles are gradient squares with a line glyph; files, folders and system
   places are small original SVGs (flat colours, no gradient ids, so hundreds can share a page). */

import { esc } from "./core.js";
import * as fs from "./fs.js";

export const TILES = {
  welcome:    { logo: true },
  explorer:   { folder: true },
  services:   ["#41a0ff", "#0a5cbf", "briefcase"],
  health:     ["#43d283", "#118c50", "shield"],
  about:      ["#ffb35e", "#e26b08", "user"],
  mail:       ["#55b0ff", "#0b66c4", "mail"],
  terminal:   ["#454545", "#0d0d0d", "terminal"],
  code:       ["#a184ff", "#5b3cd4", "code"],
  notepad:    ["#62b5ff", "#1d73d8", "doc"],
  settings:   ["#97a1b1", "#525d6d", "gear"],
  browser:    ["#33cbd5", "#0a6fc2", "globe"],
  calculator: ["#6c7685", "#2f3743", "calc"],
  paint:      ["#ff9a6b", "#d4471f", "brush"],
  photos:     ["#7fb2ff", "#6a3fe0", "image"],
  taskmgr:    ["#33cbd5", "#08868f", "activity"],
  system:     ["#97a1b1", "#525d6d", "info"]
};

const FOLDER = (badge = "") => `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 11a3 3 0 0 1 3-3h11.2l4 4H41a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#e8a317"/><path d="M4 17.5a3 3 0 0 1 3-3h34a3 3 0 0 1 3 3V37a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z" fill="#ffc83d"/><path d="M7 15.5h34" stroke="#ffe08a" stroke-width="1.2"/>${badge}</svg>`;
const BADGE = g => `<svg x="16" y="19" width="16" height="16" viewBox="0 0 24 24"><use href="#i-${g}" fill="none" stroke="#9a5c00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PAGE = (inner = "", fold = "#e3e7ec") => `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11.5 4.5H29l10.5 10.5v27.5a2 2 0 0 1-2 2h-26a2 2 0 0 1-2-2v-36a2 2 0 0 1 2-2z" fill="#fff" stroke="#a3acb7"/><path d="M29 4.5V13a2 2 0 0 0 2 2h8.5" fill="${fold}" stroke="#a3acb7"/>${inner}</svg>`;
const LINES = `<path d="M15 22h17M15 27h17M15 32h17M15 37h11" stroke="#9aa4b0" stroke-width="1.6" stroke-linecap="round"/>`;
const PS = `<rect x="13" y="24" width="22" height="16" rx="3" fill="#2a6ad4"/><path d="M17 28.5l4 3.5-4 3.5M23 36h6" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const CODE = `<path d="M19 25l-5 5 5 5M29 25l5 5-5 5M26 23l-4 14" stroke="#7a52d6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const PIC = `<rect x="13" y="22" width="22" height="17" rx="2" fill="#dbeafe"/><circle cx="19" cy="27" r="2.4" fill="#f5b800"/><path d="M13.5 37l6-5.5 4 3.5 4-3 7 5" fill="#3d8ee8" stroke="#3d8ee8" stroke-linejoin="round"/>`;
const WEB = `<circle cx="24" cy="30" r="8" fill="none" stroke="#0a6fc2" stroke-width="1.6"/><path d="M16 30h16M24 22c2.5 2.4 3.2 5 3.2 8s-.7 5.6-3.2 8c-2.5-2.4-3.2-5-3.2-8s.7-5.6 3.2-8z" stroke="#0a6fc2" stroke-width="1.4" fill="none"/>`;
const PC = `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="7" width="40" height="27" rx="3" fill="#2b3a4f"/><rect x="6.5" y="9.5" width="35" height="22" rx="1.5" fill="#3d8ee8"/><path d="M6.5 26c9-7 20-9 35-4v8a1.5 1.5 0 0 1-1.5 1.5H8a1.5 1.5 0 0 1-1.5-1.5z" fill="#6cb6ff"/><rect x="19" y="34" width="10" height="5" fill="#8a96a6"/><rect x="13" y="39" width="22" height="3.2" rx="1.6" fill="#6b7787"/></svg>`;
const BIN = full => `<svg viewBox="0 0 48 48" aria-hidden="true">${full ? `<path d="M15 15l3-6 6 4 5-5 4 7z" fill="#fff" stroke="#b6c2cf"/><path d="M20 14l9-3 2 5z" fill="#ffe28a" stroke="#d6b44b"/>` : ""}<path d="M11 15h26l-2.4 26.4A3 3 0 0 1 31.6 44H16.4a3 3 0 0 1-3-2.6z" fill="#cfe1f3" fill-opacity=".8" stroke="#7f97b1"/><rect x="9" y="11.5" width="30" height="5" rx="2" fill="#b9cde2" stroke="#7f97b1"/><path d="M19 21l1 17M24 21v17M29 21l-1 17" stroke="#7f97b1" stroke-width="1.3" stroke-linecap="round"/></svg>`;
const DRIVE = `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="14" width="40" height="20" rx="3.5" fill="#d7dde5" stroke="#8d97a3"/><path d="M4.5 26h39" stroke="#8d97a3"/><circle cx="37" cy="30" r="1.8" fill="#16c60c"/><rect x="9" y="18" width="12" height="4" rx="1" fill="#3d8ee8"/></svg>`;

export function appIcon(id, size = 24) {
  const t = TILES[id] || TILES.system;
  if (t.logo) return `<span class="app-ico logo-ico" style="--s:${size}px"><svg viewBox="0 0 64 64" aria-hidden="true"><use href="#rivaMarkG"/></svg></span>`;
  if (t.folder) return `<span class="app-ico svg-ico" style="--s:${size}px">${FOLDER()}</span>`;
  return `<span class="app-ico" style="--s:${size}px;--g1:${t[0]};--g2:${t[1]}"><svg class="i" aria-hidden="true"><use href="#i-${t[2]}"/></svg></span>`;
}

const SPECIAL = { [fs.DESKTOP]: "desktop", [fs.DOCS]: "doc", [fs.PICS]: "image", [fs.DL]: "download", [fs.HOME]: "user", [fs.RIVA]: "terminal" };
export const pcIcon = (size = 48) => `<span class="file-ico" style="--s:${size}px">${PC}</span>`;
export const binIcon = (size = 48) => `<span class="file-ico" style="--s:${size}px">${BIN(fs.ls(fs.TRASH).length > 0)}</span>`;
export const driveIcon = (size = 48) => `<span class="file-ico" style="--s:${size}px">${DRIVE}</span>`;
export const folderIcon = (size = 48, badge) => `<span class="file-ico" style="--s:${size}px">${FOLDER(badge ? BADGE(badge) : "")}</span>`;

/** Icon for a file-system node. Images get a real thumbnail when `thumb` is set. */
export function fileIcon(n, size = 48, { thumb = true } = {}) {
  if (!n) return `<span class="file-ico" style="--s:${size}px">${PAGE()}</span>`;
  if (n.path === fs.ROOT) return driveIcon(size);
  if (n.path === fs.TRASH) return binIcon(size);
  if (n.type === "dir") return folderIcon(size, SPECIAL[n.path]);
  const ext = fs.extOf(n.path);
  if (ext === "lnk") {
    const s = fs.shortcut(n.path) || {};
    const inner = s.app ? appIcon(s.app, size * .8) : fileIcon(fs.stat(s.path), size * .8);
    return `<span class="file-ico" style="--s:${size}px">${inner}<span class="lnk"><svg class="i"><use href="#i-shortcut"/></svg></span></span>`;
  }
  if (thumb && fs.isImage(n)) return `<span class="file-ico" style="--s:${size}px"><img src="${esc(fs.url(n.path))}" alt="" loading="lazy" decoding="async" draggable="false"></span>`;
  const inner = ext === "ps1" ? PS : /^(js|json|css|html?|xml|md)$/.test(ext) ? CODE : fs.isImage(n) ? PIC : ext === "url" ? WEB : fs.isText(n) ? LINES : "";
  return `<span class="file-ico" style="--s:${size}px">${PAGE(inner)}</span>`;
}

export function typeName(n) {
  if (!n) return "";
  if (n.path === fs.ROOT) return "Local Disk";
  if (n.type === "dir") return "File folder";
  const ext = fs.extOf(n.path);
  return { txt: "Text Document", ps1: "PowerShell Script", lnk: "Shortcut", md: "Markdown File", json: "JSON File", png: "PNG File", jpg: "JPEG File", jpeg: "JPEG File",
    svg: "SVG Image", gif: "GIF File", webp: "WebP Image", html: "HTML Document", csv: "CSV File", pdf: "PDF Document", url: "Internet Shortcut", log: "Log File" }[ext] || (ext ? ext.toUpperCase() + " File" : "File");
}

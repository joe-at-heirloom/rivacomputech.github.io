# Riva Computech: rivaOS

**rivacomputech.com is a working operating system.** rivaOS is a Windows 11-style desktop that runs in
the browser: windows that drag, resize and snap, a taskbar and Start menu, a real (browser-stored) file
system, a PowerShell terminal, and around 15 apps. Riva Computech's services, IT health check, profile
and contact form are apps inside it.

It runs on **Cloudflare Workers**: static files are served from Cloudflare's edge, and a small Worker
adds the parts a static site can't do (edge info, weather, a backup contact endpoint).

No framework and no build step: native ES modules, served as-is.

```
public/                     ← everything the browser downloads (Workers Static Assets)
  index.html                ← boot screen, SEO/no-JS fallback, SVG sprite (logo + icons)
  os/
    main.js                 ← boot: mounts the file system, starts the shell
    core.js                 ← helpers, settings, event bus, contact details, Formspree endpoint
    content.js              ← ALL of Riva Computech's copy (services, bio, health checks…)
    shell.js                ← desktop, taskbar, Start, Quick Settings, notifications, widgets, lock/power
    wm.js                   ← window manager: drag, resize, snap, snap layouts, dialogs
    fs.js                   ← virtual C:\ drive in IndexedDB (+ read-only C:\Riva built from content.js)
    ps.js                   ← the PowerShell interpreter (Terminal + Script Editor)
    ui.js                   ← menus, tooltips, dialogs, file picker, Properties, import/download
    apps.js · icons.js · wallpapers.js
    apps/*.js               ← one module per app, loaded on first launch
    os.css                  ← Fluent design tokens + shell styles (apps carry their own CSS)
  404.html                  ← blue-screen 404
  og.png                    ← share image (source: tools/og.html)
  brand/ · assets/logos/ · og.png · favicon.svg · robots.txt · sitemap.xml · _headers
tools/og.html               ← source for the share image
src/worker.js               ← the Worker: /api/ping, /api/system, /api/version, /api/weather, /api/contact
wrangler.jsonc              ← Cloudflare config
```

## Apps

| App | What it does |
| --- | --- |
| **Welcome** | The pitch: headline, "Book a free 30-min chat", tiles into everything else. Opens at start-up. |
| **Riva Services** | The six services (plus *Ask about this*), **Why Riva** (`Compare-Object`), **How it works**. |
| **Health Check** | Eight toggles → score ring → "fix these first" → pre-filled message to Devik. Nothing is sent. |
| **About Devik** | Profile, `Get-ADUser devik` card, bio. |
| **Contact** | Mail compose → Formspree. Email/phone with copy and tap-to-call. Keeps a copy in *Documents › Sent*. |
| **Terminal** | Tabs + a real little PowerShell: files, pipes, `>` redirection, variables, `if`/`foreach`, scripts. |
| **Script Editor** | Highlighted `.ps1` editor with **Run**. `C:\Riva\Scripts\Offboard-User.ps1` runs against a simulated tenant. |
| **File Explorer** | Home / This PC, breadcrumbs, search, grid & details, cut/copy/paste, rename, Recycle Bin, drag & drop, upload/download. |
| **Notepad · Paint · Photos · Calculator** | The classics, saving into the virtual file system. |
| **Browser** | Address bar + start page. Sites that refuse embedding get an "open in new tab" button. |
| **Settings** | Light/dark/auto, accent colours, wallpapers (or your own picture), taskbar, text size, motion, storage & reset, rivaOS Update, About (shows the Cloudflare data centre that served you). |
| **Task Manager** | Open windows as processes (End task), live CPU / memory / frame-rate / edge-latency graphs. |

**The shell:** snap by dragging to edges or corners, snap layouts on the maximize button, Start with
search across apps, services, settings and files (no match → *Ask Devik about "…"*), right-click menus
everywhere, Quick Settings (dark mode, night light, Do not disturb, brightness, volume), notification
centre and calendar, widgets (weather, edge info, status), lock screen, restart and shut down. Keyboard:
<kbd>Ctrl</kbd>+<kbd>Esc</kbd> or a tap of <kbd>⊞</kbd>/<kbd>⌘</kbd> for Start, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Esc</kbd> for Task Manager.

**Links still work:** `/#services`, `/#why`, `/#automation`, `/#health`, `/#about`, `/#contact`, `/#svc-m365`…
open the matching app, and the address bar follows the focused app so links can be shared.

**Phones:** below ~760px wide, windows open full-screen and the taskbar becomes a scrolling app switcher.

**Privacy:** files live only in the visitor's browser (IndexedDB). Settings → Privacy & storage explains
this and has a reset button.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:8787 — the full thing, Worker included
```

A plain static server works too (`python3 -m http.server -d public 8080`). Edge info and weather then
show as unavailable, and the contact form still works through Formspree.

## Deploy to Cloudflare

**Easiest: connect the repo (deploys on every push).** Cloudflare dashboard → *Workers & Pages* →
*Create* → *Import a repository* → pick this repo. Leave the build command empty; the deploy command
is `npx wrangler deploy`. Set the production branch to `main`.

**Or from your machine:**

```bash
npx wrangler login
npm run deploy
```

Either way the site is live at `https://rivaos.<your-subdomain>.workers.dev`.

**Custom domain (`rivacomputech.com`).** Add the domain to Cloudflare (change the nameservers at
your registrar), then either uncomment `routes` in `wrangler.jsonc` and redeploy, or go to the Worker →
*Settings* → *Domains & Routes* → *Add* → *Custom domain* for `rivacomputech.com` and `www.rivacomputech.com`.
Cloudflare creates the DNS records and certificate. Then delete the old GitHub Pages `A`/`CNAME`
records and turn off GitHub Pages (repo *Settings → Pages*). This repo no longer deploys to Pages:
the site lives in `public/`.

## The contact form

Messages go to **Formspree** (`https://formspree.io/f/xvkkjper`, set in `public/os/core.js` → `FORMSPREE`),
which forwards them to rivacomputech@gmail.com. In the Formspree dashboard it's worth turning on
*Restrict to domain* (`rivacomputech.com`) once the domain is live. The form has a `_gotcha` honeypot.

If Formspree can't be reached, the app tries the Worker's `/api/contact`, then opens the visitor's own
email app with the message filled in, so an enquiry is never lost.

**Optional: Cloudflare-native email instead of (or as well as) Formspree.** Once the domain is on Cloudflare:
enable *Email Routing*, verify rivacomputech@gmail.com as a destination, then uncomment `send_email` in
`wrangler.jsonc` and deploy. `CONTACT_FROM` must be an address on the domain. To also keep every message
in Workers KV: `npx wrangler kv namespace create INBOX` and uncomment `kv_namespaces`. The Worker validates
input, blocks cross-site posts, rate-limits to 5 messages a minute per visitor, and strips header injection.

## Weather

The widgets' weather comes from **MET Norway** (free, including commercial use, CC BY 4.0; credited in
the widget). The Worker rounds the visitor's approximate Cloudflare location to ~10 km, caches each area
for 30 minutes, and stores nothing. The User-Agent identifies the site, as MET Norway's terms require.

## Share image

`public/og.png` (1200×630) is rendered from `tools/og.html`. To change it, edit that page, serve the repo
root (`python3 -m http.server 8090`), open `http://localhost:8090/tools/og.html` at 1200×630 and screenshot it.
Then bump `?v=` on the `og:image` / `twitter:image` URLs in `public/index.html` so LinkedIn, Slack and others
fetch the new image instead of a cached one.

## Editing the content

All copy lives in **`public/os/content.js`**: tagline, services, comparison, steps, health checks, profile
and bio. The Welcome, Services, Health Check, About and Contact apps, the read-only `C:\Riva` folder and
the terminal (`Get-Service`, `Get-ADUser devik`) all read from it. Email and phone live in `public/os/core.js`.

Honesty rules for copy: **10+ years**, **no Microsoft certifications** (none are claimed), and
**no testimonials** until there are real ones.

## ⚠️ TODO (from Devik)

1. **Service area.** Add `areaServed` to the JSON-LD in `public/index.html`.
2. **Photo.** Swap the `DP` initials in the About app (`public/os/apps/about.js`) for a square photo.

## Brand

The logo is the **riva wordmark**: rounded, connected letters in brand blue **`#0067c0`**. Where the
full name is needed, "COMPUTECH" is set in small, widely spaced capitals underneath. It's the Start
button, the boot screen, the Welcome header and the share image.

| File | Use |
| --- | --- |
| `public/brand/riva-logo.svg` (= `public/logo.svg`) | The wordmark, brand blue, for light backgrounds |
| `public/brand/riva-logo-white.svg` | White, for dark or photo backgrounds |
| `public/brand/riva-icon.svg` | Square app icon: white wordmark on a blue tile (favicon, home-screen icon) |

In the site, the wordmark is one SVG symbol (`#rivaLogo` in `public/index.html`) coloured by the
`--logo` token: `#0067c0` in light mode, `#3d9bf0` in dark mode so it stays readable.

rivaOS is an original design: the wallpapers, icons and artwork are drawn for this site, the Start button
is the riva logo, and the Welcome app carries a trademark disclaimer, so it doesn't look affiliated with Microsoft.

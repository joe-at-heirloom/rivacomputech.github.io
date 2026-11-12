# Riva Computech: website

**rivacomputech.com has two faces:**

- **The home page (`/`)** is one simple, centred page in plain words: what Riva does, what to expect,
  who Devik is, answers to common questions, and how to get in touch. Modest and uncomplicated, with
  the feel of a computer desktop: a dark "screen" up top, app windows, and a taskbar for a menu.
- **rivaOS (`/desktop/`)** is the interactive version: a Windows 11-style desktop that runs in the
  browser, with windows, a file system, a PowerShell terminal and around 15 apps. It's linked from the
  home page's footer for anyone curious.

It runs on **Cloudflare Workers**: static files are served from Cloudflare's edge, and a small Worker
adds the parts a static site can't do (edge info, weather, a backup contact endpoint).

No framework and no build step: plain HTML for the home page, native ES modules for rivaOS.

## The home page

`public/index.html` is the whole thing: HTML, CSS and a few lines of script in one file.

- **Plain words first, technical terms second:** each service has an everyday name and one plain
  sentence ("Sign-ins and access: one sign-in per person…"), then an *Includes* line with the terms
  people and search engines look for (Microsoft Entra ID, Active Directory, Intune…).
- **It borrows the feel of a computer desktop** (the look the earlier site had), without being one:
  - **The hero is a dark "screen":** full-height navy, with the riva bloom from the desktop wallpaper
    rising from the bottom and the brand blue as the accent. The slogan types itself in blocky Space
    Mono, and the face is `:(` while it types and lights up as `:)` when it finishes. The typing runs
    once per visit, and not at all for visitors who have asked their device for reduced motion;
    without JavaScript the finished hero is simply there. The colors are at the top of the hero's CSS
    (`--screen`, `--screen-2`, `--blue`, `--sky`).
  - **The taskbar** is fixed to the bottom of the screen and is the page's menu. It is kept quiet on
    purpose: plain line icons in one color with the section names, and the section on screen is
    simply brighter with a small blue mark. Wide screens also get a clock and a *Book a free chat*
    button. Phones get five items (no *Top*), and the bar slides away while someone is typing so it
    never covers the keyboard. Its markup sits right after the header.
  - **App windows:** the health check, the example script and the message form are drawn as windows
    with a title bar. The three little window buttons are decoration only.
  - **App icons:** each service card has its own icon color and a small "Running" light, and each
    section has a line of PowerShell above its heading (`PS> Get-Service`). These are flavor and are
    hidden from screen readers; the headings underneath stay in plain words.
- **Slogan:** "You mind your business. We'll mind your computers." It is the page's `<h1>`. The
  second sentence sits on a blue bar, the way selected text looks, with a cursor that blinks four
  times and then stays still. The plain description, "IT support for small businesses", is the
  sentence under it, so search engines and AI assistants still meet it straight away.
- **No buttons in the hero:** one box asks "What's going on with your computers?". The visitor types,
  presses Enter and lands on the message form with their words already in it. A link such as
  `/?q=our+email+is+down#contact` does the same. The phone number sits underneath as plain text.
- **Sections, in order:** services · the example script · common reasons people get in touch · what
  to expect · how it works · a quick IT health check · about Devik · questions people ask · get in touch.
- **The example script:** a real offboarding script in a code window. *Run* prints what it would do,
  one line at a time; nothing actually runs. The button only appears when JavaScript is on.
- **Health check:** eight checkboxes, a ring that fills as they are checked, and a "good place to
  start" tip. *Ask Devik about my result* copies the result into the message box. Nothing is sent
  until the visitor presses *Send message*.
- **About:** an ID card with a terminal-style read-out of the facts, beside a few paragraphs in
  Devik's own words (the line about efficiency and working smarter is his, from the earlier site).
- **Questions people ask:** eleven short answers in a native accordion, so it works without JavaScript.
- **Everything is centred:** hero, the "Works with" logo row (each logo sized by eye so they carry the
  same weight), service cards, windows, steps, and the footer.
- **Phones first, and not crowded:** the hero is given room rather than packed. On a phone it is
  the logo, the smile, the slogan, one sentence and the type-here box, all above the taskbar on the
  first screen (the line with the phone number is left to the Contact section, and on the shortest
  phones the smile steps aside). Nothing scrolls sideways except the code inside the script window,
  and controls are at least 44px tall.
- **Readable:** Inter at 18px, strong contrast, buttons at least 48px tall. A small text-size control in
  the footer goes up to 22px and remembers the choice.
- **A forgiving form:** name, a phone number *or* an email, and a message, with clear error messages.
  It posts to Formspree and works with JavaScript turned off.
- **Old links still work:** `/#services`, `/#automation`, `/#why`, `/#how`, `/#about`, `/#health` and
  `/#contact` jump to those sections; `/#terminal`, `/#settings` and `/#files` open rivaOS.
- **Page not found (`public/404.html`):** the same dark screen with a frown and a stop code, as a nod
  to the earlier site's 404 page.

To change the wording, edit `public/index.html` directly. (rivaOS has its own copy in
`public/os/content.js`, including the slogan; if a service or the bio changes, update both, and
`public/llms.txt` too.)

### How the copy is written

- **Modest.** No "senior", "expert", "best" or "leading", no digs at other providers, and no promises
  the business can't keep. Say what is done and let the reader judge.
- **True today.** 10+ years of experience, no Microsoft certifications claimed, no testimonials until
  there are real ones, no prices or response-time guarantees, and no location until the service area
  is confirmed.
- **Plain, and in US spelling.** Short sentences. Name the business and the person ("Riva Computech",
  "Devik Patel") rather than "we", so a sentence still makes sense when it is quoted on its own.

## Search engines and AI assistants

The page is written to be found, and to be quoted accurately when someone asks an AI assistant about
the business.

- **Title, description and headings** describe the business in the words people search for
  ("small business IT support", "Microsoft 365", the service names).
- **Structured data** (the JSON-LD block in `<head>`) describes the business, Devik, the services and
  the questions. ⚠️ The questions appear twice, once in the page and once in the JSON-LD, and the two
  must match word for word. If you edit a question or an answer, edit both.
- **`public/llms.txt`** is a plain-text summary of the business for AI tools. Keep it in step with
  the page.
- **`public/robots.txt`** lets everyone in, AI crawlers included, and **`public/sitemap.xml`** lists
  both pages. Update `<lastmod>` there when the content changes.
- **Sources.** The two outside facts on the page link to where they come from: Microsoft Research for
  the MFA figure, and Microsoft's "shared responsibility" page for the backup answer.

Once the site is live on `rivacomputech.com`:

1. Add the site to [Google Search Console](https://search.google.com/search-console) and
   [Bing Webmaster Tools](https://www.bing.com/webmasters), and submit
   `https://rivacomputech.com/sitemap.xml` in both. (Bing also supplies Microsoft Copilot's answers.)
2. In the Cloudflare dashboard, open **Security → Settings**, filter by **Bot traffic**, and open
   **AI Crawler and Agent access policies**. Leave *Search* and *Agents* on **Allow (do not block)**,
   which is the default for a new domain. If either is set to block, AI assistants can't read the site.
   *Training* is a separate choice.
3. When the service area is settled, add it to the page, to the JSON-LD and to `llms.txt`, and set up
   a Google Business Profile. Local searches ("IT support near me") depend on that more than on
   anything in this repo.

```
public/                     ← everything the browser downloads (Workers Static Assets)
  index.html                ← the home page
  desktop/index.html        ← rivaOS: boot screen, no-JS fallback, SVG sprite (logo + icons)
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
  404.html                  ← "page not found": the dark screen with a frown
  og.png                    ← share image (source: tools/og.html)
  llms.txt                  ← plain-text summary of the business for AI assistants
  brand/ · assets/logos/ · favicon.svg · robots.txt · sitemap.xml · _headers
tools/og.html               ← source for the share image
print/business-card/        ← business card: print PDF, editable SVGs, preview (not deployed)
src/worker.js               ← the Worker: /api/ping, /api/system, /api/version, /api/weather, /api/contact
wrangler.jsonc              ← Cloudflare config
```

## rivaOS (`/desktop/`)

### Apps

| App | What it does |
| --- | --- |
| **Welcome** | The introduction: slogan, "Book a free 30-min chat", tiles into everything else. Opens at start-up. |
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

**Deep links:** `/desktop/#services`, `#why`, `#automation`, `#health`, `#about`, `#contact`, `#svc-m365`…
open the matching app, and the address bar follows the focused app so links can be shared.

**Phones:** below ~760px wide, windows open full-screen and the taskbar becomes a scrolling app switcher.

**Privacy:** files live only in the visitor's browser (IndexedDB). Settings → Privacy & storage explains
this and has a reset button.

## Run it locally

```bash
npm install
npm run dev          # http://localhost:8787 (home page) and /desktop/ (rivaOS), Worker included
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

The home page's wording is in **`public/index.html`**. rivaOS's copy lives in **`public/os/content.js`**:
tagline, services, comparison, steps, health checks, profile and bio. The Welcome, Services, Health Check, About and Contact apps, the read-only `C:\Riva` folder and
the terminal (`Get-Service`, `Get-ADUser devik`) all read from it. Email and phone live in `public/os/core.js`.

Honesty rules for copy: **10+ years**, **no Microsoft certifications** (none are claimed), and
**no testimonials** until there are real ones. See *How the copy is written* above for the rest.

## ⚠️ TODO (from Devik)

1. **Service area.** The site doesn't say where Riva works. Once that's settled, say it on the page
   (the hero and a question in *Questions people ask*), in the JSON-LD in `public/index.html`
   (change `Organization` to `ProfessionalService` and add `areaServed` and/or `address`) and in
   `public/llms.txt`.
2. **Remote or on site.** The page doesn't say whether the work is done remotely, on site or both.
   It's one of the first things people ask, so it deserves a line in *Questions people ask*.
3. **Photo.** Swap the `DP` initials for a square photo, in the home page's About section
   (`public/index.html`) and in rivaOS's About app (`public/os/apps/about.js`).
4. **Phone numbers.** The website shows (313) 405-7164; the business card shows (734) 765-9182.
   Confirm that's intended, or pick one.
5. **Read the answers.** *Questions people ask* speaks for Devik. He should read it once, in
   particular "Is Riva Computech the right fit for my business?", and change anything that isn't
   how he'd put it.

## Brand

**Slogan:** *You mind your business. We'll mind your computers.*

The logo is the **riva wordmark**: rounded, connected letters in brand blue **`#0067c0`**. Where the
full name is needed, "COMPUTECH" is set in small, widely spaced capitals underneath. It's the Start
button, the boot screen, the Welcome header and the share image.

| File | Use |
| --- | --- |
| `public/brand/riva-logo.svg` (= `public/logo.svg`) | The wordmark, brand blue, for light backgrounds |
| `public/brand/riva-logo-white.svg` | White, for dark or photo backgrounds |
| `public/brand/riva-icon.svg` | Square app icon: white wordmark on a blue tile (favicon, home-screen icon) |
| `public/brand/riva-computech-logo.svg` · `-white.svg` | Full lockup: wordmark + COMPUTECH (outlined, no font needed) |

**Business card:** `print/business-card/` has the print-ready PDF (3.5 × 2 in, 1/8 in bleed), editable
SVGs for both sides, and a preview. See its README for print and editing notes.

In the site, the wordmark is one SVG symbol (`#rivaLogo` in `public/index.html`) coloured by the
`--logo` token: `#0067c0` in light mode, `#3d9bf0` in dark mode so it stays readable.

rivaOS is an original design: the wallpapers, icons and artwork are drawn for this site, the Start button
is the riva logo, and the Welcome app carries a trademark disclaimer, so it doesn't look affiliated with Microsoft.

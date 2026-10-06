# Riva Computech — website

**rivaOS:** a single-page site that *is* a Windows 11 desktop. The taskbar is the navigation,
the hero is a working PowerShell terminal, and every section is introduced by the cmdlet that
would fetch it (`Get-Service`, `Compare-Object`, `Test-ITHealth`, `Get-ADUser devik`…).

No framework, no build step — `index.html` **is** the site (HTML + CSS + JS in one file).

```
index.html     ← the whole site
og.png         ← 1200×630 social preview (rendered from the hero)
brand/         ← the riva logo files (see "Brand" below)
logo.svg       ← copy of brand/riva-logo.svg (primary lockup)
favicon.svg · apple-touch-icon.png ← the riva mark
assets/logos/  ← technology logos for the "Hands-on with" strip
404.html       ← blue-screen-of-death 404 page
robots.txt · sitemap.xml
vendor/, assets/wall-*  ← unused leftovers from the earlier multi-era design (safe to delete)
```

## What's on the page

| Section | What it does |
| --- | --- |
| **Hero / desktop** | Original "bloom" wallpaper (drawn in SVG, recolours for dark mode) + an interactive Windows Terminal. Try `help`, `Get-Service`, `Get-ADUser devik`, `Invoke-Migration`, `book`, `ls`, `cd about`, `exit`. Tab-completion and ↑/↓ history work. Drag it by the title bar; drag to the top edge to maximise. |
| **Services** (`Get-Service`) | Six Fluent cards, each with its PowerShell-verb cmdlet. |
| **Why** (`Compare-Object`) | Typical IT provider `<=` vs `=>` Riva Computech. |
| **Automation** (`Invoke-Automation`) | A real, correct `Offboard-User.ps1` (Graph + Exchange Online) with syntax highlighting and a **Run** button that plays the output. |
| **Health check** (`Test-ITHealth`) | Eight Settings-style toggles → live score ring + "fix these first". The CTA pre-fills the contact form with the results. Nothing leaves the browser. |
| **About** (`Get-ADUser devik`) | Devik's profile and first-person bio. |
| **Contact** (`Send-MailMessage`) | A mail-compose window posting to Formspree, with quick-subject chips. |

**The shell:** a fixed Win11 taskbar (scroll-spy running indicators, tooltips), a Start menu with
search (no match → "Ask Devik about '…'" pre-fills the form), power menu (Sleep → lock screen,
Restart → replays the intro, Shut down → a joke), Quick Settings (dark mode, reduce motion, copy
email) and a calendar flyout. Light/dark follows the OS until the visitor picks one.

**Easter eggs:** Konami code → Windows 3.1 (Internet Archive emulator). Type `devik` anywhere → 🎵.

The Start button uses the riva logo rather than the Windows logo, the wallpaper is original,
and the footer carries a trademark disclaimer, so the site doesn't look affiliated with Microsoft.

## Brand

The logo is **"Prompt"**: a lowercase `r` followed by a blinking block cursor, like the PowerShell
prompt Devik lives in.

| File | Use |
| --- | --- |
| `brand/riva-logo.svg` | Primary lockup (mark + wordmark) on light backgrounds |
| `brand/riva-logo-white.svg` | Reversed, for dark backgrounds |
| `brand/riva-wordmark.svg` | Wordmark only (`riva▮` + COMPUTECH) |
| `brand/riva-mark.svg` · `riva-mark-dark.svg` | App icon / favicon / avatar (dark variant has a lighter tile + edge) |

Colours: tile `#0d1625` · cursor `#1e9bf0` · ink `#0b1b30` · COMPUTECH `#5c6b80` (on dark: tile
`#1a2740`, COMPUTECH `#9fb0c6`). The wordmark is JetBrains Mono Bold converted to outlines (SIL
Open Font License, which allows use in logos), so the files don't need the font installed. The site inlines the mark plus a **compact** wordmark (COMPUTECH set
relatively larger so it stays legible at header size). The hero cursor blinks four times on load,
then stays solid. Keep clear space of at least the cursor's width around the lockup, and don't use the
wordmark without the mark below ~24px tall. Use the mark on its own instead.

## Preview locally

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Deploy (GitHub Pages)

Repo **Settings → Pages → Deploy from a branch → `main` / root**. Every push to `main` republishes.
For the custom domain, add a `CNAME` file containing `rivacomputech.com` (it was removed in
`fa4c46e`) and point DNS at GitHub Pages: apex `A` records `185.199.108–111.153`, `www` →
`CNAME` → `joe-at-heirloom.github.io`. If DNS is on Cloudflare, use DNS-only (grey cloud).

## ⚠️ TODO before launch (from Devik)

All marked `TODO(Devik)` in `index.html`:

1. **Formspree ID.** Create a form at <https://formspree.io> (with `rivacomputech@gmail.com`) and
   replace `YOUR_FORMSPREE_ID` in the form `action`. Until then, **Send opens the visitor's email
   app with the message pre-filled**, so the form still works.
2. **Phone number & service area.** Add them to the Contact "Phone" row and to the JSON-LD
   (`telephone`, `areaServed`).
3. **Photo.** Swap the `DP` initials in the About card for a square `devik.jpg`.
4. **Bio check.** The About copy mentions that the business is named after his daughter. Confirm he's
   happy to share that.

Honesty rules for copy: **10+ years**, **no Microsoft certifications** (none are claimed), and
**no testimonials** until there are real ones.

## Notes

- Fonts: Segoe UI Variable on Windows, SF on Apple, Inter elsewhere. Cascadia Code (Windows
  Terminal's font) for anything monospaced.
- Respects `prefers-reduced-motion` and `prefers-color-scheme`. Visitors can override both in
  Quick Settings.
- Formspree endpoints are public by design. The form has a `_gotcha` honeypot.

# Riva Computech — website

**rivaOS:** a single-page site that *is* a Windows 11 desktop. The taskbar is the navigation,
the hero is a working PowerShell terminal, and every section is introduced by the cmdlet that
would fetch it (`Get-Service`, `Compare-Object`, `Test-ITHealth`, `Get-ADUser devik`…).

No framework, no build step — `index.html` **is** the site (HTML + CSS + JS in one file).

```
index.html     ← the whole site
og.png         ← 1200×630 social preview (rendered from the hero)
assets/logos/  ← technology logos for the "Hands-on with" strip
logo.svg       ← the riva wordmark (also inlined in index.html as an SVG symbol)
404.html       ← blue-screen-of-death 404 page
favicon.svg    ← terminal-prompt favicon
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

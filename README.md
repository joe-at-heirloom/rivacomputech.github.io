# Riva Computech — website

A single-page site for Riva Computech that scrolls through Windows history — each section is a
different Windows era (11 → 10 → 7 → XP → 95), styled after the matching community CSS framework
(w11CSS / win10css / 7.css / XP.css / 95CSS), with era-authentic loading animations.
No build step, no framework — `index.html` **is** the site.

```
index.html     ← the whole site (HTML + CSS + JS, self-contained)
404.html       ← Windows blue-screen-of-death 404 page
favicon.svg    ← terminal-prompt favicon
robots.txt     ← search-engine directives
sitemap.xml    ← sitemap
README.md      ← this file
```

> ✅ **Wallpapers:** the Windows desktop backgrounds are now drawn entirely in **CSS**
> (original gradients — XP sky+hill, Win7 glow, Win10 abstract, Win95 teal). No copyrighted
> Microsoft images are bundled, so it's safe for a public/commercial site.

## Preview locally

Open `index.html` directly in a browser, or serve it:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploy to Cloudflare Pages

**Option A — direct upload (fastest)**

```bash
npx wrangler pages deploy . --project-name rivacomputech
```

Or in the Cloudflare dashboard → **Workers & Pages → Create → Pages → Upload assets**,
drag in this folder.

**Option B — Git (recommended for ongoing edits)**

1. Push this folder to a GitHub repo.
2. Cloudflare dashboard → **Pages → Connect to Git** → pick the repo.
3. Build settings: **Build command = _(leave empty)_**, **Output directory = `/`**.
4. Every push to `main` auto-deploys.

Then add the custom domain `rivacomputech.com` under the Pages project → **Custom domains**.

---

## ⚠️ TODO before launch (things to get from Devik)

These are marked with `TODO(Devik)` comments inside `index.html`:

1. **Web3Forms access key (required for the contact form).**
   - Sign up free at <https://web3forms.com> using `rivacomputech@gmail.com`.
   - Copy the access key, then in `index.html` replace `YOUR_WEB3FORMS_ACCESS_KEY`
     (search for it — it's a hidden `<input name="access_key">`).
   - Until this is set, the form shows a friendly "not configured yet" message instead of sending.

2. **Phone number & service area** — used in the Contact section and the JSON-LD `areaServed`.

3. **About the owner** (the Windows XP window) — Devik Patel, owner. Stats are honest:
   `10+ years`, `1:1 direct with owner`, `M365 + Azure focus` (no Microsoft certifications,
   so none are claimed). Optional: drop a square **photo** of Devik in (`devik.jpg`) and
   replace the `DP` initials tile — see the `TODO(Devik)` comment in the `.xp-user` block.

4. **Logo** — currently the `riva computech` wordmark approximated in the rounded **Fredoka**
   font (a stand-in for your WIP logo). To use the real artwork: export it as `logo.svg`,
   drop it in this folder, and replace the `.logo-word` spans in the nav and footer with
   `<img src="/logo.svg" alt="riva computech" />`.

5. **Social share image** — add `og.png` (1200×630) to this folder for nice link previews
   (referenced in the `<meta property="og:image">` tag).

6. *(Later)* **Testimonials** — gather 2–3 client quotes; a testimonials section can be added then.

## Notes

- All animations respect `prefers-reduced-motion`.
- Fonts (Cascadia Code + Inter) load from public CDNs with monospace/system fallbacks.
- The contact form posts client-side to Web3Forms — no backend, no secrets in the repo
  beyond the public access key (which is safe to expose; that's how Web3Forms works).

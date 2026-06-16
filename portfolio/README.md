# Mira Solén — Portfolio Landing Page

An awards-style landing page for a fictional independent UI/UX designer, built as a
self-contained static experience with **GSAP** (motion + ScrollTrigger), **Three.js**
(a custom WebGL shader hero) and **Lenis** (smooth scroll).

> Mira Solén is fictional. All projects, clients and awards are invented for the demo.

## Run it

The page uses ES modules and self-hosted fonts, so it must be served over HTTP
(opening `index.html` via `file://` will be blocked by the browser). From the repo root:

```bash
# any static server works — pick one
npx serve portfolio
# or
python3 -m http.server 8077 --directory portfolio
```

Then open the printed URL.

## What's inside

| Area | Highlights |
| --- | --- |
| **Hero** | Full-screen WebGL fragment shader — domain-warped fbm simplex noise flowing through the brand palette, with smoothed mouse parallax and scroll-driven dissolve. Falls back to a pure-CSS gradient if WebGL is unavailable. |
| **Motion** | GSAP timelines for the preloader + hero intro; ScrollTrigger for parallax, line/word reveals, animated stat counters and a velocity-scrubbed marquee. |
| **Smooth scroll** | Lenis, wired into the GSAP ticker and `ScrollTrigger.update`. |
| **Interaction** | Custom blend-mode cursor with label states, cursor-following project preview, magnetic CTA, live Lisbon clock. |
| **Type** | Self-hosted *Fraunces* (variable serif), *Space Grotesk* and *Inter* — no external CDN calls. |
| **Accessibility** | Honours `prefers-reduced-motion` (skips the loader/intro, disables smooth scroll and grain) and `(hover: none)` for touch. |

## Structure

```
portfolio/
  index.html          # markup + section content
  css/style.css       # design tokens, layout, components, responsive, reduced-motion
  js/main.js          # WebGL shader, Lenis+ScrollTrigger, cursor, reveals, counters
  assets/             # self-hosted woff2 fonts
  vendor/             # gsap.min.js, ScrollTrigger.min.js, three.module.min.js, lenis.esm.js
```

GSAP core + ScrollTrigger load as classic UMD `<script>` tags (window globals); Three.js
and Lenis are imported as ES modules.

## Verification

Checked in headless Chrome (puppeteer) across desktop (1440×900) and mobile (390×844):
WebGL context creation, zero console/page errors, all sections rendering, the
reduced-motion path, and screenshots at six scroll positions.

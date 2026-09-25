# LoopMint Website

Responsive static website for LoopMint, including a landing page, device setup instructions, and a customer help centre. The homepage cycles through three original, unbranded sport, film and series images with gentle CSS movement. The motion stops on the football image when the visitor requests reduced motion.

The on-page hero scenes use compressed WebP images. The football PNG remains for social previews.

## Pages

- `index.html` - Main landing page, plans, trial request, reviews, and FAQ
- `setup.html` - Setup routes for Fire TV, Android, Windows, Smart TV, Apple, and compatible TV boxes
- `guides.html` - Plain-language service, connection, pricing, and family-viewing guides
- `trial-checklist.html` - Practical guide to testing a 24-hour trial before choosing a plan

## Run locally

```powershell
npm install
npm run serve
```

Open `http://127.0.0.1:5500/`.

## Verification

With the local server running:

```powershell
npm run audit:site
```

The audit checks page metadata, all three hero scenes, generic viewing categories, the guide interaction, checkout payment choices, and mobile horizontal overflow. It runs against the local server on port 5500.

## Structure

```text
assets/             Website images, including the generated football hero
playwright-tools/   Browser verification script
guides.html         Help centre
index.html          Main website
script.js           Interaction behavior
setup.html          Device setup centre
styles.css          Shared responsive styling
```

Experimental media, generated screenshots, browser profiles, installed dependencies, and archived drafts are intentionally excluded from version control.

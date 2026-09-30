# LoopMint Website

Responsive static website for LoopMint, including a landing page, device setup instructions, and a customer help centre. The homepage cycles through three original, unbranded sport, film and series images with gentle CSS movement. The motion stops on the football image when the visitor requests reduced motion.

The on-page hero scenes use compressed WebP images. The football PNG remains for social previews.

## Device graphics

The setup page and homepage use the [Fire TV press logo](https://press.aboutamazon.com/logos), the [Android robot](https://developer.android.com/distribute/marketing-tools/brand-guidelines), and the header marks from [Infomir](https://www.infomir.eu/) and [Formuler](https://www.formuler.tv/). The Android attribution appears on both pages. Windows and Apple use local vector marks; Smart TV uses a neutral television icon because it is a device category, not one manufacturer. Brand marks identify setup routes and do not imply an affiliation.

## Pages

- `index.html` - Main landing page, plans, trial request, reviews, and FAQ
- `setup.html` - Setup routes for Fire TV, Android, Windows, Smart TV, Apple, and compatible TV boxes
- `guides.html` - Plain-language service, connection, pricing, and family-viewing guides
- `trial-checklist.html` - Practical guide to testing a 24-hour trial before choosing a plan
- `blog/` - Live TV review policy and buyer's guides; named reviews require documented testing
- `blog/live-tv-app-vs-service.html` - Guide to player apps, viewing plans, device checks and total costs
- `blog/where-loopmint-is-available.html` - Worldwide trial and plan request guide with examples for the UK, Ireland and United States
- `blog/uk-live-tv-trial-guide.html` - UK trial checklist and published euro plan prices, with final payment currency confirmed before purchase
- `privacy.html`, `terms.html`, `refunds.html` - Customer information and contact routes

Optional Meta Pixel tracking on the homepage, setup and guides loads only after an explicit choice. Visitors can change their choice from the footer on every page.

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
npm run audit:privacy
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

# LoopMint IPTV Landing Page

Responsive static website for LoopMint, including a product landing page, device-specific setup instructions, and a customer help centre.

## Pages

- `index.html` - Main landing page, plans, trial request, reviews, and FAQ
- `setup.html` - Setup routes for Fire TV, Android, Windows, Smart TV, Apple, and compatible TV boxes
- `guides.html` - Plain-language service, connection, pricing, and family-viewing guides

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
npm run audit:resources
npm run audit:production
```

The automated checks cover desktop and mobile layouts, responsive video playback, fixed navigation, worldwide phone selection, trial and checkout handoffs, pricing calculations, device routes, guide routes, and horizontal overflow.

## Structure

```text
assets/             Production images, logos, and video
playwright-tools/   Browser verification scripts
guides.html         Help centre
index.html          Main website
script.js           Interaction behavior
setup.html          Device setup centre
styles.css          Shared responsive styling
```

Experimental media, generated screenshots, browser profiles, installed dependencies, and archived drafts are intentionally excluded from version control.

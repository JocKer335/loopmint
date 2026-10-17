# LoopMint Website

Responsive static website for LoopMint, including a landing page, device setup instructions, and a customer help centre. The homepage cycles through three original, unbranded sport, film and series images with gentle CSS movement. The motion stops on the football image when the visitor requests reduced motion.

The on-page hero scenes use compressed WebP images. The football PNG remains for social previews.

## Device graphics

The setup page and homepage use the [Fire TV press logo](https://press.aboutamazon.com/logos), the [Android robot](https://developer.android.com/distribute/marketing-tools/brand-guidelines), and the header marks from [Infomir](https://www.infomir.eu/) and [Formuler](https://www.formuler.tv/). The Android attribution appears on both pages. Windows and Apple use local vector marks; Smart TV uses a neutral television icon because it is a device category, not one manufacturer. Brand marks identify setup routes and do not imply an affiliation.

## Pages

- `index.html` - Main landing page, plans, trial request, and FAQ
- `setup.html` - Setup routes for Fire TV, Android, Windows, Smart TV, Apple, and compatible TV boxes
- `guides.html` - Plain-language service, connection, pricing, and family-viewing guides
- `trial-checklist.html` - Practical guide to testing a 24-hour trial before choosing a plan
- `blog/` - Live TV review policy and buyer's guides; named reviews require documented testing
- `blog/live-tv-app-vs-service.html` - IPTV player activation and setup guide with 26 named player activation enquiries, included licence terms, device checks and app-versus-viewing costs
- `blog/iptv-mag-box-setup.html` - Supported MAG activation, MAC address, portal setup and support routes
- `blog/iptv-fire-tv-setup.html` - Existing Fire TV and Fire Stick setup article
- `blog/where-loopmint-is-available.html` - Worldwide trial and plan request guide with examples for the UK, Ireland and United States
- `blog/uk-live-tv-trial-guide.html` - UK trial checklist and published euro plan prices, with final payment currency confirmed before purchase
- `privacy.html`, `terms.html`, `refunds.html` - Customer information and contact routes

Optional Meta Pixel tracking on the homepage, setup and guides loads only after an explicit choice. Visitors can change their choice from the footer on every page.

## Run locally

```powershell
npm install
npm run build
npm run serve
```

Open `http://127.0.0.1:5500/`.

## Optimized assets

Edit the original `.css` and `.js` files, then run `npm run build`. The build removes unused CSS while preserving interactive states, minifies CSS and JavaScript, and updates all pages to use content-versioned `.min.css` and `.min.js` files. Include those generated files when publishing. Rebuild after changing markup or scripts, since the CSS build reads their class names.

The local preview compresses text assets with gzip and caches assets for ten minutes, matching the compression and asset cache duration observed on the live GitHub Pages host. HTML is revalidated during local development. Preview measurements are lab results; check the live deployment after publishing.

## Verification

With the local server running:

```powershell
npm run audit:site
npm run audit:privacy
npm run audit:content
npm run audit:countries
```

The audit checks page metadata, all three hero scenes, generic viewing categories, the guide interaction, checkout payment choices, and mobile horizontal overflow. It runs against the local server on port 5500.

The content audit checks all sitemap pages and their internal links, fragments, local assets, article dates and schema. It checks widths of 320, 390 and 1440 pixels, all five plan totals and included player activation, currency changes, extra-screen pricing, and keyboard focus in the trial and order dialogs. It does not submit an order or send a WhatsApp message.

The country-picker audit checks search, selection, international-number paste and keyboard opening. Country lists are populated when used to reduce the initial page layout. Set `AUDIT_ORIGIN` to `https://loopmint.net` to run this check against the published site; external requests and form submissions are not sent.

## Canonical URLs and search indexing

Use the directory homepage (`./` or `../` depending on the page) for internal home links. The preferred public homepage is `https://loopmint.net/`. All sitemap URLs are canonical URLs; article dates show meaningful content revisions, and sitemap `lastmod` values reflect those changes.

The live GitHub Pages host redirects HTTP and the www host to the HTTPS apex host. GitHub Pages also serves `/index.html` as a 200 page, so that alias declares the root homepage as its canonical. GitHub Pages does not provide a per-path redirect configuration for this alias. A Search Console redirect or alternate-canonical exclusion for a duplicate URL can be expected; inspect the canonical destination before changing hosting.

Successful page requests and a sitemap do not confirm Google indexing. Check URL Inspection for the individual canonical article URLs after publishing. Publishing and Search Console indexing requests are separate steps.

### Bing and IndexNow

LoopMint was imported into Bing Webmaster Tools from Google Search Console on 14 October 2026. The screenshot confirmed that `https://loopmint.net/sitemap.xml` was submitted and processing; it did not confirm page indexing.

`indexnow-key.txt` is the public domain verification file for [IndexNow](https://www.indexnow.org/documentation). Keep it in the website root, including manual uploads. The GitHub workflow `Notify IndexNow after publishing` sends notifications for added, edited and removed canonical sitemap pages on main-branch pushes. It first checks that the key, sitemap and selected pages match the live deployment. It stops without submitting if deployment verification fails. A 200 response confirms receipt; a 202 response means receipt with key validation pending. Neither guarantees crawling, indexing or rankings.

Preview selected URLs without submitting:

```powershell
node tools/submit-indexnow.mjs --since FULL_PREVIOUS_COMMIT_SHA --dry-run
```

For an initial submission or a deliberate full resubmission, use the workflow's manual Run workflow action or `node tools/submit-indexnow.mjs --all`. Routine publishing uses changed pages only; do not repeatedly resubmit unchanged URLs. The script needs Node 22 or later and no installed packages or account token.

## Manual upload

Review and chat handoff documents are local working notes excluded from Git. They are available in the working folder used for this review. The public site is published from the website files on the GitHub Pages branch.

The 9 October review and manual upload instructions are in `UPDATE-2026-10-09.md`; the complete article edit and latest Google guidance are in `EDITORIAL-REVIEW-2026-10-09.md`. The complete website ZIP is in the ignored `output/` folder. Upload the ZIP's contents with their directory structure, including the `blog/` and `assets/` folders. Updating only `index.html` does not update the articles or shared scripts.

After building and auditing future changes, regenerate the public bundle in PowerShell:

```powershell
./tools/package-upload.ps1 -ReleaseDate YYYY-MM-DD
```

The packager includes the public pages, styles/scripts and approved tracked assets, then checks the ZIP's required files and page count against the sitemap. It also writes a SHA-256 manifest beside the ZIP.

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

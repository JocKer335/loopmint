import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const expected = [
  ['/', 'Live TV & On-Demand Viewing | LoopMint'],
  ['/guides.html', 'Viewing & Setup Help Guides | LoopMint'],
  ['/setup.html', 'Device Setup Guides | LoopMint'],
  ['/trial-checklist.html', 'How to Test a 24-Hour Live TV Trial | LoopMint'],
  ['/blog/', 'Live TV, Films & Series Guides | LoopMint Blog'],
  ['/blog/uk-live-tv-trial-guide.html', 'UK Live TV Trial Guide: Devices, Plans & Prices | LoopMint'],
  ['/blog/where-loopmint-is-available.html', 'Where Is LoopMint Available? Worldwide Trial & Plans'],
  ['/blog/live-tv-app-vs-service.html', 'Live TV App vs Viewing Service: What Do You Need? | LoopMint'],
  ['/blog/how-we-review.html', 'How We Review Live TV Services | LoopMint Blog'],
  ['/blog/iptv-site-checklist.html', '12 Checks Before Choosing a Live TV Service | LoopMint Blog'],
  ['/privacy.html', 'Privacy Notice | LoopMint'],
  ['/terms.html', 'Trial and Plan Terms | LoopMint'],
  ['/refunds.html', 'Refund Policy | LoopMint']
];
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  for (const [pathname, title] of expected) {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:5500/') ? route.continue() : route.abort());
    const response = await page.goto(`http://127.0.0.1:5500${pathname}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200, pathname);
    await page.waitForLoadState('load');
    const seo = await page.evaluate(() => ({
      title: document.title,
      lang: document.documentElement.lang,
      description: document.querySelector('meta[name="description"]')?.content,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
      ogUrl: document.querySelector('meta[property="og:url"]')?.content,
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
      twitterImage: document.querySelector('meta[name="twitter:image"]')?.content,
      h1Count: document.querySelectorAll('h1').length,
      jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(x => JSON.parse(x.textContent)),
      hasCountryFaq: document.body.textContent.includes('Is LoopMint available in my country?'),
      correctedRate: document.body.textContent.includes('€5.56 monthly equivalent')
    }));
    assert.equal(seo.title, title);
    assert.equal(seo.lang, 'en');
    assert.ok(seo.description.length > 80 && seo.description.length < 170);
    assert.equal(seo.canonical, `https://loopmint.net${pathname === '/' ? '/' : pathname}`);
    assert.equal(seo.ogUrl, seo.canonical);
    assert.ok(seo.ogImage.startsWith('https://loopmint.net/assets/'));
    assert.ok(seo.twitterImage.startsWith('https://loopmint.net/assets/'));
    assert.equal(seo.h1Count, 1);
    const wording = await page.evaluate(() => ({
      headings: [...document.querySelectorAll('h1, h2, h3')].map(node => node.textContent).join(' '),
      body: document.body.innerText,
      brokenImages: [...document.images].filter(image => image.loading !== 'lazy' && (!image.complete || image.naturalWidth === 0)).length
    }));
    assert.ok(!/\bIPTV\b|buffering/i.test(wording.headings));
    assert.ok(!/buffering/i.test(wording.body));
    assert.equal(wording.brokenImages, 0);
    if (pathname === '/blog/' || pathname === '/blog/how-we-review.html') {
      assert.equal((wording.body.match(/\bIPTV\b/g) || []).length, 1);
    }
    if (pathname === '/') {
      assert.equal(seo.jsonld[0]['@graph'][0].name, 'LoopMint');
      assert.ok(seo.hasCountryFaq);
      assert.ok(seo.correctedRate);
      const visual = await page.evaluate(() => ({
        heroImages: [...document.querySelectorAll('.hero-scene')].map(image => image.complete && image.naturalWidth > 0 && image.currentSrc.endsWith('.webp')),
        heroAnimation: getComputedStyle(document.querySelector('.hero-football-image')).animationName,
        heroVideoCount: document.querySelectorAll('.hero video').length,
        cardCount: document.querySelectorAll('.clean-content-card').length,
        bodyText: document.body.innerText,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth
      }));
      assert.deepEqual(visual.heroImages, [true, true, true]);
      assert.ok(visual.heroAnimation.includes('heroSceneCycle'));
      assert.equal(visual.heroVideoCount, 0);
      assert.equal(visual.cardCount, 6);
      assert.ok(!/IPTV|Netflix|Premier League|Disney\+|HBO Max|UFC/.test(visual.bodyText));
      assert.ok(visual.scrollWidth <= visual.viewportWidth);
      await page.waitForTimeout(8000);
      assert.ok(Number(await page.locator('.hero-films-image').evaluate(image => getComputedStyle(image).opacity)) > 0.8);
      await page.waitForTimeout(8000);
      assert.ok(Number(await page.locator('.hero-series-image').evaluate(image => getComputedStyle(image).opacity)) > 0.8);
      assert.equal(await page.locator('.guide-img[loading="lazy"]').count(), 6);
      await page.locator('.guide-img').first().scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const image = document.querySelector('.guide-img');
        return image.complete && image.naturalWidth > 0;
      });
      await page.getByRole('button', { name: /Films and box sets/i }).click();
      await page.waitForTimeout(250);
      assert.ok((await page.locator('#feature-display').innerText()).includes('Browse films, series'));
      await page.locator('button[data-plan="6 Months"][data-price="€55"]').click();
      assert.equal(await page.locator('#checkout-modal').getAttribute('aria-hidden'), 'false');
      assert.deepEqual(await page.locator('.payment-opt-card').allTextContents().then(values => values.map(value => value.trim().replace(/\s+/g, ' '))), [
        'Card link Confirm on WhatsApp',
        'Bank transfer Details confirmed privately',
        'Ask for options Discuss with our team'
      ]);
      await page.locator('.payment-opt-card[data-pm="Bank transfer"]').click();
      assert.ok(await page.locator('.payment-opt-card[data-pm="Bank transfer"]').evaluate(element => element.classList.contains('active')));
    }
    assert.deepEqual(pageErrors, [], `${pathname} script errors`);
    console.log(`PASS ${pathname}: title, metadata, canonical, social image, H1`);
    await page.close();
  }
  const robots = await (await fetch('http://127.0.0.1:5500/robots.txt')).text();
  const sitemap = await (await fetch('http://127.0.0.1:5500/sitemap.xml')).text();
  assert.ok(robots.includes('Sitemap: https://loopmint.net/sitemap.xml'));
  for (const [pathname] of expected) assert.ok(sitemap.includes(`<loc>https://loopmint.net${pathname === '/' ? '/' : pathname}</loc>`));
  assert.equal((sitemap.match(/<loc>/g) || []).length, expected.length);
  assert.ok(!(await readFile('index.html', 'utf8')).includes('€6.11 monthly equivalent'));
  console.log('PASS robots.txt, sitemap.xml, corrected source price');
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:5500/') ? route.continue() : route.abort());
  await mobile.goto('http://127.0.0.1:5500/', { waitUntil: 'domcontentloaded' });
  assert.deepEqual(await mobile.locator('.hero-scene').evaluateAll(images => images.map(image => image.complete && image.naturalWidth > 0)), [true, true, true]);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  assert.deepEqual(await mobile.locator('.hero-scene').evaluateAll(images => images.map(image => getComputedStyle(image).opacity)), ['1', '0', '0']);
  console.log('PASS mobile hero image and horizontal layout');
  await mobile.close();
} finally {
  await browser.close();
}

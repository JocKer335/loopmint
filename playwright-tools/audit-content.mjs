import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const origin = 'http://127.0.0.1:5500';
const sitemap = await readFile('sitemap.xml', 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const snapshots = new Map();
const resourcePaths = new Set();
const errors = [];
const output = 'output/review-2026-10-09';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  for (const url of urls) {
    const pathname = new URL(url).pathname;
    const response = await page.goto(origin + pathname, { waitUntil: 'load' });
    assert.equal(response.status(), 200, pathname);
    const data = await page.evaluate(() => {
      const meta = selector => document.querySelector(selector)?.content;
      const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent.replace(/\s+/g, ' ').trim(),
        h1Count: document.querySelectorAll('h1').length,
        description: meta('meta[name="description"]'),
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        robots: meta('meta[name="robots"]') || '',
        links: [...document.querySelectorAll('a[href]')].map(e => e.href),
        assets: [...document.querySelectorAll('img[src],script[src],link[rel="stylesheet"]')].map(e => e.src || e.href),
        missingAlt: [...document.images].filter(e => !e.hasAttribute('alt')).map(e => e.src),
        ids,
        duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(e => JSON.parse(e.textContent)),
        times: [...document.querySelectorAll('.byline time')].map(e => e.dateTime),
        text: document.querySelector('main')?.innerText || '',
        articleText: document.querySelector('.article-layout article')?.innerText || ''
      };
    });
    assert.equal(data.h1Count, 1, `${pathname}: one H1`);
    assert.ok(data.description.length >= 80 && data.description.length <= 170, `${pathname}: description`);
    assert.equal(data.canonical, url, `${pathname}: canonical`);
    assert.ok(!/noindex|none/i.test(data.robots), `${pathname}: indexable`);
    assert.deepEqual(data.missingAlt, [], `${pathname}: alt attributes`);
    assert.deepEqual(data.duplicateIds, [], `${pathname}: duplicate IDs`);
    for (const asset of data.assets) resourcePaths.add(new URL(asset).pathname);
    for (const schema of data.jsonld) {
      for (const entity of schema['@graph'] || [schema]) {
        if (entity['@type'] !== 'Article') continue;
        assert.equal(entity.headline, data.h1, `${pathname}: schema matches heading`);
        assert.equal(entity.mainEntityOfPage, url);
        assert.deepEqual(data.times, [entity.datePublished, entity.dateModified], `${pathname}: displayed dates`);
        assert.ok(entity.datePublished <= entity.dateModified && entity.dateModified <= '2026-10-09');
      }
    }
    if (data.articleText) assert.ok(!/€(?:10|20)\b/.test(data.articleText), `${pathname}: separate player fees omitted`);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `${pathname}: overflow ${overflow}px at ${width}px`);
    }
    if (pathname === '/' || pathname === '/blog/iptv-subscription-cost.html') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${output}/${pathname === '/' ? 'home' : 'article'}-mobile.png`, fullPage: true });
    }
    snapshots.set(pathname, data);
    console.log(`PASS ${pathname}: metadata, schema, accessibility basics, mobile widths`);
  }
  for (const [pathname, data] of snapshots) {
    for (const href of data.links) {
      const link = new URL(href);
      if (link.origin !== origin) continue;
      assert.ok(!/\/index\.html$/.test(link.pathname), `${pathname}: avoid duplicate home URL ${href}`);
      const target = snapshots.get(link.pathname);
      assert.ok(target, `${pathname}: linked page is in sitemap: ${href}`);
      if (link.hash && !['#privacy-choices', '#trial-embed'].includes(link.hash)) {
        assert.ok(target.ids.includes(decodeURIComponent(link.hash.slice(1))), `${pathname}: missing target ${href}`);
      }
    }
  }
  for (const path of resourcePaths) {
    const response = await page.request.get(origin + path);
    assert.equal(response.status(), 200, `Asset: ${path}`);
  }

  await page.goto(origin + '/blog/', { waitUntil: 'load' });
  await page.locator('a[href="what-is-iptv.html"]').first().click();
  await page.waitForURL(origin + '/blog/what-is-iptv.html');
  await page.goBack({ waitUntil: 'load' });
  assert.equal(page.url(), origin + '/blog/', 'Back returns immediately to the blog index');

  await page.goto(origin, { waitUntil: 'load' });
  const offers = [
    ['1 Month', 'Available separately', '€12'],
    ['6 Months', '1 year included', '€55'],
    ['1 Year', '1 year included', '€85'],
    ['2 Years', 'Lifetime included', '€150'],
    ['3 Years', 'Lifetime included', '€200']
  ];
  for (const [plan, activation, price] of offers) {
    const trigger = page.locator(`.price-card button[data-plan="${plan}"]`);
    await trigger.click();
    await page.waitForFunction(() => document.querySelector('#checkout-modal').contains(document.activeElement));
    assert.equal(await page.locator('#sum-plan-name').innerText(), plan);
    assert.equal(await page.locator('#sum-player-activation').innerText(), activation);
    assert.equal(await page.locator('#sum-total-today').innerText(), price);
    await page.keyboard.press('Escape');
    assert.ok(await trigger.evaluate(e => e === document.activeElement));
  }
  await page.locator('.price-card button[data-plan="2 Years"]').click();
  await page.locator('#btn-device-plus').click();
  assert.equal(await page.locator('#sum-total-today').innerText(), '€255');
  await page.locator('#checkout-modal .currency-toggle-btn[data-curr="USD"]').click();
  assert.equal(await page.locator('#sum-total-today').innerText(), '$295.80');
  assert.equal(await page.locator('#sum-player-activation').innerText(), 'Lifetime included');
  await page.keyboard.press('Escape');
  await page.locator('.hero-primary-btn').click();
  await page.waitForFunction(() => document.querySelector('#trial-modal').contains(document.activeElement));
  await page.keyboard.press('Shift+Tab');
  assert.ok(await page.locator('#trial-modal').evaluate(e => e.contains(document.activeElement)));
  await page.keyboard.press('Tab');
  assert.ok(await page.locator('#trial-modal').evaluate(e => e.contains(document.activeElement)));
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('.hero-primary-btn').evaluate(e => e === document.activeElement));
  assert.deepEqual(errors, [], 'No browser script errors');
  const report = { date: '2026-10-09', pages: snapshots.size, assets: resourcePaths.size, widths: [320, 390, 1440], plans: offers.length, links: 'passed', scripts: 'passed', result: 'passed' };
  await writeFile(`${output}/results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}

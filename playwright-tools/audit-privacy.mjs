import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const origin = 'http://127.0.0.1:5500';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const metaRequests = [];
  const errors = [];
  page.on('request', request => {
    if (/connect\.facebook\.net|facebook\.com\/tr/.test(request.url())) metaRequests.push(request.url());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());

  const response = await page.goto(origin, { waitUntil: 'load' });
  assert.equal(response.status(), 200);
  assert.equal(metaRequests.length, 0, 'Meta must not load before a choice');
  assert.equal(await page.getByRole('button', { name: 'Reject optional tracking' }).count(), 1);
  assert.equal(await page.getByRole('button', { name: 'Accept optional tracking' }).count(), 1);
  await page.getByRole('link', { name: 'Start Free Trial' }).click();
  assert.equal(await page.locator('#trial-modal').getAttribute('aria-hidden'), 'false');
  assert.equal(await page.locator('.lm-consent-banner').isVisible(), false, 'Banner must not cover the trial form');
  await page.locator('#trial-close').click();
  assert.equal(await page.locator('.lm-consent-banner').isVisible(), true);
  await page.getByRole('button', { name: 'Reject optional tracking' }).click();
  assert.equal(metaRequests.length, 0);
  await page.reload({ waitUntil: 'load' });
  assert.equal(await page.locator('.lm-consent-banner').count(), 0, 'Rejection should persist');
  assert.equal(metaRequests.length, 0);
  await page.getByRole('link', { name: 'Privacy choices' }).click();
  await page.getByRole('button', { name: 'Accept optional tracking' }).click();
  await page.waitForTimeout(100);
  assert.ok(metaRequests.some(url => url.includes('connect.facebook.net')), 'Meta should load after opt-in');
  assert.equal(await page.evaluate(() => localStorage.getItem('loopmint_marketing_choice')), 'accepted');

  await page.getByRole('link', { name: 'Privacy choices' }).click();
  const beforeWithdrawal = metaRequests.length;
  await page.getByRole('button', { name: 'Reject optional tracking' }).click();
  await page.waitForLoadState('load');
  assert.equal(await page.evaluate(() => localStorage.getItem('loopmint_marketing_choice')), 'declined');
  assert.equal(metaRequests.length, beforeWithdrawal, 'Meta should not load after withdrawal reload');
  assert.equal(await page.locator('#co-consent').isChecked(), false, 'Order contact box must begin unchecked');

  for (const path of ['/privacy.html', '/terms.html', '/refunds.html']) {
    const res = await page.goto(origin + path, { waitUntil: 'load' });
    assert.equal(res.status(), 200, path);
    assert.equal(await page.locator('h1').count(), 1, path);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, path);
    assert.equal(await page.locator('a[href="mailto:inquiries@officialgnf.com"]').count() > 0, true, path);
  }
  assert.match(await page.locator('main').innerText(), /30 calendar days/);
  assert.equal(metaRequests.length, beforeWithdrawal);

  await page.goto(origin + '/blog/', { waitUntil: 'load' });
  await page.getByRole('link', { name: 'Request a free 24-hour trial' }).click();
  const frame = page.frameLocator('iframe.blog-trial-frame');
  assert.equal(await frame.locator('#trial-modal-form').count(), 1);
  assert.equal(await frame.locator('.lm-consent-banner').count(), 0, 'No duplicate banner in trial iframe');
  const fresh = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await fresh.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  await fresh.goto(origin + '/blog/', { waitUntil: 'load' });
  assert.equal(await fresh.locator('.lm-consent-banner').isVisible(), true);
  await fresh.getByRole('link', { name: 'Request a free 24-hour trial' }).click();
  await fresh.frameLocator('iframe.blog-trial-frame').locator('#trial-first-name').click();
  await fresh.close();
  assert.deepEqual(errors, []);
  console.log('Privacy, policy pages, mobile layout and blog trial popup: passed');
} finally {
  await browser.close();
}

import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const origin = (process.env.AUDIT_ORIGIN || 'http://127.0.0.1:5500').replace(/\/$/, '');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  await page.goto(origin, { waitUntil: 'load' });
  const initialElements = await page.locator('*').count();
  assert.ok(initialElements < 1500, `Country menus should not inflate initial layout: ${initialElements} elements`);

  await page.locator('.price-card button[data-plan="1 Month"]').click();
  const orderPicker = page.locator('#co-country-picker');
  await orderPicker.locator('.country-trigger-btn').click();
  await orderPicker.getByRole('searchbox', { name: 'Search countries' }).fill('United States');
  await orderPicker.locator('.country-item[data-code="US"]').click();
  assert.equal(await orderPicker.locator('input[type="hidden"]').inputValue(), '+1');
  assert.equal(await orderPicker.locator('.curr-code').innerText(), 'US');
  assert.equal(await orderPicker.locator('.country-trigger-btn').getAttribute('aria-expanded'), 'false');
  await orderPicker.locator('.country-trigger-btn').click();
  assert.equal(await orderPicker.locator('.country-item[data-code="US"]').getAttribute('aria-selected'), 'true');
  assert.equal(await orderPicker.getByRole('searchbox').inputValue(), '');
  await orderPicker.getByRole('searchbox').fill('+212');
  await orderPicker.locator('.country-item[data-code="MA"]').click();
  assert.equal(await orderPicker.locator('input[type="hidden"]').inputValue(), '+212');
  await page.keyboard.press('Escape');

  // Pasting a full number must work before the user ever opens that picker.
  await page.reload({ waitUntil: 'load' });
  await page.locator('.price-card button[data-plan="1 Month"]').click();
  await page.locator('#co-whatsapp').fill('+14155550123');
  assert.equal(await orderPicker.locator('.curr-code').innerText(), 'US');
  assert.equal(await orderPicker.locator('input[type="hidden"]').inputValue(), '+1');
  await page.locator('#co-whatsapp').fill('+212612345678');
  assert.equal(await orderPicker.locator('.curr-code').innerText(), 'MA');
  await page.keyboard.press('Escape');

  await page.reload({ waitUntil: 'load' });
  await page.locator('.hero-primary-btn').click();
  const trialPicker = page.locator('#trial-country-picker');
  await page.locator('#trial-whatsapp').fill('+447700900123');
  assert.equal(await trialPicker.locator('.curr-code').innerText(), 'GB');
  assert.equal(await trialPicker.locator('input[type="hidden"]').inputValue(), '+44');
  await trialPicker.locator('.country-trigger-btn').focus();
  await page.keyboard.press('Enter');
  await trialPicker.getByRole('searchbox').fill('Canada');
  await trialPicker.locator('.country-item[data-code="CA"]').click();
  await page.locator('#trial-whatsapp').fill('+14155550123');
  assert.equal(await trialPicker.locator('.curr-code').innerText(), 'CA', 'Keep the chosen country when its calling code matches');
  assert.equal(await trialPicker.locator('input[type="hidden"]').inputValue(), '+1');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ origin, initialElements, countrySearch: 'passed', selection: 'passed', internationalPaste: 'passed', keyboard: 'passed', result: 'passed' }));
} finally {
  await browser.close();
}

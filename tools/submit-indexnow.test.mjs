import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sitemapEntries, sourcePath, changedUrls, waitForPublished, submit } from './submit-indexnow.mjs';

const home = 'https://loopmint.net/';
const blog = 'https://loopmint.net/blog/';
const article = 'https://loopmint.net/blog/what-is-iptv.html';
const added = 'https://loopmint.net/blog/iptv-mag-box-setup.html';
const previous = new Map([[home, '2026-10-13'], [blog, '2026-10-12'], [article, '2026-10-09']]);

test('notification selection skips unchanged pages, includes edits, additions and removals', () => {
  assert.deepEqual(changedUrls(previous, previous, ['README.md']), []);
  assert.deepEqual(changedUrls(previous, previous, ['index.html', 'blog/index.html']), [home, blog]);
  const current = new Map([[home, '2026-10-14'], [blog, '2026-10-12'], [added, '2026-10-14']]);
  assert.deepEqual(changedUrls(current, previous, []), [home, added, article]);
  assert.deepEqual(changedUrls(previous, previous, [], true), [home, blog, article]);
  assert.equal(sourcePath(home), 'index.html');
  assert.equal(sourcePath(blog), 'blog/index.html');
});

test('real sitemap includes the homepage, blog index and existing page files', () => {
  const entries = sitemapEntries(fs.readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8'));
  assert.ok(entries.has(home));
  assert.ok(entries.has(blog));
  for (const url of entries.keys()) {
    assert.ok(fs.existsSync(new URL(`../${sourcePath(url)}`, import.meta.url)), `Missing page: ${url}`);
  }
});

test('noncanonical and duplicate sitemap URLs are rejected', () => {
  for (const url of ['http://loopmint.net/', 'https://www.loopmint.net/', 'https://other.test/', `${home}?x=1`, `${home}#trial`]) {
    assert.throws(() => sitemapEntries(`<url><loc>${url}</loc></url>`), /Not a canonical/);
  }
  assert.throws(() => sitemapEntries(`<url><loc>${home}</loc></url><url><loc>${home}</loc></url>`), /Duplicate/);
});

test('live verification accepts matching content and a removed page', async () => {
  const expected = new Map([[home, '<html>new</html>\n'], [article, null]]);
  await waitForPublished(expected, async url => new URL(url).pathname === '/'
    ? new Response('<html>new</html>\r\n', { status: 200 })
    : new Response('Not found', { status: 404 }), 0);
});

test('stale deployment or redirects stop before notification', async () => {
  for (const status of [200, 301, 503]) {
    let submissions = 0;
    const fetcher = async (url, options) => {
      if (options?.method === 'POST') submissions++;
      return new Response('old content', { status });
    };
    await assert.rejects(async () => {
      await waitForPublished(new Map([[home, 'new content']]), fetcher, 0);
      await submit({ urlList: [home] }, fetcher);
    }, /no IndexNow submission sent/);
    assert.equal(submissions, 0);
  }
});

test('only 200 and 202 count as receipt; errors are surfaced without automatic resubmission', async () => {
  const payload = { host: 'loopmint.net', key: 'test', keyLocation: `${home}indexnow-key.txt`, urlList: [home] };
  for (const status of [200, 202, 403, 422, 429, 500]) {
    let calls = 0;
    const fetcher = async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.indexnow.org/indexnow');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), payload);
      return new Response('', { status });
    };
    if ([200, 202].includes(status)) assert.equal((await submit(payload, fetcher)).status, status);
    else await assert.rejects(submit(payload, fetcher), new RegExp(`HTTP ${status}`));
    assert.equal(calls, 1);
  }
});

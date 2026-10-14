import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const origin = 'https://loopmint.net';
const root = fileURLToPath(new URL('../', import.meta.url));
const normalize = value => value.replaceAll('\r\n', '\n').replace(/^\uFEFF/, '').trim();

export function sitemapEntries(xml) {
  const entries = new Map();
  for (const match of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)) {
    const url = new URL(match[1]);
    if (url.origin !== origin || url.search || url.hash || /%|\.\./.test(url.pathname)) {
      throw new Error(`Not a canonical LoopMint URL: ${match[1]}`);
    }
    if (entries.has(url.href)) throw new Error(`Duplicate sitemap URL: ${url.href}`);
    entries.set(url.href, match[2].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? '');
  }
  if (!entries.size) throw new Error('Sitemap has no URLs.');
  return entries;
}

export function sourcePath(url) {
  const pathname = new URL(url).pathname.slice(1);
  return pathname + (pathname.endsWith('/') || !pathname ? 'index.html' : '');
}

export function changedUrls(current, previous, changedFiles, all = false) {
  if (all) return [...current.keys()];
  const files = new Set(changedFiles);
  const selected = new Set();
  for (const [url, date] of current) {
    if (!previous.has(url) || previous.get(url) !== date || files.has(sourcePath(url))) selected.add(url);
  }
  for (const url of previous.keys()) {
    if (!current.has(url)) selected.add(url);
  }
  return [...selected];
}

export async function waitForPublished(expected, fetcher = fetch, waitMs = 600000, pauseMs = 15000) {
  const pending = new Map(expected);
  const deadline = Date.now() + waitMs;
  let lastError = '';
  do {
    for (const [url, content] of pending) {
      try {
        const probe = new URL(url);
        probe.searchParams.set('indexnow-check', `${process.env.GITHUB_SHA ?? 'manual'}-${Date.now()}`);
        const response = await fetcher(probe, {
          redirect: 'manual', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(15000),
        });
        const matches = content === null
          ? [404, 410].includes(response.status)
          : response.status === 200 && normalize(await response.text()) === normalize(content);
        if (matches) pending.delete(url);
        else lastError = `${url}: not yet the expected published version (HTTP ${response.status})`;
      } catch (error) { lastError = `${url}: ${error.message}`; }
    }
    if (!pending.size) return;
    if (Date.now() >= deadline) break;
    console.log(`Waiting for deployment: ${pending.size} files remaining.`);
    await new Promise(resolve => setTimeout(resolve, Math.min(pauseMs, deadline - Date.now())));
  } while (Date.now() <= deadline);
  throw new Error(`Deployment verification timed out; no IndexNow submission sent. ${lastError}`);
}

export async function submit(payload, fetcher = fetch) {
  const response = await fetcher('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(30000),
  });
  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  }
  return { status: response.status, urls: payload.urlList.length,
    result: response.status === 200 ? 'received' : 'received; key validation pending' };
}

async function main() {
  const args = process.argv.slice(2);
  const sinceIndex = args.indexOf('--since');
  const since = sinceIndex >= 0 ? args[sinceIndex + 1] : undefined;
  if (sinceIndex >= 0 && (!since || !/^[0-9a-f]{40}$/i.test(since))) throw new Error('--since requires a full Git commit SHA.');
  if (!args.includes('--all') && !since) throw new Error('Use --all for initial submission or --since COMMIT for changed pages.');
  const git = values => execFileSync('git', values, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const current = sitemapEntries(sitemap);
  for (const url of current.keys()) {
    if (!fs.existsSync(path.join(root, sourcePath(url)))) throw new Error(`Missing current page: ${url}`);
  }
  let all = args.includes('--all') || /^0{40}$/.test(since ?? '');
  let previous = new Map();
  let files = [];
  if (since && !all) {
    previous = sitemapEntries(git(['show', `${since}:sitemap.xml`]));
    files = git(['diff', '--name-only', since, 'HEAD']).trim().split('\n');
    // The first deployment of IndexNow submits the existing canonical site once.
    try { git(['cat-file', '-e', `${since}:indexnow-key.txt`]); } catch { all = true; }
  }
  const urlList = changedUrls(current, previous, files, all);
  if (!urlList.length) { console.log('No canonical page changes to notify.'); return; }
  const key = fs.readFileSync(path.join(root, 'indexnow-key.txt'), 'utf8').trim();
  if (!/^[a-f0-9]{32}$/.test(key)) throw new Error('Invalid IndexNow verification key.');
  const keyLocation = `${origin}/indexnow-key.txt`;
  const payload = { host: new URL(origin).hostname, key, keyLocation, urlList };
  if (args.includes('--dry-run')) {
    console.log(JSON.stringify({ host: payload.host, keyLocation, urls: urlList }, null, 2)); return;
  }
  const expected = new Map([[keyLocation, key], [`${origin}/sitemap.xml`, sitemap]]);
  for (const url of urlList) {
    const file = path.join(root, sourcePath(url));
    expected.set(url, fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null);
  }
  await waitForPublished(expected);
  const result = await submit(payload);
  console.log(JSON.stringify(result));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## IndexNow\n\nHTTP ${result.status}: ${result.result}. ${result.urls} canonical URLs notified after verifying the live deployment. This does not confirm indexing.\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}

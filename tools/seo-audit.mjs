import fs from 'node:fs';
import path from 'node:path';

function getHtmlFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory() && !['node_modules', '.git', 'output', 'archive', 'test-results', 'playwright-report'].includes(file)) {
      results = results.concat(getHtmlFiles(full));
    } else if (file.endsWith('.html')) {
      results.push(full);
    }
  });
  return results;
}

const files = getHtmlFiles('.');
const report = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const titleMatch = /<title>([^<]*)<\/title>/i.exec(content);
  const descriptionTag = [...content.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]).find(tag => /name=["']description["']/i.test(tag));
  const descMatch = descriptionTag && /content=(["'])(.*?)\1/i.exec(descriptionTag);
  const canonicalMatch = /<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i.exec(content);
  const h1Matches = [...content.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const imgMatches = [...content.matchAll(/<img\b([^>]*)>/gi)];
  
  let emptyAlt = 0;
  let missingAlt = 0;
  imgMatches.forEach(m => {
    const tag = m[0];
    const alt = /alt=(["'])(.*?)\1/i.exec(tag);
    if (!alt) {
      if (/alt=["']\s*["']/i.test(tag)) {
        emptyAlt++;
      } else {
        missingAlt++;
      }
    } else if (alt[2].trim() === '') {
      emptyAlt++;
    }
  });

  const schemaMatch = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi.exec(content);

  report.push({
    file: path.relative('.', f).replace(/\\/g, '/'),
    titleLen: titleMatch ? titleMatch[1].trim().length : 0,
    descLen: descMatch ? descMatch[2].trim().length : 0,
    canonical: canonicalMatch ? 'OK' : 'MISSING',
    h1Count: h1Matches.length,
    imgCount: imgMatches.length,
    emptyAlt,
    missingAlt,
    hasSchema: !!schemaMatch
  });
});

console.table(report);

import fs from 'node:fs';

const blogFiles = fs.readdirSync('blog').filter(f => f.endsWith('.html'));
for (const f of blogFiles) {
  const html = fs.readFileSync('blog/' + f, 'utf8');
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const types = schemas.map(s => {
    try {
      const obj = JSON.parse(s[1]);
      return obj['@type'] || (obj['@graph'] ? obj['@graph'].map(g => g['@type']).join(',') : 'unknown');
    } catch (e) {
      return 'JSON_ERR';
    }
  });
  console.log(f + ': ' + types.join('; '));
}

const rootFiles = ['index.html', 'setup.html', 'guides.html', 'trial-checklist.html'];
for (const f of rootFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const types = schemas.map(s => {
    try {
      const obj = JSON.parse(s[1]);
      return obj['@type'] || (obj['@graph'] ? obj['@graph'].map(g => g['@type']).join(',') : 'unknown');
    } catch (e) {
      return 'JSON_ERR';
    }
  });
  console.log(f + ': ' + types.join('; '));
}

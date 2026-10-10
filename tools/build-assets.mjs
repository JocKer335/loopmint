import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { transform } from 'lightningcss';
import { minify } from 'terser';
import { PurgeCSS } from 'purgecss';

const folders = ['.', 'blog'];
const files = folders.flatMap(folder => fs.readdirSync(folder).map(name => path.join(folder, name).replaceAll('\\', '/')))
  .filter(file => fs.statSync(file).isFile());
const content = files.filter(file => /\.(html|js)$/.test(file) && !file.includes('.min.'));
const assets = files.filter(file => /\.(css|js)$/.test(file) && !file.includes('.min.'));
const hashes = new Map();

for (const file of assets) {
  const source = fs.readFileSync(file, 'utf8');
  let code;
  if (file.endsWith('.css')) {
    // Preserve dynamic UI states; the editable CSS remains the source of truth.
    const [{ css }] = await new PurgeCSS().purge({
      content,
      css: [{ raw: source }],
      safelist: { standard: ['active', 'open', 'hidden', 'input-error'], greedy: [/^is-/, /^theme-/, /^lm-/, /^trial-/, /^checkout-/, /^co-/, /^country-/, /^custom-/, /^summary-/, /^plan-/] },
      keyframes: false,
      variables: false
    }).catch(error => { throw new Error(`${file}:${error.line || '?'} ${error.reason || error.message}`); });
    code = transform({ filename: file, code: Buffer.from(css), minify: true }).code;
  } else {
    code = (await minify(source, { compress: { toplevel: false }, mangle: { toplevel: false }, format: { comments: false } })).code;
  }
  const destination = file.replace(/\.(css|js)$/, '.min.$1');
  fs.writeFileSync(destination, code);
  const bytes = Buffer.byteLength(code);
  const hash = createHash('sha256').update(code).digest('hex').slice(0, 12);
  hashes.set(file, { destination, hash });
  console.log(`${file}: ${Buffer.byteLength(source)} → ${bytes} bytes`);
}

for (const file of files.filter(file => file.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8').replace(/\b(href|src)="([^"]+\.(?:css|js)(?:\?[^"\s]*)?)"/g, (tag, attribute, value) => {
    const source = value.split('?')[0].replace('.min.', '.');
    const key = path.normalize(path.join(path.dirname(file), source)).replaceAll('\\', '/');
    const built = hashes.get(key);
    if (!built) return tag;
    const relative = path.relative(path.dirname(file), built.destination).replaceAll('\\', '/');
    return `${attribute}="${relative}?v=${built.hash}"`;
  });
  fs.writeFileSync(file, html);
}

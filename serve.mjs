import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

const root = process.cwd();
const compress = promisify(gzip);
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.xml': 'application/xml', '.txt': 'text/plain' };

http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const requestedPath = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    const file = path.resolve(root, `.${requestedPath}`);
    if (!file.startsWith(root + path.sep)) throw new Error('Outside project');
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    const extension = path.extname(file);
    const textual = ['.html', '.css', '.js', '.svg', '.xml', '.txt'].includes(extension);
    const headers = {
      'Content-Type': `${mime[extension] || 'application/octet-stream'}${textual ? '; charset=utf-8' : ''}`,
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=600',
    };
    let body = await readFile(file);
    if (textual) {
      headers.Vary = 'Accept-Encoding';
      if (/\bgzip\b/.test(request.headers['accept-encoding'] || '')) {
        body = await compress(body);
        headers['Content-Encoding'] = 'gzip';
      }
    }
    headers['Content-Length'] = body.length;
    response.writeHead(200, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}).listen(5500, '127.0.0.1', () => console.log('LoopMint preview: http://127.0.0.1:5500/'));

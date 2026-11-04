import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { checkDeployment } from '../scripts/check-deployment.mjs';
import { ROOT } from '../scripts/generate-seo.mjs';

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.txt': 'text/plain', '.xml': 'application/xml', '.woff2': 'font/woff2', '.png': 'image/png' };
let scenario = '';
const methods = [];
const server = createServer((req, res) => {
  methods.push(req.method);
  const path = new URL(req.url, 'http://localhost').pathname;
  if (scenario === 'timeout' && path === '/') return;
  if (scenario === 'body-timeout' && path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write('<!DOCTYPE html>');
    return;
  }
  if (path === '/product.html' || path === '/product/') {
    res.writeHead(308, { Location: scenario === 'bad-redirect' ? '/pricing' : '/product' });
    return res.end();
  }
  if (scenario === 'missing-font' && path.endsWith('inter-latin-variable.woff2')) { res.writeHead(404); return res.end(); }
  const file = resolve(ROOT, '.' + (path === '/' ? '/index.html' : extname(path) ? path : path + '.html'));
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); return res.end(); }
  if (scenario === 'header-noindex' && path === '/') res.setHeader('X-Robots-Tag', 'googlebot: noindex, nofollow');
  let bytes = readFileSync(file);
  if (path === '/') {
    let html = bytes.toString();
    if (scenario === 'meta-none') html = html.replace('</head>', '<meta name="robots" content="none"></head>');
    if (scenario === 'missing-canonical') html = html.replace(/<link rel="canonical"[^>]*>/, '');
    if (scenario === 'stale-canonical') html = html.replace('rel="canonical" href="https://www.myprospects.com/"', 'rel="canonical" href="https://wrong.example/"');
    if (scenario === 'duplicate-og') html = html.replace('</head>', '<meta property="og:url" content="https://www.myprospects.com/"></head>');
    if (scenario === 'bad-jsonld') html = html.replace('"@context":', 'bad-json:');
    if (scenario === 'disconnected-jsonld') html = html.replace('"isPartOf":{"@id":"https://www.myprospects.com/#website"}', '"isPartOf":{"@id":"https://wrong.example/#website"}');
    bytes = Buffer.from(html);
  }
  if (scenario === 'stale-discovery' && path === '/llms.txt') bytes = Buffer.from('# Stale deployment');
  if (scenario === 'wrong-asset-type' && path === '/css/styles.css') res.setHeader('Content-Type', 'text/html');
  else res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  res.end(bytes);
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
try {
  const cliGood = await promisify(execFile)(process.execPath, ['scripts/check-deployment.mjs', '--url', baseUrl], { cwd: ROOT });
  assert.match(cliGood.stdout, /18 pages, \d+ checks.*0 failures/);
  const beforeMalformedCLI = methods.length;
  await assert.rejects(promisify(execFile)(process.execPath, ['scripts/check-deployment.mjs', '--url'], { cwd: ROOT }), error => error.code === 1 && /Usage:/.test(error.stderr));
  assert.equal(methods.length, beforeMalformedCLI, 'malformed CLI arguments fail before requesting a deployment');
  const good = await checkDeployment({ baseUrl });
  assert.equal(good.failures.length, 0, JSON.stringify(good.failures));
  assert.equal(good.pages, 18);
  assert.ok(good.checks >= 30, 'checks all pages, discovery, shared assets and redirects');
  assert.ok(methods.every(method => method === 'GET'), 'verification performs only read-only GET requests');
  for (const name of ['header-noindex', 'meta-none']) {
    scenario = name;
    const preview = await checkDeployment({ baseUrl });
    assert.equal(preview.failures.length, 0, `${name}: previews may intentionally be noindex`);
  }
  for (const [name, expected] of [
    ['header-noindex', /noindex/i], ['meta-none', /noindex/i], ['missing-canonical', /canonical/i], ['stale-canonical', /canonical/i], ['bad-jsonld', /JSON-LD/i],
    ['duplicate-og', /og:url/], ['disconnected-jsonld', /JSON-LD/i], ['stale-discovery', /llms\.txt/], ['missing-font', /inter-latin-variable\.woff2/],
    ['bad-redirect', /redirect/i], ['wrong-asset-type', /content.type/i],
  ]) {
    scenario = name;
    const result = await checkDeployment({ baseUrl, expectIndexable: true });
    assert.ok(result.failures.some(message => expected.test(message)), `${name}: actionable failure reported: ${result.failures.join('; ')}`);
  }
  for (const name of ['timeout', 'body-timeout']) {
    scenario = name;
    const timedOut = await checkDeployment({ baseUrl, timeoutMs: 50 });
    assert.ok(timedOut.failures.some(message => /timed out/i.test(message)), `${name}: hanging responses are bounded and reported`);
  }
  scenario = 'missing-font';
  await assert.rejects(promisify(execFile)(process.execPath, ['scripts/check-deployment.mjs', '--url', baseUrl], { cwd: ROOT }), error => error.code === 1 && /inter-latin-variable/.test(error.stderr), 'CLI returns failure status for a broken deployment');
  for (const value of ['ftp://example.com', 'https://user:secret@example.com', 'https://example.com/path', 'https://example.com/?x=1', 'https://example.com/#hash']) {
    await assert.rejects(checkDeployment({ baseUrl: value }), /origin/i);
  }
  console.log('deployment-checker: real HTTP success, stale/missing metadata and assets, broken redirects, timeouts, GET-only behavior and CLI failure status');
} finally {
  server.closeAllConnections();
  await new Promise(done => server.close(done));
}

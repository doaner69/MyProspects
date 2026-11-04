import { readFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGIN, ROOT, loadPages } from './generate-seo.mjs';

const requireCondition = (condition, message) => { if (!condition) throw new Error(message); };
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(([, key, , value]) => [key.toLowerCase(), value]));
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(([tag]) => attributes(tag));
const contentTypes = { '.css': ['text/css'], '.js': ['text/javascript', 'application/javascript'], '.woff2': ['font/woff2'], '.png': ['image/png'], '.txt': ['text/plain'], '.xml': ['application/xml', 'text/xml'] };

export async function checkDeployment({ baseUrl = ORIGIN, root = ROOT, timeoutMs = 10000, expectIndexable } = {}) {
  const base = new URL(baseUrl);
  requireCondition(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password && base.pathname === '/' && !base.search && !base.hash,
    'Deployment URL must be an HTTP(S) origin with no credentials, path, query or fragment.');
  requireCondition(Number.isInteger(timeoutMs) && timeoutMs > 0, 'Timeout must be a positive number of milliseconds.');
  // Vercel previews can intentionally send noindex; production must remain indexable.
  const requireIndexability = expectIndexable ?? base.origin === ORIGIN;
  const pages = loadPages(root);
  const assets = new Map();
  const jobs = [];
  const failures = [];
  const read = file => readFileSync(resolve(root, file));
  const addAsset = value => {
    const url = new URL(value, ORIGIN);
    if (url.origin === ORIGIN) assets.set(url.pathname + url.search, url.pathname.slice(1));
  };
  async function get(url, { redirectTo } = {}) {
    const signal = AbortSignal.timeout(timeoutMs);
    let current = new URL(url);
    let redirected = false;
    for (let hop = 0; hop <= 5; hop++) {
      let response;
      try {
        response = await fetch(current, { method: 'GET', redirect: 'manual', signal });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          requireCondition(redirectTo, `unexpected redirect from canonical path (HTTP ${response.status})`);
          requireCondition([301, 308].includes(response.status), `redirect must be permanent (HTTP ${response.status})`);
          const location = response.headers.get('location');
          requireCondition(location, 'redirect has no Location header');
          const next = new URL(location, current);
          requireCondition(next.origin === new URL(redirectTo).origin, 'redirect leaves the intended deployment origin');
          await response.body?.cancel();
          current = next;
          redirected = true;
          continue;
        }
        requireCondition(response.status === 200, `HTTP ${response.status}; expected 200${response.status === 401 || response.status === 403 ? ' (deployment may be protected)' : ''}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        if (redirectTo) requireCondition(redirected && current.href === redirectTo, `redirect must finish at ${new URL(redirectTo).pathname}`);
        return { bytes, type: (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase(), robots: response.headers.get('x-robots-tag') || '' };
      } catch (error) {
        if (signal.aborted) throw new Error(`request timed out after ${timeoutMs}ms`);
        throw error;
      }
    }
    throw new Error('redirect exceeded 5 hops');
  }
  const job = (label, run) => jobs.push(async () => {
    try { await run(); } catch (error) { failures.push(`${label}: ${error.message}`); }
  });
  for (const page of pages) {
    const local = read(page.file).toString();
    const references = [
      ...tags(local, 'link').filter(tag => tag.rel === 'stylesheet').map(tag => tag.href),
      ...tags(local, 'script').filter(tag => tag.src).map(tag => tag.src),
    ].map(value => new URL(value, ORIGIN + page.path)).filter(url => url.origin === ORIGIN);
    references.forEach(addAsset);
    job(page.path, async () => {
      const { bytes, type, robots } = await get(new URL(page.path, base));
      requireCondition(type === 'text/html', `content-type ${type || '(missing)'}; expected text/html`);
      const html = bytes.toString();
      const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
      requireCondition(head, 'missing HTML head');
      const canonical = tags(head, 'link').filter(tag => tag.rel === 'canonical');
      requireCondition(canonical.length === 1 && canonical[0].href === ORIGIN + page.path, 'missing, duplicate or stale canonical URL');
      const og = tags(head, 'meta').filter(tag => tag.property === 'og:url');
      requireCondition(og.length === 1 && og[0].content === ORIGIN + page.path, 'missing, duplicate or stale og:url');
      requireCondition(!/fonts\.(?:googleapis|gstatic)\.com/i.test(head), 'obsolete remote Google Fonts dependency');
      if (page.indexable && requireIndexability) {
        requireCondition(!/\b(?:noindex|none)\b/i.test(robots), 'public page is noindex via X-Robots-Tag');
        requireCondition(!tags(head, 'meta').some(tag => /^(robots|googlebot)$/i.test(tag.name || '') && /\b(?:noindex|none)\b/i.test(tag.content || '')), 'public page is noindex via robots metadata');
      }
      for (const reference of references) {
        const live = [...tags(html, 'link').map(tag => tag.href), ...tags(html, 'script').map(tag => tag.src)].filter(Boolean);
        requireCondition(live.some(value => new URL(value, ORIGIN + page.path).href === reference.href), `missing or stale shared asset reference ${reference.pathname}`);
      }
      const blocks = [...head.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(([, attrs]) => attributes(attrs).type === 'application/ld+json');
      requireCondition(blocks.length === 1, 'expected exactly one JSON-LD graph');
      let data;
      try { data = JSON.parse(blocks[0][2]); } catch { throw new Error('invalid JSON-LD syntax'); }
      requireCondition(data && data['@context'] === 'https://schema.org' && Array.isArray(data['@graph']), 'invalid JSON-LD context or graph');
      const graph = data['@graph'];
      requireCondition(graph.every(node => node && typeof node['@id'] === 'string' && typeof node['@type'] === 'string'), 'invalid JSON-LD entity');
      const ids = new Set(graph.map(node => node['@id']));
      const webPage = graph.filter(node => node['@type'] === 'WebPage');
      requireCondition(ids.size === graph.length && !ids.has(undefined) && webPage.length === 1 && webPage[0].url === ORIGIN + page.path, 'invalid JSON-LD page URL or entity IDs');
      function checkReferences(value) {
        if (!value || typeof value !== 'object') return;
        if (value['@id']) requireCondition(ids.has(value['@id']), 'disconnected JSON-LD entity reference');
        Object.values(value).forEach(checkReferences);
      }
      graph.forEach(checkReferences);
      requireCondition(graph.some(node => node['@type'] === 'WebSite' && node['@id'] === webPage[0].isPartOf?.['@id']), 'JSON-LD page must belong to the website');
    });
  }
  addAsset('/assets/images/myprospects-logo.png');
  // Font URLs are derived from committed CSS, so newly added local faces are checked too.
  for (const file of [...assets.values()].filter(file => file.endsWith('.css'))) {
    for (const [, value] of read(file).toString().matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      if (/\.woff2(?:\?|$)/.test(value)) addAsset(new URL(value, ORIGIN + '/' + file));
    }
  }
  for (const path of ['robots.txt', 'sitemap.xml', 'llms.txt']) assets.set('/' + path, path);
  for (const [path, file] of assets) job(path, async () => {
    const { bytes, type } = await get(new URL(path, base));
    requireCondition(contentTypes[extname(file)]?.includes(type), `unexpected content-type ${type || '(missing)'}`);
    requireCondition(bytes.equals(read(file)), 'response differs from the committed file (stale or transformed deployment)');
  });
  for (const path of ['/product.html', '/product/']) job(`${path} redirect`, () => get(new URL(path, base), { redirectTo: new URL('/product', base).href }));
  if (base.origin === ORIGIN) job('apex redirect', () => get('https://myprospects.com/', { redirectTo: ORIGIN + '/' }));
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, async () => { while (next < jobs.length) await jobs[next++](); }));
  return { baseUrl: base.origin, pages: pages.length, checks: jobs.length, failures };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    requireCondition(args.length === 0 || (args.length === 2 && args[0] === '--url'), 'Usage: node scripts/check-deployment.mjs [--url https://deployment-origin]');
    const result = await checkDeployment({ baseUrl: args[1] || ORIGIN });
    console.log(`deployment: ${result.pages} pages, ${result.checks} checks at ${result.baseUrl}, ${result.failures.length} failures`);
    if (result.failures.length) { result.failures.forEach(message => console.error(`- ${message}`)); process.exitCode = 1; }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

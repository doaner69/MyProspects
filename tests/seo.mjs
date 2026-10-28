import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(new URL(file, `file://${root}`), 'utf8');
// Independent contract: accidentally omitting a public route from the generator must fail.
const routes = [
  ['index.html', '/'], ['product.html', '/product'], ['pricing.html', '/pricing'],
  ['about.html', '/about'], ['trial.html', '/trial'], ['contact.html', '/contact'],
  ['blog.html', '/blog'], ['use-cases.html', '/use-cases'], ['case-studies.html', '/case-studies'],
  ['privacy-policy.html', '/privacy-policy'], ['terms-of-service.html', '/terms-of-service'],
  ['solutions/b2b.html', '/solutions/b2b'], ['solutions/b2c.html', '/solutions/b2c'],
  ['solutions/recruitment.html', '/solutions/recruitment'], ['solutions/nonprofit.html', '/solutions/nonprofit'],
  ['resources/anonymous-traffic-to-named-pipeline.html', '/resources/anonymous-traffic-to-named-pipeline'],
  ['resources/on-domain-and-off-domain-intent.html', '/resources/on-domain-and-off-domain-intent'],
  ['resources/activating-known-audiences.html', '/resources/activating-known-audiences'],
];
const origin = 'https://www.myprospects.com';
const publicPaths = new Set(routes.map(([, path]) => path));
const discovered = ['', 'solutions/', 'resources/'].flatMap(directory => readdirSync(new URL(directory, `file://${root}`), { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.html')).map(entry => directory + entry.name));
assert.deepEqual(discovered.sort(), routes.map(([file]) => file).sort(), 'new public HTML must join the explicit SEO contract');
const titles = new Set();
const descriptions = new Set();
for (const [file, path] of routes) {
  const html = read(file);
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)[1];
  const canonicals = [...head.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g)];
  assert.deepEqual(canonicals.map(match => match[1]), [origin + path], `${file}: one self-canonical without query/fragment`);
  titles.add(head.match(/<title>([\s\S]*?)<\/title>/i)[1]);
  descriptions.add(head.match(/<meta\b[^>]*name="description"[^>]*content="([^"]+)"/i)[1]);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${file}: one primary heading`);
  assert.doesNotMatch(head, /(?:noindex|nofollow|nosnippet)/i, `${file}: intended public content remains indexable`);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    if (/^(?:mailto:|tel:)/.test(href)) continue;
    const target = new URL(href.replaceAll('&amp;', '&'), origin + path);
    if (target.origin !== origin) continue;
    assert.ok(publicPaths.has(target.pathname), `${file}: final public link ${href}`);
    if (target.hash) {
      const destination = routes.find(([, route]) => route === target.pathname)[0];
      const targetIds = target.pathname === path ? ids : new Set([...read(destination).matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
      assert.ok(targetIds.has(decodeURIComponent(target.hash.slice(1))), `${file}: missing anchor ${href}`);
    }
  }
}
assert.equal(titles.size, 18, 'titles remain unique');
assert.equal(descriptions.size, 18, 'descriptions remain unique');
assert.ok(existsSync(new URL('../robots.txt', import.meta.url)), 'robots.txt exists');
assert.equal(read('robots.txt').trim(), 'Sitemap: https://www.myprospects.com/sitemap.xml', 'discovery declaration does not change any crawler access policy');
const sitemap = read('sitemap.xml');
assert.match(sitemap, /<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).sort(), routes.map(([, path]) => origin + path).sort(), 'exactly the intended canonical public pages');
assert.doesNotMatch(sitemap, /<lastmod>|<priority>|<changefreq>/, 'no fabricated update dates or unsupported importance hints');
console.log('seo: 18 canonical/indexable pages, unique metadata, final internal URLs, valid anchors and unchanged crawler access');

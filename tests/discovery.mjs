import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const pages = JSON.parse(read('seo/pages.json'));
const origin = 'https://www.myprospects.com';
const decode = text => text.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
for (const page of pages) {
  const html = read(page.file);
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)[1];
  const metadata = [...head.matchAll(/<meta\b[^>]*>/g)].map(([tag]) => Object.fromEntries([...tag.matchAll(/([\w:]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])));
  const get = name => {
    const matches = metadata.filter(meta => meta.property === name || meta.name === name);
    assert.equal(matches.length, 1, `${page.file}: exactly one ${name}`);
    return matches[0].content;
  };
  assert.equal(get('og:url'), origin + page.path);
  assert.equal(get('og:type'), 'website');
  assert.equal(get('og:title'), decode(head.match(/<title>(.*?)<\/title>/s)[1]));
  assert.equal(get('og:description'), get('description'));
  assert.equal(get('twitter:title'), get('og:title'));
  assert.equal(get('twitter:description'), get('description'));
  assert.equal(get('twitter:card'), 'summary');
  const image = new URL(get('og:image'));
  assert.equal(image.origin, origin);
  const bytes = readFileSync(new URL('.' + image.pathname, root));
  assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
  assert.equal(Number(get('og:image:width')), bytes.readUInt32BE(16));
  assert.equal(Number(get('og:image:height')), bytes.readUInt32BE(20));
  assert.equal(get('twitter:image'), image.href);
  assert.ok(get('og:image:alt'));
  const blocks = [...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, `${page.file}: structured data in initial HTML`);
  const data = JSON.parse(blocks[0][1]);
  assert.equal(data['@context'], 'https://schema.org');
  const graph = data['@graph'];
  const ids = new Set(graph.map(node => node['@id']));
  assert.equal(ids.size, graph.length, 'entity IDs are unique');
  const webPage = graph.find(node => node['@type'] === 'WebPage');
  assert.equal(webPage.url, origin + page.path);
  assert.equal(webPage.name, get('og:title'));
  assert.equal(webPage.description, get('description'));
  assert.ok(ids.has(webPage.isPartOf['@id']));
  assert.equal(graph.find(node => node['@type'] === 'Organization').name, 'Local Sphere');
  assert.equal(graph.find(node => node['@type'] === 'Brand').name, 'MyProspects');
  assert.doesNotMatch(blocks[0][1], /aggregateRating|reviewCount|datePublished|dateModified|priceCurrency/, 'no invented proof, dates or offers');
  if (page.path !== '/') {
    const crumbs = graph.find(node => node['@type'] === 'BreadcrumbList');
    assert.deepEqual(crumbs.itemListElement.map(item => item.item), [origin + '/', origin + page.path]);
    assert.equal(webPage.breadcrumb['@id'], crumbs['@id']);
  }
  assert.match(head, /<link rel="describedby" href="\/llms.txt" type="text\/plain">/);
}
const llms = read('llms.txt');
assert.match(llms, /^# MyProspects\n/);
const links = [...llms.matchAll(/\]\((https:[^)]+)\)/g)].map(([, url]) => url);
assert.deepEqual(links.sort(), pages.filter(page => page.indexable).map(page => origin + page.path).sort(), 'discovery file lists only published canonical pages once');
assert.ok(existsSync(new URL('llms.txt', root)));
console.log('discovery: page-specific social previews, connected JSON-LD, image dimensions and canonical llms inventory');

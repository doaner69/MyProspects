import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

const pages = [
  'index.html', 'product.html', 'pricing.html', 'about.html', 'demo.html',
  'use-cases.html', 'case-studies.html', 'blog.html', 'trial.html',
  'solutions/b2b.html', 'solutions/b2c.html', 'solutions/recruitment.html',
  'solutions/nonprofit.html', 'resources/anonymous-traffic-to-named-pipeline.html',
  'resources/on-domain-and-off-domain-intent.html', 'resources/activating-known-audiences.html',
  'privacy-policy.html', 'terms-of-service.html',
];

for (const page of pages) {
  const html = read(page);
  const compact = html.replace(/\s+/g, ' ');
  assert.match(compact, /<title>[^<]{10,}<\/title>/, `${page} needs a descriptive title`);
  assert.ok(compact.includes('MyProspects'), `${page} title or metadata should include the brand`);
  assert.match(compact, /<meta name="description" content="[^"]{40,}"/, `${page} needs a useful description`);
  assert.ok(html.includes('id="site-nav"') && html.includes('id="site-footer"'), `${page} needs shared chrome`);
  assert.ok(html.includes('styles.css?v=20260713'), `${page} should use the current stylesheet`);
  assert.ok(html.includes('main.js?v=20260713'), `${page} should use the current shared script`);
  assert.ok(!html.includes('cdnjs.cloudflare.com/ajax/libs/gsap'), `${page} should not load unused GSAP`);
}

const marketingPages = pages.filter((page) => !['privacy-policy.html', 'terms-of-service.html'].includes(page));
for (const page of marketingPages) {
  const html = read(page);
  assert.ok(html.includes('Start Your Free Trial'), `${page} should present the primary CTA`);
  assert.ok(html.includes('/pricing.html') || page === 'pricing.html', `${page} should connect to pricing`);
}

const rebuiltPages = marketingPages.filter((page) => page !== 'index.html');
for (const page of rebuiltPages) {
  const html = read(page);
  for (const unsupported of ['SOC 2 Type II certified', 'GDPR compliant', 'CCPA compliant', 'IAB TCF registered']) {
    assert.ok(!html.includes(unsupported), `${page} should not present unsupported badge copy: ${unsupported}`);
  }
}

const requiredAssets = [
  'product-identity-graph.webp', 'solution-b2b-flow.webp', 'solution-b2c-flow.webp',
  'solution-recruitment-flow.webp', 'solution-nonprofit-flow.webp', 'about-infrastructure.webp',
  'outcome-playbooks.webp', 'guide-named-pipeline.webp', 'guide-identity-intent.webp',
  'guide-audience-activation.webp',
];
for (const name of requiredAssets) {
  const path = join(root, 'assets/images/subpages', name);
  assert.ok(existsSync(path), `missing generated asset ${name}`);
  const size = statSync(path).size;
  assert.ok(size > 20_000 && size < 250_000, `${name} should remain within the image budget`);
}

const localRefPattern = /(?:href|src)="([^"]+)"/g;
for (const page of pages) {
  const html = read(page);
  for (const [, rawRef] of html.matchAll(localRefPattern)) {
    const ref = rawRef.split('#')[0].split('?')[0];
    if (!ref || /^(?:https?:|mailto:|tel:|#)/.test(ref)) continue;
    const resolved = ref.startsWith('/')
      ? join(root, ref.slice(1))
      : normalize(join(root, dirname(page), ref));
    assert.ok(existsSync(resolved), `${page} references missing local file ${rawRef}`);
  }
}

const product = read('product.html');
assert.ok(product.includes('data-story-tabs') && product.includes('role="tablist"'), 'product story should be interactive and semantic');
assert.equal((product.match(/data-story-panel=/g) || []).length, 5, 'product should include five identity graph stages');

const useCases = read('use-cases.html');
assert.ok(useCases.includes('data-query-key="segment"'), 'use case filter should preserve shareable segment state');
assert.equal((useCases.match(/data-filter-panel=/g) || []).length, 4, 'use case explorer should include four segments');

const pricing = read('pricing.html');
assert.ok(pricing.includes('data-pricing-estimator') && pricing.includes('data-resolution-range'), 'pricing should include a resolution estimator');
assert.equal((pricing.match(/data-price-card=/g) || []).length, 4, 'pricing should include four plan levels');

const demo = read('demo.html');
for (const control of ['data-demo-persona-tab', 'data-visitor-explorer', 'data-channel-toggle', 'data-meter']) {
  assert.ok(demo.includes(control), `demo should include ${control}`);
}

const trial = read('trial.html');
for (const field of ['firstName', 'lastName', 'workEmail', 'company', 'website', 'useCase', 'monthlyTraffic', 'consent', 'website_confirm']) {
  assert.ok(trial.includes(`name="${field}"`), `trial form should include ${field}`);
}

const mainScript = read('js/main.js');
assert.ok(mainScript.includes('/trial.html') && mainScript.includes('Start Your Free Trial'), 'shared navigation should use the trial CTA');
assert.ok(mainScript.includes('(solutions|resources)'), 'shared path handling should support both nested route groups');

console.log(`site-smoke: ${pages.length} routes, ${requiredAssets.length} generated assets, and local links validated`);

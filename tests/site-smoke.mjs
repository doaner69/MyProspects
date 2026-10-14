import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

const pages = [
  'index.html', 'product.html', 'pricing.html', 'about.html', 'contact.html',
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
  assert.ok(html.includes('main.js?v=20261014'), `${page} should use the current shared script`);
  assert.ok(!html.includes('cdnjs.cloudflare.com/ajax/libs/gsap'), `${page} should not load unused GSAP`);
  assert.ok(!html.includes('G-SQY7W3M8FR'), `${page} must remove the old GA4 destination`);
  assert.ok(!html.includes('googletagmanager.com/gtag/js'), `${page} must initialize GA4 only through GTM`);
  assert.equal((html.match(/GTM-K3S8PSJ9/g) || []).length, 2, `${page} needs one GTM loader and one fallback`);
  const consentPosition = html.indexOf('/js/tracking-consent.js?v=20261014');
  const gtmPosition = html.indexOf('<!-- Google Tag Manager -->');
  assert.ok(consentPosition > html.indexOf('<head>') && consentPosition < gtmPosition, `${page} must establish consent before GTM loads`);
  assert.ok(html.includes('<script src="/js/tracking-consent.js?v=20261014"></script>'), `${page} must establish consent synchronously`);
  assert.match(html, /<body\b[^>]*>\s*<!-- Google Tag Manager \(noscript\) -->/, `${page} needs the GTM fallback at the start of its body`);
  if (/<form\b|<textarea\b/i.test(html)) {
    assert.ok(['contact.html', 'trial.html'].includes(page), `${page} introduces a form requiring a collection review`);
  }
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
assert.equal((useCases.match(/class="use-case-body"/g) || []).length, 4, 'each use case should use the readable split layout');

const pricing = read('pricing.html');
assert.ok(pricing.includes('data-pricing-estimator') && pricing.includes('data-resolution-range'), 'pricing should include a resolution estimator');
assert.equal((pricing.match(/data-price-card=/g) || []).length, 4, 'pricing should include four plan levels');
for (const price of ['data-monthly-price="2000"', 'data-monthly-price="3500"', 'data-monthly-price="5000"']) {
  assert.ok(pricing.includes(price), `pricing should include ${price}`);
}
assert.ok(pricing.includes('Standard onboarding is $2,000'), 'pricing should show the approved onboarding fee');
assert.ok(pricing.indexOf('pricing-grid-primary') < pricing.indexOf('data-pricing-estimator'), 'plans should appear before the estimator');

const privacyPolicy = read('privacy-policy.html');
assert.ok(!privacyPolicy.includes('SOC 2 Type II certified'), 'privacy policy should not claim SOC 2 Type II certification');

const terms = read('terms-of-service.html');
assert.ok(terms.includes('href="https://myprospects.com">myprospects.com</a>'), 'terms should link to the current MyProspects domain');
assert.ok(terms.includes('laws of the State of Florida'), 'terms should identify Florida as the governing state');
assert.ok(terms.includes('mailto:steve@localsphere.com">steve@localsphere.com</a>'), 'terms should use the current legal contact email');

const trial = read('trial.html');
for (const field of ['firstName', 'lastName', 'workEmail', 'company', 'website', 'useCase', 'monthlyTraffic', 'consent', 'website_confirm']) {
  assert.ok(trial.includes(`name="${field}"`), `trial form should include ${field}`);
}

const contact = read('contact.html');
for (const field of ['name', 'email', 'message', 'website_confirm']) {
  assert.ok(contact.includes(`name="${field}"`), `contact form should include ${field}`);
}
assert.equal((contact.match(/\brequired\b/g) || []).length, 3, 'contact form should have exactly three required fields');

const mainScript = read('js/main.js');
assert.ok(mainScript.includes('/trial.html') && mainScript.includes('Start Your Free Trial'), 'shared navigation should use the trial CTA');
assert.ok(mainScript.includes('(solutions|resources)'), 'shared path handling should support both nested route groups');
assert.ok(mainScript.includes('https://app.localsphere.com'), 'shared navigation should link to the Local Sphere app');
assert.doesNotMatch(mainScript, /href="https:\/\/app\.localsphere\.com"[^>]*target=/, 'Log In should open in the same tab');
assert.ok(mainScript.includes('/contact.html'), 'shared navigation and footer should link to Contact');

const subpageScript = read('js/subpages.js');
assert.ok(subpageScript.includes('Someone from MyProspects will be contacting you soon!'), 'forms should use the approved confirmation message');
assert.ok(subpageScript.includes('https://${value}'), 'trial website input should normalize bare domains');

const leadPipeline = read('api/_lead-submissions.js');
assert.ok(leadPipeline.includes('public.myprospects_leads'), 'lead pipeline should persist into the dedicated Neon table');
assert.ok(leadPipeline.indexOf('const savedLead = await persist(input)') < leadPipeline.indexOf('await sendNotification(input)'), 'lead persistence must complete before Slack notification');
assert.ok(leadPipeline.includes('SLACK_WEBHOOK_URL_PREVIEW') && leadPipeline.includes('SLACK_WEBHOOK_URL'), 'lead pipeline should isolate preview and production Slack webhooks');

const leadSchema = read('db/001-create-myprospects-leads.sql');
for (const field of ['submission_type', 'source', 'email', 'created_at']) {
  assert.ok(leadSchema.includes(field), `lead schema should include ${field}`);
}

for (const file of ['api/contact-request.js', 'api/trial-request.js', 'api/_lead-submissions.js', 'README.md', 'SITE-REFERENCE.md']) {
  assert.ok(!read(file).includes('TRIAL_REQUEST_WEBHOOK_URL'), `${file} should not rely on the retired generic webhook`);
}

const redirects = JSON.parse(read('vercel.json')).redirects;
for (const source of ['/demo', '/demo.html']) {
  assert.ok(redirects.some((redirect) => redirect.source === source && redirect.destination === '/contact' && redirect.permanent), `${source} should permanently redirect to Contact`);
}

const scannedFiles = [...pages, 'js/main.js', 'js/subpages.js', 'README.md', 'SITE-REFERENCE.md'];
for (const file of scannedFiles) {
  const content = read(file);
  assert.doesNotMatch(content, /real[ -]?time/i, `${file} should not include real-time claims`);
  assert.doesNotMatch(content, /(?:under\s+|&lt;|<)100ms/i, `${file} should not include sub-100ms claims`);
  assert.doesNotMatch(content, /\/demo(?:\.html)?|interactive demo|demo\.html/i, `${file} should not reference the removed demo route or files`);
}

console.log(`site-smoke: ${pages.length} routes, ${requiredAssets.length} generated assets, and local links validated`);

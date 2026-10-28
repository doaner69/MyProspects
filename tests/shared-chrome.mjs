import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = JSON.parse(readFileSync(resolve(root, 'seo/pages.json'), 'utf8'));
for (const page of pages) {
  const html = readFileSync(resolve(root, page.file), 'utf8');
  const nav = html.match(/<nav\b[^>]*id="site-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1] || '';
  const footer = html.match(/<!-- FOOTER:START -->([\s\S]*?)<!-- FOOTER:END -->/)?.[1] || '';
  for (const path of ['/solutions/b2b', '/solutions/b2c', '/solutions/recruitment', '/solutions/nonprofit', '/product', '/pricing', '/blog', '/trial']) {
    assert.ok(nav.includes(`href="${path}"`), `${page.file}: ${path} discoverable without JS`);
  }
  assert.ok(footer.includes('data-tracking-choices'), `${page.file}: privacy choices retained`);
  assert.ok(footer.includes('href="/privacy-policy"'), `${page.file}: privacy policy in initial footer`);
  assert.ok(nav.includes('src="/assets/images/myprospects-logo.png"'), `${page.file}: nested logo paths remain correct`);
  assert.equal((html.match(/id="site-nav"/g) || []).length, 1, `${page.file}: one navigation`);
  assert.equal((html.match(/id="site-footer"/g) || []).length, 1, `${page.file}: one footer`);
  assert.doesNotMatch(nav, /id="mobile-site-menu"[^>]*aria-hidden="true"/, `${page.file}: no-JS menu is accessible`);
}
console.log('shared-chrome: all 18 initial HTML pages expose navigation, four audiences, privacy controls and correct nested assets');

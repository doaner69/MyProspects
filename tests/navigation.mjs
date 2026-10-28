import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');

class Element {
  constructor(href) {
    this.href = href;
    this.attributes = new Map();
    this.events = {};
    const classes = new Set();
    this.classList = {
      add: (...values) => values.forEach((value) => classes.add(value)),
      contains: (value) => classes.has(value),
      toggle: (value, force = !classes.has(value)) => {
        if (force) classes.add(value); else classes.delete(value);
        return force;
      },
    };
  }
  setAttribute(key, value) { this.attributes.set(key, value); }
  removeAttribute(key) { this.attributes.delete(key); }
  getAttribute(key) { return this.attributes.get(key); }
  addEventListener(type, listener) { (this.events[type] ??= []).push(listener); }
  emit(type, event = { preventDefault() {} }) { (this.events[type] ?? []).forEach((listener) => listener(event)); }
  focus() { this.ownerDocument.activeElement = this; }
  contains(target) { return target === this || this.children?.includes(target); }
  querySelectorAll() { return this.children ?? []; }
}

function setup(pathname = '/') {
  const nav = new Element();
  const toggle = new Element();
  const menu = new Element();
  const disclosure = new Element();
  disclosure.open = false;
  const document = new Element();
  document.body = new Element();
  const links = ['/', '/product', '/solutions/b2b?tracking_opt_out=1', 'https://other.example/product'].map((path) => new Element(new URL(path, 'https://myprospects.com').href));
  nav.children = links;
  menu.children = links;
  links.forEach((link) => { link.ownerDocument = document; });
  toggle.ownerDocument = document;
  document.getElementById = (id) => id === 'site-nav' ? nav : null;
  document.querySelector = (selector) => ({ '[data-mobile-toggle]': toggle, '[data-mobile-menu]': menu, '[data-mobile-navigation]': disclosure })[selector] ?? null;
  document.querySelectorAll = () => [];
  const media = new Element();
  const window = new Element();
  window.scrollY = 0;
  window.location = { pathname, href: `https://myprospects.com${pathname}` };
  window.matchMedia = () => media;
  const context = vm.createContext({ document, window, URL, requestAnimationFrame: (callback) => callback() });
  vm.runInContext(source, context);
  return { context, document, window, nav, toggle, menu, disclosure, links, media };
}

for (const [path, expected] of [['/', 0], ['/index.html', 0], ['/product/', 1], ['/product.html', 1], ['/solutions/b2b', 2]]) {
  const { context, links } = setup(path);
  vm.runInContext('initCurrentNav()', context);
  assert.equal(links[expected].getAttribute('aria-current'), 'page', `current link for ${path}`);
  assert.equal(links.filter((link) => link.getAttribute('aria-current') === 'page').length, 1);
  assert.equal(links[2].href, 'https://myprospects.com/solutions/b2b?tracking_opt_out=1', 'query parameters remain intact');
}

const { context, document, nav, menu, toggle, disclosure, links, media } = setup();
vm.runInContext('initNav()', context);
assert.equal(disclosure.open, false, 'closed native menu stays closed at enhancement startup');
assert.equal(menu.getAttribute('aria-hidden'), 'true');
toggle.emit('click');
assert.equal(disclosure.open, true, 'enhanced controls keep the native disclosure state synchronized');
assert.equal(toggle.getAttribute('aria-expanded'), 'true');
assert.equal(menu.getAttribute('aria-hidden'), 'false');
assert.equal(document.activeElement, links[0]);
let prevented = false;
document.emit('keydown', { key: 'Tab', shiftKey: true, preventDefault: () => { prevented = true; } });
assert.equal(prevented, true);
assert.equal(document.activeElement, links.at(-1));
document.emit('keydown', { key: 'Tab', preventDefault() {} });
assert.equal(document.activeElement, links[0]);
document.emit('keydown', { key: 'Escape', preventDefault() {} });
assert.equal(menu.classList.contains('open'), false);
assert.equal(document.activeElement, toggle);
toggle.emit('click');
document.emit('click', { target: new Element() });
assert.equal(toggle.getAttribute('aria-expanded'), 'false');
toggle.emit('click');
media.emit('change', { matches: true });
assert.equal(menu.classList.contains('open'), false);
assert.equal(document.body.classList.contains('mobile-menu-open'), false);
toggle.emit('click');
menu.emit('click', { target: { closest: () => links[0] } });
assert.equal(menu.classList.contains('open'), false, 'following a menu link closes the menu');

const fallback = setup();
fallback.document.querySelector = (selector) => selector === '[data-workflow-story]' ? { querySelectorAll: () => [], style: { setProperty() {} } } : null;
assert.doesNotThrow(() => vm.runInContext('initWorkflowStory()', fallback.context), 'missing IntersectionObserver must not stop later initializers');

const fade = setup();
const item = new Element();
fade.document.querySelectorAll = () => [item];
assert.doesNotThrow(() => vm.runInContext('initFadeIn()', fade.context));
assert.equal(item.classList.contains('is-visible'), false, 'no observer leaves ordinary visible content alone');
let observeCallback;
let unobserved;
fade.context.IntersectionObserver = fade.window.IntersectionObserver = class {
  constructor(callback) { observeCallback = callback; }
  observe() {}
  unobserve(target) { unobserved = target; }
};
vm.runInContext('initFadeIn()', fade.context);
assert.equal(item.classList.contains('is-visible'), false, 'a silent observer must not introduce a hidden state');
observeCallback([{ target: item, isIntersecting: true }]);
assert.equal(item.classList.contains('is-visible'), true);
assert.equal(unobserved, item);
const reduced = setup();
reduced.media.matches = true;
reduced.document.querySelectorAll = () => [new Element()];
reduced.context.IntersectionObserver = reduced.window.IntersectionObserver = class {
  constructor() { assert.fail('reduced motion should not initialize entrance animations'); }
};
vm.runInContext('initFadeIn()', reduced.context);
assert.doesNotMatch(css, /\[data-fade\]\s*\{[^}]*opacity:\s*0\s*;/, 'content must be visible before scripts or observers run');
assert.doesNotMatch(source, /injectSharedChrome|fixPaths|getPathPrefix|innerHTML/, 'runtime must enhance existing markup');

const { NAV_HTML, FOOTER_HTML } = await import('../templates/shared-chrome.mjs');
for (const html of [NAV_HTML, FOOTER_HTML]) {
  assert.match(html, /src="\/assets\/images\/myprospects-logo\.png"/);
  assert.doesNotMatch(html, /href="[^"]*\.html/);
}
assert.doesNotMatch(NAV_HTML, /id="mobile-site-menu"[^>]*aria-hidden="true"/, 'no-JS menu must remain accessible');
assert.match(NAV_HTML, /<details\b[^>]*data-mobile-navigation[\s\S]*?<summary\b[^>]*data-mobile-toggle[\s\S]*?<\/summary>[\s\S]*?data-mobile-menu[\s\S]*?<\/details>/, 'native disclosure keeps no-JS navigation usable without an expanded startup layout');
assert.doesNotMatch(NAV_HTML, /<details\b[^>]*\bopen(?:[\s=>])/, 'initial native navigation is collapsed without scripts');
console.log('Navigation regression checks passed.');

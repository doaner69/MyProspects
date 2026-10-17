import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const sourcePath = new URL('../js/tracking-consent.js', import.meta.url);
assert.ok(existsSync(sourcePath), 'The shared consent controller must exist');
const source = readFileSync(sourcePath, 'utf8');
const storageKey = 'myprospects-tracking-consent-v2';

function start({ pathname = '/', saved, savedKey = storageKey, globalPrivacyControl = false, storageBlocked = false, writesBlocked = false, sessionBlocked = false, sessionSaved, search = '', sdkLoaded = true, form = false, hostname = 'www.myprospects.com', protocol = 'https:', now = Date.now() } = {}) {
  const values = new Map(saved ? [[savedKey, JSON.stringify(saved)]] : []);
  const sessionValues = new Map(sessionSaved ? [['myprospects-tracking-opt-out', '1']] : []);
  const events = {};
  const documentEvents = {};
  const timers = new Map();
  let timerId = 0;
  let clock = now;
  let banner;
  const pixelCalls = [];
  const reloads = [];
  const window = {
    location: {
      pathname, protocol, hostname, href: `${protocol}//${hostname}${pathname}${search}`,
      reload() {
        reloads.push({
          gaDisabled: window['ga-disable-G-VH43PH567B'],
          pixelConsent: window.__delivrPixelConsent,
          sdkConsent: pixelCalls.at(-1),
          event: window.dataLayer.at(-1).event,
          storedChoice: values.get(storageKey),
          timerCount: timers.size,
        });
      },
    },
    navigator: { globalPrivacyControl },
    localStorage: {
      getItem(key) { if (storageBlocked) throw new Error('blocked'); return values.get(key) ?? null; },
      setItem(key, value) { if (storageBlocked || writesBlocked) throw new Error('blocked'); values.set(key, value); },
    },
    sessionStorage: {
      getItem(key) { if (sessionBlocked) throw new Error('blocked'); return sessionValues.get(key) ?? null; },
      setItem(key, value) { if (sessionBlocked) throw new Error('blocked'); sessionValues.set(key, value); },
      removeItem(key) { if (sessionBlocked) throw new Error('blocked'); sessionValues.delete(key); },
    },
    history: { replaceState(_state, _title, url) { window.location.href = String(url); } },
    PixelSDK: sdkLoaded ? { pixelId: 'f975a66e-59f3-4c58-988f-c5b1d9361f9b', setConsent(value) { pixelCalls.push(value); } } : undefined,
    addEventListener(type, callback) { events[type] = callback; },
    setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  };
  const acceptButton = { focus() {}, setAttribute(key, value) { this[key] = value; } };
  const rejectButton = { focus() {} };
  const browserNotice = {};
  const document = {
    readyState: 'complete', visibilityState: 'visible',
    addEventListener(type, callback) { documentEvents[type] = callback; },
    querySelectorAll() { return []; },
    querySelector(selector) { return selector === 'form' && form ? {} : null; },
    createElement() { return { setAttribute() {}, querySelector(selector) { return selector.includes('accept') ? acceptButton : selector.includes('reject') ? rejectButton : browserNotice; } }; },
    body: { appendChild(element) { banner = element; } },
  };
  runInNewContext(source, { window, document, Date: { now: () => clock }, URL }, { timeout: 1000 });
  return {
    window, document, api: window.MyProspectsConsent, values, sessionValues, events, documentEvents, pixelCalls, reloads, timers, banner, acceptButton, browserNotice,
    setNow(value) { clock = value; },
    fireNextTimer() {
      const [id, timer] = timers.entries().next().value;
      timers.delete(id);
      timer.callback();
    },
  };
}

const current = start();
assert.match(current.banner.innerHTML, /Cookie preferences/);
assert.match(current.banner.innerHTML, /data-tracking-choice="reject"[^>]*>Opt out<\/button>/);
assert.match(current.banner.innerHTML, /Tracking is on unless you opt out\./);
assert.match(current.banner.innerHTML, /You can opt out now or withdraw at any time/);
assert.match(current.banner.innerHTML, /Google Analytics and our visitor identification partners/);
assert.match(current.banner.innerHTML, /names, emails, Contact messages, Trial notes and copied text/);
assert.match(current.banner.innerHTML, /confidential or sensitive information/);
assert.match(current.banner.innerHTML, /href="\/privacy-policy\.html"/);
assert.doesNotMatch(current.banner.innerHTML, /After you accept|By continuing to browse|analytics only|currently inactive/);
assert.equal(current.api.isAllowed(), true, 'New visitors must start allowed');
assert.equal(current.api.isIdentityAllowed(), true, 'Production HTTPS visitors must start with identity allowed');
assert.equal(current.window['ga-disable-G-VH43PH567B'], false);
assert.equal(current.window.__delivrPixelConsent, true, 'The pixel flag must be established before GTM loads');
assert.equal(current.pixelCalls.at(-1), true);
assert.equal(current.window.dataLayer[0].myprospects.analytics_consent, 'granted');
assert.equal(current.window.dataLayer[0].myprospects.identity_consent, 'granted');
assert.equal(current.values.has(storageKey), false, 'Default tracking must not fabricate a visitor decision');
assert.equal(current.banner.hidden, false, 'New visitors must see the notice while tracking is allowed');
assert.equal(current.reloads.length, 0);

// Exercise the actual GTM bridge with the controller's synchronous initial state.
const bridge = readFileSync(new URL('../gtm/myprospects-consent.js', import.meta.url), 'utf8');
for (const globalPrivacyControl of [false, true]) {
  const page = start({ globalPrivacyControl });
  const states = [];
  runInNewContext(bridge, {
    require(name) {
      if (name === 'setDefaultConsentState' || name === 'updateConsentState') return state => states.push(state);
      if (name === 'callInWindow') return (_path, callback) => page.api.subscribe(callback);
      throw new Error(`Unexpected GTM API ${name}`);
    },
    data: { gtmOnSuccess() {} },
  });
  assert.equal(states[0].analytics_storage, 'denied', 'GTM must fail closed until the controller responds');
  assert.equal(states.at(-1).analytics_storage, globalPrivacyControl ? 'denied' : 'granted', 'GTM must apply default-on or GPC before page initialization');
  page.api.setChoice('reject');
  assert.equal(states.at(-1).analytics_storage, 'denied');
  assert.ok(states.every(state => ['ad_storage', 'ad_user_data', 'ad_personalization'].every(type => state[type] === 'denied')));
}

const choices = [];
current.api.subscribe(allowed => choices.push(allowed));
assert.deepEqual(choices, [true]);
current.api.setChoice('accept');
assert.equal(current.api.isAllowed(), true);
assert.equal(current.banner.hidden, true);
assert.equal(JSON.parse(current.values.get(storageKey)).version, 2);
assert.deepEqual(choices, [true], 'Acknowledging default-on tracking must not reinitialize tags');
assert.equal(current.window.dataLayer.filter(e => e.event === 'myprospects_consent_granted').length, 0);
current.api.setChoice('reject');
assert.equal(current.api.isAllowed(), false);
assert.equal(current.window['ga-disable-G-VH43PH567B'], true);
assert.equal(current.pixelCalls.at(-1), false);
assert.deepEqual(choices, [true, false]);
assert.equal(current.reloads.length, 1, 'Opt-out must unload already-running partner code');
assert.deepEqual(current.reloads[0], {
  gaDisabled: true, pixelConsent: false, sdkConsent: false,
  event: 'myprospects_consent_denied', storedChoice: current.values.get(storageKey), timerCount: 0,
}, 'Opt-out must update storage, SDK, GTM and expiry scheduling before reload');
assert.equal(JSON.parse(current.values.get(storageKey)).choice, 'reject');
current.api.setChoice('reject');
assert.equal(current.reloads.length, 1, 'Repeated opt-out must not cause a reload loop');
const restarted = start({ saved: JSON.parse(current.values.get(storageKey)) });
assert.equal(restarted.api.isAllowed(), false);
assert.equal(restarted.banner.hidden, true);
assert.equal(restarted.reloads.length, 0);
restarted.api.showChoices();
assert.equal(restarted.banner.hidden, false);
assert.equal(restarted.acceptButton.textContent, 'Allow tracking', 'Reversing an opt-out must have an explicit visible label');
restarted.api.setChoice('accept');
assert.equal(restarted.api.isAllowed(), true);
assert.equal(restarted.window.dataLayer.at(-1).event, 'myprospects_consent_granted');

const noSdk = start({ sdkLoaded: false });
noSdk.api.setChoice('reject');
assert.equal(noSdk.reloads.length, 0);

const savedGrant = { version: 2, choice: 'accept', expiresAt: Date.now() + 60_000 };
assert.equal(start({ saved: savedGrant }).api.isAllowed(), true);
assert.equal(start({ saved: savedGrant }).banner.hidden, true);
for (const saved of [
  { ...savedGrant, choice: 'reject' },
  { ...savedGrant, choice: 'reject', expiresAt: 1 },
]) {
  const page = start({ saved });
  assert.equal(page.api.isAllowed(), false, 'Existing v2 opt-outs must remain denied, even after the old expiry');
  assert.equal(page.api.isIdentityAllowed(), false);
  assert.equal(page.banner.hidden, true);
  assert.equal(page.timers.size, 0, 'Opt-outs must not expire automatically');
  page.setNow(Date.now() + 365 * 24 * 60 * 60 * 1000);
  page.events.focus();
  assert.equal(page.api.isAllowed(), false);
}
for (const key of [storageKey, 'myprospects-tracking-consent-v1']) {
  const page = start({ savedKey: key, saved: { version: 1, choice: 'reject', expiresAt: 1 } });
  assert.equal(page.api.isAllowed(), false, 'Legacy analytics rejections must also suppress default-on identity tracking');
}
const legacyGrant = start({ savedKey: 'myprospects-tracking-consent-v1', saved: { ...savedGrant, version: 1 } });
assert.equal(legacyGrant.api.isAllowed(), true);
assert.equal(legacyGrant.banner.hidden, false, 'Old analytics acceptance must not dismiss the new notice');
for (const saved of [{ ...savedGrant, expiresAt: 1 }, { ...savedGrant, version: 0 }, { ...savedGrant, choice: 'unknown' }]) {
  const page = start({ saved });
  assert.equal(page.api.isAllowed(), true);
  assert.equal(page.banner.hidden, false);
}
const browserOptOut = start({ globalPrivacyControl: true });
assert.equal(browserOptOut.api.isAllowed(), false);
assert.equal(browserOptOut.window.__delivrPixelConsent, false);
assert.equal(browserOptOut.acceptButton.disabled, true);
browserOptOut.api.setChoice('accept');
assert.equal(browserOptOut.api.isAllowed(), false, 'An explicit allow choice must never override GPC');
assert.equal(browserOptOut.reloads.length, 0);
const gpcChange = start({ saved: savedGrant });
gpcChange.window.navigator.globalPrivacyControl = true;
gpcChange.events.focus();
assert.equal(gpcChange.api.isAllowed(), false);
assert.equal(gpcChange.reloads.length, 1);
gpcChange.api.showChoices();
assert.equal(gpcChange.acceptButton.disabled, true);
assert.equal(gpcChange.browserNotice.hidden, false);

const privateMode = start({ storageBlocked: true });
assert.equal(privateMode.api.isAllowed(), false, 'Unreadable preferences must not silently override a possible saved opt-out');
assert.equal(privateMode.acceptButton.textContent, 'Allow tracking', 'Storage-blocked visitors must see an explicit allowance action');
privateMode.api.setChoice('accept');
assert.equal(privateMode.api.isAllowed(), true, 'Visitors can explicitly allow tracking for a storage-blocked visit');
privateMode.api.setChoice('reject');
assert.equal(privateMode.api.isAllowed(), false);
assert.equal(start({ storageBlocked: true }).api.isAllowed(), false, 'A storage-blocked reload after opt-out must stay denied');

// Reads can work even when writes fail (for example when localStorage is full).
for (const sessionBlocked of [false, true]) {
  const page = start({ writesBlocked: true, sessionBlocked, saved: savedGrant });
  assert.equal(page.api.isAllowed(), true);
  page.api.setChoice('reject');
  assert.equal(page.api.isAllowed(), false);
  assert.equal(page.reloads.length, 1);
  const restarted = start({
    writesBlocked: true, sessionBlocked, saved: savedGrant,
    sessionSaved: page.sessionValues.get('myprospects-tracking-opt-out') === '1',
    search: new URL(page.window.location.href).search,
  });
  assert.equal(restarted.api.isAllowed(), false, 'A failed preference write must not undo an opt-out on reload');
  assert.equal(restarted.reloads.length, 0);
  if (sessionBlocked) {
    const link = { href: 'https://www.myprospects.com/contact.html' };
    restarted.documentEvents.click({ target: { closest(selector) { return selector === 'a[href]' ? link : null; } } });
    assert.equal(new URL(link.href).searchParams.get('myprospects_opt_out'), '1', 'Fallback opt-out must carry through internal links');
    assert.equal(start({ writesBlocked: true, sessionBlocked, saved: savedGrant, pathname: '/contact.html', search: new URL(link.href).search }).api.isAllowed(), false);
  }
  restarted.api.setChoice('accept');
  assert.equal(restarted.api.isAllowed(), true);
  assert.equal(restarted.sessionValues.has('myprospects-tracking-opt-out'), false);
  assert.equal(new URL(restarted.window.location.href).searchParams.has('myprospects_opt_out'), false);
}

for (const pathname of ['/contact', '/contact.html', '/trial', '/trial.html', '/solutions/b2b.html']) {
  const page = start({ pathname });
  assert.equal(page.api.isAllowed(), true);
  assert.equal(page.api.isIdentityAllowed(), true, `${pathname}: default-on coverage must include form pages`);
}
for (const { hostname, protocol } of [
  { hostname: 'localhost', protocol: 'http:' },
  { hostname: 'preview.vercel.app', protocol: 'https:' },
  { hostname: 'myprospects.com', protocol: 'https:' },
  { hostname: 'www.myprospects.com', protocol: 'http:' },
]) assert.equal(start({ hostname, protocol }).api.isIdentityAllowed(), false, 'Identity tracking must retain the exact production HTTPS host restriction');

const anotherTab = start();
anotherTab.values.set(storageKey, JSON.stringify({ ...savedGrant, choice: 'reject' }));
anotherTab.events.storage({ key: storageKey });
assert.equal(anotherTab.api.isAllowed(), false);
assert.equal(anotherTab.pixelCalls.at(-1), false);
assert.equal(anotherTab.reloads.length, 1);
anotherTab.values.set(storageKey, JSON.stringify(savedGrant));
anotherTab.events.storage({ key: storageKey });
assert.equal(anotherTab.api.isAllowed(), true, 'An explicit allow choice in another tab must propagate');

function expiringAcknowledgment() {
  const page = start({ now: 1000, saved: { version: 2, choice: 'accept', expiresAt: 2000 } });
  const decisions = [];
  page.api.subscribe(allowed => decisions.push(allowed));
  assert.equal(page.banner.hidden, true);
  page.setNow(2001);
  return { page, decisions };
}
for (const resume of ['timer', 'focus', 'visibilitychange']) {
  const { page, decisions } = expiringAcknowledgment();
  if (resume === 'timer') page.fireNextTimer();
  else if (resume === 'focus') page.events.focus();
  else page.documentEvents.visibilitychange();
  assert.equal(page.api.isAllowed(), true, 'Acknowledgment expiry must retain default-on tracking');
  assert.equal(page.banner.hidden, false, 'Acknowledgment expiry must reshow the notice');
  assert.equal(page.reloads.length, 0);
  assert.equal(page.timers.size, 0);
  assert.deepEqual(decisions, [true], 'Acknowledgment expiry must not duplicate tracking initialization');
}
const longExpiry = start({ now: 1000 });
longExpiry.api.setChoice('accept');
assert.equal(longExpiry.timers.values().next().value?.delay, 2147483647);
longExpiry.setNow(1000 + 2147483647);
longExpiry.fireNextTimer();
assert.equal(longExpiry.api.isAllowed(), true);
assert.equal(longExpiry.timers.values().next().value?.delay, 2147483647);
assert.ok(!current.window.dataLayer.some(e => e[0] === 'config' || e[0] === 'event'), 'The controller must not initialize a second Google tag');
console.log('tracking-consent: default-on tracking, GTM bootstrap, persistent and legacy opt-outs, explicit re-enabling, GPC, storage failures, host restrictions, acknowledgment expiry, and cross-tab changes validated');

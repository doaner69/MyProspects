import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const sourcePath = new URL('../js/tracking-consent.js', import.meta.url);
assert.ok(existsSync(sourcePath), 'The shared consent controller must exist');
const source = readFileSync(sourcePath, 'utf8');
const storageKey = 'myprospects-tracking-consent-v2';

function start({ pathname = '/', saved, savedKey = storageKey, globalPrivacyControl = false, storageBlocked = false, sdkLoaded = true, form = false, now = Date.now() } = {}) {
  const values = new Map(saved ? [[savedKey, JSON.stringify(saved)]] : []);
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
      pathname, protocol: 'https:', hostname: 'www.myprospects.com',
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
      setItem(key, value) { if (storageBlocked) throw new Error('blocked'); values.set(key, value); },
    },
    PixelSDK: sdkLoaded ? { pixelId: 'f975a66e-59f3-4c58-988f-c5b1d9361f9b', setConsent(value) { pixelCalls.push(value); } } : undefined,
    addEventListener(type, callback) { events[type] = callback; },
    setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); },
  };
  const document = {
    readyState: 'complete', visibilityState: 'visible',
    addEventListener(type, callback) { documentEvents[type] = callback; },
    querySelector(selector) { return selector === 'form' && form ? {} : null; },
    createElement() { return { setAttribute() {}, querySelector() { return { focus() {} }; } }; },
    body: { appendChild(element) { banner = element; } },
  };
  runInNewContext(source, { window, document, Date: { now: () => clock }, URL }, { timeout: 1000 });
  return {
    window, document, api: window.MyProspectsConsent, values, events, documentEvents, pixelCalls, reloads, timers, banner,
    setNow(value) { clock = value; },
    fireNextTimer() {
      const [id, timer] = timers.entries().next().value;
      timers.delete(id);
      timer.callback();
    },
  };
}

const current = start();
assert.match(current.banner.innerHTML, /After you accept optional tracking, we share information with Google Analytics and our visitor identification partners\./);
assert.match(current.banner.innerHTML, /names, emails, Contact messages, Trial notes and copied text/);
assert.match(current.banner.innerHTML, /confidential or sensitive information/);
assert.doesNotMatch(current.banner.innerHTML, /analytics only|currently inactive/);
assert.match(current.banner.innerHTML, /withdraw at any time/);
assert.match(current.banner.innerHTML, /href="\/privacy-policy\.html"/);
assert.equal(current.api.isAllowed(), false, 'Unknown visitors must start denied');
assert.equal(current.window['ga-disable-G-VH43PH567B'], true, 'Denied consent must disable GA4 sends');
assert.equal(current.window.__delivrPixelConsent, false, 'Denied consent must gate the identity SDK before load');
assert.equal(current.reloads.length, 0, 'Initial denial must not reload the page');
const choices = [];
current.api.subscribe(allowed => choices.push(allowed));
assert.deepEqual(choices, [false], 'GTM must receive the initial decision immediately');
current.api.setChoice('accept');
assert.equal(current.api.isAllowed(), true);
assert.equal(current.window['ga-disable-G-VH43PH567B'], false);
assert.equal(current.api.isIdentityAllowed(), true, 'New v2 acceptance must authorize identity');
assert.equal(current.window.__delivrPixelConsent, true);
assert.equal(current.pixelCalls.at(-1), true);
assert.equal(current.window.dataLayer.at(-1).myprospects.identity_consent, 'granted');
assert.equal(JSON.parse(current.values.get(storageKey)).version, 2, 'New decisions must persist schema v2');
assert.deepEqual(choices, [false, true]);
assert.equal(current.reloads.length, 0, 'Acceptance must not reload the page');
assert.equal(current.window.dataLayer.filter(e => e.event === 'myprospects_consent_granted').length, 1);
current.api.setChoice('accept');
assert.equal(current.window.dataLayer.filter(e => e.event === 'myprospects_consent_granted').length, 1, 'Repeated acceptance must not retrigger tag initialization');
current.api.setChoice('reject');
assert.equal(current.api.isAllowed(), false);
assert.equal(current.window['ga-disable-G-VH43PH567B'], true);
assert.equal(current.pixelCalls.at(-1), false, 'Withdrawal must reach the vendor SDK');
assert.deepEqual(choices, [false, true, false]);
assert.equal(current.window.dataLayer.some(e => e.event === 'myprospects_consent_denied'), true);
assert.equal(current.reloads.length, 1, 'Withdrawal must unload already-loaded partner code');
assert.deepEqual(current.reloads[0], {
  gaDisabled: true, pixelConsent: false, sdkConsent: false,
  event: 'myprospects_consent_denied', storedChoice: current.values.get(storageKey), timerCount: 1,
}, 'Stored denial, SDK, data layer, and timer must be updated before reloading');
assert.equal(JSON.parse(current.reloads[0].storedChoice).choice, 'reject');
current.api.setChoice('reject');
assert.equal(current.reloads.length, 1, 'Repeated denial must not cause a reload loop');
const restartedAfterWithdrawal = start({ saved: JSON.parse(current.values.get(storageKey)) });
assert.equal(restartedAfterWithdrawal.api.isAllowed(), false, 'A refreshed page must honor stored withdrawal');
assert.equal(restartedAfterWithdrawal.api.isIdentityAllowed(), false);
assert.equal(restartedAfterWithdrawal.reloads.length, 0, 'Restarting denied must not reload again');

const noSdk = start({ sdkLoaded: false });
noSdk.api.setChoice('accept');
noSdk.api.setChoice('reject');
assert.equal(noSdk.reloads.length, 0, 'Withdrawal without a loaded identity SDK must not reload');

const savedGrant = { version: 2, choice: 'accept', expiresAt: Date.now() + 60_000 };
assert.equal(start({ saved: savedGrant }).api.isAllowed(), true, 'An unexpired choice must be available before GTM loads');
assert.equal(start({ saved: savedGrant }).api.isIdentityAllowed(), true, 'Stored v2 consent must authorize identity');
const legacyGrant = start({ saved: { ...savedGrant, version: 1 }, savedKey: 'myprospects-tracking-consent-v1' });
assert.equal(legacyGrant.api.isAllowed(), false, 'Legacy analytics consent must require renewed consent');
assert.equal(legacyGrant.api.isIdentityAllowed(), false, 'Legacy analytics consent must never authorize identity');
assert.equal(legacyGrant.window.__delivrPixelConsent, false);
assert.equal(legacyGrant.banner.hidden, false, 'Legacy acceptance must show the updated notice');
legacyGrant.api.setChoice('accept');
assert.equal(legacyGrant.api.isIdentityAllowed(), true, 'Identity is authorized only after renewed acceptance');
assert.equal(JSON.parse(legacyGrant.values.get(storageKey)).version, 2);
assert.equal(start({ saved: { ...savedGrant, version: 1 } }).api.isAllowed(), false, 'A v1 schema in the v2 key must also be rejected');
assert.equal(start({ saved: { ...savedGrant, expiresAt: Date.now() - 1 } }).api.isAllowed(), false);
assert.equal(start({ saved: { ...savedGrant, version: 0 } }).api.isAllowed(), false);
assert.equal(start({ saved: { ...savedGrant, choice: 'unknown' } }).api.isAllowed(), false);
const browserOptOut = start({ saved: savedGrant, globalPrivacyControl: true });
assert.equal(browserOptOut.api.isAllowed(), false, 'Browser privacy opt-out must keep tracking denied');
browserOptOut.api.setChoice('accept');
assert.equal(browserOptOut.api.isAllowed(), false);
assert.equal(browserOptOut.reloads.length, 0, 'Initial browser opt-out must not reload');

const privateMode = start({ storageBlocked: true });
assert.equal(privateMode.api.isAllowed(), false);
privateMode.api.setChoice('accept');
assert.equal(privateMode.api.isAllowed(), true, 'A visitor can grant for the current visit even when persistence is unavailable');

for (const pathname of ['/contact', '/contact.html', '/contact/', '/contact.html/', '/trial', '/trial.html', '/trial/']) {
  const page = start({ pathname });
  page.api.setChoice('accept');
  assert.equal(page.api.isAllowed(), true, `${pathname}: GA4 may run after consent`);
  assert.equal(page.api.isIdentityAllowed(), true, `${pathname}: renewed opt-in authorizes intended all-page identity coverage`);
  assert.equal(page.window.__delivrPixelConsent, true);
  assert.equal(page.pixelCalls.at(-1), true);
}

const anotherTab = start({ saved: savedGrant });
anotherTab.values.set(storageKey, JSON.stringify({ ...savedGrant, choice: 'reject' }));
anotherTab.events.storage({ key: storageKey });
assert.equal(anotherTab.api.isAllowed(), false, 'Withdrawal in another tab must propagate');
assert.equal(anotherTab.pixelCalls.at(-1), false);
assert.equal(anotherTab.reloads.length, 1, 'Cross-tab withdrawal must unload partner code');

function expiringGrant() {
  const page = start({ now: 1000, saved: { version: 2, choice: 'accept', expiresAt: 2000 } });
  const decisions = [];
  page.api.subscribe(allowed => decisions.push(allowed));
  assert.deepEqual(decisions, [true]);
  assert.equal(page.banner.hidden, true);
  page.setNow(2001);
  return { page, decisions };
}

function assertExpired(page, decisions) {
  assert.equal(page.api.isAllowed(), false);
  assert.equal(page.window['ga-disable-G-VH43PH567B'], true, 'Expiry must disable GA4 sends');
  assert.equal(page.window.__delivrPixelConsent, false, 'Expiry must revoke the pixel global');
  assert.equal(page.pixelCalls.at(-1), false, 'Expiry must reach the vendor SDK');
  assert.deepEqual(decisions, [true, false], 'Expiry must notify GTM of the applied denial');
  assert.equal(page.window.dataLayer.filter(e => e.event === 'myprospects_consent_denied').length, 1);
  assert.equal(page.reloads.length, 1, 'Expiry must unload already-loaded partner code');
}

const timerExpiry = expiringGrant();
assert.equal(timerExpiry.page.timers.values().next().value?.delay, 1000, 'Expiry must be scheduled');
timerExpiry.page.fireNextTimer();
assertExpired(timerExpiry.page, timerExpiry.decisions);
assert.equal(timerExpiry.page.banner.hidden, false, 'An expired choice must resurface the banner');
assert.equal(timerExpiry.page.timers.size, 0, 'An expired choice must not retain an expiry timer');
const restartedAfterExpiry = start({ now: 2001, saved: JSON.parse(timerExpiry.page.values.get(storageKey)) });
assert.equal(restartedAfterExpiry.api.isAllowed(), false, 'An expiry refresh must restart denied even while the expired record remains stored');
assert.equal(restartedAfterExpiry.reloads.length, 0);

for (const resume of ['focus', 'visibilitychange']) {
  const { page, decisions } = expiringGrant();
  if (resume === 'focus') page.events.focus();
  else page.documentEvents.visibilitychange();
  assertExpired(page, decisions);
  assert.equal(page.banner.hidden, false, `${resume}: an expired choice must resurface the banner`);
}

const rejectAfterExpiry = expiringGrant();
rejectAfterExpiry.page.api.setChoice('reject');
assertExpired(rejectAfterExpiry.page, rejectAfterExpiry.decisions);
assert.equal(rejectAfterExpiry.page.banner.hidden, true, 'A new rejection must dismiss the banner');

const longExpiry = start({ now: 1000 });
longExpiry.api.setChoice('accept');
assert.equal(longExpiry.timers.values().next().value?.delay, 2147483647, 'Long expiry timers must respect the browser timeout limit');
longExpiry.setNow(1000 + 2147483647);
longExpiry.fireNextTimer();
assert.equal(longExpiry.api.isAllowed(), true, 'A timeout chunk must not expire a valid choice early');
assert.equal(longExpiry.timers.values().next().value?.delay, 2147483647, 'Long expiry must schedule another bounded timeout');
assert.ok(!current.window.dataLayer.some(e => e[0] === 'config' || e[0] === 'event'), 'The banner must not initialize a second Google tag or send form analytics');

console.log('tracking-consent: defaults, grant, withdrawal, persistence, expiry, browser opt-out, all-page consent, and cross-tab changes validated');

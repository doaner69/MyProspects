(function () {
  'use strict';

  if (window.MyProspectsConsent) return;

  // v1 analytics-only decisions do not authorize the expanded identity scope.
  const storageKey = 'myprospects-tracking-consent-v2';
  const identityTrackingEnabled = true;
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const pixelId = 'f975a66e-59f3-4c58-988f-c5b1d9361f9b';
  const listeners = [];
  let choice = readChoice();
  let appliedAllowed;
  let expiryTimer;
  let banner;
  let returnFocus;

  function readChoice() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey));
      return saved?.version === 2
        && ['accept', 'reject'].includes(saved.choice)
        && Number.isFinite(saved.expiresAt)
        && saved.expiresAt > Date.now() ? saved : null;
    } catch {
      return null;
    }
  }

  function browserOptOut() {
    return window.navigator.globalPrivacyControl === true;
  }

  function isAllowed() {
    return choice?.choice === 'accept' && choice.expiresAt > Date.now() && !browserOptOut();
  }

  function isIdentityAllowed() {
    return identityTrackingEnabled && isAllowed() && window.location.hostname === 'www.myprospects.com' && window.location.protocol === 'https:';
  }

  function scheduleExpiry() {
    window.clearTimeout(expiryTimer);
    expiryTimer = undefined;
    if (choice) {
      expiryTimer = window.setTimeout(applyConsent, Math.min(choice.expiresAt - Date.now(), 2147483647));
    }
  }

  function applyConsent() {
    if (choice && choice.expiresAt <= Date.now()) {
      choice = null;
      if (banner) banner.hidden = false;
    }
    const allowed = isAllowed();
    const changed = appliedAllowed !== undefined && appliedAllowed !== allowed;
    appliedAllowed = allowed;
    const identityAllowed = isIdentityAllowed();
    window['ga-disable-G-VH43PH567B'] = !allowed;
    window.__delivrPixelConsent = identityAllowed;

    const sdk = window.PixelSDK;
    if (sdk?.pixelId === pixelId && typeof sdk.setConsent === 'function') {
      sdk.setConsent(identityAllowed);
    }

    let referrer = '';
    try { referrer = document.referrer ? new URL(document.referrer).origin : ''; } catch { /* Invalid referrers stay empty. */ }
    const state = {
      myprospects: {
        analytics_consent: allowed ? 'granted' : 'denied',
        identity_consent: identityAllowed ? 'granted' : 'denied',
        page_location: `${window.location.origin || `${window.location.protocol}//${window.location.hostname}`}${window.location.pathname}`,
        page_referrer: referrer,
      },
    };

    if (changed) {
      listeners.slice().forEach(callback => callback(allowed));
      state.event = allowed ? 'myprospects_consent_granted' : 'myprospects_consent_denied';
    }
    window.dataLayer.push(state);
    scheduleExpiry();
    // SDK denial cannot unload a partner script that has already executed.
    if (changed && !allowed && sdk?.pixelId === pixelId) window.location.reload();
  }

  function setChoice(value) {
    if (!['accept', 'reject'].includes(value)) return;
    choice = { version: 2, choice: value, expiresAt: Date.now() + lifetime };
    try { window.localStorage.setItem(storageKey, JSON.stringify(choice)); } catch { /* Apply the choice for this visit if storage is unavailable. */ }
    applyConsent();
    if (banner) banner.hidden = true;
    returnFocus?.focus();
  }

  function showChoices(source) {
    if (!banner) return;
    returnFocus = source || document.activeElement;
    banner.hidden = false;
    const button = banner.querySelector(browserOptOut() ? '[data-tracking-choice="reject"]' : '[data-tracking-choice="accept"]');
    button?.focus();
  }

  window.dataLayer = window.dataLayer || [];
  // The vendor reads GA4 IDs through this queue; GA4 initialization belongs to GTM.
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.MyProspectsConsent = {
    isAllowed,
    isIdentityAllowed,
    setChoice,
    showChoices,
    subscribe(callback) {
      if (typeof callback !== 'function') return;
      listeners.push(callback);
      callback(isAllowed());
    },
  };
  applyConsent();

  window.addEventListener('focus', applyConsent);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') applyConsent();
  });

  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    choice = readChoice();
    applyConsent();
    if (banner) banner.hidden = choice !== null;
  });

  function renderChoices() {
    banner = document.createElement('aside');
    banner.id = 'tracking-consent';
    banner.className = 'tracking-consent';
    banner.setAttribute('aria-labelledby', 'tracking-consent-title');
    banner.innerHTML = `
      <div class="tracking-consent-copy">
        <h2 id="tracking-consent-title">We Respect Your Privacy</h2>
        <p>We use cookies and similar technologies to measure traffic and identify visitors. After you accept optional tracking, we share information with Google Analytics and our visitor identification partners.</p>
        <p>Visitor identification can share website activity, names, emails, Contact messages, Trial notes and copied text. Messages and notes may contain confidential or sensitive information. Our Privacy Policy explains the recipients and details.</p>
        <p>You can reject optional tracking or withdraw at any time using Privacy choices in the footer. Withdrawal refreshes the page if tracking has loaded. We honor Global Privacy Control by keeping optional tracking off.</p>
        <p><a href="/privacy-policy.html">Privacy Policy</a> | <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></p>
        <p class="tracking-browser-choice" ${browserOptOut() ? '' : 'hidden'}>Your browser privacy preference keeps optional tracking off.</p>
      </div>
      <div class="tracking-consent-actions">
        <button type="button" data-tracking-choice="reject">Reject optional tracking</button>
        <button type="button" data-tracking-choice="accept" ${browserOptOut() ? 'disabled' : ''}>Accept optional tracking</button>
      </div>`;
    banner.hidden = choice !== null;
    document.body.appendChild(banner);
    document.addEventListener('click', event => {
      const decision = event.target.closest('[data-tracking-choice]');
      if (decision) setChoice(decision.getAttribute('data-tracking-choice'));
      const reopen = event.target.closest('[data-tracking-choices]');
      if (reopen) showChoices(reopen);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderChoices, { once: true });
  else renderChoices();
}());

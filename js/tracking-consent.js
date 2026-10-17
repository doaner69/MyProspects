(function () {
  'use strict';

  if (window.MyProspectsConsent) return;

  // Keep the existing key so the opt-out model preserves prior privacy choices.
  const storageKey = 'myprospects-tracking-consent-v2';
  const sessionOptOutKey = 'myprospects-tracking-opt-out';
  const optOutParameter = 'myprospects_opt_out';
  const identityTrackingEnabled = true;
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const pixelId = 'f975a66e-59f3-4c58-988f-c5b1d9361f9b';
  const listeners = [];
  let storageAvailable = true;
  let choice = readChoice();
  let appliedAllowed;
  let expiryTimer;
  let banner;
  let returnFocus;

  function readChoice() {
    const optedOut = { version: 2, choice: 'reject', expiresAt: 0 };
    if (new URL(window.location.href).searchParams.get(optOutParameter) === '1') return optedOut;
    try {
      if (window.sessionStorage.getItem(sessionOptOutKey) === '1') return optedOut;
    } catch { /* Persistent preferences may still be available. */ }
    try {
      for (const key of [storageKey, 'myprospects-tracking-consent-v1']) {
        const raw = window.localStorage.getItem(key);
        let saved;
        try { saved = JSON.parse(raw); } catch { continue; }
        if (![1, 2].includes(saved?.version) || !['accept', 'reject'].includes(saved.choice)
          || !Number.isFinite(saved.expiresAt)) continue;
        // Opt-outs never expire into default-on tracking, including legacy choices.
        if (saved.choice === 'reject') return saved;
        if (key === storageKey && saved.version === 2) {
          return saved.expiresAt > Date.now() ? saved : null;
        }
      }
      return null;
    } catch {
      // An unreadable saved preference may contain an opt-out. Fail closed.
      storageAvailable = false;
      return null;
    }
  }

  function browserOptOut() {
    return window.navigator.globalPrivacyControl === true;
  }

  function isAllowed() {
    return choice?.choice !== 'reject' && !browserOptOut()
      && (storageAvailable || choice?.choice === 'accept');
  }

  function isIdentityAllowed() {
    return identityTrackingEnabled && isAllowed() && window.location.hostname === 'www.myprospects.com' && window.location.protocol === 'https:';
  }

  function scheduleExpiry() {
    window.clearTimeout(expiryTimer);
    expiryTimer = undefined;
    if (choice?.choice === 'accept') {
      expiryTimer = window.setTimeout(applyConsent, Math.min(choice.expiresAt - Date.now(), 2147483647));
    }
  }

  function applyConsent() {
    if (choice?.choice === 'accept' && choice.expiresAt <= Date.now()) {
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
    updateChoices();
    // SDK denial cannot unload a partner script that has already executed.
    if (changed && !allowed && sdk?.pixelId === pixelId) window.location.reload();
  }

  function setChoice(value) {
    if (!['accept', 'reject'].includes(value)) return;
    choice = { version: 2, choice: value, expiresAt: Date.now() + lifetime };
    let persisted = false;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(choice));
      persisted = true;
    } catch { /* Fall back before a withdrawal refresh can undo this choice. */ }
    if (value === 'reject' && !persisted) {
      try {
        window.sessionStorage.setItem(sessionOptOutKey, '1');
        persisted = true;
      } catch { /* The URL can preserve the opt-out when both storage APIs fail. */ }
    }
    if (value === 'accept') {
      try { window.sessionStorage.removeItem(sessionOptOutKey); } catch { /* This allowance may last only for the current visit. */ }
      document.querySelectorAll('a[href]').forEach(link => updateOptOutLink(link, false));
    }
    const url = new URL(window.location.href);
    if (value === 'reject' && !persisted) url.searchParams.set(optOutParameter, '1');
    else if (value === 'accept') url.searchParams.delete(optOutParameter);
    if (url.href !== window.location.href) window.history.replaceState(null, '', url.href);
    applyConsent();
    if (banner) banner.hidden = true;
    returnFocus?.focus();
  }

  function updateOptOutLink(link, optedOut) {
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== new URL(window.location.href).origin) return;
    if (optedOut) url.searchParams.set(optOutParameter, '1');
    else url.searchParams.delete(optOutParameter);
    if (url.href !== link.href) link.href = url.href;
  }

  function carryOptOut(event) {
    if (choice?.choice === 'reject' && new URL(window.location.href).searchParams.get(optOutParameter) === '1') {
      updateOptOutLink(event.target.closest('a[href]'), true);
    }
  }

  function showChoices(source) {
    if (!banner) return;
    returnFocus = source || document.activeElement;
    banner.hidden = false;
    updateChoices();
    const button = banner.querySelector(browserOptOut() || choice?.choice === 'reject' ? '[data-tracking-choice="reject"]' : '[data-tracking-choice="accept"]');
    button?.focus();
  }

  function updateChoices() {
    if (!banner) return;
    const allow = banner.querySelector('[data-tracking-choice="accept"]');
    const needsAllowance = choice?.choice === 'reject' || (!storageAvailable && choice?.choice !== 'accept');
    allow.textContent = needsAllowance ? 'Allow tracking' : 'OK, got it';
    allow.setAttribute('aria-label', allow.textContent);
    allow.disabled = browserOptOut();
    banner.querySelector('.tracking-browser-choice').hidden = !browserOptOut();
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
      <h2 id="tracking-consent-title">Cookie preferences</h2>
      <div class="tracking-consent-copy">
        <p>We use cookies and similar technologies to improve your experience, analyze traffic, and support marketing and visitor identification. Tracking is on unless you opt out. We share information with Google Analytics and our visitor identification partners. Visitor identification can share website activity, names, emails, Contact messages, Trial notes and copied text, including confidential or sensitive information. You can opt out now or withdraw at any time using Privacy choices in the footer. See our <a href="/privacy-policy.html">Privacy Policy</a>.</p>
        <p class="tracking-browser-choice" ${browserOptOut() ? '' : 'hidden'}>Your browser privacy preference keeps optional tracking off.</p>
      </div>
      <div class="tracking-consent-actions">
        <button type="button" data-tracking-choice="reject">Opt out</button>
        <button type="button" data-tracking-choice="accept">OK, got it</button>
      </div>`;
    banner.hidden = choice !== null;
    document.body.appendChild(banner);
    updateChoices();
    document.addEventListener('pointerdown', carryOptOut);
    document.addEventListener('click', event => {
      carryOptOut(event);
      const decision = event.target.closest('[data-tracking-choice]');
      if (decision) setChoice(decision.getAttribute('data-tracking-choice'));
      const reopen = event.target.closest('[data-tracking-choices]');
      if (reopen) showChoices(reopen);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderChoices, { once: true });
  else renderChoices();
}());

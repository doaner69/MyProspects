function activateButtonSet(buttons, activeButton) {
  buttons.forEach((button) => {
    const active = button === activeButton;
    button.classList.toggle('active', active);
    if (button.hasAttribute('role')) button.setAttribute('aria-selected', String(active));
    if (button.hasAttribute('role')) button.tabIndex = active ? 0 : -1;
  });
}

function bindArrowNavigation(buttons, activate) {
  buttons.forEach((button, index) => {
    button.addEventListener('keydown', (event) => {
      let nextIndex = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = buttons.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      activate(buttons[nextIndex], true);
    });
  });
}

function initStoryTabs() {
  document.querySelectorAll('[data-story-tabs]').forEach((container) => {
    const buttons = [...container.querySelectorAll('[data-story-tab]')];
    const panels = [...container.querySelectorAll('[data-story-panel]')];
    if (!buttons.length || !panels.length) return;

    const activate = (button, moveFocus = false) => {
      const target = button.dataset.storyTab;
      activateButtonSet(buttons, button);
      panels.forEach((panel) => {
        const active = panel.dataset.storyPanel === target;
        panel.classList.toggle('active', active);
        panel.hidden = !active;
      });
      if (moveFocus) button.focus();
    };

    buttons.forEach((button) => button.addEventListener('click', () => activate(button)));
    bindArrowNavigation(buttons, activate);
  });
}

function initFilters() {
  document.querySelectorAll('[data-filter-group]').forEach((container) => {
    const buttons = [...container.querySelectorAll('[data-filter-button]')];
    const items = [...container.querySelectorAll('[data-filter-item]')];
    const panels = [...container.querySelectorAll('[data-filter-panel]')];
    const queryKey = container.dataset.queryKey;
    if (!buttons.length) return;

    const activate = (button, moveFocus = false, updateUrl = true) => {
      const value = button.dataset.filterButton;
      activateButtonSet(buttons, button);

      items.forEach((item) => {
        const values = (item.dataset.filterItem || '').split(' ');
        item.hidden = value !== 'all' && !values.includes(value);
      });

      panels.forEach((panel) => {
        const active = panel.dataset.filterPanel === value;
        panel.classList.toggle('active', active);
        panel.hidden = !active;
      });

      if (queryKey && updateUrl) {
        const url = new URL(window.location.href);
        if (value === 'all') url.searchParams.delete(queryKey);
        else url.searchParams.set(queryKey, value);
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }

      if (moveFocus) button.focus();
    };

    buttons.forEach((button) => button.addEventListener('click', () => activate(button)));
    bindArrowNavigation(buttons, activate);

    if (queryKey) {
      const current = new URL(window.location.href).searchParams.get(queryKey);
      const initial = buttons.find((button) => button.dataset.filterButton === current) || buttons[0];
      activate(initial, false, false);
    }
  });
}

function initPricingEstimator() {
  const estimator = document.querySelector('[data-pricing-estimator]');
  if (!estimator) return;

  const range = estimator.querySelector('[data-resolution-range]');
  const output = estimator.querySelector('[data-resolution-output]');
  const planName = estimator.querySelector('[data-plan-name]');
  const planCopy = estimator.querySelector('[data-plan-copy]');
  const billingButtons = [...document.querySelectorAll('[data-billing]')];
  const priceEls = [...document.querySelectorAll('[data-monthly-price]')];
  const cards = [...document.querySelectorAll('[data-price-card]')];
  if (!range || !output || !planName || !planCopy) return;

  const plans = [
    { max: 1000, name: 'Launch', copy: 'Best for teams starting with visitor identification on one primary domain.' },
    { max: 3000, name: 'Growth', copy: 'Adds off-domain intent and higher monthly resolution capacity.' },
    { max: 7500, name: 'Scale', copy: 'Built for coordinated audience activation, attribution, and larger traffic volumes.' },
    { max: Infinity, name: 'Enterprise', copy: 'Custom capacity, support, and identity graph configuration.' },
  ];

  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value);

  const updateRecommendation = () => {
    const value = Number(range.value);
    const plan = plans.find((candidate) => value <= candidate.max) || plans.at(-1);
    output.value = `${formatNumber(value)} / month`;
    output.textContent = output.value;
    planName.textContent = plan.name;
    planCopy.textContent = plan.copy;
    cards.forEach((card) => card.classList.toggle('recommended', card.dataset.priceCard === plan.name.toLowerCase()));
  };

  const updateBilling = (button) => {
    activateButtonSet(billingButtons, button);
    const annual = button.dataset.billing === 'annual';
    priceEls.forEach((element) => {
      const monthly = Number(element.dataset.monthlyPrice);
      if (!Number.isFinite(monthly)) return;
      element.textContent = `$${formatNumber(Math.round(annual ? monthly * 0.85 : monthly))}`;
    });
    document.querySelectorAll('[data-billing-note]').forEach((note) => {
      note.textContent = annual ? 'per month, billed annually at 15% savings' : 'per month, billed month-to-month';
    });
  };

  range.addEventListener('input', updateRecommendation);
  billingButtons.forEach((button) => button.addEventListener('click', () => updateBilling(button)));
  updateRecommendation();
}

function initCycleSteps() {
  document.querySelectorAll('[data-cycle-steps]').forEach((container) => {
    const steps = [...container.querySelectorAll('.journey-step')];
    if (!steps.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let activeIndex = 0;
    let timer = null;

    const render = () => {
      steps.forEach((step, index) => step.classList.toggle('active', index === activeIndex));
    };

    const stop = () => {
      window.clearInterval(timer);
      timer = null;
    };

    const start = () => {
      if (reduceMotion || timer) return;
      timer = window.setInterval(() => {
        activeIndex = (activeIndex + 1) % steps.length;
        render();
      }, 1800);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    }, { threshold: 0.25 });

    render();
    observer.observe(container);
    container.addEventListener('mouseenter', stop);
    container.addEventListener('mouseleave', start);
  });
}

function validateTrialField(field) {
  const error = document.getElementById(`${field.id}-error`);
  if (!error) return field.checkValidity();

  let message = '';
  if (field.validity.valueMissing) message = 'This field is required.';
  else if (field.validity.typeMismatch) {
    message = field.type === 'email'
      ? field.name === 'workEmail' ? 'Enter a valid work email.' : 'Enter a valid email.'
      : 'Enter a valid value.';
  }
  else if (field.validity.patternMismatch) message = 'Enter a complete website address.';
  else if (field.validity.tooLong) message = `Keep this under ${field.maxLength} characters.`;

  field.setAttribute('aria-invalid', String(Boolean(message)));
  error.textContent = message;
  return !message;
}

function normalizeWebsiteField(field) {
  if (!field) return;
  const value = field.value.trim();
  if (value && !/^https?:\/\//i.test(value)) field.value = `https://${value}`;
}

function showConfirmationDialog(returnFocusTo) {
  let dialog = document.querySelector('[data-confirmation-dialog]');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.className = 'confirmation-dialog';
    dialog.dataset.confirmationDialog = '';
    dialog.setAttribute('aria-labelledby', 'confirmation-title');
    dialog.setAttribute('aria-describedby', 'confirmation-message');
    dialog.innerHTML = `
      <div class="confirmation-dialog-card">
        <span class="confirmation-dialog-icon" aria-hidden="true">✓</span>
        <h2 id="confirmation-title">Thank you for reaching out.</h2>
        <p id="confirmation-message">Someone from MyProspects will be contacting you soon!</p>
        <button class="btn btn-primary" type="button" data-confirmation-close>Close</button>
      </div>
    `;
    document.body.append(dialog);
    dialog.querySelector('[data-confirmation-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  dialog.addEventListener('close', () => returnFocusTo?.focus(), { once: true });
  dialog.showModal();
}

function initTrialForm() {
  const form = document.querySelector('[data-trial-form]');
  if (!form) return;

  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('[type="submit"]');
  const website = form.querySelector('#website');
  const fields = [...form.querySelectorAll('input, select, textarea')]
    .filter((field) => field.name !== 'website_confirm');

  fields.forEach((field) => {
    field.addEventListener('blur', () => {
      if (field === website) normalizeWebsiteField(field);
      validateTrialField(field);
    });
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateTrialField(field);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    normalizeWebsiteField(website);
    const valid = fields.map(validateTrialField).every(Boolean);
    if (!valid) {
      fields.find((field) => field.getAttribute('aria-invalid') === 'true')?.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending request...';
    status.className = 'form-status';
    status.textContent = '';

    const data = Object.fromEntries(new FormData(form).entries());
    data.consent = data.consent === 'on';

    let succeeded = false;
    try {
      const response = await fetch('/api/trial-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to submit the request.');

      form.reset();
      succeeded = true;
      showConfirmationDialog(submit);
    } catch (error) {
      status.className = 'form-status error visible';
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
      submit.textContent = 'Start Your Free Trial';
      if (!succeeded) status.focus();
    }
  });
}

function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('[type="submit"]');
  const defaultSubmitLabel = submit.textContent;
  const fields = [...form.querySelectorAll('input, textarea')]
    .filter((field) => field.name !== 'website_confirm');

  fields.forEach((field) => {
    field.addEventListener('blur', () => validateTrialField(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateTrialField(field);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const valid = fields.map(validateTrialField).every(Boolean);
    if (!valid) {
      fields.find((field) => field.getAttribute('aria-invalid') === 'true')?.focus();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Sending message...';
    status.className = 'form-status';
    status.textContent = '';
    let succeeded = false;

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const response = await fetch('/api/contact-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Unable to send your message.');

      form.reset();
      succeeded = true;
      showConfirmationDialog(submit);
    } catch (error) {
      status.className = 'form-status error visible';
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
      submit.textContent = defaultSubmitLabel;
      if (!succeeded) status.focus();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initStoryTabs();
  initFilters();
  initPricingEstimator();
  initCycleSteps();
  initTrialForm();
  initContactForm();
});

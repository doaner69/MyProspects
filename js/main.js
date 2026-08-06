const NAV_HTML = `
  <div class="container">
    <div class="nav-inner">
      <a href="/index.html" class="brand-wordmark" aria-label="MyProspects home">
        <img src="assets/images/myprospects-logo.png" alt="MyProspects">
      </a>
      <ul class="nav-links">
        <li class="nav-dropdown">
          <button class="nav-dropdown-trigger" type="button" aria-expanded="false">Solutions <span aria-hidden="true">⌄</span></button>
          <div class="nav-dropdown-menu">
            <a href="/solutions/b2b.html">B2B Sales &amp; Marketing</a>
            <a href="/solutions/recruitment.html">Recruitment</a>
            <a href="/solutions/b2c.html">B2C Products &amp; Services</a>
            <a href="/solutions/nonprofit.html">Nonprofit</a>
          </div>
        </li>
        <li><a href="/product.html">Product</a></li>
        <li><a href="/pricing.html">Pricing</a></li>
        <li><a href="/about.html">About</a></li>
        <li class="nav-dropdown">
          <button class="nav-dropdown-trigger" type="button" aria-expanded="false">Resources <span aria-hidden="true">⌄</span></button>
          <div class="nav-dropdown-menu">
            <a href="/blog.html">Resource Hub</a>
            <a href="/case-studies.html">Outcome Playbooks</a>
            <a href="/use-cases.html">Use Cases</a>
          </div>
        </li>
      </ul>
      <div class="nav-actions">
        <a href="https://app.localsphere.com" class="btn nav-login">Log In</a>
        <a href="/trial.html" class="btn btn-primary nav-cta">Start Your Free Trial</a>
      </div>
      <button class="nav-mobile-toggle" type="button" aria-label="Open menu" aria-expanded="false"
        aria-controls="mobile-site-menu" data-mobile-toggle>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
    </div>
    <div class="mobile-menu" id="mobile-site-menu" aria-hidden="true" data-mobile-menu>
      <a href="/solutions/b2b.html">B2B Sales &amp; Marketing</a>
      <a href="/solutions/recruitment.html">Recruitment</a>
      <a href="/solutions/b2c.html">B2C Products &amp; Services</a>
      <a href="/solutions/nonprofit.html">Nonprofit</a>
      <a href="/product.html">Product</a>
      <a href="/pricing.html">Pricing</a>
      <a href="/about.html">About</a>
      <a href="/contact.html">Contact</a>
      <a href="/blog.html">Resource Hub</a>
      <a href="/case-studies.html">Outcome Playbooks</a>
      <a href="/use-cases.html">Use Cases</a>
      <a href="https://app.localsphere.com">Log In</a>
      <a href="/trial.html">Start Your Free Trial</a>
    </div>
  </div>
`;

const FOOTER_HTML = `
  <div class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="/index.html" class="brand-wordmark footer-logo" aria-label="MyProspects home">
            <img src="assets/images/myprospects-logo.png" alt="MyProspects">
          </a>
          <p style="margin-top:16px;max-width:320px;">Person-level visitor identity resolution and buyer intent data for B2B, B2C, recruitment, and nonprofit teams.</p>
          <div class="footer-badges">
            <span class="badge">Person-level identity</span>
            <span class="badge">Privacy-first activation</span>
          </div>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><a href="/product.html#identity-graph">Identity Resolution</a></li>
            <li><a href="/product.html#identity-graph">Intent Intelligence</a></li>
            <li><a href="/product.html#capabilities">Audience Activation</a></li>
            <li><a href="/product.html#implementation">Implementation</a></li>
            <li><a href="/pricing.html">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4>Solutions</h4>
          <ul>
            <li><a href="/solutions/b2b.html">B2B Sales &amp; Marketing</a></li>
            <li><a href="/solutions/recruitment.html">Recruitment</a></li>
            <li><a href="/solutions/b2c.html">B2C Products &amp; Services</a></li>
            <li><a href="/solutions/nonprofit.html">Nonprofit</a></li>
          </ul>
        </div>
        <div>
          <h4>Resources</h4>
          <ul>
            <li><a href="/blog.html">Resource Hub</a></li>
            <li><a href="/case-studies.html">Outcome Playbooks</a></li>
            <li><a href="/use-cases.html">Use Cases</a></li>
            <li><a href="/trial.html">Start Your Free Trial</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="/about.html">About</a></li>
            <li><a href="/contact.html">Contact</a></li>
            <li><a href="/privacy-policy.html">Privacy Policy</a></li>
            <li><a href="/terms-of-service.html">Terms of Service</a></li>
            <li><a href="https://linkedin.com/company/myprospects" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Local Sphere. All rights reserved.</span>
        <span>A Local Sphere product</span>
      </div>
    </div>
  </div>
`;

function getPathPrefix() {
  return /\/(solutions|resources)\//.test(window.location.pathname) ? '..' : '';
}

function fixPaths(html, prefix) {
  if (!prefix) return html;
  return html
    .replace(/href="\//g, `href="${prefix}/`)
    .replace(/src="assets\//g, `src="${prefix}/assets/`);
}

function injectSharedChrome() {
  const prefix = getPathPrefix();
  const nav = document.getElementById('site-nav');
  const footer = document.getElementById('site-footer');
  if (nav) nav.innerHTML = fixPaths(NAV_HTML, prefix);
  if (footer) footer.innerHTML = fixPaths(FOOTER_HTML, prefix);

  const currentPath = window.location.pathname.replace(/\/$/, '') || '/index.html';
  nav?.querySelectorAll('a[href]').forEach((link) => {
    const linkPath = new URL(link.href, window.location.href).pathname.replace(/\/$/, '');
    if (linkPath === currentPath) link.setAttribute('aria-current', 'page');
  });
}

function initNav() {
  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('[data-mobile-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (!nav) return;

  const setScrolled = () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  };

  setScrolled();
  window.addEventListener('scroll', setScrolled, { passive: true });

  if (toggle && menu) {
    const menuLinks = [...menu.querySelectorAll('a')];

    const setMenuState = (isOpen, restoreFocus = false) => {
      menu.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', String(!isOpen));
      document.body.classList.toggle('mobile-menu-open', isOpen);
      if (isOpen) {
        requestAnimationFrame(() => menuLinks[0]?.focus());
      } else if (restoreFocus) {
        toggle.focus();
      }
    };

    toggle.addEventListener('click', () => {
      setMenuState(!menu.classList.contains('open'));
    });

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        setMenuState(false);
      }
    });

    document.addEventListener('click', (event) => {
      if (menu.classList.contains('open') && !menu.contains(event.target) && !toggle.contains(event.target)) {
        setMenuState(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!menu.classList.contains('open')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuState(false, true);
        return;
      }

      if (event.key !== 'Tab' || !menuLinks.length) return;
      const first = menuLinks[0];
      const last = menuLinks[menuLinks.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => {
      if (event.matches) setMenuState(false);
    });
  }
}

function initFadeIn() {
  const items = document.querySelectorAll('[data-fade]');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px 10% 0px', threshold: 0.08 });

  items.forEach((item) => observer.observe(item));
}

function initSolutionTabs() {
  const tabs = document.querySelectorAll('[data-solution-tab]');
  if (!tabs.length) return;

  const panels = document.querySelectorAll('[data-solution-panel]');

  const activateTab = (tab, moveFocus = false) => {
    const id = tab.dataset.solutionTab;
    tabs.forEach((candidate) => {
      const active = candidate === tab;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-selected', String(active));
      candidate.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.dataset.solutionPanel === id;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
    if (moveFocus) tab.focus();
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activateTab(tab);
    });

    tab.addEventListener('keydown', (event) => {
      const currentIndex = [...tabs].indexOf(tab);
      let nextIndex = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabs.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      activateTab(tabs[nextIndex], true);
    });
  });
}

function initWorkflowStory() {
  const flow = document.querySelector('[data-workflow-story]');
  if (!flow) return;

  const steps = [...flow.querySelectorAll('.workflow-step')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let activeIndex = 0;
  let timer = null;
  let isVisible = false;

  const render = (index) => {
    activeIndex = index;
    steps.forEach((step, stepIndex) => {
      step.classList.toggle('is-active', stepIndex === index);
      step.classList.toggle('is-complete', stepIndex < index);
    });
    flow.style.setProperty('--workflow-progress', `${8 + (index * 18)}%`);
  };

  const stop = () => {
    window.clearInterval(timer);
    timer = null;
  };

  const start = () => {
    if (reduceMotion || timer || !isVisible) return;
    timer = window.setInterval(() => render((activeIndex + 1) % steps.length), 1700);
  };

  if (reduceMotion) {
    steps.forEach((step) => step.classList.add('is-complete'));
    flow.style.setProperty('--workflow-progress', '80%');
    return;
  }

  render(0);
  const observer = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) start();
    else stop();
  }, { threshold: 0.3 });

  observer.observe(flow);
  flow.addEventListener('mouseenter', stop);
  flow.addEventListener('mouseleave', start);
}

function initLegacyTabs() {
  document.querySelectorAll('[data-tabs-container]').forEach((container) => {
    const tabs = container.querySelectorAll('[data-tab]');
    const panels = container.querySelectorAll('[data-tab-panel]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach((candidate) => candidate.classList.toggle('active', candidate === tab));
        panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.tabPanel === target));
      });
    });
  });
}

function initAccordions() {
  document.querySelectorAll('.accordion-item').forEach((item, index) => {
    const button = item.querySelector('.accordion-btn');
    const body = item.querySelector('.accordion-body');
    if (!button || !body) return;

    const bodyId = body.id || `accordion-panel-${index + 1}`;
    body.id = bodyId;
    button.setAttribute('aria-controls', bodyId);
    button.setAttribute('aria-expanded', 'false');

    button.addEventListener('click', () => {
      const isOpen = item.classList.toggle('open');
      button.setAttribute('aria-expanded', String(isOpen));
      body.style.maxHeight = isOpen ? `${body.scrollHeight}px` : '0px';
    });
  });
}

function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;

  const animate = (counter) => {
    const target = Number(counter.dataset.target);
    if (!Number.isFinite(target)) return;

    const prefix = counter.dataset.prefix || '';
    const suffix = counter.dataset.suffix || '';
    const decimals = String(counter.dataset.target).includes('.') ? 1 : 0;
    const start = performance.now();
    const duration = 900;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      counter.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach((counter) => observer.observe(counter));
}

document.addEventListener('DOMContentLoaded', () => {
  injectSharedChrome();
  initNav();
  initFadeIn();
  initSolutionTabs();
  initWorkflowStory();
  initLegacyTabs();
  initAccordions();
  initCounters();
});

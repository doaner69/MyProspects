function initCurrentNav() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  const normalizePath = (path) => path.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const currentUrl = new URL(window.location.href);
  const currentPath = normalizePath(currentUrl.pathname);
  nav.querySelectorAll('a[href]').forEach((link) => {
    const url = new URL(link.href, currentUrl);
    if (url.origin === currentUrl.origin && normalizePath(url.pathname) === currentPath) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function initNav() {
  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('[data-mobile-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  const disclosure = document.querySelector('[data-mobile-navigation]');
  if (!nav) return;

  const setScrolled = () => {
    nav.classList.toggle('scrolled', window.scrollY > 8);
  };

  setScrolled();
  window.addEventListener('scroll', setScrolled, { passive: true });

  if (toggle && menu && disclosure) {
    const menuLinks = [...menu.querySelectorAll('a')];

    const setMenuState = (isOpen, restoreFocus = false) => {
      disclosure.open = isOpen;
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

    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      setMenuState(!disclosure.open);
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

    // Preserve a native disclosure opened before enhancement finished loading.
    setMenuState(disclosure.open);
  }
}

function initFadeIn() {
  const items = document.querySelectorAll('[data-fade]');
  if (!items.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

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

  if (reduceMotion || !('IntersectionObserver' in window)) {
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
  initCurrentNav();
  initNav();
  initFadeIn();
  initSolutionTabs();
  initWorkflowStory();
  initLegacyTabs();
  initAccordions();
  initCounters();
});

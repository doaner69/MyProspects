function initDemoPersonas() {
  const buttons = [...document.querySelectorAll('[data-demo-persona-tab]')];
  const panels = [...document.querySelectorAll('[data-demo-persona]')];
  if (!buttons.length || !panels.length) return;

  const activate = (button) => {
    const target = button.dataset.demoPersonaTab;
    buttons.forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-selected', String(active));
      candidate.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.demoPersona === target));
  };

  buttons.forEach((button, index) => {
    button.addEventListener('click', () => activate(button));
    button.addEventListener('keydown', (event) => {
      let next = null;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
      if (next === null) return;
      event.preventDefault();
      activate(buttons[next]);
      buttons[next].focus();
    });
  });
}

function initVisitorRows() {
  document.querySelectorAll('[data-visitor-explorer]').forEach((explorer) => {
    const rows = [...explorer.querySelectorAll('[data-visitor-row]')];
    const drawers = [...explorer.querySelectorAll('[data-visitor-drawer]')];
    rows.forEach((row) => {
      row.addEventListener('click', () => {
        const target = row.dataset.visitorRow;
        rows.forEach((candidate) => {
          const active = candidate === row;
          candidate.classList.toggle('active', active);
          candidate.setAttribute('aria-expanded', String(active));
        });
        drawers.forEach((drawer) => drawer.classList.toggle('active', drawer.dataset.visitorDrawer === target));
      });
    });
  });
}

function initChannels() {
  const channels = [...document.querySelectorAll('[data-channel-toggle]')];
  const status = document.querySelector('[data-sync-status]');
  if (!channels.length || !status) return;

  const render = () => {
    const active = channels.filter((channel) => channel.classList.contains('active')).length;
    status.textContent = active
      ? `${active} activation channel${active === 1 ? '' : 's'} selected and ready to sync.`
      : 'Select at least one activation channel.';
  };

  channels.forEach((channel) => {
    channel.addEventListener('click', () => {
      const active = channel.classList.toggle('active');
      channel.setAttribute('aria-pressed', String(active));
      render();
    });
  });
  render();
}

function initDemoRail() {
  const links = [...document.querySelectorAll('[data-demo-step-link]')];
  const sections = links
    .map((link) => document.getElementById(link.dataset.demoStepLink))
    .filter(Boolean);
  if (!links.length || !sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    links.forEach((link) => link.classList.toggle('active', link.dataset.demoStepLink === visible.target.id));
  }, { rootMargin: '-25% 0px -55%', threshold: [0.1, 0.35, 0.6] });

  sections.forEach((section) => observer.observe(section));
}

function initMeters() {
  const meters = [...document.querySelectorAll('[data-meter]')];
  if (!meters.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.style.setProperty('--meter', `${entry.target.dataset.meter}%`);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.4 });

  meters.forEach((meter) => {
    if (reduceMotion) meter.style.setProperty('--meter', `${meter.dataset.meter}%`);
    else observer.observe(meter);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDemoPersonas();
  initVisitorRows();
  initChannels();
  initDemoRail();
  initMeters();
});

// ============================================
// SHARED COMPONENTS
// ============================================

const NAV_HTML = `
<div class="container">
  <div class="nav-inner">
    <a href="/index.html" class="nav-logo">
      <img src="/assets/images/myprospects-logo-2.png" alt="MyProspects" class="nav-logo-img">
    </a>
    <ul class="nav-links">
      <li class="nav-dropdown">
        <a href="#" style="display:flex;align-items:center;gap:0.375rem;">
          Solutions
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="opacity:0.5">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <div class="nav-dropdown-menu">
          <a href="/solutions/b2b.html">B2B Sales & Marketing</a>
          <a href="/solutions/recruitment.html">Recruitment</a>
          <a href="/solutions/b2c.html">B2C & Consumer</a>
          <a href="/solutions/nonprofit.html">Nonprofit</a>
        </div>
      </li>
      <li><a href="/product.html">Product</a></li>
      <li><a href="/pricing.html">Pricing</a></li>
      <li><a href="/about.html">About</a></li>
      <li class="nav-dropdown">
        <a href="#" style="display:flex;align-items:center;gap:0.375rem;">
          Resources
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="opacity:0.5">
            <path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <div class="nav-dropdown-menu">
          <a href="/blog.html">Blog</a>
          <a href="/case-studies.html">Case Studies</a>
          <a href="/use-cases.html">Use Cases</a>
        </div>
      </li>
    </ul>
    <a href="/demo.html" class="btn btn-primary nav-cta" style="font-size:0.875rem;padding:0.625rem 1.25rem;">Book a Demo</a>
    <button class="nav-mobile-toggle" id="mobile-toggle" aria-label="Open menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
  <!-- Mobile menu -->
  <div id="mobile-menu" style="display:none;padding:1rem 0;">
    <a href="/solutions/b2b.html" style="display:block;padding:0.75rem 0;color:var(--text-muted);font-weight:500;border-bottom:1px solid var(--border-dark);">B2B Sales & Marketing</a>
    <a href="/solutions/recruitment.html" style="display:block;padding:0.75rem 0;color:var(--text-muted);font-weight:500;border-bottom:1px solid var(--border-dark);">Recruitment</a>
    <a href="/solutions/b2c.html" style="display:block;padding:0.75rem 0;color:var(--text-muted);font-weight:500;border-bottom:1px solid var(--border-dark);">B2C & Consumer</a>
    <a href="/solutions/nonprofit.html" style="display:block;padding:0.75rem 0;color:var(--text-muted);font-weight:500;border-bottom:1px solid var(--border-dark);">Nonprofit</a>
    <a href="/product.html" style="display:block;padding:0.75rem 0;color:var(--text-muted);font-weight:500;border-bottom:1px solid var(--border-dark);">Product</a>
    <a href="/pricing.html" style="display:block;padding:0.75rem 0;color:var(--text-muted);font-weight:500;border-bottom:1px solid var(--border-dark);">Pricing</a>
    <a href="/about.html" style="display:block;padding:0.75rem 0;color:var(--text-muted);font-weight:500;border-bottom:1px solid var(--border-dark);">About</a>
    <a href="/blog.html" style="display:block;padding:0.75rem 0;color:var(--text-muted);font-weight:500;border-bottom:1px solid var(--border-dark);">Blog</a>
    <a href="/case-studies.html" style="display:block;padding:0.75rem 0;color:var(--text-muted);font-weight:500;border-bottom:1px solid var(--border-dark);">Case Studies</a>
    <a href="/use-cases.html" style="display:block;padding:0.75rem 0;color:var(--text-muted);font-weight:500;border-bottom:1px solid var(--border-dark);">Use Cases</a>
    <a href="/demo.html" class="btn btn-primary" style="margin-top:1rem;width:100%;justify-content:center;">Book a Demo</a>
  </div>
</div>
`;

const FOOTER_HTML = `
<div class="container">
  <div class="footer-grid">
    <div class="footer-col">
      <div class="nav-logo" style="margin-bottom:0.75rem;">
        <img src="/assets/images/myprospects-logo-2.png" alt="MyProspects" class="nav-logo-img">
      </div>
      <p style="font-size:0.9375rem;color:var(--text-muted);max-width:280px;line-height:1.65;">
        Person-level visitor identity resolution and buyer intent data — for B2B, B2C, Recruitment, and Nonprofit.
      </p>
      <div class="footer-badges">
        <span class="badge">SOC2 Type II</span>
        <span class="badge">GDPR</span>
        <span class="badge">CCPA</span>
        <span class="badge">IAB TCF</span>
      </div>
    </div>
    <div class="footer-col">
      <h4>Product</h4>
      <ul>
        <li><a href="/product.html">Identity Resolution</a></li>
        <li><a href="/product.html#intent">Intent Intelligence</a></li>
        <li><a href="/product.html#ads">Ad Serving</a></li>
        <li><a href="/product.html#journey">Buyer's Journey</a></li>
        <li><a href="/pricing.html">Pricing</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Solutions</h4>
      <ul>
        <li><a href="/solutions/b2b.html">B2B Sales & Marketing</a></li>
        <li><a href="/solutions/recruitment.html">Recruitment</a></li>
        <li><a href="/solutions/b2c.html">B2C & Consumer</a></li>
        <li><a href="/solutions/nonprofit.html">Nonprofit</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Company</h4>
      <ul>
        <li><a href="/about.html">About</a></li>
        <li><a href="/blog.html">Blog</a></li>
        <li><a href="/case-studies.html">Case Studies</a></li>
        <li><a href="/demo.html">Book a Demo</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Legal</h4>
      <ul>
        <li><a href="/privacy-policy.html">Privacy Policy</a></li>
        <li><a href="/terms-of-service.html">Terms of Service</a></li>
      </ul>
      <div style="margin-top:1.25rem;">
        <a href="https://linkedin.com/company/myprospects" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:0.5rem;color:var(--text-muted);font-size:0.875rem;font-weight:500;transition:color 0.2s;" onmouseover="this.style.color='var(--blue)'" onmouseout="this.style.color='var(--text-muted)'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          LinkedIn
        </a>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span>© 2026 Local Sphere. All rights reserved.</span>
    <div style="display:flex;gap:1.5rem;align-items:center;">
      <a href="/privacy-policy.html" style="color:var(--text-muted);font-size:0.8125rem;text-decoration:none;transition:color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='var(--text-muted)'">Privacy Policy</a>
      <a href="/terms-of-service.html" style="color:var(--text-muted);font-size:0.8125rem;text-decoration:none;transition:color 0.2s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='var(--text-muted)'">Terms of Service</a>
      <span style="color:var(--text-muted);font-size:0.8125rem;">A <strong style="color:var(--blue)">Local Sphere</strong> product</span>
    </div>
  </div>
</div>
`;

// ============================================
// PATH PREFIX DETECTION
// (solutions pages live one level deeper)
// ============================================

function getPathPrefix() {
  const path = window.location.pathname;
  return path.includes('/solutions/') ? '..' : '';
}

function fixPaths(html, prefix) {
  if (!prefix) return html;
  return html.replace(/href="\//g, `href="${prefix}/`).replace(/src="\//g, `src="${prefix}/`);
}

// ============================================
// COMPONENT INJECTION
// ============================================

function injectComponents() {
  const prefix = getPathPrefix();
  const nav = document.getElementById('site-nav');
  const footer = document.getElementById('site-footer');
  if (nav) nav.innerHTML = fixPaths(NAV_HTML, prefix);
  if (footer) footer.innerHTML = fixPaths(FOOTER_HTML, prefix);
}

// ============================================
// NAV SCROLL BEHAVIOR
// ============================================

function initNav() {
  const nav = document.getElementById('site-nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // Mobile toggle
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('mobile-menu');
    if (!menu) return;
    if (e.target.closest('#mobile-toggle')) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    } else if (!e.target.closest('#mobile-menu') && menu.style.display === 'block') {
      menu.style.display = 'none';
    }
  });
}

// ============================================
// ACTIVE NAV LINK HIGHLIGHTING
// ============================================

function highlightActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('#site-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    // Normalize href by stripping leading ../ or /
    const normalizedHref = href.replace(/^\.\.\//, '/');
    if (path.endsWith(normalizedHref) || (path.endsWith('/') && normalizedHref === '/index.html')) {
      link.style.color = 'var(--text-on-dark)';
    }
  });
}

// ============================================
// ANIMATED COUNTERS
// ============================================

function animateCounter(el) {
  const target = el.dataset.target;
  if (!target || isNaN(parseFloat(target))) return;
  const suffix = el.dataset.suffix || '';
  const prefix = el.dataset.prefix || '';
  const isFloat = target.includes('.');
  const numTarget = parseFloat(target);
  const duration = 2;

  const obj = { val: 0 };
  gsap.to(obj, {
    val: numTarget,
    duration,
    ease: 'power2.out',
    onUpdate: function() {
      el.textContent = prefix + (isFloat
        ? obj.val.toFixed(1)
        : Math.round(obj.val).toLocaleString()) + suffix;
    }
  });
}

function initCounters() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  document.querySelectorAll('[data-counter]').forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => animateCounter(el)
    });
  });
}

// ============================================
// TABS
// ============================================

function initTabs() {
  document.querySelectorAll('.tab-list').forEach(tabList => {
    const buttons = tabList.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.tab;
        const container = btn.closest('[data-tabs-container]') || document;

        // Deactivate all
        buttons.forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        // Activate clicked
        btn.classList.add('active');
        const panel = container.querySelector(`[data-tab-panel="${targetId}"]`);
        if (panel) panel.classList.add('active');
      });
    });
  });
}

// ============================================
// ACCORDION
// ============================================

function initAccordions() {
  document.querySelectorAll('.accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.accordion-item');
      const body = item.querySelector('.accordion-body');
      const inner = item.querySelector('.accordion-body-inner');
      const isOpen = item.classList.contains('open');

      // Close all in same accordion group
      const group = item.closest('.accordion-group');
      if (group) {
        group.querySelectorAll('.accordion-item.open').forEach(openItem => {
          if (openItem !== item) {
            openItem.classList.remove('open');
            openItem.querySelector('.accordion-body').style.maxHeight = '0';
          }
        });
      }

      if (isOpen) {
        item.classList.remove('open');
        body.style.maxHeight = '0';
      } else {
        if (!inner) return;
        item.classList.add('open');
        body.style.maxHeight = inner.scrollHeight + 32 + 'px';
      }
    });
  });
}

// ============================================
// SPOTLIGHT CARDS (cursor glow)
// ============================================

function initSpotlightCards() {
  document.querySelectorAll('.spotlight-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', x + '%');
      card.style.setProperty('--mouse-y', y + '%');
    });
  });
}

// ============================================
// GSAP FADE-IN ON SCROLL
// ============================================

function initScrollAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.utils.toArray('[data-fade]').forEach(el => {
    gsap.fromTo(el,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          once: true
        }
      }
    );
  });
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }
  injectComponents();
  initNav();
  highlightActiveNav();
  initCounters();
  initTabs();
  initAccordions();
  initSpotlightCards();
  initScrollAnimations();
});

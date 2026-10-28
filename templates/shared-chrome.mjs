export const NAV_HTML = `
  <div class="container">
    <div class="nav-inner">
      <a href="/" class="brand-wordmark" aria-label="MyProspects home">
        <img src="/assets/images/myprospects-logo.png" alt="MyProspects">
      </a>
      <ul class="nav-links">
        <li class="nav-dropdown">
          <button class="nav-dropdown-trigger" type="button" aria-expanded="false">Solutions <span aria-hidden="true">⌄</span></button>
          <div class="nav-dropdown-menu">
            <a href="/solutions/b2b">B2B Sales &amp; Marketing</a>
            <a href="/solutions/recruitment">Recruitment</a>
            <a href="/solutions/b2c">B2C Products &amp; Services</a>
            <a href="/solutions/nonprofit">Nonprofit</a>
          </div>
        </li>
        <li><a href="/product">Product</a></li>
        <li><a href="/pricing">Pricing</a></li>
        <li><a href="/about">About</a></li>
        <li class="nav-dropdown">
          <button class="nav-dropdown-trigger" type="button" aria-expanded="false">Resources <span aria-hidden="true">⌄</span></button>
          <div class="nav-dropdown-menu">
            <a href="/blog">Resource Hub</a>
            <a href="/case-studies">Outcome Playbooks</a>
            <a href="/use-cases">Use Cases</a>
          </div>
        </li>
      </ul>
      <div class="nav-actions">
        <a href="https://app.localsphere.com" class="btn nav-login">Log In</a>
        <a href="/trial" class="btn btn-primary nav-cta">Start Your Free Trial</a>
      </div>
    </div>
    <details class="mobile-navigation" data-mobile-navigation>
      <summary class="nav-mobile-toggle" aria-label="Menu" aria-controls="mobile-site-menu" data-mobile-toggle>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </summary>
    <div class="mobile-menu" id="mobile-site-menu" data-mobile-menu>
      <a href="/solutions/b2b">B2B Sales &amp; Marketing</a>
      <a href="/solutions/recruitment">Recruitment</a>
      <a href="/solutions/b2c">B2C Products &amp; Services</a>
      <a href="/solutions/nonprofit">Nonprofit</a>
      <a href="/product">Product</a>
      <a href="/pricing">Pricing</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
      <a href="/blog">Resource Hub</a>
      <a href="/case-studies">Outcome Playbooks</a>
      <a href="/use-cases">Use Cases</a>
      <a href="https://app.localsphere.com">Log In</a>
      <a href="/trial">Start Your Free Trial</a>
    </div>
    </details>
  </div>
`;

export const FOOTER_HTML = `
  <div class="footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <a href="/" class="brand-wordmark footer-logo" aria-label="MyProspects home">
            <img src="/assets/images/myprospects-logo.png" alt="MyProspects">
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
            <li><a href="/product#identity-graph">Identity Resolution</a></li>
            <li><a href="/product#identity-graph">Intent Intelligence</a></li>
            <li><a href="/product#capabilities">Audience Activation</a></li>
            <li><a href="/product#implementation">Implementation</a></li>
            <li><a href="/pricing">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4>Solutions</h4>
          <ul>
            <li><a href="/solutions/b2b">B2B Sales &amp; Marketing</a></li>
            <li><a href="/solutions/recruitment">Recruitment</a></li>
            <li><a href="/solutions/b2c">B2C Products &amp; Services</a></li>
            <li><a href="/solutions/nonprofit">Nonprofit</a></li>
          </ul>
        </div>
        <div>
          <h4>Resources</h4>
          <ul>
            <li><a href="/blog">Resource Hub</a></li>
            <li><a href="/case-studies">Outcome Playbooks</a></li>
            <li><a href="/use-cases">Use Cases</a></li>
            <li><a href="/trial">Start Your Free Trial</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
            <li><a href="/privacy-policy">Privacy Policy</a></li>
            <li><a href="/terms-of-service">Terms of Service</a></li>
            <li><a href="https://linkedin.com/company/myprospects" target="_blank" rel="noopener noreferrer">LinkedIn</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Local Sphere. All rights reserved.</span>
        <button type="button" class="tracking-choices-button" data-tracking-choices>Privacy choices</button>
        <span>A Local Sphere product</span>
      </div>
    </div>
  </div>
`;

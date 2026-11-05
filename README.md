# MyProspects Marketing Site

Static marketing site for MyProspects, a Local Sphere product. The site explains how teams can turn meaningful website and intent signals into responsible, governed actions across B2B sales and marketing, B2C products and services, recruitment, and nonprofit workflows.

## Current Positioning

- Primary message: **Know who's on your website. By name.**
- Primary CTA: **Start Your Free Trial**
- Secondary CTA: **See Pricing**
- Product story: observe, resolve, enrich, score, activate, and measure.
- Public copy intentionally avoids unverified competitor claims, testimonials, performance guarantees, and detailed compliance certifications.

## Run Locally

```bash
npm install
npm run dev
```

The site is static HTML, CSS, and JavaScript. The form endpoints are Vercel serverless functions and are available through Vercel Development or a compatible local environment.

## Static SEO and Navigation Maintenance

The production URL contract is `https://www.myprospects.com/` with extensionless paths and no trailing slash except `/`. Existing Vercel redirects are retained. Use final clean paths for internal links and keep meaningful fragments/query values, including `myprospects_opt_out=1`.

`seo/pages.json` is the explicit public-page inventory (`file`, `path`, `indexable`). Titles, descriptions and page copy remain authored in each HTML file. Do not add GTM tag payloads, APIs or local reports to the inventory.

```bash
npm run build:site
npm run check:site
npm test
```

- `build:site` runs both dependency-free Node generators. `build:chrome` populates the marked navigation/footer blocks in all public HTML from `templates/shared-chrome.mjs`. `build:seo` synchronizes self-canonicals, normalizes known internal page links and writes `sitemap.xml`, `robots.txt`, and `llms.txt`. It also generates page-specific Open Graph/Twitter metadata and connected Organization, Brand, WebSite, WebPage and breadcrumb JSON-LD from the authored titles/descriptions. Existing partial social tags are replaced to avoid duplicates. The shared logo is the social preview image; its actual PNG dimensions are declared.
- `check:site` checks generated output without changing files and fails if anything is stale. Commit the generated HTML/discovery files with their sources; this cycle does not add a deployment build step.
- Edit shared navigation in `templates/shared-chrome.mjs`, not its generated HTML blocks. JavaScript enhances existing markup; it does not inject the navigation/footer. The native mobile disclosure opens without JavaScript, stays collapsed during startup, and is enhanced with Escape/focus handling when scripts run. Main content stays visible without animation code.
- To add a public page, create its HTML with the existing consent/GTM bootstrap, unique title/description and one H1; register its file/path/indexability; retain the shared block markers or empty `site-nav`/`site-footer` containers; run `build:site` and all checks. Update the deliberate route contract in `tests/seo.mjs` when adding/removing a public route.
- The sitemap currently lists all 18 intended public pages, including contact/legal pages. No update dates are guessed. `robots.txt` adds only the sitemap declaration: existing unrestricted crawl access, including AI training bots, is unchanged. Any future bot-policy change requires an explicit decision.
- Shared CSS uses the `20261104-aeo` cache version; unchanged shared JavaScript retains `20261028-seo`. Bump the corresponding HTML asset references when changing shared assets. Inter and JetBrains Mono Latin variable fonts are served from `assets/fonts/` under their included SIL OFL licenses. `font-display: optional` avoids a late font swap; a slow first visit can use the system fallback. Do not reintroduce the blocking Google Fonts stylesheet.

Homepage originals remain under `assets/images/`. Committed responsive WebP candidates and their source hashes live in `assets/images/optimized/`. To regenerate them, use an **existing** Python environment with Pillow/WebP support:

```bash
python3 scripts/optimize-home-images.py
node tests/home-images.mjs
```

The Codex bundled Python runtime can run that script when system Python lacks Pillow; no dependency was added to this project. Do not upscale or crop the source artwork. Preserve the current `sizes`, truthful width descriptors, intrinsic aspect ratios, eager hero and lazy below-fold loading. Review native-size visuals when changing conversion settings. Byte-budget checks are not Core Web Vitals measurements.

## Lead Submissions

`trial.html` and `contact.html` validate their forms in the browser and post to `/api/trial-request` and `/api/contact-request` respectively.

Both endpoints accept a JSON object. Malformed JSON and non-object bodies (including `null`, arrays, numbers, booleans, and JSON string values) return HTTP 400 without attempting persistence or notifications. Missing/invalid fields retain the existing field-validation responses; valid submissions and honeypot behavior are unchanged.

- Validated submissions are inserted first into `public.myprospects_leads` in Neon. The two flows are distinguished by `submission_type` and the exact `source` values `myprospects-trial-page` and `myprospects-contact-page`.
- After persistence succeeds, the server sends a formatted Slack notification. Structured operational logs distinguish sent, skipped (missing webhook), and failed notifications without losing the saved lead or turning the form into an error. Server-generated request IDs are returned in `X-Request-Id` and correlate request, persistence and notification durations/outcomes. Diagnostics exclude submitted fields and raw errors; the existing Slack business notification content is unchanged.
- The idempotent schema is maintained in `db/001-create-myprospects-leads.sql` and is also ensured by the server function before its first insert.

### Required Vercel Environment Variables

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEON_DATABASE_URL` | Preview and Production, with environment-specific values | Preferred pooled Neon connection string. `DATABASE_URL`, `POSTGRES_URL`, and common Neon integration variants are also accepted. |
| `SLACK_WEBHOOK_URL_PREVIEW` | Preview only | Optional preview/test Slack Incoming Webhook. Preview never falls back to the production webhook. |
| `SLACK_WEBHOOK_URL` | Production only | Optional production Slack Incoming Webhook. |

Database configuration is required for successful form submission. Slack is optional and best-effort. All values must remain server-side in Vercel; never include them in HTML, browser JavaScript, committed files, or screenshots.

## Site Tracking

The tracking implementation includes Google Tag Manager container `GTM-K3S8PSJ9` on all 18 HTML pages, with the standard head script and a noscript iframe immediately after the opening body tag. Each page loads `/js/tracking-consent.js` synchronously before GTM and includes the shared consent stylesheet. When adding a page, include these assets and both GTM snippets.

The consent controller uses an opt-out model: analytics and visitor identification start enabled unless a saved opt-out or Global Privacy Control blocks them. The full-width bottom banner offers **Opt out** and **OK, got it** (acknowledgment). After an opt-out, reopening **Privacy choices** offers **Allow tracking** to explicitly reverse it. Existing v2 and legacy v1 rejections remain honored, even beyond their old expiry dates. Opt-outs persist until explicitly reversed or browser site data is cleared; acknowledgments expire after 180 days. The existing `myprospects-tracking-consent-v2` key (schema version `2`) is retained. If saving an opt-out fails, the controller uses session storage, then a `myprospects_opt_out=1` URL flag as a last resort, so withdrawal remains denied after refreshing. The URL fallback is carried through internal links when browser storage cannot remember the choice. Explicit allowance clears these fallback markers. If preferences cannot be read, tracking stays denied until explicitly allowed for that visit, so a storage-blocked reload cannot undo an opt-out. The GTM consent template starts denied as a bootstrap fallback, immediately subscribes to the controller's current state before page initialization, and always leaves Google advertising consent denied. The internal `identityTrackingEnabled = true` gate still requires the controller's allowed state and the production HTTPS host.

The old direct Analytics installation for `G-SQY7W3M8FR` is removed from the HTML. The new GA4 destination, `G-VH43PH567B` (property `559042859`), is configured only through the GTM package: one initialization per page load, additional `analytics_storage` consent required, and triggers restricted to exactly `https://www.myprospects.com`. Its `page_location` excludes query strings and fragments; `page_referrer` contains only the referrer origin. Google signals and advertising personalization signals are disabled.

`gtm/myprospects-container.json` is the maintained container package. Run `npm run build:gtm` after editing the canonical consent source (`gtm/myprospects-consent.js`), template (`gtm/myprospects-consent.tpl`), or pixel HTML (`gtm/myprospects-pixel.html`) to synchronize the embedded sources. Reconcile changes with the native GTM workspace before publication.

The identity pixel's intended coverage is all 18 pages by default on the production HTTPS host, except for saved opt-outs, GPC, or unreadable preferences, at `https://pixel.localsphere.com/pixels/f975a66e-59f3-4c58-988f-c5b1d9361f9b/p.js`, with `data-ga4-key="G-VH43PH567B"`, `data-consent-category="marketing"`, and `async`. The GA4 attribute reads IDs; it does not initialize GA4. The controller supplies the initial consent flag and propagates withdrawal to the SDK. Activation includes the approved Sitelytics and partner scope described below.

The approved scope includes website activity, names, emails, Contact messages, Trial notes, and copied text to Sitelytics at `api.sitelytics.tech` while tracking is enabled, including potentially confidential or sensitive content, plus partner browser/IP identifiers and site activity at `ce.lijit.com` and `pxdrop.lijit.com`. The bounded probe observed an image destination at the former and a script destination at the latter, with both loads blocked before execution. It did not establish copied-text or form-value transmission to partner endpoints. Current Contact and Trial forms have no dedicated password or payment credential fields; keep those fields excluded from tracking and retain the reviewed field-mask limits rather than assuming arbitrary sensitive text is masked.

The banner and privacy notice disclose default-on tracking, the recipients, and the opt-out controls. Retain the documented consent-required attribute, GPC, expiry, and controller withdrawal integration, and verify the complete vendor/partner flow. The reviewed build uses `FormData`; our GA4 configuration sends no form values, while downstream vendor forwarding remains unverified. On a transition from granted to denied, the controller updates SDK consent, listeners, the data layer, and expiry scheduling before refreshing the page if the matching SDK is loaded. This unloads independently running partner code; stored rejection, GPC, or unreadable preferences keep the refreshed page denied. Expiration only resurfaces an acknowledgment notice; it never expires an opt-out. SDK denial alone cannot stop an already-executed partner script. Withdrawal does not retract already-sent data or guarantee downstream behavior. Isolated tests do not establish deployed behavior.

The maintained package uses the native GTM schema and IDs from workspace `2`. Verify default-on startup, existing and new opt-outs, explicit re-enabling, GPC, storage failures, production host restrictions, a production page view, and ingestion in the new GA4 property when releasing tracking changes. Site deployment and GTM publication are separate release steps; local tests do not prove production collection or deployed vendor withdrawal behavior.

## Validation

```bash
npm test
```

This runs the six original suites (site smoke, consent controller, GTM package, lead submissions, trial API, contact API), plus SEO/discovery, social metadata/JSON-LD/LLM inventory, local font delivery, static navigation, navigation/failure behavior, responsive images, generator contracts, safe operational logging, trusted production-deployment selection, and deployment-checker regression tests against a local HTTP fixture server. The two read-only generation checks run last. These checks do not submit leads or contact external APIs.

Before release, also inspect representative desktop/mobile home, product, pricing, nested solution and guide pages. Verify normal and failed/disabled JavaScript, keyboard/mobile menu behavior, anchor navigation, GPC/opt-outs and the query fallback. Local browser diagnostics cannot establish production redirects, field Core Web Vitals, indexing, analytics ingestion or ranking gains. Publication remains a separate authorized step.

### Continuous integration

`.github/workflows/ci.yml` runs on pull requests, pushes to `main`, and manual dispatch. The job uses Node.js 24 (matching the production runtime), installs the lockfile with `npm ci`, then runs `npm test`, including the read-only generated-file checks. Actions are pinned to verified commits; repository permissions are read-only and checkout credentials are not persisted. No database, Slack, Vercel, or analytics secrets are required. The workflow does not deploy or regenerate committed output.

GitHub `main` protection now requires this exact test-job name from GitHub Actions, an up-to-date PR, and passing checks, including for administrators. Vercel also requires the job before promoting Production deployments. Keep the job name synchronized with both settings. See `ops/main-branch-protection.json` and [RELEASE-OPERATIONS.md](RELEASE-OPERATIONS.md) for the applied configuration, verification limits and recovery procedure.

### Read-only deployment verification

After a release, run the checker from the checkout that was deployed:

```bash
npm run check:deployment
npm run check:deployment -- --url https://www.myprospects.com
```

The default target is production. To check an accessible preview or local server, pass its HTTP(S) origin with `--url`; credentials, subpaths, queries and fragments are rejected. Canonical and structured-data URLs must still identify `https://www.myprospects.com` on previews. Production checks reject `noindex`/`none` in robots headers or metadata; preview/local checks permit those intentional indexing restrictions. Protected deployments report HTTP 401/403; the checker does not bypass authentication or accept secrets.

The checker uses only GET requests, at most four at a time, with a ten-second timeout covering each request/redirect chain and its response body. It checks the public-page inventory, self-canonicals, Open Graph URLs, connected JSON-LD, indexability headers/meta tags, shared stylesheet/script references, removal of obsolete Google Fonts dependencies, discovery files, local fonts and shared assets. Committed discovery/shared-asset bytes and MIME types must match. It also checks permanent extensionless/trailing-slash redirects and, on production, the apex-to-www redirect.

Failures are listed by path and produce a nonzero exit status. Compare against the deployed revision: newer local CSS, JavaScript or discovery files intentionally fail against an older deployment. The checker never submits forms, calls lead APIs, executes page scripts or writes data. It does not measure browser rendering, Core Web Vitals, tracking ingestion, database health or search indexing. It is deliberately separate from the CI job; `npm test` exercises its failure behavior using only a local fixture server. `.github/workflows/verify-production.yml` runs it automatically after a trusted successful Vercel Production deployment and supports manual dispatch on `main`. The workflow selects the active production commit from GitHub metadata, validates its main-branch ancestry, checks out that exact revision, and checks only the canonical production domain. Stale, failed, preview and untrusted events are skipped. Failures surface in the GitHub run and summary; no external notifications or automatic rollback are configured. The production path requires its control helper on `main` after merge; preview events can already exercise the guarded skip path on PR branches. Its first real production verification must still be checked.

## Business Decisions for the Next Content Cycle

Technical SEO does not approve new commercial or product claims. Before changing public copy, obtain these decisions and supporting evidence:

- **Trial:** duration and start event; eligibility; evaluation versus production scope; onboarding timing/fee; payment requirements; cancellation and paid conversion.
- **Pricing:** cross-device identity counting, resets, and overages/rollover. The approved monthly tiers use Monthly Unique Resolved Visitors; see SITE-REFERENCE.md.
- **Claims:** definitions, provenance, dates, denominator and publishing permission for 4.5B+ records, 35B daily signals, 50%+ resolution and 24–48h setup. Separate graph scale, match coverage and accuracy.
- **Capabilities:** supported countries/traffic/fields, confidence and refresh limitations, native/export/custom integrations, and customer versus vendor responsibilities.
- **Trust/editorial:** approved security/privacy wording and concrete controls, real expert/reviewer identities, actual article dates, and permission/evidence for customer proof. Legal language needs its own review.

Keep illustrative playbooks labeled. The implemented structured data uses only existing organization/brand relationships and page metadata. Commercial rewrites, expanded editorial content and conversion instrumentation remain later tasks; their facts and any API/tracking/publication changes need separate review.

See [SITE-REFERENCE.md](SITE-REFERENCE.md) for the current route map, pricing presentation, content standards, and maintenance notes.

See [SEO-AEO-AUDIT.md](SEO-AEO-AUDIT.md) for the November 4 audit diagnosis, implemented scope, verification, and publication follow-up. `llms.txt` is a supplementary discovery proposal, not a ranking guarantee or crawler access policy.

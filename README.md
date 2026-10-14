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

## Lead Submissions

`trial.html` and `contact.html` validate their forms in the browser and post to `/api/trial-request` and `/api/contact-request` respectively.

- Validated submissions are inserted first into `public.myprospects_leads` in Neon. The two flows are distinguished by `submission_type` and the exact `source` values `myprospects-trial-page` and `myprospects-contact-page`.
- After persistence succeeds, the server sends a formatted Slack notification. A missing or failing Slack webhook is logged but does not lose the saved lead or turn the form into an error.
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

The consent controller keeps optional tracking denied until an explicit acceptance or a valid stored acceptance. Accept/reject choices are stored for 180 days under `myprospects-tracking-consent-v2` (schema version `2`) and authorize analytics and visitor identification. Version `1` analytics-only choices are ignored, requiring renewed consent to the expanded notice. The shared footer's **Privacy choices** button lets visitors withdraw consent; expiry and page resume also refresh the applied decision. Global Privacy Control keeps optional tracking denied even with a stored acceptance. The GTM consent template defaults analytics and advertising consent to denied, updates analytics consent from the controller, and always leaves advertising consent denied. The internal `identityTrackingEnabled = true` gate still requires consent and the production HTTPS host.

The old direct Analytics installation for `G-SQY7W3M8FR` is removed from the HTML. The new GA4 destination, `G-VH43PH567B` (property `559042859`), is configured only through the GTM package: one initialization per page load, additional `analytics_storage` consent required, and triggers restricted to exactly `https://www.myprospects.com`. Its `page_location` excludes query strings and fragments; `page_referrer` contains only the referrer origin. Google signals and advertising personalization signals are disabled.

`gtm/myprospects-container.json` is the maintained container package. Run `npm run build:gtm` after editing the canonical consent source (`gtm/myprospects-consent.js`), template (`gtm/myprospects-consent.tpl`), or pixel HTML (`gtm/myprospects-pixel.html`) to synchronize the embedded sources. Reconcile changes with the native GTM workspace before publication.

The identity pixel's intended coverage is all 18 pages after renewed opt-in on the production HTTPS host, at `https://pixel.localsphere.com/pixels/f975a66e-59f3-4c58-988f-c5b1d9361f9b/p.js`, with `data-ga4-key="G-VH43PH567B"`, `data-consent-category="marketing"`, and `async`. The GA4 attribute reads IDs; it does not initialize GA4. The controller supplies the initial consent flag and propagates withdrawal to the SDK. Activation includes the approved Sitelytics and partner scope described below.

The approved scope includes website activity, names, emails, Contact messages, Trial notes, and copied text to Sitelytics at `api.sitelytics.tech` after opt-in, including potentially confidential or sensitive content, plus partner browser/IP identifiers and site activity at `ce.lijit.com` and `pxdrop.lijit.com`. The bounded probe observed an image destination at the former and a script destination at the latter, with both loads blocked before execution. It did not establish copied-text or form-value transmission to partner endpoints. Current Contact and Trial forms have no dedicated password or payment credential fields; keep those fields excluded from tracking and retain the reviewed field-mask limits rather than assuming arbitrary sensitive text is masked.

The v2 banner and privacy notice disclose the expanded recipients and require renewed visitor consent. Retain the documented consent-required attribute, GPC, expiry, and controller withdrawal integration, and verify the complete vendor/partner flow. The reviewed build uses `FormData`; our GA4 configuration sends no form values, while downstream vendor forwarding remains unverified. On a transition from granted to denied, the controller updates SDK consent, listeners, the data layer, and expiry scheduling before refreshing the page if the matching SDK is loaded. This unloads independently running partner code; stored rejection, expired consent, or GPC keeps the refreshed page denied. SDK denial alone cannot stop an already-executed partner script. Withdrawal does not retract already-sent data or guarantee downstream behavior. Isolated tests do not establish deployed behavior.

The maintained package uses the native GTM schema and IDs from workspace `2`. Verify consent denial, acceptance, withdrawal, GPC, production host restrictions, a production page view, and ingestion in the new GA4 property when releasing tracking changes. Site deployment and GTM publication are separate release steps; local tests do not prove production collection or deployed vendor withdrawal behavior.

## Validation

```bash
npm test
```

This runs six suites covering the site smoke checks, consent controller, GTM package, lead submissions, trial API, and contact API.

See [SITE-REFERENCE.md](SITE-REFERENCE.md) for the current route map, pricing presentation, content standards, and maintenance notes.

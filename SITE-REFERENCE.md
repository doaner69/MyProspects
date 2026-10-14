# MyProspects Current Build Reference

Updated: July 2026

This file is the source of truth for the live site's public structure and messaging. It complements the internal GTM and pricing strategy documents; internal forecasts, competitive analysis, and legacy package assumptions are not automatically approved as public website copy.

## Core Narrative

MyProspects helps teams recognize meaningful interest across their website, the open web, and real-world locations. The public product narrative follows this operating model:

1. Observe meaningful website behavior.
2. Resolve identity where approved and appropriate.
3. Enrich profiles with useful context.
4. Score fit, intent, recency, and engagement transparently.
5. Activate one governed next action.
6. Measure delivery, execution, and progression.

Every explanation should keep consent, suppression, frequency, and responsible activation visible. Avoid language that implies an individual is being watched or that a signal proves buying intent.

## Conversion System

| Priority | Copy | Destination |
| --- | --- | --- |
| Primary | Start Your Free Trial | `/trial.html` |
| Secondary | See Pricing | `/pricing.html` |
| Expert conversation | Talk to an Expert | `/contact.html` |

The free-trial flow collects contact details, company, website, use case, traffic range, notes, and consent. It evaluates fit, signal quality, and workflow design; it is not described as a complete production implementation.

## Route Map

| Area | Routes |
| --- | --- |
| Platform | `/product.html`, `/pricing.html`, `/about.html` |
| Solutions | `/solutions/b2b.html`, `/solutions/b2c.html`, `/solutions/recruitment.html`, `/solutions/nonprofit.html` |
| Practical workflows | `/use-cases.html`, `/case-studies.html` |
| Resources | `/blog.html`, `/resources/anonymous-traffic-to-named-pipeline.html`, `/resources/on-domain-and-off-domain-intent.html`, `/resources/activating-known-audiences.html` |
| Conversion and legal | `/trial.html`, `/contact.html`, `/privacy-policy.html`, `/terms-of-service.html`, `/ccpa.html` |

`case-studies.html` uses illustrative outcome playbooks until approved customer proof is available. Legal body copy is intentionally preserved and should receive separate legal review.

## Approved Solution Language

| Segment | Public label | Core outcome |
| --- | --- | --- |
| B2B | B2B sales and marketing | Turn quiet research into named pipeline. |
| B2C | B2C products and services | Recognize interest and reconnect the journey. |
| Recruitment | Recruitment | Discover interest before the application. |
| Nonprofit | Nonprofit | Turn mission interest into relevant supporter engagement. |

## Pricing Presentation

| Plan | Price | Resolved visitor capacity | Public framing |
| --- | ---: | ---: | --- |
| Launch | $2,000/month | Up to 1,000 monthly | Website identity |
| Growth | $3,500/month | Up to 3,000 monthly | Identity and intent |
| Scale | $5,000/month | Up to 7,500 monthly | Coordinated activation |
| Enterprise | Custom | Custom | Identity graph configuration |

- Plans are presented as month-to-month.
- Standard onboarding is $2,000 and covers pixel setup, routing, and launch support.
- Annual billing offers a 15% discount once the platform is proven in the workflow.
- Intent, premium activation destinations, and custom integrations are scoped separately; do not add public pricing for modules unless it has current commercial approval.

## Build Architecture

- Shared navigation and footer: `js/main.js`
- Shared page interaction and trial validation: `js/subpages.js`
- Homepage style system: `css/styles.css`
- Subpage and resource styles: `css/subpages.css`
- Trial request API: `api/trial-request.js`
- Contact request API: `api/contact-request.js`
- Shared persistence and Slack notification pipeline: `api/_lead-submissions.js`
- Lead schema: `db/001-create-myprospects-leads.sql`
- Generated visual assets: `assets/images/subpages/`

Use native browser capabilities, CSS transitions, and `IntersectionObserver` for motion. Preserve keyboard access, visible focus, responsive layouts, and `prefers-reduced-motion` support.

Both forms must persist a validated row to Neon before reporting success. Slack notifications run only after persistence and are best-effort. Preview uses only `SLACK_WEBHOOK_URL_PREVIEW`; production uses only `SLACK_WEBHOOK_URL`. Database and Slack credentials must remain server-side Vercel environment variables.

### Tracking Architecture (October 14, 2026)

All 18 HTML pages load `js/tracking-consent.js` synchronously before the standard `GTM-K3S8PSJ9` head script and include its body noscript fallback and `css/tracking-consent.css`. The controller stores choices for 180 days, defaults optional tracking to denied, honors Global Privacy Control, and provides withdrawal through the shared footer's **Privacy choices** button.

The maintained GTM package is `gtm/myprospects-container.json`; `npm run build:gtm` synchronizes the canonical consent JS/template and pixel HTML. GA4 `G-VH43PH567B` is initialized only through that package, once per page load, with analytics consent required and an exact production HTTPS host gate. The old direct `G-SQY7W3M8FR` installation is removed from the HTML. Page-location query strings/fragments are excluded, referrer values are reduced to origins, and advertising consent/signals remain disabled.

The approved opt-in scope includes Google Analytics and visitor identification across all 18 pages on the production HTTPS host. The controller's `identityTrackingEnabled = true` gate still requires consent. Sitelytics at `api.sitelytics.tech` receives activity, names, emails, Contact messages, Trial notes and copied text; partner tracking at `ce.lijit.com` and `pxdrop.lijit.com` may receive browser/IP identifiers and site activity. A bounded probe observed image/script destinations respectively but blocked both loads; it did not establish copied-text or form-value transmission to the partners. The banner identifies both purposes and links the complete recipient notice.

The expanded notice uses `myprospects-tracking-consent-v2` (schema version `2`), requiring visitors to choose again; version `1` analytics-only choices are ignored. Retain GPC, expiry, persistent withdrawal, and the vendor consent-required attribute. When applied consent changes from granted to denied, the controller first updates SDK consent, subscribers, the data layer, and expiry scheduling, then refreshes if the matching pixel SDK is loaded. The refresh unloads independent partner code and restarts denied; SDK denial alone cannot stop a partner script that already executed. Withdrawal cannot retract sent data or control recipient processing. Current Contact and Trial forms have no dedicated password or payment credential fields; keep those excluded from tracking and retain the reviewed field-mask limits. Our GA4 configuration sends no form values; downstream vendor forwarding is not established.

Native GTM workspace `2` is the configuration counterpart to the maintained package. Reconcile its configuration before publishing, then verify production consent denial, renewed acceptance, withdrawal, GPC, vendor/partner requests, the production GA4 page view, and new-property ingestion. Site deployment and container publication are separate release steps. Local tests do not prove production collection or every downstream vendor action. See README.md for maintenance details.

## Content Guardrails

- Do not publish testimonials, customer logos, performance outcomes, competitor pricing, or compliance certifications without explicit approval and evidence.
- Do not expose webhook URLs, CRM endpoints, or server credentials in front-end source.
- Keep outcome playbooks labelled as illustrative until customer proof is approved.
- Describe Local Sphere as the parent product relationship and marketing/activation capability without adding unverified technical or data claims.
- Keep images text-free, without baked-in cards, hard rectangular edges, or shadows; interface labels should remain HTML/CSS for accessibility.

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
- Generated visual assets: `assets/images/subpages/`

Use native browser capabilities, CSS transitions, and `IntersectionObserver` for motion. Preserve keyboard access, visible focus, responsive layouts, and `prefers-reduced-motion` support.

## Content Guardrails

- Do not publish testimonials, customer logos, performance outcomes, competitor pricing, or compliance certifications without explicit approval and evidence.
- Do not expose webhook URLs, CRM endpoints, or server credentials in front-end source.
- Keep outcome playbooks labelled as illustrative until customer proof is approved.
- Describe Local Sphere as the parent product relationship and marketing/activation capability without adding unverified technical or data claims.
- Keep images text-free, without baked-in cards, hard rectangular edges, or shadows; interface labels should remain HTML/CSS for accessibility.

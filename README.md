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

## Validation

```bash
node tests/site-smoke.mjs
node tests/lead-submissions.mjs
node tests/trial-api.mjs
node tests/contact-api.mjs
```

See [SITE-REFERENCE.md](SITE-REFERENCE.md) for the current route map, pricing presentation, content standards, and maintenance notes.

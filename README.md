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
npm run dev
```

The site is static HTML, CSS, and JavaScript. `api/trial-request.js` is a Vercel serverless function and is available when running through Vercel or a compatible local environment.

## Trial Requests

`trial.html` and `contact.html` validate their forms in the browser and post to `/api/trial-request` and `/api/contact-request` respectively.

- Set `TRIAL_REQUEST_WEBHOOK_URL` in the server environment to forward validated trial and contact requests. Each payload includes a distinct `source` value.
- Without that variable, the APIs return a transparent temporary-configuration error.
- The webhook URL is never included in client-side source.

## Validation

```bash
node tests/site-smoke.mjs
node tests/trial-api.mjs
node tests/contact-api.mjs
```

See [SITE-REFERENCE.md](SITE-REFERENCE.md) for the current route map, pricing presentation, content standards, and maintenance notes.

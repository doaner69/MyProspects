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

`trial.html` validates the form in the browser and posts to `/api/trial-request`.

- Set `TRIAL_REQUEST_WEBHOOK_URL` in the server environment to forward validated trial requests.
- Without that variable, the API returns a transparent fallback response that directs visitors to the interactive demo.
- The webhook URL is never included in client-side source.

## Validation

```bash
node tests/site-smoke.mjs
node tests/trial-api.mjs
```

See [SITE-REFERENCE.md](SITE-REFERENCE.md) for the current route map, pricing presentation, content standards, and maintenance notes.

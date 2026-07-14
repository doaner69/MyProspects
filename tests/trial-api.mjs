import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../api/trial-request.js');

const validBody = {
  firstName: 'Alex', lastName: 'Johnson', workEmail: 'alex@acme.example',
  company: 'Acme', website: 'https://acme.example', useCase: 'b2b',
  monthlyTraffic: '10k-50k', notes: 'Validate website identity.', consent: true,
};

function response() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    end(body) { this.body = JSON.parse(body); },
  };
}

async function invoke({ method = 'POST', body = validBody } = {}) {
  const res = response();
  await handler({ method, body }, res);
  return res;
}

const previousWebhook = process.env.TRIAL_REQUEST_WEBHOOK_URL;
const previousFetch = global.fetch;
const previousConsoleError = console.error;

try {
  delete process.env.TRIAL_REQUEST_WEBHOOK_URL;
  let res = await invoke({ method: 'GET' });
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'POST');

  res = await invoke({ body: '{bad json' });
  assert.equal(res.statusCode, 400);

  res = await invoke({ body: { ...validBody, workEmail: 'invalid', consent: false } });
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.fields.workEmail && res.body.fields.consent);

  res = await invoke({ body: { ...validBody, website_confirm: 'bot' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);

  res = await invoke();
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.fallback, '/demo.html#book');

  process.env.TRIAL_REQUEST_WEBHOOK_URL = 'https://hooks.example/trial';
  global.fetch = async (_url, options) => {
    const forwarded = JSON.parse(options.body);
    assert.equal(forwarded.source, 'myprospects-trial-page');
    assert.equal(forwarded.workEmail, validBody.workEmail);
    return { ok: true, status: 200 };
  };
  res = await invoke();
  assert.equal(res.statusCode, 200);

  global.fetch = async () => ({ ok: false, status: 500 });
  console.error = () => {};
  res = await invoke();
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.fallback, '/demo.html#book');
} finally {
  if (previousWebhook === undefined) delete process.env.TRIAL_REQUEST_WEBHOOK_URL;
  else process.env.TRIAL_REQUEST_WEBHOOK_URL = previousWebhook;
  global.fetch = previousFetch;
  console.error = previousConsoleError;
}

console.log('trial-api: method, validation, honeypot, configuration, success, and failure paths validated');

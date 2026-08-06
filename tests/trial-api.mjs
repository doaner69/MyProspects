import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const trialModule = require('../api/trial-request.js');

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

async function invoke(handler, { method = 'POST', body = validBody } = {}) {
  const res = response();
  await handler({ method, body, headers: { 'user-agent': 'MyProspects API test' } }, res);
  return res;
}

const submissions = [];
const handler = trialModule.createHandler({
  submitLead: async (input) => {
    submissions.push(input);
    return { id: 2 };
  },
  logger: { error() {} },
});

let res = await invoke(handler, { method: 'GET' });
assert.equal(res.statusCode, 405);
assert.equal(res.headers.Allow, 'POST');

res = await invoke(handler, { body: '{bad json' });
assert.equal(res.statusCode, 400);

res = await invoke(handler, { body: { ...validBody, workEmail: 'invalid', consent: false } });
assert.equal(res.statusCode, 400);
assert.ok(res.body.fields.workEmail && res.body.fields.consent);

res = await invoke(handler, { body: { ...validBody, website_confirm: 'bot' } });
assert.equal(res.statusCode, 200);
assert.equal(res.body.ok, true);
assert.equal(submissions.length, 0, 'honeypot submissions must not reach persistence');

res = await invoke(handler, { body: { ...validBody, website: 'acme.example' } });
assert.equal(res.statusCode, 200);
assert.equal(submissions.length, 1);
assert.deepEqual(submissions[0], {
  submissionType: 'free_trial',
  source: 'myprospects-trial-page',
  name: 'Alex Johnson',
  firstName: validBody.firstName,
  lastName: validBody.lastName,
  email: validBody.workEmail,
  company: validBody.company,
  website: 'https://acme.example',
  useCase: validBody.useCase,
  monthlyTraffic: validBody.monthlyTraffic,
  notes: validBody.notes,
  consent: true,
  userAgent: 'MyProspects API test',
});

const failingHandler = trialModule.createHandler({
  submitLead: async () => { throw new Error('database unavailable'); },
  logger: { error() {} },
});
res = await invoke(failingHandler);
assert.equal(res.statusCode, 503);
assert.match(res.body.error, /could not save/i);

console.log('trial-api: method, validation, honeypot, normalization, persistence success, and database failure paths validated');

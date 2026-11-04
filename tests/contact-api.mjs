import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const contactModule = require('../api/contact-request.js');

const validBody = {
  name: 'Alex Johnson',
  email: 'alex@acme.example',
  message: 'I would like to discuss the right plan for our traffic.',
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
const handler = contactModule.createHandler({
  submitLead: async (input) => {
    submissions.push(input);
    return { id: 1 };
  },
  logger: { error() {} },
});

let res = await invoke(handler, { method: 'GET' });
assert.equal(res.statusCode, 405);
assert.equal(res.headers.Allow, 'POST');

res = await invoke(handler, { body: '{bad json' });
assert.equal(res.statusCode, 400);

// JSON primitives and arrays must never reach persistence or throw outside the handler.
for (const body of [null, [], [validBody], true, false, 0, 42, 'null', '[]', '[{}]', 'true', 'false', '0', '"text"', '""']) {
  res = await invoke(handler, { body });
  assert.equal(res.statusCode, 400, `reject non-object request body: ${JSON.stringify(body)}`);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(typeof res.body.error, 'string');
  assert.equal(submissions.length, 0, 'malformed requests must not reach persistence');
}
assert.equal(contactModule.validatePayload(Object.assign([], validBody)).ok, false, 'arrays with field-shaped properties are not payload objects');

res = await invoke(handler, { body: { ...validBody, name: '', email: 'invalid', message: '' } });
assert.equal(res.statusCode, 400);
assert.ok(res.body.fields.name && res.body.fields.email && res.body.fields.message);

res = await invoke(handler, { body: { ...validBody, website_confirm: 'bot' } });
assert.equal(res.statusCode, 200);
assert.equal(res.body.ok, true);
assert.equal(submissions.length, 0, 'honeypot submissions must not reach persistence');

res = await invoke(handler);
assert.equal(res.statusCode, 200);
assert.equal(submissions.length, 1);
assert.deepEqual(submissions[0], {
  submissionType: 'contact',
  source: 'myprospects-contact-page',
  name: validBody.name,
  email: validBody.email,
  message: validBody.message,
  websiteConfirm: '',
  userAgent: 'MyProspects API test',
});

res = await invoke(handler, { body: JSON.stringify(validBody) });
assert.equal(res.statusCode, 200, 'valid JSON object strings remain accepted');
assert.equal(submissions.length, 2);
assert.deepEqual(submissions[1], submissions[0]);

const failingHandler = contactModule.createHandler({
  submitLead: async () => { throw new Error('database unavailable'); },
  logger: { error() {} },
});
res = await invoke(failingHandler);
assert.equal(res.statusCode, 503);
assert.match(res.body.error, /could not save/i);

console.log('contact-api: method, malformed-body rejection, validation, honeypot, persistence success, and database failure paths validated');

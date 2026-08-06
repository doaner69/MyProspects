import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  buildSlackMessage,
  createLeadStore,
  notifySlack,
  resolveDatabaseUrl,
  resolveSlackWebhookUrl,
  saveLeadWithNotification,
} = require('../api/_lead-submissions.js');

const contactLead = {
  submissionType: 'contact',
  source: 'myprospects-contact-page',
  name: 'Alex <Johnson>',
  email: 'alex&team@acme.example',
  message: 'Please tell me more about visitor identity.',
  userAgent: 'API test',
};

assert.equal(resolveDatabaseUrl({ NEON_DATABASE_URL: ' postgres://preview ' }), 'postgres://preview');
assert.equal(resolveDatabaseUrl({ DATABASE_URL: 'postgres://fallback' }), 'postgres://fallback');
assert.throws(() => resolveDatabaseUrl({}), /Missing Neon database URL/);

const productionSlack = 'https://hooks.slack.com/services/T000/B000/production';
const previewSlack = 'https://hooks.slack.com/services/T000/B000/preview';
assert.equal(resolveSlackWebhookUrl({ VERCEL_ENV: 'production', SLACK_WEBHOOK_URL: productionSlack }), productionSlack);
assert.equal(resolveSlackWebhookUrl({ VERCEL_ENV: 'preview', SLACK_WEBHOOK_URL_PREVIEW: previewSlack }), previewSlack);
assert.equal(resolveSlackWebhookUrl({ VERCEL_ENV: 'preview', SLACK_WEBHOOK_URL: productionSlack }), undefined);
assert.throws(
  () => resolveSlackWebhookUrl({ VERCEL_ENV: 'production', SLACK_WEBHOOK_URL: 'https://example.com/hook' }),
  /Slack incoming webhook/,
);

const slackMessage = buildSlackMessage(contactLead);
assert.match(JSON.stringify(slackMessage), /Alex &lt;Johnson&gt;/);
assert.match(JSON.stringify(slackMessage), /alex&amp;team@acme\.example/);
assert.match(slackMessage.text, /MyProspects contact request/);

const sqlCalls = [];
async function fakeSql(strings, ...values) {
  const query = strings.join('?').replace(/\s+/g, ' ').trim();
  sqlCalls.push({ query, values });
  return query.startsWith('INSERT') ? [{ id: 42, created_at: new Date().toISOString() }] : [];
}

const store = createLeadStore(fakeSql);
await store.saveLead(contactLead);
await store.saveLead({ ...contactLead, email: 'second@acme.example' });
assert.equal(sqlCalls.filter(({ query }) => query.startsWith('CREATE TABLE')).length, 1, 'schema setup should be cached');
assert.equal(sqlCalls.filter(({ query }) => query.startsWith('CREATE INDEX')).length, 2, 'both indexes should be ensured once');
assert.equal(sqlCalls.filter(({ query }) => query.startsWith('INSERT')).length, 2, 'every validated lead should be inserted');
const firstInsert = sqlCalls.find(({ query }) => query.startsWith('INSERT'));
assert.equal(firstInsert.values[0], 'contact');
assert.equal(firstInsert.values[1], 'myprospects-contact-page');

let failureCalls = 0;
const failingStore = createLeadStore(async () => {
  failureCalls += 1;
  throw new Error('database unavailable');
});
await assert.rejects(() => failingStore.saveLead(contactLead), /database unavailable/);
await assert.rejects(() => failingStore.saveLead(contactLead), /database unavailable/);
assert.equal(failureCalls, 2, 'a failed schema check should be retryable on the next request');

const order = [];
await saveLeadWithNotification(contactLead, {
  saveLead: async () => { order.push('database'); return { id: 1 }; },
  notifySlack: async () => { order.push('slack'); return { status: 'sent' }; },
});
assert.deepEqual(order, ['database', 'slack']);

let notificationAttempted = false;
await assert.rejects(
  () => saveLeadWithNotification(contactLead, {
    saveLead: async () => { throw new Error('database write failed'); },
    notifySlack: async () => { notificationAttempted = true; },
  }),
  /database write failed/,
);
assert.equal(notificationAttempted, false, 'Slack must not run when persistence fails');

const warnings = [];
await saveLeadWithNotification(contactLead, {
  saveLead: async () => ({ id: 2 }),
  notifySlack: async () => { throw new Error('Slack unavailable'); },
  logger: { warn: (...args) => warnings.push(args) },
});
assert.equal(warnings.length, 1, 'Slack failure should be logged once');

let sentSlackBody;
const notification = await notifySlack(contactLead, {
  env: { VERCEL_ENV: 'preview', SLACK_WEBHOOK_URL_PREVIEW: previewSlack },
  fetcher: async (_url, options) => {
    sentSlackBody = JSON.parse(options.body);
    assert.ok(options.signal, 'Slack request should have a timeout signal');
    return { ok: true, status: 200, text: async () => 'ok' };
  },
});
assert.equal(notification.status, 'sent');
assert.match(sentSlackBody.text, /MyProspects contact request/);

await assert.rejects(
  () => notifySlack(contactLead, {
    env: { VERCEL_ENV: 'production', SLACK_WEBHOOK_URL: productionSlack },
    fetcher: async () => ({ ok: false, status: 500, text: async () => 'failure' }),
  }),
  /Slack webhook returned 500/,
);

console.log('lead-submissions: schema, database ordering/failure, and Slack success/failure paths validated');

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const configPath = new URL('../gtm/myprospects-container.json', import.meta.url);
assert.ok(existsSync(configPath), 'The reviewed GTM import configuration must exist');
const config = JSON.parse(readFileSync(configPath, 'utf8')).containerVersion;
assert.equal(config.container.publicId, 'GTM-K3S8PSJ9');
assert.equal(config.accountId, '6382565138');
assert.equal(config.containerId, '267143179');
assert.equal(config.tag.length, 3, 'Only the reviewed consent, Google, and identity tags belong in this workspace');
assert.equal(config.trigger.length, 4);
assert.equal(config.variable.length, 4);
assert.equal(config.customTemplate.length, 1);
const googleTags = config.tag.filter(tag => tag.type === 'googtag');
assert.equal(googleTags.length, 1, 'The container must initialize exactly one Google tag');
const ga = googleTags[0];
assert.equal(ga.parameter.find(parameter => parameter.key === 'tagId').value, 'G-VH43PH567B');
assert.equal(ga.tagFiringOption, 'ONCE_PER_LOAD', 'Grant/regrant and initialization triggers must not duplicate the page view');
assert.equal(ga.consentSettings.consentStatus, 'NEEDED');
assert.equal(ga.consentSettings.consentType.list[0].value, 'analytics_storage');
const settings = Object.fromEntries(ga.parameter.find(parameter => parameter.key === 'configSettingsTable').list.map(row => row.map.map(({ value }) => value)));
assert.equal(settings.allow_google_signals, 'false');
assert.equal(settings.allow_ad_personalization_signals, 'false');
assert.equal(settings.page_location, '{{MyProspects – Page location}}');
assert.equal(settings.page_referrer, '{{MyProspects – Page referrer}}');
assert.deepEqual(Object.keys(settings).sort(), ['allow_ad_personalization_signals', 'allow_google_signals', 'page_location', 'page_referrer'].sort(), 'Only the reviewed privacy-safe parameters may reach GA4');
assert.ok(!JSON.stringify(config).includes('G-SQY7W3M8FR'));

const pixel = config.tag.find(tag => tag.type === 'html');
assert.ok(pixel);
assert.equal(pixel.paused, false, 'The approved identity tag must be enabled behind the controller privacy state');
assert.equal(pixel.tagFiringOption, 'ONCE_PER_LOAD');
const pixelHtml = pixel.parameter.find(parameter => parameter.key === 'html').value;
const pixelCode = pixelHtml.match(/<script>([\s\S]*)<\/script>/)[1];
function pixelLoader(allowed) {
  const scripts = [];
  const document = {
    querySelector() { return scripts[0] ?? null; },
    createElement(tag) { assert.equal(tag, 'script'); return { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } }; },
    head: { appendChild(script) { scripts.push(script); } },
  };
  const context = { window: { MyProspectsConsent: { isIdentityAllowed: () => allowed } }, document };
  runInNewContext(pixelCode, context);
  runInNewContext(pixelCode, context);
  return scripts;
}
assert.equal(pixelLoader(false).length, 0, 'Denied consent must not load the vendor script');
const loaded = pixelLoader(true);
assert.equal(loaded.length, 1, 'The enabled pixel must not load twice');
assert.equal(loaded[0].src, 'https://pixel.localsphere.com/pixels/f975a66e-59f3-4c58-988f-c5b1d9361f9b/p.js');
assert.equal(loaded[0].async, true);
assert.equal(loaded[0].attributes['data-ga4-key'], 'G-VH43PH567B');
assert.equal(loaded[0].attributes['data-consent-category'], 'marketing');
assert.deepEqual(Object.keys(loaded[0].attributes).sort(), ['data-consent-category', 'data-ga4-key'], 'No unsupported vendor attributes may be invented');

function matches(filter, values) {
  const params = Object.fromEntries(filter.parameter.map(parameter => [parameter.key, parameter.value]));
  const left = values[params.arg0] ?? params.arg0;
  if (filter.type === 'EQUALS') return left === params.arg1;
  if (filter.type === 'MATCH_REGEX') return new RegExp(params.arg1).test(left);
  throw new Error(`Unexpected filter type ${filter.type}`);
}
function triggersFor(tag, type, values) {
  return tag.firingTriggerId.map(id => config.trigger.find(trigger => trigger.triggerId === id))
    .filter(trigger => trigger.type === type && [...(trigger.filter || []), ...(trigger.customEventFilter || [])].every(filter => matches(filter, values)));
}
for (const path of ['/', '/contact', '/contact.html', '/trial', '/trial.html', '/solutions/b2b', '/resources/anonymous-traffic-to-named-pipeline']) {
  const values = { '{{Page URL}}': `https://www.myprospects.com${path}`, '{{MyProspects – Analytics consent}}': 'granted', '{{MyProspects – Identity consent}}': 'granted', '{{_event}}': 'myprospects_consent_granted' };
  assert.equal(triggersFor(ga, 'INIT', values).length, 1, `${path}: GA4 must cover every intended page when the controller allows tracking`);
  assert.equal(triggersFor(ga, 'CUSTOM_EVENT', values).length, 1, `${path}: explicit re-enabling must start GA4`);
  assert.equal(triggersFor(pixel, 'DOM_READY', values).length, 1, `${path}: pixel coverage must include form pages`);
  assert.equal(triggersFor(pixel, 'CUSTOM_EVENT', values).length, 1);
  values['{{MyProspects – Analytics consent}}'] = 'denied';
  values['{{MyProspects – Identity consent}}'] = 'denied';
  assert.equal(triggersFor(ga, 'INIT', values).length, 0);
  assert.equal(triggersFor(pixel, 'DOM_READY', values).length, 0);
}
for (const origin of ['http://www.myprospects.com', 'https://myprospects.com', 'https://app.localsphere.com', 'http://localhost:8765', 'https://preview.vercel.app', 'https://www.myprospects.com.example.invalid']) {
  const values = { '{{Page URL}}': `${origin}/`, '{{MyProspects – Analytics consent}}': 'granted', '{{MyProspects – Identity consent}}': 'granted', '{{_event}}': 'myprospects_consent_granted' };
  assert.equal(triggersFor(ga, 'INIT', values).length, 0, `${origin}: GA4 must stay within the exact production site`);
  assert.equal(triggersFor(pixel, 'DOM_READY', values).length, 0);
}

const consentCode = readFileSync(new URL('../gtm/myprospects-consent.js', import.meta.url), 'utf8');
const template = config.customTemplate[0];
const embeddedConsentCode = template.templateData.split('___SANDBOXED_JS_FOR_WEB_TEMPLATE___')[1].split('___WEB_PERMISSIONS___')[0].trim();
assert.equal(embeddedConsentCode, consentCode.trim(), 'The saved template must contain the reviewed consent bridge');
const consentTag = config.tag.find(tag => tag.type === `cvt_${config.containerId}_${template.templateId}`);
assert.ok(consentTag, 'The consent tag must reference this workspace\'s actual template ID');
assert.deepEqual(consentTag.firingTriggerId, ['2147479572'], 'Consent defaults must run on native Consent Initialization');
const permissions = JSON.parse(template.templateData.split('___WEB_PERMISSIONS___')[1].split('___TESTS___')[0]);
assert.deepEqual(permissions.map(item => item.instance.key.publicId).sort(), ['access_consent', 'access_globals']);
function permissionRows(id) {
  const items = permissions.find(item => item.instance.key.publicId === id).instance.param[0].value.listItem;
  return items.map(item => Object.fromEntries(item.mapKey.map((key, index) => [key.string, item.mapValue[index].string ?? item.mapValue[index].boolean])));
}
assert.deepEqual(permissionRows('access_globals'), [{ key: 'MyProspectsConsent.subscribe', read: false, write: false, execute: true }]);
assert.deepEqual(permissionRows('access_consent').map(row => row.consentType).sort(), ['ad_personalization', 'ad_storage', 'ad_user_data', 'analytics_storage']);
assert.ok(permissionRows('access_consent').every(row => row.read === false && row.write === true), 'The template needs only writes to its four consent states');
const states = [];
let subscriber;
let success = 0;
runInNewContext(consentCode, {
  require(name) {
    if (name === 'setDefaultConsentState' || name === 'updateConsentState') return value => states.push({ ...value });
    if (name === 'callInWindow') return (path, callback) => { assert.equal(path, 'MyProspectsConsent.subscribe'); subscriber = callback; callback(false); };
    throw new Error(`Unexpected template API ${name}`);
  },
  data: { gtmOnSuccess() { success += 1; } },
});
assert.equal(success, 1);
assert.equal(states[0].analytics_storage, 'denied');
subscriber(true);
assert.equal(states.at(-1).analytics_storage, 'granted');
subscriber(false);
assert.equal(states.at(-1).analytics_storage, 'denied');
assert.ok(states.every(state => ['ad_storage', 'ad_user_data', 'ad_personalization'].every(type => state[type] === 'denied')));

console.log('gtm-config: one GA4 destination, production-only consent triggers, enabled consent-gated all-page pixel, privacy-safe parameters, and consent template behavior validated');

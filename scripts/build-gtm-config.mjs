import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const write = (path, text) => writeFileSync(new URL(path, root), text);
const config = JSON.parse(read('gtm/myprospects-container.json'));
const consentSource = read('gtm/myprospects-consent.js').trim();
const template = read('gtm/myprospects-consent.tpl').replace(
  /(___SANDBOXED_JS_FOR_WEB_TEMPLATE___\s*)[\s\S]*?(\s*___WEB_PERMISSIONS___)/,
  (_match, before, after) => `${before}${consentSource}${after}`,
);
config.containerVersion.customTemplate.find(item => item.name === 'MyProspects consent').templateData = template;
const pixel = config.containerVersion.tag.find(tag => tag.type === 'html');
pixel.parameter.find(parameter => parameter.key === 'html').value = read('gtm/myprospects-pixel.html').trim();
// This release has explicit approval for the vendor and observed partner recipients.
// Runtime identity consent still gates every load through the reviewed controller.
pixel.name = 'Identity – MyProspects – Consented visitors';
pixel.paused = false;
write('gtm/myprospects-consent.tpl', template);
write('gtm/myprospects-container.json', `${JSON.stringify(config, null, 2)}\n`);
console.log('build-gtm: consent and approved pixel sources synchronized');

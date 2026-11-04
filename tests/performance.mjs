import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NAV_HTML, FOOTER_HTML } from '../templates/shared-chrome.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const css = read('css/styles.css').toString();
const faces = [...css.matchAll(/@font-face\s*\{([^}]+)\}/g)].map(match => match[1]);
assert.equal(faces.length, 2, 'Two local variable faces replace the blocking remote font stylesheet');
for (const [family, weights] of [['Inter', '400 800'], ['JetBrains Mono', '600 700']]) {
  const face = faces.find(value => value.includes(`font-family: "${family}"`));
  assert.ok(face, `${family}: requested family is available locally`);
  assert.ok(face.includes(`font-weight: ${weights};`), `${family}: retains the existing weight range`);
  assert.match(face, /font-display:\s*optional;/, 'Late font loads must not replace visible text');
  const url = face.match(/url\("([^\"]+)"\)/)?.[1];
  assert.ok(url?.startsWith('/assets/fonts/'), 'Font requests stay on the site origin');
  const bytes = read(url.slice(1));
  assert.equal(bytes.toString('ascii', 0, 4), 'wOF2', `${family}: delivery file is WOFF2`);
  assert.equal(bytes.readUInt32BE(8), bytes.length, `${family}: font length matches its WOFF2 header`);
  assert.ok(bytes.length < 60000, `${family}: compact Latin variable face`);
}

const logo = read('assets/images/myprospects-logo.png');
const dimensions = [logo.readUInt32BE(16), logo.readUInt32BE(20)];
for (const html of [NAV_HTML, FOOTER_HTML]) {
  const image = html.match(/<img\b[^>]*myprospects-logo\.png[^>]*>/)?.[0];
  assert.ok(image, 'Shared chrome contains the logo');
  assert.deepEqual([Number(image.match(/width="(\d+)"/)?.[1]), Number(image.match(/height="(\d+)"/)?.[1])], dimensions,
    'Shared logo reserves its actual aspect ratio before loading');
}
console.log('performance: local WOFF2 faces, optional rendering, weight ranges and intrinsic shared-logo sizes');

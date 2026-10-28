import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Catch missing artwork, changed accessibility text, oversized delivery, and
// distorted or mislabeled responsive files using the real HTML and file bytes.
const expected = [
  ['home-identity-flow', 'Anonymous visitor signals resolving into a verified customer profile'],
  ['home-dark-funnel', ''],
  ['identity-graph-website', 'Anonymous visitors arriving on a website'],
  ['identity-graph-resolution', 'Identity graph matching anonymous signals to a resolved profile'],
  ['identity-graph-profiles', 'Resolved person profile enriched with contact and company data'],
  ['identity-graph-intent', 'Intent signals and scoring increasing over time'],
  ['identity-graph-activate', 'Resolved audience activating across CRM marketing and ad channels'],
  ['solution-b2b', ''], ['solution-recruitment', ''], ['solution-b2c', ''], ['solution-nonprofit', ''],
  ['capability-identity', ''], ['capability-intent', ''], ['capability-enrichment', ''],
  ['capability-activation', ''], ['capability-privacy', ''], ['home-local-sphere', ''],
];
const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root));
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const html = read('index.html').toString();
const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
assert.ok(main, 'Homepage main content must exist');
const images = [...main.matchAll(/<img\b[^>]*>/g)].map(([tag]) => attrs(tag));
assert.equal(images.length, expected.length, 'All 17 homepage artwork elements must remain');
// Deliberately checked before manifest access so baseline failure explains the missing behavior.
assert.ok(images.every((img) => img.srcset && img.sizes), 'Each homepage image needs responsive srcset and sizes');
const manifest = JSON.parse(read('assets/images/optimized/manifest.json'));
function webpDimensions(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  for (let offset = 12; offset + 8 < bytes.length;) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (type === 'VP8X') return [1 + bytes.readUIntLE(data + 4, 3), 1 + bytes.readUIntLE(data + 7, 3)];
    if (type === 'VP8 ') return [bytes.readUInt16LE(data + 6) & 0x3fff, bytes.readUInt16LE(data + 8) & 0x3fff];
    offset = data + size + (size % 2);
  }
  throw new Error('No supported WebP dimension header');
}
let defaultBytes = 0;
let maximumBytes = 0;
for (const [index, [name, alt]] of expected.entries()) {
  const img = images[index];
  assert.equal(img.alt, alt, `${name}: preserve existing accessible description`);
  assert.ok(img.src.startsWith(`assets/images/optimized/${name}-`), `${name}: preserve artwork and use optimized source`);
  const original = read(`assets/images/${name}.png`);
  const width = original.readUInt32BE(16), height = original.readUInt32BE(20);
  assert.equal(Number(img.width), width, `${name}: reserve original aspect ratio`);
  assert.equal(Number(img.height), height, `${name}: reserve original aspect ratio`);
  assert.equal(img.loading, index === 0 ? 'eager' : 'lazy', `${name}: hero eager, below-fold lazy`);
  const record = manifest.images.find((item) => item.name === name);
  assert.equal(createHash('sha256').update(original).digest('hex'), record.originalSha256, `${name}: keep original intact`);
  const candidates = img.srcset.split(',').map((candidate) => {
    const match = candidate.trim().match(/^(\S+) (\d+)w$/);
    assert.ok(match, `${name}: valid width descriptor`);
    const path = match[1], descriptor = Number(match[2]);
    const bytes = read(path);
    const [actualWidth, actualHeight] = webpDimensions(bytes);
    assert.equal(actualWidth, descriptor, `${path}: truthful width descriptor`);
    assert.ok(actualWidth <= width && actualHeight <= height, `${path}: no upscaling`);
    assert.ok(Math.abs(actualHeight - height * actualWidth / width) <= 0.5, `${path}: full original aspect ratio`);
    const entry = record.candidates.find((candidate) => candidate.path === path);
    assert.deepEqual([entry.width, entry.height, entry.bytes], [actualWidth, actualHeight, bytes.length]);
    assert.ok(bytes.length < original.length, `${path}: smaller than original PNG`);
    return { path, width: actualWidth, bytes: bytes.length };
  });
  assert.ok(candidates.length >= 3, `${name}: useful responsive choices`);
  assert.equal(new Set(candidates.map((candidate) => candidate.width)).size, candidates.length);
  assert.ok(candidates.some((candidate) => candidate.path === img.src), `${name}: fallback is a responsive candidate`);
  defaultBytes += statSync(new URL(img.src, root)).size;
  maximumBytes += Math.max(...candidates.map((candidate) => candidate.bytes));
}
assert.ok(defaultBytes <= 2_000_000, `Default desktop image budget: ${defaultBytes} > 2 MB`);
assert.ok(maximumBytes <= 2_000_000, `Even largest candidates must fit 2 MB: ${maximumBytes}`);
assert.ok(statSync(new URL(images[0].src, root)).size <= 1_000_000, 'Initial eager mobile imagery must fit 1 MB');
console.log(`Homepage images passed: 17 artworks; default ${defaultBytes} bytes; largest-candidate set ${maximumBytes} bytes`);

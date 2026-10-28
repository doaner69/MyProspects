import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPages, ROOT } from './generate-seo.mjs';
import { NAV_HTML, FOOTER_HTML } from '../templates/shared-chrome.mjs';

function replaceBlock(html, name, tag, id, content, file) {
  const start = `<!-- ${name}:START -->`;
  const end = `<!-- ${name}:END -->`;
  const block = `${start}\n  <${tag} id="${id}">${content}\n  </${tag}>\n  ${end}`;
  const starts = html.split(start).length - 1;
  const ends = html.split(end).length - 1;
  if (starts !== ends || starts > 1 || (starts && html.indexOf(start) > html.indexOf(end))) throw new Error(`Malformed ${name} markers: ${file}`);
  const pattern = starts
    ? new RegExp(`<!-- ${name}:START -->[\\s\\S]*?<!-- ${name}:END -->`)
    : new RegExp(`<${tag}\\b[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/${tag}>`);
  if (!pattern.test(html)) throw new Error(`Missing ${name} container: ${file}`);
  const result = html.replace(pattern, () => block);
  if ((result.match(new RegExp(`id="${id}"`, 'g')) || []).length !== 1) throw new Error(`Duplicate ${name} container: ${file}`);
  return result;
}

export function buildSharedChrome(root = ROOT, { check = false } = {}) {
  const outputs = loadPages(root).map(page => {
    const file = resolve(root, page.file);
    let html = readFileSync(file, 'utf8');
    html = replaceBlock(html, 'NAV', 'nav', 'site-nav', NAV_HTML, page.file);
    html = replaceBlock(html, 'FOOTER', 'footer', 'site-footer', FOOTER_HTML, page.file);
    return [file, html];
  });
  const stale = [];
  for (const [file, html] of outputs) {
    if (readFileSync(file, 'utf8') === html) continue;
    stale.push(file);
    if (!check) writeFileSync(file, html);
  }
  return stale;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build-shared-chrome.mjs [--check]');
    const check = process.argv.includes('--check');
    const stale = buildSharedChrome(ROOT, { check });
    if (check && stale.length) {
      console.error(`Shared chrome is stale (${stale.length} files). Run npm run build:chrome.`);
      process.exitCode = 1;
    } else console.log(`shared-chrome: ${check ? 'checked' : 'synchronized'} ${loadPages().length} public pages (${stale.length} changed)`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

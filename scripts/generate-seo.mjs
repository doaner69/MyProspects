import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ORIGIN = 'https://www.myprospects.com';
export const ROOT = fileURLToPath(new URL('../', import.meta.url));
const START = '<!-- SEO:START -->';
const END = '<!-- SEO:END -->';

export function loadPages(root = ROOT) {
  const pages = JSON.parse(readFileSync(resolve(root, 'seo/pages.json'), 'utf8'));
  if (!Array.isArray(pages) || !pages.length) throw new Error('Public page inventory must be a nonempty array.');
  const paths = new Set();
  const files = new Set();
  for (const page of pages) {
    if (typeof page.file !== 'string' || !/^(?:(?:solutions|resources)\/)?[a-z0-9-]+\.html$/.test(page.file)) {
      throw new Error(`Invalid public HTML file: ${page.file}`);
    }
    const expected = page.file === 'index.html' ? '/' : `/${page.file.slice(0, -5)}`;
    if (page.path !== expected || typeof page.indexable !== 'boolean') throw new Error(`Invalid canonical contract: ${page.file}`);
    if (paths.has(page.path) || files.has(page.file)) throw new Error(`Duplicate public page: ${page.file}`);
    if (!existsSync(resolve(root, page.file))) throw new Error(`Missing public page: ${page.file}`);
    paths.add(page.path);
    files.add(page.file);
  }
  return pages;
}

export function renderCanonical(page) {
  return `<link rel="canonical" href="${ORIGIN}${page.path}">`;
}

export function renderSitemap(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter(page => page.indexable).map(page => `  <url><loc>${ORIGIN}${page.path}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function normalizeInternalLinks(html, page, pages) {
  const routes = new Map(pages.flatMap(item => [[`/${item.file}`, item.path], [item.path, item.path]]));
  return html.replace(/<a\b[^>]*\bhref=(['"])(.*?)\1/gi, (tag, quote, href) => {
    if (!href || /^(?:#|mailto:|tel:)/i.test(href)) return tag;
    const url = new URL(href.replaceAll('&amp;', '&'), `${ORIGIN}/${page.file}`);
    if (url.origin !== ORIGIN || !routes.has(url.pathname)) return tag;
    const clean = `${routes.get(url.pathname)}${url.search}${url.hash}`.replaceAll('&', '&amp;');
    return tag.replace(`href=${quote}${href}${quote}`, `href=${quote}${clean}${quote}`);
  });
}

export function generateSEO(root = ROOT, { check = false } = {}) {
  const pages = loadPages(root);
  const outputs = pages.map(page => {
    const filename = resolve(root, page.file);
    let html = readFileSync(filename, 'utf8');
    const block = `${START}\n  ${renderCanonical(page)}\n  ${END}`;
    const starts = html.split(START).length - 1;
    const ends = html.split(END).length - 1;
    if (starts !== ends || starts > 1 || (starts && html.indexOf(START) > html.indexOf(END))) throw new Error(`Malformed SEO markers: ${page.file}`);
    if (starts) html = html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, block);
    else if (html.includes('</head>')) html = html.replace('</head>', `  ${block}\n</head>`);
    else throw new Error(`Missing head: ${page.file}`);
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
    if ((head.match(/\brel\s*=\s*['"]canonical['"]/gi) || []).length !== 1 || !head.includes(block)) throw new Error(`Conflicting canonical tags: ${page.file}`);
    return [filename, normalizeInternalLinks(html, page, pages)];
  });
  // A sitemap declaration adds discovery without changing existing crawl/training permissions.
  outputs.push([resolve(root, 'robots.txt'), `Sitemap: ${ORIGIN}/sitemap.xml\n`]);
  outputs.push([resolve(root, 'sitemap.xml'), renderSitemap(pages)]);
  const stale = [];
  for (const [filename, content] of outputs) {
    if (existsSync(filename) && readFileSync(filename, 'utf8') === content) continue;
    stale.push(filename);
    if (!check) writeFileSync(filename, content);
  }
  return stale;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node scripts/generate-seo.mjs [--check]');
    const check = process.argv.includes('--check');
    const stale = generateSEO(ROOT, { check });
    if (check && stale.length) {
      console.error(`SEO output is stale (${stale.length} files). Run npm run build:seo.`);
      process.exitCode = 1;
    } else console.log(`seo: ${check ? 'checked' : 'synchronized'} ${loadPages().length} public pages (${stale.length} changed)`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

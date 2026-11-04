# MyProspects SEO and AEO audit — November 4, 2026

Scope: the three supplied Latitude screenshots, the live homepage response, and all 18 public HTML pages in this repository. Changes are implemented locally on `codex/technical-seo-aeo`. Publication is a separate step requiring explicit authorization. No dependencies, tracking behavior, database schemas, deployment infrastructure, or crawler permissions were changed.

## Diagnosis and implemented changes

| Finding | Diagnosis | Implemented fix |
| --- | --- | --- |
| Structured data not detected | No JSON-LD in the live homepage or repository pages. Search engines have no explicit connected entity/page model. | Static JSON-LD on all 18 pages: Local Sphere Organization, MyProspects Brand, WebSite and WebPage, with breadcrumb graphs on interior pages. Names and relationships follow existing footer, About, and privacy copy. No invented reviews, article dates, offers, certifications, or performance claims. |
| Open Graph absent / only two tags | Homepage and product had only title/description; canonical social URL, type and image were missing. Other pages lacked social metadata. The screenshot's two messages describe partial coverage. | One complete, page-specific set of Open Graph and Twitter tags per page, generated from authored titles/descriptions. Absolute canonical URLs and an existing branded PNG with its actual dimensions and alt text. Twitter uses `summary` to suit the existing wordmark. |
| `llms.txt` missing | Repository contained no AI-friendly page index. | Generated root `llms.txt` lists all 18 indexable canonical pages with their authored descriptions. Each page links to it with `rel="describedby"`. Generation checks catch drift. This is supplementary discovery, not a ranking promise or access policy. |
| Slow first content / largest element | Every page loaded a blocking external Google Fonts stylesheet. Hero artwork was already compressed, responsive WebP with intrinsic dimensions and eager loading. | Self-hosted the same Latin variable fonts (79,772 bytes combined), with original SIL OFL licenses. Removed external font stylesheet/preconnect dependencies. `font-display: optional` avoids late swaps; a slow initial visit may show system fallback. Added `fetchpriority="high"` to the homepage hero. |
| CLS 0.102 | Slightly above Google's good threshold of 0.1; screenshots do not identify the shifting elements. Shared logos lacked intrinsic dimensions; font swaps were another plausible contributor. | Reserved the actual 961 × 231 logo aspect ratio in navigation/footer across every page, and avoided late font swaps. Existing artwork dimensions remain intact. These address confirmed opportunities; the audit does not establish the exact cause of the reported field shift. |
| Interactivity / TTI 6.5s and max potential FID 170ms | These lab figures do not establish current INP or identify a responsible script. Site scripts are small and existing tracking has explicit consent requirements. | Preserved script/consent behavior and removed the confirmed font critical-path dependency. Further script work should follow a production performance trace rather than speculative refactoring. |
| Homepage search presentation | Existing title was long and emphasized a slogan; the description made a broad cookieless claim. | Title now identifies visitor identification and intent data. Description summarizes existing capabilities and audiences without repeating the broad claim. Existing visible copy is retained. |

The existing canonical paths, sitemap, static navigation, responsive artwork, unique page descriptions and crawler access remain intact. The SEO generator remains dependency-free and checks generated HTML/discovery files for drift.

## Verification

- `npm run build:site`: generated shared chrome and SEO output successfully.
- `npm test`: all 13 suites and both read-only generation checks passed. Covers SEO/canonical URLs, metadata and connected JSON-LD, social image file dimensions, `llms.txt` inventory, fonts, navigation, image delivery, forms, tracking/consent, and API behavior without sending real submissions.
- Generator regression coverage includes HTML/JSON escaping for a title containing an encoded closing script tag, idempotence, missing metadata rejection, malformed blocks, and privacy/query/fragment preservation.
- `git diff --check`: passed.
- Chrome: 15 local page/viewport combinations across homepage, product, pricing, nested B2B solution and intent guide. Desktop 1440 × 1000; mobile 390 × 844; mobile JavaScript disabled. Verified visible content/artwork, no horizontal overflow, one H1 and JSON-LD block, no uncaught JavaScript errors, no Google Fonts requests, and mobile navigation with and without JavaScript.
- Isolated browser checks observed CLS 0 on these visits. External requests, including GTM/vendors, were blocked. This is not a Lighthouse score, an INP measurement, field Core Web Vitals proof, or a before/after speed benchmark.
- Temporary browser script, captures and results: `/private/tmp/myprospects-browser-check.mjs` and `/private/tmp/myprospects-seo-aeo-20261104/`. These are local review artifacts, not site content.
- A separate read-only review found no actionable issues in the metadata, escaping, discovery inventory or font changes.

## Follow-up after authorized publication

1. Verify served HTML on canonical production URLs, successful font/image/`llms.txt` responses, and redirect behavior. Validate the deployed markup using Schema.org Validator and applicable Google Rich Results tests. General entity markup does not itself guarantee a rich result.
2. Re-run Latitude and mobile/desktop PageSpeed Insights using comparable settings. Inspect the LCP element and long tasks, separating first-party code from tag/vendor activity. Evaluate **LCP ≤2.5s, INP ≤200ms, CLS ≤0.1** at the 75th percentile with field data where available. FID and TTI should not be treated as the current Core Web Vitals set.
3. Submit/check the sitemap in Search Console and request homepage reindexing. Monitor indexing, queries, impressions, clicks and conversions; scores alone cannot establish visibility gains.
4. Improve answer coverage using approved facts: visitor-resolution scope/limits, supported countries and fields, confidence and freshness, native integrations versus exports, pricing definitions, and trial terms. The README lists unresolved business decisions. Obtain evidence and publishing approval before expanding claims or adding product/offer/review/article markup.
5. Establish credible, permissioned customer evidence and real editorial attribution. The 4.5B+, 35B, 50%+ and 24–48h statements already present in visible copy need documented provenance before reuse in new structured data or answer content. Existing illustrative playbooks should stay labeled; do not turn them into customer case studies.

## Source guidance

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): ordinary crawlability, useful visible content and SEO fundamentals apply to AI search; no special AI markup is required.
- [Google: Organization structured data](https://developers.google.com/search/docs/appearance/structured-data/organization): entity markup helps explain organizational identity; include applicable, accurate properties.
- [Open Graph protocol](https://ogp.me/): basic metadata includes title, type, image and URL.
- [The llms.txt proposal](https://llmstxt.org/): supplementary agent-oriented site guidance and discovery links.
- [Google: Web Vitals](https://web.dev/articles/vitals): current loading, interactivity and stability metrics and field thresholds.
